#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <AsyncJson.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <ESPmDNS.h>
#include <esp_camera.h>
#include <NimBLEDevice.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>
#include <Preferences.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

#include <algorithm>
#include <string>
#include <vector>
#include <cstring>
#include <functional>

#include "Config.h"
#include "AuthManager.h"
#include "LauraClient.h"
#include "AiManager.h"
#ifdef HEYSALAD_AUDIO_ENABLE
#include "Transcriber.h"
#endif

namespace {

constexpr uint32_t STATUS_BROADCAST_INTERVAL_MS = 5000;
constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 10000;
constexpr uint32_t LAURA_STATUS_INTERVAL_MS = Config::LAURA_API.status_interval_s * 1000UL;
constexpr uint32_t LAURA_COMMAND_POLL_INTERVAL_MS = Config::LAURA_API.command_poll_interval_s * 1000UL;
constexpr uint32_t BLE_CHUNK_DELAY_MS = 50;
constexpr size_t BLE_CHUNK_SIZE = 200;

#ifdef HEYSALAD_AUDIO_ENABLE
static Transcriber g_transcriber;
#endif

struct AppSettings {
    String wifiSsid;
    String wifiPassword;
    String cameraId;
    String cameraName;
    String supabaseKey;
    String cameraUuid;
    String apiUrl;
    String storageUrl;
    String locationId;
    bool frameUploadEnabled;
    String frameUploadFormat;
    float frameUploadInterval;
    bool aiEnabled;
    String aiModelPath;
    // STT/Transcriber settings stored in NVS (to avoid committing secrets)
    String sttWsUrl;
    String sttApiKey;
    bool sttHandshake = false;
    bool sttEnabled = false;
};

class HeySaladCameraServer;

class BleRxCallbacks : public NimBLECharacteristicCallbacks {
public:
    explicit BleRxCallbacks(HeySaladCameraServer& owner) : parent(owner) {}

protected:
    void onWrite(NimBLECharacteristic* characteristic) override;

private:
    HeySaladCameraServer& parent;
};

class HeySaladCameraServer {
public:
    void begin();
    void loop();

    static HeySaladCameraServer* instance;

    void handleControlMessage(const String& message, AsyncWebSocketClient* origin = nullptr);
    
#ifdef HEYSALAD_AUDIO_ENABLE
    void onTranscriptText(const String& text);
#endif

private:
    void loadSettings();
    void saveSettings();

    void initFilesystem();
    void initDisplay();
    void initCamera();
    void initGPIO();
    void initBLE();
    void initWiFi();
    void initLaura();
    void initAi();

    void setupServer();
    void setupWebSocket();

    bool ensureAuthenticated(AsyncWebServerRequest* request, bool allowInlineLogin = false);
    void sendLoginPage(AsyncWebServerRequest* request);
    void attachSessionCookie(AsyncWebServerResponse* response, const String& token);
    void serveIndex(AsyncWebServerRequest* request);

    void handleWebSocketEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
                              AwsEventType type, void* arg, uint8_t* data, size_t len);

    void updateStreaming();
    void maintainWiFi();
    void updateLaura();
    bool setAiEnabled(bool enabled, const String& modelPath = String());
    bool runAiSnapshot(std::vector<AiManager::Detection>& detections);
    void broadcastAiStatus();
    void appendAiStatus(JsonObject& root) const;

    bool connectStoredNetwork();
    bool connectConfiguredNetworks();
    bool connectPreferredNetwork();
    void startAccessPoint();

    void sendJsonStatus(AsyncWebSocketClient* client = nullptr);
    void notifyBLE(const String& payload);

    void setStreamingEnabled(bool enabled, bool updateDisplay = true);
    void setLedState(bool enabled);
    void handleAiRestStatus(AsyncWebServerRequest* request);
    void handleAiRunRequest(AsyncWebServerRequest* request);

    void setDisplayImage(const char* path);
    void drawPlaceholderColor(uint16_t color565);
    bool drawRgb565Asset(const char* path);
    void drawIpOverlay();

    String buildStatusPayload() const;
    void fillStatusJson(JsonDocument& doc) const;

    const Config::SavedLocation* findLocation(const String& id) const;

    void handleLauraCommand(const JsonVariantConst& command);

    AsyncWebServer server{80};
    AsyncWebSocket websocket{"/ws"};
    Preferences preferences;

    AppSettings settings;

    SPIClass* displaySPI = nullptr;
    Adafruit_GC9A01A* display = nullptr;
    std::vector<uint16_t> displayFramebuffer;

    AiManager aiManager;
    std::vector<AiManager::Detection> lastAiDetections;
    unsigned long lastAiRun = 0;

    NimBLEServer* bleServer = nullptr;
    NimBLECharacteristic* bleTxChar = nullptr;
    NimBLECharacteristic* bleRxChar = nullptr;

    LauraClient laura;
    AuthManager auth;

    bool filesystemReady = false;
    bool displayReady = false;
    bool cameraReady = false;
    bool streamingEnabled = true;
    bool bleReady = false;
    bool lauraReady = false;

    int ledPin = Config::GPIO_CONFIG.led_pin;
    int buzzerPin = Config::GPIO_CONFIG.buzzer_pin;
    bool ledState = false;
    SemaphoreHandle_t cameraMutex = nullptr;

    unsigned long lastFrameMs = 0;
    unsigned long lastStatusBroadcast = 0;
    unsigned long lastWifiCheck = 0;
    unsigned long lastLauraStatus = 0;
    unsigned long lastLauraCommandPoll = 0;
    unsigned long lastLauraFrameUpload = 0;

    bool wifiReconnectPending = false;
    unsigned long wifiReconnectRequestAt = 0;

    bool pendingRestart = false;
    unsigned long restartRequestedAt = 0;

    uint32_t framesSent = 0;
    float fps = 0.0f;

#ifdef HEYSALAD_AUDIO_ENABLE
    String transcriptBuf;
#endif
};

HeySaladCameraServer* HeySaladCameraServer::instance = nullptr;

void BleRxCallbacks::onWrite(NimBLECharacteristic* characteristic)
{
    std::string value = characteristic->getValue();
    if (!value.empty() && HeySaladCameraServer::instance != nullptr) {
        String message = String(value.c_str(), value.length());
        HeySaladCameraServer::instance->handleControlMessage(message, nullptr);
    }
}

void HeySaladCameraServer::begin()
{
    instance = this;

    Serial.println();
    Serial.println(F("=== HeySalad Camera Server (Async) ==="));

    auth.begin();
    loadSettings();
    initFilesystem();
    initGPIO();
    initDisplay();
    initCamera();
    initBLE();
    initWiFi();
    setupServer();
    initAi();
    initLaura();

#ifdef HEYSALAD_AUDIO_ENABLE
    g_transcriber.begin([](const String& t){
        if (HeySaladCameraServer::instance) {
            HeySaladCameraServer::instance->onTranscriptText(t + "\n");
        }
    });
    // Configure STT from settings
    g_transcriber.setConfig(settings.sttWsUrl, settings.sttApiKey, settings.sttHandshake);
    g_transcriber.setEnabled(settings.sttEnabled);
#endif

    lastStatusBroadcast = millis();
    lastFrameMs = millis();
    lastLauraStatus = millis();
    lastLauraCommandPoll = millis();
    lastLauraFrameUpload = millis();

    sendJsonStatus();
}

void HeySaladCameraServer::loop()
{
    websocket.cleanupClients();
    updateStreaming();
    maintainWiFi();
    updateLaura();

    const unsigned long now = millis();
    if (now - lastStatusBroadcast >= STATUS_BROADCAST_INTERVAL_MS) {
        sendJsonStatus();
        lastStatusBroadcast = now;
    }

    if (pendingRestart && now - restartRequestedAt > 1000) {
        ESP.restart();
    }

#ifdef HEYSALAD_AUDIO_ENABLE
    g_transcriber.loop();
#endif
}

