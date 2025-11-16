#include "Transcriber.h"
#include <ArduinoJson.h>
#include <vector>

void Transcriber::begin(const TranscriptCallback& on_transcript) {
  onTranscript_ = on_transcript;
  if (Config::MIC_CONFIG.enabled) {
    audio_.begin(Config::MIC_CONFIG.clk_pin, Config::MIC_CONFIG.data_pin, Config::MIC_CONFIG.sample_rate_hz);
  }
}

void Transcriber::connect() {
  if (!enabled_) return;
  if (wsUrl_.length() == 0) return;
  // Parse URL
  String url = wsUrl_;
  url.trim();
  bool secure = url.startsWith("wss://");
  bool plain = url.startsWith("ws://");
  if (!secure && !plain) return;

  int schemeEnd = url.indexOf("//");
  String rest = url.substring(schemeEnd + 2);
  int slash = rest.indexOf('/');
  String hostport = (slash >= 0) ? rest.substring(0, slash) : rest;
  String path = (slash >= 0) ? rest.substring(slash) : "/";
  int colon = hostport.indexOf(':');
  String host; uint16_t port;
  if (colon >= 0) {
    host = hostport.substring(0, colon);
    port = hostport.substring(colon + 1).toInt();
  } else {
    host = hostport;
    port = secure ? 443 : 80;
  }

  ws_.disconnect();
  ws_.onEvent([](WStype_t t, uint8_t* p, size_t l){}); // reset
  ws_.onEvent([this](WStype_t t, uint8_t* p, size_t l){ this->wsEvent(t, p, l); });

  if (secure) {
    ws_.beginSSL(host.c_str(), port, path.c_str(), "");
  } else {
    ws_.begin(host.c_str(), port, path.c_str());
  }

  String headers;
  if (apiKey_.length()) {
    headers += String("Authorization: Bearer ") + apiKey_ + "\r\n";
    headers += String("xi-api-key: ") + apiKey_ + "\r\n";
  }
  if (headers.length()) ws_.setExtraHeaders(headers.c_str());
  ws_.setReconnectInterval(5000);
}

void Transcriber::wsEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      wsConnected_ = false;
      break;
    case WStype_CONNECTED: {
      wsConnected_ = true;
      if (sendHandshake_) {
        DynamicJsonDocument hello(256);
        hello["type"] = "hello";
        hello["format"] = 0; // PCM16LE
        hello["sample_rate_hz"] = Config::MIC_CONFIG.sample_rate_hz;
        String msg; serializeJson(hello, msg);
        ws_.sendTXT(msg);
      }
      break;
    }
    case WStype_TEXT: {
      if (onTranscript_) {
        // try JSON with "transcript"/"text" else use raw text
        DynamicJsonDocument doc(1024);
        if (deserializeJson(doc, payload, length) == DeserializationError::Ok) {
          const char* keys[] = {"transcript", "text", "content", "caption"};
          String out;
          for (auto k : keys) {
            if (doc[k].is<const char*>()) { out = doc[k].as<const char*>(); break; }
          }
          onTranscript_(out.length() ? out : String((const char*)payload, length));
        } else {
          onTranscript_(String((const char*)payload, length));
        }
      }
      break;
    }
    default: break;
  }
}

void Transcriber::loop() {
  if (!enabled_) {
    if (wsConnected_) { ws_.disconnect(); wsConnected_ = false; }
    return; // disabled: do nothing
  }
  if (WiFi.status() == WL_CONNECTED && !wsConnected_) {
    unsigned long now = millis();
    if (now - lastAttempt_ > 5000) {
      lastAttempt_ = now;
      connect();
    }
  }
  ws_.loop();

  if (wsConnected_ && audio_.isReady()) {
    const uint32_t frame_samples = (Config::MIC_CONFIG.sample_rate_hz * Config::MIC_CONFIG.frame_ms) / 1000;
    static std::vector<int16_t> frame;
    if (frame.size() != frame_samples) frame.assign(frame_samples, 0);
    size_t got = audio_.read(frame.data(), frame.size());
    if (got > 0) {
      ws_.sendBIN(reinterpret_cast<const uint8_t*>(frame.data()), got * sizeof(int16_t));
    }
  }
}

void Transcriber::setConfig(const String& url, const String& apiKey, bool handshake) {
  wsUrl_ = url;
  apiKey_ = apiKey;
  sendHandshake_ = handshake;
  ws_.disconnect();
  wsConnected_ = false;
}
