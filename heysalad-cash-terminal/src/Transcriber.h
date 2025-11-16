#pragma once

#include <Arduino.h>
#include <WebSocketsClient.h>
#include <functional>
#include "AudioCapture.h"
#include "Config.h"

class Transcriber {
public:
  using TranscriptCallback = std::function<void(const String&)>;

  void begin(const TranscriptCallback& on_transcript);
  void loop();
  bool isConnected() const { return wsConnected_; }
  void setConfig(const String& url, const String& apiKey, bool handshake);
  void setEnabled(bool en) { enabled_ = en; if (!enabled_) { ws_.disconnect(); wsConnected_ = false; } }
  bool isEnabled() const { return enabled_; }

private:
  void connect();
  static void wsEventStatic(WStype_t type, uint8_t* payload, size_t length, bool, void* user);
  void wsEvent(WStype_t type, uint8_t* payload, size_t length);

  WebSocketsClient ws_;
  AudioCapture audio_;
  TranscriptCallback onTranscript_;
  bool wsConnected_ = false;
  unsigned long lastAttempt_ = 0;
  String wsUrl_;
  String apiKey_;
  bool sendHandshake_ = false;
  bool enabled_ = false;
};