#ifdef HEYSALAD_AUDIO_ENABLE
// Render transcript word-wrapped to the display and broadcast via WS
void HeySaladCameraServer::onTranscriptText(const String& text)
{
    transcriptBuf += text;
    if (transcriptBuf.length() > 2000) {
        transcriptBuf.remove(0, transcriptBuf.length() - 2000);
    }

    if (displayReady && display) {
        display->fillScreen(0x0000);

        // Header bar
        display->fillRect(0, 0, Config::DISPLAY_CONFIG.width, 24, 0xF800);
        display->setTextSize(1);
        display->setCursor(6, 6);
        display->setTextColor(0xFFFF, 0xF800);
        display->print("Live Captions");

        // Body
        display->setTextColor(0xFFFF, 0x0000);
        display->setTextSize(2);

        const int16_t x0 = 6;
        const int16_t y0 = 30;
        const int16_t w = Config::DISPLAY_CONFIG.width - 12;
        const int16_t h = Config::DISPLAY_CONFIG.height - y0 - 6;

        const int16_t ch = 8 * 2;  // approx line height for size=2
        const int16_t cw = 6 * 2;  // approx char width for size=2
        int16_t maxCharsPerLine = (w / cw) > 0 ? (w / cw) : 1;
        int16_t maxLines = (h / ch) > 0 ? (h / ch) : 1;

        // Split into words
        std::vector<String> words; words.reserve(256);
        String buf;
        for (size_t i = 0; i < transcriptBuf.length(); ++i) {
            char c = transcriptBuf[i];
            if (c == ' ' || c == '\n' || c == '\t') {
                if (buf.length()) { words.push_back(buf); buf = ""; }
                if (c == '\n') words.push_back("\n");
            } else {
                buf += c;
            }
        }
        if (buf.length()) words.push_back(buf);

        // Build wrapped lines
        std::vector<String> lines; lines.reserve(maxLines + 8);
        String line;
        for (const auto &wrd : words) {
            if (wrd == "\n") {
                lines.push_back(line); line = ""; continue;
            }
            int need = line.length() + (line.length() ? 1 : 0) + wrd.length();
            if (need > maxCharsPerLine) {
                lines.push_back(line); line = wrd;
            } else {
                if (line.length()) line += ' ';
                line += wrd;
            }
        }
        if (line.length()) lines.push_back(line);

        int start = (int)lines.size() - maxLines;
        if (start < 0) start = 0;
        int y = y0;
        for (size_t i = start; i < lines.size(); ++i) {
            display->setCursor(x0, y);
            display->print(lines[i]);
            y += ch;
        }
    }

    // Push to websocket clients as JSON
    DynamicJsonDocument doc(256);
    doc["type"] = "transcript";
    doc["text"] = text;
    String payload; serializeJson(doc, payload);
    websocket.textAll(payload);
}
#endif

void HeySaladCameraServer::loadSettings()
{
    settings.frameUploadEnabled = Config::LAURA_API.frame_upload_enabled;
    settings.frameUploadFormat = Config::LAURA_API.frame_upload_format;
    settings.frameUploadInterval = Config::LAURA_API.frame_upload_interval_s;
    settings.cameraId = Config::LAURA_API.camera_id;
    settings.cameraName = Config::LAURA_API.camera_name;
    settings.supabaseKey = Config::LAURA_API.supabase_key;
    settings.apiUrl = Config::LAURA_API.api_cameras_url;
    settings.storageUrl = Config::LAURA_API.storage_url;
    settings.locationId = Config::LAURA_API.current_location;
    settings.aiEnabled = Config::AI_CONFIG.enabled;
    settings.aiModelPath = Config::AI_CONFIG.default_model;

    if (preferences.begin("heysalad", true)) {
        settings.wifiSsid = preferences.getString("wifi_ssid", settings.wifiSsid);
        settings.wifiPassword = preferences.getString("wifi_password", settings.wifiPassword);
        settings.cameraId = preferences.getString("camera_id", settings.cameraId);
        settings.cameraName = preferences.getString("camera_name", settings.cameraName);
        settings.supabaseKey = preferences.getString("supabase_key", settings.supabaseKey);
        settings.cameraUuid = preferences.getString("camera_uuid", settings.cameraUuid);
        settings.apiUrl = preferences.getString("api_url", settings.apiUrl);
        settings.storageUrl = preferences.getString("storage_url", settings.storageUrl);
        settings.locationId = preferences.getString("location_id", settings.locationId);
        settings.frameUploadEnabled = preferences.getBool("frame_upload", settings.frameUploadEnabled);
        settings.frameUploadInterval = preferences.getFloat("frame_interval", settings.frameUploadInterval);
        settings.frameUploadFormat = preferences.getString("frame_format", settings.frameUploadFormat);
        settings.aiEnabled = preferences.getBool("ai_enabled", settings.aiEnabled);
        settings.aiModelPath = preferences.getString("ai_model", settings.aiModelPath);
        // Load STT settings (optional)
        settings.sttWsUrl = preferences.getString("stt_ws_url", settings.sttWsUrl.length() ? settings.sttWsUrl : String(Config::STT_WS_URL));
        settings.sttApiKey = preferences.getString("stt_api_key", "");
        settings.sttHandshake = preferences.getBool("stt_handshake", Config::STT_SEND_HANDSHAKE);
        settings.sttEnabled = preferences.getBool("stt_enabled", false);
        preferences.end();
    }

    settings.frameUploadInterval = std::max(1.0f, settings.frameUploadInterval);
    if (settings.aiModelPath.isEmpty()) {
        settings.aiModelPath = Config::AI_CONFIG.default_model;
    }
}

void HeySaladCameraServer::saveSettings()
{
    if (!preferences.begin("heysalad", false)) {
        return;
    }

    preferences.putString("wifi_ssid", settings.wifiSsid);
    preferences.putString("wifi_password", settings.wifiPassword);
    preferences.putString("camera_id", settings.cameraId);
    preferences.putString("camera_name", settings.cameraName);
    preferences.putString("supabase_key", settings.supabaseKey);
    preferences.putString("camera_uuid", settings.cameraUuid);
    preferences.putString("api_url", settings.apiUrl);
    preferences.putString("storage_url", settings.storageUrl);
    preferences.putString("location_id", settings.locationId);
    preferences.putBool("frame_upload", settings.frameUploadEnabled);
    preferences.putFloat("frame_interval", settings.frameUploadInterval);
    preferences.putString("frame_format", settings.frameUploadFormat);
    preferences.putBool("ai_enabled", settings.aiEnabled);
    preferences.putString("ai_model", settings.aiModelPath);
    // Persist STT settings
    preferences.putString("stt_ws_url", settings.sttWsUrl);
    if (settings.sttApiKey.length()) {
        preferences.putString("stt_api_key", settings.sttApiKey);
    }
    preferences.putBool("stt_handshake", settings.sttHandshake);
    preferences.putBool("stt_enabled", settings.sttEnabled);

    preferences.end();
}

void HeySaladCameraServer::initFilesystem()
{
    filesystemReady = SPIFFS.begin(true);
    if (!filesystemReady) {
        Serial.println(F("[FS] Failed to mount SPIFFS"));
    }
}

void HeySaladCameraServer::initDisplay()
{
    if (displayReady) {
        return;
    }

    displaySPI = new SPIClass(FSPI);
    displaySPI->begin(
        Config::DISPLAY_CONFIG.sck_pin,
        -1,
        Config::DISPLAY_CONFIG.mosi_pin,
        Config::DISPLAY_CONFIG.cs_pin);

    display = new Adafruit_GC9A01A(
        displaySPI,
        Config::DISPLAY_CONFIG.dc_pin,
        Config::DISPLAY_CONFIG.cs_pin,
        Config::DISPLAY_CONFIG.rst_pin);

    display->begin(60000000);

    if (Config::DISPLAY_CONFIG.bl_pin >= 0) {
        pinMode(Config::DISPLAY_CONFIG.bl_pin, OUTPUT);
        digitalWrite(Config::DISPLAY_CONFIG.bl_pin, HIGH);
    }

    display->fillScreen(0x0000);
    display->setTextColor(0xFFFF);
    display->setCursor(24, 110);
    display->setTextSize(2);
    display->println(F("HeySalad"));
    display->setCursor(10, 140);
    display->setTextSize(1);
    display->println(F("Initializing..."));

    displayReady = true;
}

