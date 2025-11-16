#pragma once

#include <array>
#include <cstdint>
#include <Arduino.h>
#include <esp_camera.h>

namespace Config {

enum class State : uint8_t {
    Idle = 0,
    Streaming = 1,
    Error = 2
};

constexpr const char* VERSION = "1.0.0";

constexpr const char* STANDARD_IMAGE = "/assets/HSK-STANDARD.rgb565";
constexpr const char* SPEEDY_IMAGE = "/assets/HSK-SPEEDY.rgb565";
constexpr const char* SHOCKED_IMAGE = "/assets/HSK-SHOCKED.rgb565";

struct WifiNetwork {
    const char* ssid;
    const char* password;
};

constexpr std::array<WifiNetwork, 3> WIFI_NETWORKS{{
    {"YOUR_WIFI_SSID_1", "YOUR_WIFI_PASSWORD_1"},
    {"YOUR_WIFI_SSID_2", "YOUR_WIFI_PASSWORD_2"},
    {"YOUR_WIFI_SSID_3", "YOUR_WIFI_PASSWORD_3"}
}};

struct AccessPointConfig {
    const char* ssid;
    const char* password;
    uint8_t channel;
    uint8_t max_connections;
};

constexpr AccessPointConfig AP_CONFIG{
    "HeySalad-Camera",
    "SET_ME_AP_PASSWORD",
    6,
    4
};

constexpr const char* DEFAULT_AUTH_PASSWORD = "change-me";

struct BleConfig {
    bool enabled;
    const char* device_name;
    const char* service_uuid;
    const char* rx_char_uuid;
    const char* tx_char_uuid;
};

constexpr BleConfig BLE_CONFIG{
    true,
    "HeySalad-Cam",
    "6E400001-B5A3-F393-E0A9-E50E24DCCA9E",
    "6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
    "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
};

struct CameraConfig {
    int data_pins[8];
    int xclk_pin;
    int pclk_pin;
    int vsync_pin;
    int href_pin;
    int siod_pin;
    int sioc_pin;
    int pwdn_pin;
    int reset_pin;
    uint32_t xclk_freq_hz;
    framesize_t frame_size;
    pixformat_t pixel_format;
    uint8_t fb_count;
    camera_grab_mode_t grab_mode;
};

constexpr CameraConfig CAMERA_CONFIG{
    {48, 11, 12, 14, 16, 18, 17, 15},  // Y9..Y2
    10,                                // XCLK
    13,                                // PCLK
    38,                                // VSYNC
    47,                                // HREF
    40,                                // SIOD
    39,                                // SIOC
    -1,                                // PWDN (not used)
    -1,                                // RESET (not used)
    20000000,
    FRAMESIZE_240X240,
    PIXFORMAT_JPEG,
    2,
    CAMERA_GRAB_WHEN_EMPTY
};

struct DisplayConfig {
    uint16_t width;
    uint16_t height;
    int dc_pin;
    int cs_pin;
    int rst_pin;
    int bl_pin;
    int sck_pin;
    int mosi_pin;
};

constexpr DisplayConfig DISPLAY_CONFIG{
    240,
    240,
    4,     // D3
    2,     // D1
    -1,    // Not connected
    45,    // Backlight
    SCK,
    MOSI
};

struct GpioConfig {
    int led_pin;
    int buzzer_pin;
    bool led_enabled;
    bool buzzer_enabled;
    uint16_t buzzer_frequency;
    uint16_t buzzer_duration_ms;
};

constexpr GpioConfig GPIO_CONFIG{
    3,      // D2
    5,      // D4
    true,
    false,
    2000,
    500
};

struct StreamingConfig {
    float frame_interval_s;
    size_t max_websocket_clients;
    uint8_t max_retries;
};

constexpr StreamingConfig STREAMING_CONFIG{
    0.1f,
    5,
    3
};

struct AiConfig {
    bool enabled;
    const char* default_model;
    float score_threshold;
};

constexpr AiConfig AI_CONFIG{
    false,
    "/models/strawberry_yolo_int8.tflite",
    0.5f
};

struct DevicePairingConfig {
    bool enabled;
    const char* device_type;
    const char* device_name;
    const char* mdns_service;
    uint16_t discovery_port;
    bool pair_on_discover;
    const char* shared_secret;
};

constexpr DevicePairingConfig DEVICE_PAIRING{
    true,
    "camera_display",
    "HeySalad-Display",
    "_heysalad._tcp",
    5353,
    false,
    "SET_ME_DEVICE_SECRET"
};

struct PeerApiConfig {
    bool enabled;
};

constexpr PeerApiConfig PEER_API_CONFIG{true};

struct LauraApiConfig {
    bool enabled;
    const char* camera_id;
    const char* camera_name;
    const char* api_cameras_url;
    const char* storage_url;
    const char* supabase_key;
    bool auto_register;
    uint32_t status_interval_s;
    uint32_t command_poll_interval_s;
    bool frame_upload_enabled;
    float frame_upload_interval_s;
    const char* frame_upload_format;
    const char* current_location;
};

constexpr LauraApiConfig LAURA_API{
    false,
    "",
    "",
    "",
    "",
    "",
    false,
    300,
    30,
    false,
    10.0f,
    "binary",
    ""
};

struct SavedLocation {
    const char* id;
    const char* name;
    const char* description;
    double lat;
    double lon;
    const char* neighborhood;
    const char* district;
};

constexpr std::array<SavedLocation, 5> SAVED_LOCATIONS{{
    {"charlottenburg", "Berlin Charlottenburg - Savignyplatz", "Upscale area near Kurfürstendamm", 52.5050, 13.3117, "Charlottenburg", "Charlottenburg-Wilmersdorf"},
    {"grunewald", "Berlin Grunewald - Königsallee", "Exclusive forest villa district", 52.4872, 13.2614, "Grunewald", "Charlottenburg-Wilmersdorf"},
    {"prenzlauer_berg", "Berlin Prenzlauer Berg - Kollwitzplatz", "Trendy neighborhood with cafes", 52.5324, 13.4125, "Prenzlauer Berg", "Pankow"},
    {"mitte_gendarmenmarkt", "Berlin Mitte - Gendarmenmarkt", "Historic center, premium location", 52.5139, 13.3925, "Mitte", "Mitte"},
    {"zehlendorf", "Berlin Zehlendorf - Onkel-Tom-Straße", "Quiet residential area, embassy quarter nearby", 52.4491, 13.2594, "Zehlendorf", "Steglitz-Zehlendorf"}
}};

// --------------
// Audio + Transcription (ESP32-S3)
// --------------

struct MicConfig {
    bool enabled;              // enable PDM mic capture
    int clk_pin;               // PDM clock (WS)
    int data_pin;              // PDM data-in (DIN)
    uint32_t sample_rate_hz;   // e.g., 16000
    uint16_t frame_ms;         // e.g., 20ms frames
};

// Set pins for your board.
// Seeed XIAO ESP32S3 Sense on-board PDM mic uses:
//   CLK = GPIO42, DATA = GPIO41
constexpr MicConfig MIC_CONFIG{
    true,   // enable mic capture
    42,     // clk pin (PDM CLK)
    41,     // data pin (PDM DATA)
    16000,  // 16 kHz PCM
    20      // 20 ms frames (~320 samples)
};

// WebSocket STT endpoint configuration
constexpr const char* STT_WS_URL = "";       // e.g. wss://<elevenlabs-realtime-stt-websocket>
constexpr const char* STT_API_KEY = "";      // Do NOT hardcode. Configure at runtime via /api/stt/config
constexpr bool STT_SEND_HANDSHAKE = false;    // Most providers auto-detect PCM16; leave false unless required

// Enable test route to push transcript text without STT
constexpr bool TEST_MODE = true;

constexpr const char* LOGIN_PAGE = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HeySalad Device Login</title>
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f0f10; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#fff; }
        .card { background:rgba(24,24,30,0.9); border:1px solid rgba(250,160,154,0.25); border-radius:16px; padding:32px; width:min(360px,90vw); box-shadow:0 16px 40px rgba(0,0,0,0.4); }
        h1 { margin:0 0 24px 0; font-size:24px; text-align:center; }
        label { display:block; font-size:14px; color:#ffd0cd; margin-bottom:8px; }
        input { width:100%; padding:12px 14px; border-radius:10px; border:1px solid rgba(237,76,76,0.6); background:rgba(255,255,255,0.04); color:#fff; font-size:16px; }
        input:focus { outline:none; border-color:#ed4c4c; }
        button { width:100%; margin-top:16px; padding:12px 14px; border:none; border-radius:10px; background:#ed4c4c; color:#fff; font-size:16px; font-weight:600; cursor:pointer; transition:background 0.2s; }
        button:hover { background:#faa09a; }
        .error { display:none; margin-top:16px; padding:12px; border-radius:10px; background:rgba(237,76,76,0.15); border:1px solid rgba(237,76,76,0.35); color:#ffd0cd; font-size:14px; text-align:center; }
        .hint { margin-top:20px; font-size:12px; color:rgba(255,255,255,0.55); text-align:center; }
    </style>
</head>
<body>
    <div class="card">
        <h1>HeySalad Camera</h1>
        <form id="loginForm">
            <label for="password">Admin Password</label>
            <input id="password" type="password" placeholder="Enter admin password" autocomplete="current-password" required />
            <button type="submit">Login</button>
            <div class="error" id="error">Invalid credentials. Please verify your admin password.</div>
        </form>
        <div class="hint">Use the same credentials as the Kitchen Assistant device.</div>
    </div>
    <script>
        const form = document.getElementById('loginForm');
        const errorBox = document.getElementById('error');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorBox.style.display = 'none';
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ password })
                });
                if (response.ok) {
                    window.location.replace('/');
                    return;
                }
                const payload = await response.json().catch(() => ({}));
                errorBox.textContent = (payload && payload.error === 'invalid_credentials') ? 'Invalid credentials. Please verify your admin password.' : 'Login failed. Please try again.';
                errorBox.style.display = 'block';
            } catch (err) {
                errorBox.textContent = 'Network error. Please try again.';
                errorBox.style.display = 'block';
            }
        });
    </script>
