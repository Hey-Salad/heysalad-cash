#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>

class LauraClient {
public:
    LauraClient();

    void configure(const String& cameraId,
                   const String& cameraName,
                   const String& apiCamerasUrl,
                   const String& storageUrl,
                   const String& supabaseKey);

    void setStreamInfo(const String& ipAddress, const String& streamUrl);
    void setCameraUuid(const String& uuid);
    const String& getCameraUuid() const { return cameraUuid; }
    const String& getCameraId() const { return cameraId; }

    void setLogger(Print* logger);

    bool init();
    bool ensureRegistered();

    bool uploadPhoto(const uint8_t* data, size_t length, String& publicUrl, const String& commandId = String());
    bool uploadFrame(const uint8_t* data, size_t length, const String& format);
    bool sendStatus(const JsonDocument& statusDoc);
    bool pollCommands(JsonDocument& outDoc);
    bool acknowledgeCommand(const String& commandId,
                            const String& status,
                            const JsonVariantConst& result);
    bool acknowledgeCommand(const String& commandId,
                            const String& status);

private:
    bool postJson(const String& url, const String& payload);
    bool patchJson(const String& url, const String& payload);
    bool requestJson(const char* method,
                     const String& url,
                     const String& payload,
                     String& response);
    bool sendRaw(const String& url,
                 const uint8_t* data,
                 size_t length,
                 const char* contentType);
    bool notifyPhoto(const String& photoUrl, const String& commandId);

    String buildCameraEndpoint(const char* suffix) const;
    String buildStorageUploadUrl(const String& objectPath) const;
    String buildStoragePublicUrl(const String& objectPath) const;
    bool isConfigured() const;

    WiFiClientSecure client;
    Print* logger;

    String cameraId;
    String cameraName;
    String apiUrl;
    String storageUrl;
    String supabaseKey;
    String cameraUuid;
    String ipAddress;
    String streamUrl;
};