void HeySaladCameraServer::initCamera()
{
    camera_config_t config{};
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_pwdn = Config::CAMERA_CONFIG.pwdn_pin;
    config.pin_reset = Config::CAMERA_CONFIG.reset_pin;
    config.pin_xclk = Config::CAMERA_CONFIG.xclk_pin;
    config.pin_sccb_sda = Config::CAMERA_CONFIG.siod_pin;
    config.pin_sccb_scl = Config::CAMERA_CONFIG.sioc_pin;
    config.pin_d7 = Config::CAMERA_CONFIG.data_pins[0];
    config.pin_d6 = Config::CAMERA_CONFIG.data_pins[1];
    config.pin_d5 = Config::CAMERA_CONFIG.data_pins[2];
    config.pin_d4 = Config::CAMERA_CONFIG.data_pins[3];
    config.pin_d3 = Config::CAMERA_CONFIG.data_pins[4];
    config.pin_d2 = Config::CAMERA_CONFIG.data_pins[5];
    config.pin_d1 = Config::CAMERA_CONFIG.data_pins[6];
    config.pin_d0 = Config::CAMERA_CONFIG.data_pins[7];
    config.pin_vsync = Config::CAMERA_CONFIG.vsync_pin;
    config.pin_href = Config::CAMERA_CONFIG.href_pin;
    config.pin_pclk = Config::CAMERA_CONFIG.pclk_pin;

    config.xclk_freq_hz = Config::CAMERA_CONFIG.xclk_freq_hz;
    config.pixel_format = Config::CAMERA_CONFIG.pixel_format;
    config.frame_size = Config::CAMERA_CONFIG.frame_size;
    config.jpeg_quality = 14;
    config.fb_count = Config::CAMERA_CONFIG.fb_count;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = Config::CAMERA_CONFIG.grab_mode;
    config.sccb_i2c_port = -1;

    if (config.pixel_format != PIXFORMAT_JPEG && config.pixel_format != PIXFORMAT_RGB565) {
        config.pixel_format = PIXFORMAT_JPEG;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[Camera] Initialization failed: 0x%x\n", static_cast<unsigned int>(err));
        cameraReady = false;
        setDisplayImage(Config::SHOCKED_IMAGE);
    } else {
        cameraReady = true;
        Serial.println(F("[Camera] Initialized"));
        setDisplayImage(Config::SPEEDY_IMAGE);
        if (cameraMutex == nullptr) {
            cameraMutex = xSemaphoreCreateMutex();
        }
    }
}

void HeySaladCameraServer::initGPIO()
{
    if (Config::GPIO_CONFIG.led_enabled && ledPin >= 0) {
        pinMode(ledPin, OUTPUT);
        digitalWrite(ledPin, LOW);
        ledState = false;
    }

    if (Config::GPIO_CONFIG.buzzer_enabled && buzzerPin >= 0) {
        ledcSetup(7, Config::GPIO_CONFIG.buzzer_frequency, 10);
        ledcAttachPin(buzzerPin, 7);
    }
}

void HeySaladCameraServer::initBLE()
{
    if (!Config::BLE_CONFIG.enabled) {
        Serial.println(F("[BLE] Disabled in configuration"));
        return;
    }

    NimBLEDevice::init(Config::BLE_CONFIG.device_name);
    NimBLEDevice::setSecurityAuth(BLE_SM_PAIR_AUTHREQ_BOND);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    bleServer = NimBLEDevice::createServer();
    NimBLEService* service = bleServer->createService(Config::BLE_CONFIG.service_uuid);

    bleTxChar = service->createCharacteristic(
        Config::BLE_CONFIG.tx_char_uuid,
        NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);

    bleRxChar = service->createCharacteristic(
        Config::BLE_CONFIG.rx_char_uuid,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    bleRxChar->setCallbacks(new BleRxCallbacks(*this));

    service->start();

    NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(service->getUUID());
    advertising->setScanResponse(true);
    advertising->start();

    bleReady = true;
    Serial.println(F("[BLE] Advertising started"));
}

void HeySaladCameraServer::setupServer()
{
    setupWebSocket();

    server.on("/login", HTTP_GET, [this](AsyncWebServerRequest* request) {
        if (auth.isAuthenticated(request)) {
            request->redirect("/");
            return;
        }
        sendLoginPage(request);
    });

    ArBodyHandlerFunction loginBodyHandler = [this](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t, size_t) {
        DynamicJsonDocument doc(256);
        DeserializationError err = deserializeJson(doc, data, len);
        if (err) {
            DynamicJsonDocument resp(64);
            resp["error"] = "invalid_json";
            String payload;
            serializeJson(resp, payload);
            request->send(400, "application/json", payload);
            return;
        }

        const char* password = doc["password"] | "";
        String token = auth.login(password);
        if (token.length() == 0) {
            DynamicJsonDocument resp(64);
            resp["error"] = "invalid_credentials";
            String payload;
            serializeJson(resp, payload);
            request->send(401, "application/json", payload);
            return;
        }

        DynamicJsonDocument resp(128);
        resp["token"] = token;
        String payload;
        serializeJson(resp, payload);

        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", payload);
        response->addHeader("Cache-Control", "no-store");
        attachSessionCookie(response, token);
        request->send(response);
    };

    server.on("/login", HTTP_POST, [this](AsyncWebServerRequest* request) {}, nullptr, loginBodyHandler);
    server.on("/api/login", HTTP_POST, [this](AsyncWebServerRequest* request) {}, nullptr, loginBodyHandler);

    auto logoutHandler = [this](AsyncWebServerRequest* request) {
        String token;
        if (request->hasHeader("Authorization")) {
            token = request->header("Authorization");
            token.trim();
            if (token.startsWith("Bearer ")) {
                token.remove(0, 7);
                token.trim();
            }
        }
        if (token.isEmpty() && request->hasHeader("Cookie")) {
            String cookie = request->header("Cookie");
            String needle = String(auth.sessionCookieName()) + "=";
            int startIdx = cookie.indexOf(needle);
            if (startIdx >= 0) {
                startIdx += needle.length();
                int endIdx = cookie.indexOf(";", startIdx);
                if (endIdx < 0) {
                    endIdx = cookie.length();
                }
                token = cookie.substring(startIdx, endIdx);
            } else {
                token.clear();
            }
        }

        if (!token.isEmpty()) {
            auth.logout(token);
        }

        DynamicJsonDocument resp(64);
        resp["success"] = true;
        String payload;
        serializeJson(resp, payload);

        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", payload);
        response->addHeader("Set-Cookie",
            String(auth.sessionCookieName()) + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
        request->send(response);
    };

    server.on("/logout", HTTP_POST, logoutHandler);
    server.on("/api/logout", HTTP_POST, logoutHandler);

    server.on("/", HTTP_GET, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request, true)) {
            return;
        }
        serveIndex(request);
    });

    server.on("/api/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        const size_t extra = lastAiDetections.size() * 96;
        DynamicJsonDocument doc(1024 + extra);
        fillStatusJson(doc);
        String payload;
        serializeJson(doc, payload);
        request->send(200, "application/json", payload);
    });

    server.on("/api/stream/start", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        setStreamingEnabled(true);
        auto* response = new AsyncJsonResponse(false);
        response->getRoot()["status"] = "streaming";
        response->setLength();
        request->send(response);
    });

    server.on("/api/stream/stop", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        setStreamingEnabled(false);
        auto* response = new AsyncJsonResponse(false);
        response->getRoot()["status"] = "stopped";
        response->setLength();
        request->send(response);
    });

    server.on("/api/peer/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        auto* response = new AsyncJsonResponse(false);
        JsonVariant obj = response->getRoot();
        obj["device_name"] = Config::DEVICE_PAIRING.device_name;
        obj["device_type"] = Config::DEVICE_PAIRING.device_type;
        obj["streaming"] = streamingEnabled;
        obj["laura_state"] = streamingEnabled ? "streaming" : "idle";
        obj["paired_count"] = websocket.count();
        response->setLength();
        request->send(response);
    });

    server.on("/api/ai/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleAiRestStatus(request);
    });

    auto aiEnableHandler = new AsyncCallbackJsonWebHandler("/api/ai/enable", [this](AsyncWebServerRequest* request, JsonVariant& json) {
        if (!ensureAuthenticated(request, true)) {
            return;
        }
        String model = settings.aiModelPath;
        if (json.is<JsonObject>() && json["model"].is<const char*>()) {
            model = json["model"].as<const char*>();
        }
        const bool ok = setAiEnabled(true, model);
        DynamicJsonDocument doc(256 + lastAiDetections.size() * 32);
        JsonObject root = doc.to<JsonObject>();
        root["success"] = ok;
        appendAiStatus(root);
        String payload;
        serializeJson(doc, payload);
        request->send(ok ? 200 : 500, "application/json", payload);
    });
    server.addHandler(aiEnableHandler);

    server.on("/api/ai/disable", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request, true)) {
            return;
        }
        const bool ok = setAiEnabled(false);
        DynamicJsonDocument doc(256);
        JsonObject root = doc.to<JsonObject>();
        root["success"] = ok;
        appendAiStatus(root);
        String payload;
        serializeJson(doc, payload);
        request->send(ok ? 200 : 500, "application/json", payload);
    });

    server.on("/api/ai/run", HTTP_POST, [this](AsyncWebServerRequest* request) {
        handleAiRunRequest(request);
    });