</body>
</html>
)rawliteral";

constexpr const char* HTML_TEMPLATE = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HeySalad Camera Stream</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #ffd0cd; color: #333; }
        header { background: #ed4c4c; color: white; padding: 1rem; text-align: center; }
        main { padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        button { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: #ed4c4c; color: white; font-size: 1rem; cursor: pointer; }
        button.secondary { background: #faa09a; }
        .status { padding: 1rem; background: white; border-radius: 8px; width: 100%; max-width: 480px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <header>
        <h1>HeySalad Camera Stream</h1>
    </header>
    <main>
        <canvas id="streamCanvas" width="240" height="240" style="background:#000;border-radius:120px;"></canvas>
        <div>
            <button id="startBtn">Start Stream</button>
            <button id="stopBtn" class="secondary">Stop Stream</button>
        </div>
        <div class="status" id="statusPanel">
            <strong>Status:</strong> <span id="statusText">Idle</span><br />
            <strong>WiFi:</strong> <span id="wifiStatus">Unknown</span><br />
            <strong>FPS:</strong> <span id="fpsValue">0</span>
        </div>
    </main>
    <script>
        (() => {
            const canvas = document.getElementById("streamCanvas");
            const ctx = canvas.getContext("2d");
            const statusText = document.getElementById("statusText");
            const wifiStatus = document.getElementById("wifiStatus");
            const fpsValue = document.getElementById("fpsValue");
            const startBtn = document.getElementById("startBtn");
            const stopBtn = document.getElementById("stopBtn");

            function fetchStatus() {
                fetch("/api/status")
                    .then(r => r.json())
                    .then(data => {
                        statusText.textContent = data.streaming ? "Streaming" : "Idle";
                        wifiStatus.textContent = `${data.network.ssid || "AP"} (${data.network.rssi || "N/A"} dBm)`;
                        fpsValue.textContent = data.fps.toFixed(1);
                    })
                    .catch(() => {});
            }

            const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
            ws.binaryType = "arraybuffer";
            ws.onmessage = (event) => {
                const blob = new Blob([event.data], { type: "image/jpeg" });
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = URL.createObjectURL(blob);
            };

            startBtn.onclick = () => fetch("/api/stream/start", { method: "POST" }).then(fetchStatus);
            stopBtn.onclick = () => fetch("/api/stream/stop", { method: "POST" }).then(fetchStatus);

            setInterval(fetchStatus, 5000);
            fetchStatus();
        })();
    </script>
</body>
</html>
)rawliteral";

}  // namespace Config