#if defined(HEYSALAD_AUDIO_ENABLE)
    if (Config::TEST_MODE) {
        server.on("/api/test/transcript", HTTP_GET, [this](AsyncWebServerRequest* request) {
            if (!ensureAuthenticated(request, true)) { return; }
            if (request->hasParam("text")) {
                String t = request->getParam("text")->value();
                onTranscriptText(t);
                request->send(200, "text/plain", "ok");
            } else {
                request->send(400, "text/plain", "missing text");
            }
        });
    }
    // Update STT config over HTTP (no secrets committed to code)
    server.on("/api/stt/config", HTTP_POST, [this](AsyncWebServerRequest* request){}, nullptr,
        [this](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t, size_t){
            if (!ensureAuthenticated(request, true)) return;
            DynamicJsonDocument doc(512);
            if (deserializeJson(doc, data, len)) {
                request->send(400, "application/json", "{\"error\":\"invalid_json\"}");
                return;
            }
            String url = doc["ws_url"].is<const char*>() ? String(doc["ws_url"].as<const char*>()) : settings.sttWsUrl;
            String key = doc["api_key"].is<const char*>() ? String(doc["api_key"].as<const char*>()) : settings.sttApiKey;
            bool handshake = doc["handshake"].is<bool>() ? doc["handshake"].as<bool>() : settings.sttHandshake;
            settings.sttWsUrl = url;
            settings.sttApiKey = key;
            settings.sttHandshake = handshake;
            saveSettings();
            g_transcriber.setConfig(settings.sttWsUrl, settings.sttApiKey, settings.sttHandshake);
            DynamicJsonDocument ok(128);
            ok["success"] = true;
            ok["ws_url"] = settings.sttWsUrl;
            ok["handshake"] = settings.sttHandshake;
            String payload; serializeJson(ok, payload);
            request->send(200, "application/json", payload);
        }
    );
    // Convenience: configure STT via GET query parameters
    server.on("/api/stt/config", HTTP_GET, [this](AsyncWebServerRequest* request){
        if (!ensureAuthenticated(request, true)) return;
        if (request->hasParam("ws_url")) settings.sttWsUrl = request->getParam("ws_url")->value();
        if (request->hasParam("api_key")) settings.sttApiKey = request->getParam("api_key")->value();
        if (request->hasParam("handshake")) settings.sttHandshake = request->getParam("handshake")->value() == "true";
        saveSettings();
        g_transcriber.setConfig(settings.sttWsUrl, settings.sttApiKey, settings.sttHandshake);
        DynamicJsonDocument ok(128);
        ok["success"] = true;
        ok["ws_url"] = settings.sttWsUrl;
        ok["handshake"] = settings.sttHandshake;
        String payload; serializeJson(ok, payload);
        request->send(200, "application/json", payload);
    });

    // Start/Stop STT streaming
    server.on("/api/stt/start", HTTP_POST, [this](AsyncWebServerRequest* request){
        if (!ensureAuthenticated(request, true)) return;
        settings.sttEnabled = true;
        saveSettings();
        g_transcriber.setEnabled(true);
        DynamicJsonDocument ok(128);
        ok["success"] = true;
        ok["enabled"] = true;
        String payload; serializeJson(ok, payload);
        request->send(200, "application/json", payload);
    });
    server.on("/api/stt/stop", HTTP_POST, [this](AsyncWebServerRequest* request){
        if (!ensureAuthenticated(request, true)) return;
        settings.sttEnabled = false;
        saveSettings();
        g_transcriber.setEnabled(false);
        DynamicJsonDocument ok(128);
        ok["success"] = true;
        ok["enabled"] = false;
        String payload; serializeJson(ok, payload);
        request->send(200, "application/json", payload);
    });
    server.on("/api/stt/status", HTTP_GET, [this](AsyncWebServerRequest* request){
        if (!ensureAuthenticated(request, true)) return;
        DynamicJsonDocument doc(128);
        doc["enabled"] = settings.sttEnabled;
        doc["connected"] = g_transcriber.isConnected();
        doc["ws_configured"] = settings.sttWsUrl.length() > 0;
        String payload; serializeJson(doc, payload);
        request->send(200, "application/json", payload);
    });
#endif

    // Serve static files from /assets/ directory
    server.on("/assets/*", HTTP_GET, [this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        String path = request->url();
        if (filesystemReady && SPIFFS.exists(path)) {
            String contentType = "text/plain";
            if (path.endsWith(".svg")) contentType = "image/svg+xml";
            else if (path.endsWith(".png")) contentType = "image/png";
            else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (path.endsWith(".ico")) contentType = "image/x-icon";
            request->send(SPIFFS, path, contentType);
        } else {
            request->send(404, "application/json", "{\"error\":\"file_not_found\"}");
        }
    });

    server.onNotFound([this](AsyncWebServerRequest* request) {
        if (!ensureAuthenticated(request)) {
            return;
        }
        request->send(404, "application/json", "{\"error\":\"not_found\"}");
    });

    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    server.begin();
}

void HeySaladCameraServer::setupWebSocket()
{
    websocket.onEvent([this](AsyncWebSocket* srv, AsyncWebSocketClient* client, AwsEventType type,
                              void* arg, uint8_t* data, size_t len) {
        handleWebSocketEvent(srv, client, type, arg, data, len);
    });
    websocket.handleHandshake([this](AsyncWebServerRequest* request) {
        if (auth.isAuthenticated(request)) {
            return true;
        }
        if (request->hasParam("token")) {
            String token = request->getParam("token")->value();
            if (auth.verifySession(token)) {
                return true;
            }
        }
        request->send(401, "text/plain", "Unauthorized");
        return false;
    });
    server.addHandler(&websocket);
}

void HeySaladCameraServer::attachSessionCookie(AsyncWebServerResponse* response, const String& token)
{
    String cookie = String(auth.sessionCookieName()) + "=" + token + "; Path=/; HttpOnly; SameSite=Strict";
    response->addHeader("Set-Cookie", cookie);
}

void HeySaladCameraServer::sendLoginPage(AsyncWebServerRequest* request)
{
    AsyncWebServerResponse* response = request->beginResponse(200, "text/html", Config::LOGIN_PAGE);
    response->addHeader("Cache-Control", "no-store");
    response->addHeader("Pragma", "no-cache");
    response->addHeader("Expires", "0");
    request->send(response);
}

bool HeySaladCameraServer::ensureAuthenticated(AsyncWebServerRequest* request, bool allowInlineLogin)
{
    if (auth.isAuthenticated(request)) {
        return true;
    }

    if (allowInlineLogin) {
        sendLoginPage(request);
    } else {
        DynamicJsonDocument doc(64);
        doc["error"] = "unauthorized";
        String payload;
        serializeJson(doc, payload);
        request->send(401, "application/json", payload);
    }
    return false;
}

void HeySaladCameraServer::serveIndex(AsyncWebServerRequest* request)
{
    if (filesystemReady && SPIFFS.exists("/index.html")) {
        request->send(SPIFFS, "/index.html", "text/html");
        return;
    }
    request->send(200, "text/html", Config::HTML_TEMPLATE);
}

void HeySaladCameraServer::initWiFi()
{
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(WIFI_PS_MIN_MODEM);

    if (!connectPreferredNetwork()) {
        startAccessPoint();
    } else {
        Serial.printf("[WiFi] Connected to %s (RSSI: %d dBm)\n", WiFi.SSID().c_str(), WiFi.RSSI());
        Serial.printf("[WiFi] IP address: %s\n", WiFi.localIP().toString().c_str());
        if (MDNS.begin("heysalad-cam")) {
            Serial.println(F("[mDNS] Service available at heysalad-cam.local"));
        }
    }
}

bool HeySaladCameraServer::connectPreferredNetwork()
{
    if (settings.wifiSsid.length() > 0) {
        Serial.printf("[WiFi] Trying stored network %s\n", settings.wifiSsid.c_str());
        if (connectStoredNetwork()) {
            return true;
        }
    }
    return connectConfiguredNetworks();
}

bool HeySaladCameraServer::connectStoredNetwork()
{
    if (settings.wifiSsid.isEmpty() || settings.wifiPassword.isEmpty()) {
        return false;
    }

    WiFi.begin(settings.wifiSsid.c_str(), settings.wifiPassword.c_str());
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
        delay(200);
        Serial.print('.');
    }
    Serial.println();
    return WiFi.status() == WL_CONNECTED;
}

bool HeySaladCameraServer::connectConfiguredNetworks()
{
    for (const auto& net : Config::WIFI_NETWORKS) {
        if (!net.ssid || !net.password) {
            continue;
        }

        Serial.printf("[WiFi] Trying %s ...\n", net.ssid);
        WiFi.begin(net.ssid, net.password);
        const unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
            delay(200);
            Serial.print('.');
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            settings.wifiSsid = net.ssid;
            settings.wifiPassword = net.password;
            saveSettings();
            return true;
        }
    }

    Serial.println(F("[WiFi] Failed to connect to known networks"));
    return false;
}

void HeySaladCameraServer::startAccessPoint()
{
    Serial.println(F("[WiFi] Starting access point mode"));

    WiFi.mode(WIFI_AP);
    const bool apStarted = WiFi.softAP(
        Config::AP_CONFIG.ssid,
        Config::AP_CONFIG.password,
        Config::AP_CONFIG.channel,
        false,
        Config::AP_CONFIG.max_connections);

    if (apStarted) {
        Serial.printf("[WiFi] AP started: %s (IP %s)\n", Config::AP_CONFIG.ssid, WiFi.softAPIP().toString().c_str());
        if (streamingEnabled) {
            drawIpOverlay();
        }
    } else {
        Serial.println(F("[WiFi] Failed to start Access Point"));
    }
}

void HeySaladCameraServer::initLaura()
{
    if (!Config::LAURA_API.enabled) {
        return;
    }

    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    laura.configure(
        settings.cameraId,
        settings.cameraName,
        settings.apiUrl,
        settings.storageUrl,
        settings.supabaseKey);
    laura.setLogger(&Serial);
    laura.init();

    const String ipAddr = WiFi.localIP().toString();
    const String streamUrl = "http://" + ipAddr + "/ws";
    laura.setStreamInfo(ipAddr, streamUrl);
    laura.setCameraUuid(settings.cameraUuid);

    if (!laura.ensureRegistered()) {
        Serial.println(F("[Laura] Registration failed"));
        lauraReady = false;
        return;
    }

    settings.cameraUuid = laura.getCameraUuid();
    saveSettings();
    lauraReady = true;
    Serial.println(F("[Laura] Ready"));
}

void HeySaladCameraServer::initAi()
{
    if (!settings.aiEnabled) {
        aiManager.end();
        return;
    }

    String path = settings.aiModelPath;
    if (!SPIFFS.exists(path)) {
        Serial.printf("[AI] Model not found: %s\n", path.c_str());
        if (path != Config::AI_CONFIG.default_model && SPIFFS.exists(Config::AI_CONFIG.default_model)) {
            Serial.println(F("[AI] Falling back to default model"));
            path = Config::AI_CONFIG.default_model;
            settings.aiModelPath = path;
            saveSettings();
        } else {
            settings.aiEnabled = false;
            saveSettings();
            return;
        }
    }

    if (!setAiEnabled(true, path)) {
        Serial.println(F("[AI] Failed to initialize runtime"));
    }
}

bool HeySaladCameraServer::setAiEnabled(bool enabled, const String& modelPathOverride)
{
    if (!filesystemReady) {
        Serial.println(F("[AI] Filesystem unavailable"));
        return false;
    }
    if (enabled) {
        String path = modelPathOverride.length() ? modelPathOverride : settings.aiModelPath;
        if (path.isEmpty()) {
            path = Config::AI_CONFIG.default_model;
        }
        if (!SPIFFS.exists(path)) {
            Serial.printf("[AI] Missing model file: %s\n", path.c_str());
            if (path != Config::AI_CONFIG.default_model && SPIFFS.exists(Config::AI_CONFIG.default_model)) {
                Serial.println(F("[AI] Falling back to default model"));
                path = Config::AI_CONFIG.default_model;
            } else {
                return false;
            }
        }
        if (!aiManager.begin(path.c_str(), Config::AI_CONFIG.score_threshold)) {
            return false;
        }
        settings.aiEnabled = true;
        settings.aiModelPath = path;
        saveSettings();
        Serial.println(F("[AI] Enabled"));
        sendJsonStatus();
        return true;
    }

    aiManager.end();
    settings.aiEnabled = false;
    saveSettings();
    Serial.println(F("[AI] Disabled"));
    lastAiDetections.clear();
    lastAiRun = 0;
    sendJsonStatus();
    return true;
}

bool HeySaladCameraServer::runAiSnapshot(std::vector<AiManager::Detection>& detections)
{
    detections.clear();
    if (!aiManager.isReady()) {
        return false;
    }
    if (!cameraMutex) {
        return false;
    }
    if (xSemaphoreTake(cameraMutex, pdMS_TO_TICKS(600)) != pdTRUE) {
        Serial.println(F("[AI] Camera busy"));
        return false;
    }
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        xSemaphoreGive(cameraMutex);
        Serial.println(F("[AI] Failed to capture frame"));
        return false;
    }
    const bool ok = aiManager.run(fb, detections);
    esp_camera_fb_return(fb);
    xSemaphoreGive(cameraMutex);
    return ok;
}

void HeySaladCameraServer::appendAiStatus(JsonObject& root) const
{
    JsonObject ai = root.createNestedObject("ai");
    ai["enabled"] = settings.aiEnabled;
    ai["model"] = settings.aiModelPath;
    ai["ready"] = aiManager.isReady();
    ai["last_run_ms"] = lastAiRun;

    JsonArray detections = ai.createNestedArray("detections");
    for (const auto& det : lastAiDetections) {
        JsonObject obj = detections.createNestedObject();
        obj["label"] = det.label;
        obj["score"] = det.score;
        obj["x"] = det.x;
        obj["y"] = det.y;
        obj["w"] = det.w;
        obj["h"] = det.h;
    }
}

void HeySaladCameraServer::broadcastAiStatus()
{
    const size_t extra = lastAiDetections.size() * 96;
    DynamicJsonDocument doc(512 + extra);
    JsonObject root = doc.to<JsonObject>();
    root["type"] = "ai_update";
    appendAiStatus(root);
    String payload;
    serializeJson(doc, payload);
    websocket.textAll(payload);
    notifyBLE(payload);
}

void HeySaladCameraServer::updateStreaming()
{
    if (!streamingEnabled || !cameraReady) {
        return;
    }

    if (websocket.count() == 0) {
        return;
    }

    const uint32_t intervalMs = static_cast<uint32_t>(Config::STREAMING_CONFIG.frame_interval_s * 1000.0f);
    const unsigned long now = millis();
    if (now - lastFrameMs < intervalMs) {
        return;
    }

    if (!cameraMutex || xSemaphoreTake(cameraMutex, pdMS_TO_TICKS(5)) != pdTRUE) {
        return;
    }
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        xSemaphoreGive(cameraMutex);
        Serial.println(F("[Camera] Failed to grab frame"));
        return;
    }

    if (!websocket.availableForWriteAll()) {
        esp_camera_fb_return(fb);
        xSemaphoreGive(cameraMutex);
        return;
    }

    websocket.binaryAll(fb->buf, fb->len);
    esp_camera_fb_return(fb);
    xSemaphoreGive(cameraMutex);

    framesSent++;
    if (now != lastFrameMs) {
        fps = 1000.0f / static_cast<float>(now - lastFrameMs);
    }
    lastFrameMs = now;
}

void HeySaladCameraServer::maintainWiFi()
{
    const unsigned long now = millis();

    if (wifiReconnectPending && now - wifiReconnectRequestAt > 500) {
        wifiReconnectPending = false;
        Serial.println(F("[WiFi] Applying pending reconnect"));
        WiFi.disconnect(true);
        delay(100);
        if (!connectPreferredNetwork()) {
            startAccessPoint();
        } else {
            Serial.printf("[WiFi] Connected to %s (RSSI: %d dBm)\n", WiFi.SSID().c_str(), WiFi.RSSI());
            Serial.printf("[WiFi] IP address: %s\n", WiFi.localIP().toString().c_str());
            if (streamingEnabled) {
                drawIpOverlay();
            }
        }
        initLaura();
    }

    if (now - lastWifiCheck < WIFI_RETRY_INTERVAL_MS) {
        return;
    }
    lastWifiCheck = now;

    if (WiFi.getMode() == WIFI_AP) {
        return;
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println(F("[WiFi] Connection lost, retrying"));
        if (!connectPreferredNetwork()) {
            startAccessPoint();
            lauraReady = false;
        } else {
            Serial.printf("[WiFi] Connected to %s (RSSI: %d dBm)\n", WiFi.SSID().c_str(), WiFi.RSSI());
            Serial.printf("[WiFi] IP address: %s\n", WiFi.localIP().toString().c_str());
            if (streamingEnabled) {
                drawIpOverlay();
            }
            initLaura();
        }
    } else if (!lauraReady && Config::LAURA_API.enabled) {
        initLaura();
    }
}

void HeySaladCameraServer::updateLaura()
{
    if (!Config::LAURA_API.enabled || !lauraReady) {
        return;
    }

    const unsigned long now = millis();

    const bool throttleStatus = streamingEnabled && websocket.count() > 0;
    const uint32_t statusInterval = throttleStatus ? LAURA_STATUS_INTERVAL_MS * 2 : LAURA_STATUS_INTERVAL_MS;

    if (now - lastLauraStatus >= statusInterval) {
        DynamicJsonDocument doc(512);
        fillStatusJson(doc);
        doc["status"] = streamingEnabled ? "busy" : "online";
        doc["operating_state"] = streamingEnabled ? "streaming" : "idle";
        doc["wifi_signal"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
        doc["streaming"] = streamingEnabled;
        doc["camera_ready"] = cameraReady;
        doc["network"]["mode"] = WiFi.getMode() == WIFI_AP ? "ap" : "sta";
        doc["network"]["ip"] = WiFi.localIP().toString();
        doc["network"]["ssid"] = WiFi.SSID();
        laura.sendStatus(doc);
        lastLauraStatus = now;
    }

    if (now - lastLauraCommandPoll >= LAURA_COMMAND_POLL_INTERVAL_MS) {
        DynamicJsonDocument commandDoc(2048);
        if (laura.pollCommands(commandDoc) && commandDoc["commands"].is<JsonArray>()) {
            for (JsonVariantConst command : commandDoc["commands"].as<JsonArray>()) {
                handleLauraCommand(command);
            }
        }
        lastLauraCommandPoll = now;
    }

    if (settings.frameUploadEnabled && streamingEnabled && cameraReady) {
        const uint32_t interval = static_cast<uint32_t>(settings.frameUploadInterval * 1000.0f);
        if (interval > 0 && now - lastLauraFrameUpload >= interval) {
            camera_fb_t* fb = esp_camera_fb_get();
            if (fb) {
                laura.uploadFrame(fb->buf, fb->len, settings.frameUploadFormat);
                esp_camera_fb_return(fb);
            }
            lastLauraFrameUpload = now;
        }
    }
}

void HeySaladCameraServer::handleWebSocketEvent(AsyncWebSocket* srv, AsyncWebSocketClient* client,
                                                AwsEventType type, void* arg, uint8_t* data, size_t len)
{
    switch (type) {
    case WS_EVT_CONNECT: {
        Serial.printf("[WebSocket] Client %u connected (%u total)\n", client->id(), websocket.count());
        if (websocket.count() > Config::STREAMING_CONFIG.max_websocket_clients) {
            Serial.println(F("[WebSocket] Max clients reached, closing connection"));
            client->close(1008, "Too many clients");
            return;
        }
        sendJsonStatus(client);
        break;
    }
    case WS_EVT_DISCONNECT:
        Serial.printf("[WebSocket] Client %u disconnected\n", client->id());
        break;
    case WS_EVT_DATA: {
        auto* info = reinterpret_cast<AwsFrameInfo*>(arg);
        if (!info || info->opcode != WS_TEXT || !info->final || info->index != 0) {
            break;
        }
        String message = String(reinterpret_cast<const char*>(data), len);
        handleControlMessage(message, client);
        break;
    }
    default:
        break;
    }
}

void HeySaladCameraServer::handleControlMessage(const String& message, AsyncWebSocketClient* origin)
{
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, message);

    auto sendStatusToOrigin = [this, origin]() {
        if (origin) {
            origin->text(buildStatusPayload());
        } else {
            sendJsonStatus();
        }
    };

    if (err) {
        if (message == "start_stream" || message == "start_video") {
            setStreamingEnabled(true);
            sendStatusToOrigin();
        } else if (message == "stop_stream" || message == "stop_video") {
            setStreamingEnabled(false);
            sendStatusToOrigin();
        }
        return;
    }

    const char* command = doc["command"] | doc["type"] | "";
    if (strlen(command) == 0) {
        return;
    }

    const String cmd = String(command);
    if (cmd.equalsIgnoreCase("start_stream") || cmd.equalsIgnoreCase("start_video")) {
        setStreamingEnabled(true);
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("stop_stream") || cmd.equalsIgnoreCase("stop_video")) {
        setStreamingEnabled(false);
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("toggle_led")) {
        setLedState(!ledState);
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("led_on")) {
        setLedState(true);
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("led_off")) {
        setLedState(false);
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("get_status")) {
        sendStatusToOrigin();
    } else if (cmd.equalsIgnoreCase("ai_enable")) {
        const char* modelPath = doc["model"] | settings.aiModelPath.c_str();
        if (setAiEnabled(true, modelPath)) {
            sendStatusToOrigin();
        } else if (origin) {
            origin->text("{\"error\":\"ai_enable_failed\"}");
        }
    } else if (cmd.equalsIgnoreCase("ai_disable")) {
        if (setAiEnabled(false)) {
            sendStatusToOrigin();
        } else if (origin) {
            origin->text("{\"error\":\"ai_disable_failed\"}");
        }
    } else if (cmd.equalsIgnoreCase("ai_run") || cmd.equalsIgnoreCase("ai_snapshot")) {
        std::vector<AiManager::Detection> detections;
        if (runAiSnapshot(detections)) {
            lastAiDetections = detections;
            lastAiRun = millis();
            broadcastAiStatus();
            sendStatusToOrigin();
        } else if (origin) {
            origin->text("{\"error\":\"ai_inference_failed\"}");
        }
    }
}

void HeySaladCameraServer::setStreamingEnabled(bool enabled, bool updateDisplay)
{
    streamingEnabled = enabled;
    if (updateDisplay) {
        setDisplayImage(enabled ? Config::SPEEDY_IMAGE : Config::STANDARD_IMAGE);
        if (enabled) {
            drawIpOverlay();
        }
    }
    sendJsonStatus();
    if (lauraReady) {
        DynamicJsonDocument doc(512);
        fillStatusJson(doc);
        doc["status"] = enabled ? "busy" : "online";
        doc["operating_state"] = enabled ? "streaming" : "idle";
        doc["streaming"] = enabled;
        doc["wifi_signal"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
        laura.sendStatus(doc);
    }
}

void HeySaladCameraServer::setLedState(bool enabled)
{
    if (!Config::GPIO_CONFIG.led_enabled || ledPin < 0) {
        return;
    }
    ledState = enabled;
    digitalWrite(ledPin, ledState ? HIGH : LOW);
}

void HeySaladCameraServer::handleAiRestStatus(AsyncWebServerRequest* request)
{
    if (!ensureAuthenticated(request, true)) {
        return;
    }
    const size_t extra = lastAiDetections.size() * 96;
    DynamicJsonDocument doc(512 + extra);
    JsonObject root = doc.to<JsonObject>();
    appendAiStatus(root);
    String payload;
    serializeJson(doc, payload);
    request->send(200, "application/json", payload);
}

void HeySaladCameraServer::handleAiRunRequest(AsyncWebServerRequest* request)
{
    if (!ensureAuthenticated(request, true)) {
        return;
    }
    if (!settings.aiEnabled || !aiManager.isReady()) {
        request->send(409, "application/json", "{\"error\":\"ai_disabled\"}");
        return;
    }
    std::vector<AiManager::Detection> detections;
    if (!runAiSnapshot(detections)) {
        request->send(500, "application/json", "{\"error\":\"ai_inference_failed\"}");
        return;
    }
    lastAiDetections = detections;
    lastAiRun = millis();
    broadcastAiStatus();

    const size_t extra = detections.size() * 96;
    DynamicJsonDocument doc(512 + extra);
    JsonObject root = doc.to<JsonObject>();
    appendAiStatus(root);
    String payload;
    serializeJson(doc, payload);
    request->send(200, "application/json", payload);
}

void HeySaladCameraServer::sendJsonStatus(AsyncWebSocketClient* client)
{
    String payload = buildStatusPayload();
    if (client) {
        client->text(payload);
    } else {
        websocket.textAll(payload);
    }
    notifyBLE(payload);
}

String HeySaladCameraServer::buildStatusPayload() const
{
    const size_t extra = lastAiDetections.size() * 96;
    DynamicJsonDocument doc(768 + extra);
    fillStatusJson(doc);
    String payload;
    serializeJson(doc, payload);
    return payload;
}

void HeySaladCameraServer::fillStatusJson(JsonDocument& doc) const
{
    doc["version"] = Config::VERSION;
    doc["streaming"] = streamingEnabled;
    doc["operating_state"] = streamingEnabled ? "streaming" : "idle";
    doc["camera_ready"] = cameraReady;
    doc["display_ready"] = displayReady;
    doc["fps"] = fps;
    doc["frames_sent"] = framesSent;
    doc["uptime"] = millis() / 1000;
    doc["heap_free"] = ESP.getFreeHeap();
    doc["led"] = ledState;

    JsonObject network = doc.createNestedObject("network");
    if (WiFi.getMode() == WIFI_AP) {
        network["mode"] = "ap";
        network["ssid"] = Config::AP_CONFIG.ssid;
        network["ip"] = WiFi.softAPIP().toString();
    } else {
        network["mode"] = WiFi.status() == WL_CONNECTED ? "sta" : "disconnected";
        network["ssid"] = WiFi.SSID();
        network["ip"] = WiFi.localIP().toString();
        network["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    }

    JsonObject lauraJson = doc.createNestedObject("laura");
    lauraJson["enabled"] = Config::LAURA_API.enabled;
    lauraJson["ready"] = lauraReady;
    lauraJson["camera_uuid"] = settings.cameraUuid;

    const auto* location = findLocation(settings.locationId);
    if (location) {
        JsonObject loc = doc.createNestedObject("location");
        loc["id"] = location->id;
        loc["name"] = location->name;
        loc["lat"] = location->lat;
        loc["lon"] = location->lon;
    }

    JsonObject root = doc.as<JsonObject>();
    appendAiStatus(root);

#if defined(HEYSALAD_AUDIO_ENABLE)
    JsonObject stt = doc.createNestedObject("stt");
    stt["enabled"] = settings.sttEnabled;
    stt["connected"] = g_transcriber.isConnected();
    stt["ws_configured"] = settings.sttWsUrl.length() > 0;
#endif

}

const Config::SavedLocation* HeySaladCameraServer::findLocation(const String& id) const
{
    if (id.length() == 0) {
        return &Config::SAVED_LOCATIONS[0];
    }
    for (const auto& location : Config::SAVED_LOCATIONS) {
        if (id.equalsIgnoreCase(location.id)) {
            return &location;
        }
    }
    return &Config::SAVED_LOCATIONS[0];
}

void HeySaladCameraServer::notifyBLE(const String& payload)
{
    if (!bleReady || bleTxChar == nullptr) {
        return;
    }
    if (bleTxChar->getSubscribedCount() == 0) {
        return;
    }

    const size_t total = payload.length();
    const uint8_t* data = reinterpret_cast<const uint8_t*>(payload.c_str());
    for (size_t offset = 0; offset < total; offset += BLE_CHUNK_SIZE) {
        const size_t chunk = std::min(BLE_CHUNK_SIZE, total - offset);
        bleTxChar->setValue(data + offset, chunk);
        bleTxChar->notify();
        delay(BLE_CHUNK_DELAY_MS);
    }
}

void HeySaladCameraServer::handleLauraCommand(const JsonVariantConst& command)
{
    const char* id = command["id"] | "";
    const char* type = command["type"] | command["command"] | "";
    const JsonVariantConst params = command["params"];

    if (strlen(type) == 0 || strlen(id) == 0) {
        return;
    }

    const String typeStr = String(type);

    auto acknowledge = [this, &id](const char* status, const JsonVariantConst& result) {
        laura.acknowledgeCommand(id, status, result);
    };

    if (typeStr.equalsIgnoreCase("start_video") || typeStr.equalsIgnoreCase("start_stream")) {
        setStreamingEnabled(true);
        DynamicJsonDocument doc(64);
        doc["streaming"] = true;
        acknowledge("completed", doc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("stop_video") || typeStr.equalsIgnoreCase("stop_stream")) {
        setStreamingEnabled(false);
        DynamicJsonDocument doc(64);
        doc["streaming"] = false;
        acknowledge("completed", doc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("ai_enable")) {
        const char* model = (params && params["model"].is<const char*>()) ? params["model"].as<const char*>() : nullptr;
        const bool ok = setAiEnabled(true, model ? String(model) : String());
        DynamicJsonDocument doc(256);
        JsonObject root = doc.to<JsonObject>();
        root["success"] = ok;
        appendAiStatus(root);
        acknowledge(ok ? "completed" : "failed", doc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("ai_disable")) {
        const bool ok = setAiEnabled(false);
        DynamicJsonDocument doc(256);
        JsonObject root = doc.to<JsonObject>();
        root["success"] = ok;
        appendAiStatus(root);
        acknowledge(ok ? "completed" : "failed", doc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("ai_run") || typeStr.equalsIgnoreCase("ai_snapshot")) {
        std::vector<AiManager::Detection> detections;
        DynamicJsonDocument doc(512 + lastAiDetections.size() * 96);
        if (runAiSnapshot(detections)) {
            lastAiDetections = detections;
            lastAiRun = millis();
            broadcastAiStatus();
            JsonObject root = doc.to<JsonObject>();
            appendAiStatus(root);
            acknowledge("completed", doc.as<JsonVariant>());
        } else {
            doc["error"] = "ai_inference_failed";
            acknowledge("failed", doc.as<JsonVariant>());
        }
    } else if (typeStr.equalsIgnoreCase("take_photo") || typeStr.equalsIgnoreCase("capture_photo")) {
        if (!cameraReady) {
            DynamicJsonDocument errDoc(128);
            errDoc["error"] = "camera_not_ready";
            acknowledge("failed", errDoc.as<JsonVariant>());
            return;
        }
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
            DynamicJsonDocument errDoc(128);
            errDoc["error"] = "capture_failed";
            acknowledge("failed", errDoc.as<JsonVariant>());
            return;
        }
        String url;
        const bool uploaded = laura.uploadPhoto(fb->buf, fb->len, url, id);
        esp_camera_fb_return(fb);
        if (uploaded) {
            DynamicJsonDocument okDoc(256);
            okDoc["photo_url"] = url;
            acknowledge("completed", okDoc.as<JsonVariant>());
        } else {
            DynamicJsonDocument errDoc(128);
            errDoc["error"] = "upload_failed";
            acknowledge("failed", errDoc.as<JsonVariant>());
        }
    } else if (typeStr.equalsIgnoreCase("change_location")) {
        if (!params.is<JsonObject>() || !params["location_id"].is<const char*>()) {
            DynamicJsonDocument errDoc(128);
            errDoc["error"] = "missing_location_id";
            acknowledge("failed", errDoc.as<JsonVariant>());
            return;
        }
        settings.locationId = params["location_id"].as<const char*>();
        saveSettings();
        const auto* location = findLocation(settings.locationId);
        DynamicJsonDocument okDoc(256);
        okDoc["location"] = location->name;
        okDoc["lat"] = location->lat;
        okDoc["lon"] = location->lon;
        acknowledge("completed", okDoc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("get_status")) {
        DynamicJsonDocument statusDoc(512);
        fillStatusJson(statusDoc);
        acknowledge("completed", statusDoc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("led_on")) {
        setLedState(true);
        DynamicJsonDocument okDoc(64);
        okDoc["led_state"] = true;
        acknowledge("completed", okDoc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("led_off")) {
        setLedState(false);
        DynamicJsonDocument okDoc(64);
        okDoc["led_state"] = false;
        acknowledge("completed", okDoc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("update_settings")) {
        if (!params.is<JsonObject>()) {
            DynamicJsonDocument errDoc(128);
            errDoc["error"] = "no_params";
            acknowledge("failed", errDoc.as<JsonVariant>());
            return;
        }
        bool updatedCamera = false;
        bool wifiChanged = false;
        bool authChanged = false;

        if (params["wifi_ssid"].is<const char*>()) {
            settings.wifiSsid = params["wifi_ssid"].as<const char*>();
            wifiChanged = true;
        }
        if (params["wifi_password"].is<const char*>()) {
            settings.wifiPassword = params["wifi_password"].as<const char*>();
            wifiChanged = true;
        }
        if (params["camera_id"].is<const char*>()) {
            settings.cameraId = params["camera_id"].as<const char*>();
            updatedCamera = true;
        }
        if (params["camera_name"].is<const char*>()) {
            settings.cameraName = params["camera_name"].as<const char*>();
        }
        if (params["supabase_key"].is<const char*>()) {
            settings.supabaseKey = params["supabase_key"].as<const char*>();
        }
        if (params["auth_password"].is<JsonObjectConst>()) {
            JsonObjectConst passwd = params["auth_password"].as<JsonObjectConst>();
            const char* oldPassword = passwd["old"] | "";
            const char* newPassword = passwd["new"] | "";
            if (strlen(oldPassword) > 0 && strlen(newPassword) >= 6) {
                authChanged = auth.changePassword(oldPassword, newPassword);
            }
        }
        if (params["location_id"].is<const char*>()) {
            settings.locationId = params["location_id"].as<const char*>();
        }
        if (params["frame_upload_enabled"].is<bool>()) {
            settings.frameUploadEnabled = params["frame_upload_enabled"].as<bool>();
        }
        if (params["frame_upload_interval"].is<float>()) {
            settings.frameUploadInterval = std::max(1.0f, params["frame_upload_interval"].as<float>());
        }
        if (params["frame_upload_format"].is<const char*>()) {
            settings.frameUploadFormat = params["frame_upload_format"].as<const char*>();
        }

        saveSettings();

        if (wifiChanged) {
            wifiReconnectPending = true;
            wifiReconnectRequestAt = millis();
        }
        if (updatedCamera) {
            settings.cameraUuid = "";
            lauraReady = false;
        }
        if (authChanged) {
            Serial.println(F("[Auth] Updated HTTP credentials"));
        }

        DynamicJsonDocument okDoc(256);
        okDoc["wifi_changed"] = wifiChanged;
        okDoc["camera_updated"] = updatedCamera;
        okDoc["auth_updated"] = authChanged;
        acknowledge("completed", okDoc.as<JsonVariant>());
    } else if (typeStr.equalsIgnoreCase("reboot")) {
        DynamicJsonDocument okDoc(128);
        okDoc["message"] = "Device rebooting";
        acknowledge("completed", okDoc.as<JsonVariant>());
        pendingRestart = true;
        restartRequestedAt = millis();
    } else {
        DynamicJsonDocument errDoc(128);
        errDoc["error"] = String("unknown_command: ") + typeStr;
        acknowledge("failed", errDoc.as<JsonVariant>());
    }
}

void HeySaladCameraServer::setDisplayImage(const char* path)
{
    if (!displayReady) {
        return;
    }

    uint16_t fallbackColor = display->color565(0x1F, 0x1F, 0x3F);
    if (path == Config::SPEEDY_IMAGE) {
        fallbackColor = display->color565(0x1F, 0x3F, 0x00);
    } else if (path == Config::SHOCKED_IMAGE) {
        fallbackColor = display->color565(0x3F, 0x00, 0x00);
    }

    if (path == nullptr || !drawRgb565Asset(path)) {
        drawPlaceholderColor(fallbackColor);
    }
}

void HeySaladCameraServer::drawPlaceholderColor(uint16_t color565)
{
    if (!displayReady) {
        return;
    }
    display->fillScreen(color565);
    display->setTextColor(GC9A01A_WHITE, color565);
    display->setCursor(20, 110);
    display->setTextSize(2);
    display->println(streamingEnabled ? F("Streaming") : F("Idle"));
}

bool HeySaladCameraServer::drawRgb565Asset(const char* path)
{
    if (!filesystemReady) {
        Serial.println(F("[Display] SPIFFS not mounted; cannot load image"));
        return false;
    }

    if (path == nullptr || path[0] == '\0') {
        Serial.println(F("[Display] No image path provided"));
        return false;
    }

    File file = SPIFFS.open(path, "r");
    if (!file) {
        Serial.printf("[Display] Failed to open %s\n", path);
        return false;
    }

    const size_t pixelCount = static_cast<size_t>(Config::DISPLAY_CONFIG.width) *
                              static_cast<size_t>(Config::DISPLAY_CONFIG.height);
    const size_t expectedBytes = pixelCount * sizeof(uint16_t);

    const size_t fileSize = static_cast<size_t>(file.size());
    if (fileSize > 0 && fileSize != expectedBytes) {
        Serial.printf("[Display] Unexpected size for %s: %u bytes (expected %u)\n",
                      path,
                      static_cast<unsigned>(fileSize),
                      static_cast<unsigned>(expectedBytes));
        if (fileSize < expectedBytes) {
            file.close();
            return false;
        }
    }

    if (displayFramebuffer.size() != pixelCount) {
        displayFramebuffer.resize(pixelCount);
    }

    uint8_t* raw = reinterpret_cast<uint8_t*>(displayFramebuffer.data());
    size_t offset = 0;
    while (offset < expectedBytes) {
        const size_t chunk = file.read(raw + offset, expectedBytes - offset);
        if (chunk == 0) {
            break;
        }
        offset += chunk;
    }
    file.close();

    if (offset != expectedBytes) {
        Serial.printf("[Display] Incomplete read for %s (%u/%u bytes)\n",
                      path,
                      static_cast<unsigned>(offset),
                      static_cast<unsigned>(expectedBytes));
        return false;
    }

    display->startWrite();
    display->setAddrWindow(0, 0, Config::DISPLAY_CONFIG.width, Config::DISPLAY_CONFIG.height);
    display->writePixels(displayFramebuffer.data(), static_cast<uint32_t>(displayFramebuffer.size()));
    display->endWrite();
    return true;
}

void HeySaladCameraServer::drawIpOverlay()
{
    if (!displayReady || display == nullptr) {
        return;
    }
    String ip = (WiFi.getMode() == WIFI_AP) ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
    const int16_t w = Config::DISPLAY_CONFIG.width;
    const int16_t h = Config::DISPLAY_CONFIG.height;
    const int16_t barH = 18;
    display->fillRect(0, h - barH, w, barH, display->color565(0, 0, 0));
    display->setTextColor(GC9A01A_WHITE, display->color565(0, 0, 0));
    display->setTextSize(1);
    display->setCursor(6, h - barH + 4);
    display->print(F("IP: "));
    display->print(ip);
}

}  // namespace

HeySaladCameraServer serverInstance;

void setup()
{
    Serial.begin(115200);
    delay(200);
    serverInstance.begin();
}

void loop()
{
    serverInstance.loop();
}
