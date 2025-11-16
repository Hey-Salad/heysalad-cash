#include "LauraClient.h"

#include <HTTPClient.h>

LauraClient::LauraClient()
    : logger(&Serial) {
}

void LauraClient::configure(const String& id,
                            const String& name,
                            const String& apiCamerasUrl,
                            const String& storage,
                            const String& supabase)
{
    cameraId = id;
    cameraName = name;
    apiUrl = apiCamerasUrl;
    storageUrl = storage;
    supabaseKey = supabase;
}

void LauraClient::setStreamInfo(const String& ip, const String& stream)
{
    ipAddress = ip;
    streamUrl = stream;
}

void LauraClient::setCameraUuid(const String& uuid)
{
    cameraUuid = uuid;
}

void LauraClient::setLogger(Print* newLogger)
{
    logger = newLogger ? newLogger : &Serial;
}

bool LauraClient::init()
{
    client.setInsecure();
    return true;
}

bool LauraClient::isConfigured() const
{
    return cameraId.length() > 0 &&
           apiUrl.length() > 0 &&
           storageUrl.length() > 0 &&
           supabaseKey.length() > 0;
}

bool LauraClient::ensureRegistered()
{
    if (!isConfigured()) {
        if (logger) {
            logger->println("[Laura] Missing configuration; cannot register");
        }
        return false;
    }

    if (cameraUuid.length() > 0) {
        return true;
    }

    String endpoint = apiUrl;
    if (endpoint.endsWith("/")) {
        endpoint.remove(endpoint.length() - 1);
    }

    StaticJsonDocument<512> doc;
    doc["camera_id"] = cameraId;
    doc["camera_name"] = cameraName.length() > 0 ? cameraName : String("HeySalad Camera ") + cameraId;

    JsonObject metadata = doc.createNestedObject("metadata");
    if (ipAddress.length() > 0) {
        metadata["ip_address"] = ipAddress;
    }
    if (streamUrl.length() > 0) {
        metadata["stream_url"] = streamUrl;
    }

    String payload;
    serializeJson(doc, payload);

    String response;
    if (!requestJson("POST", endpoint, payload, response)) {
        if (logger) {
            logger->println("[Laura] Camera registration request failed");
        }
        return false;
    }

    DynamicJsonDocument respDoc(1024);
    DeserializationError err = deserializeJson(respDoc, response);
    if (err) {
        if (logger) {
            logger->print("[Laura] Failed to parse registration response: ");
            logger->println(err.c_str());
        }
        return false;
    }

    const char* uuid = nullptr;
    if (respDoc.containsKey("camera") && respDoc["camera"].containsKey("id")) {
        uuid = respDoc["camera"]["id"];
    } else if (respDoc.containsKey("uuid")) {
        uuid = respDoc["uuid"];
    } else if (respDoc.containsKey("id")) {
        uuid = respDoc["id"];
    }

    if (!uuid || strlen(uuid) == 0) {
        if (logger) {
            logger->println("[Laura] Registration response missing UUID");
        }
        return false;
    }

    cameraUuid = uuid;
    if (logger) {
        logger->print("[Laura] Registered camera UUID: ");
        logger->println(cameraUuid);
    }

    return true;
}

bool LauraClient::uploadPhoto(const uint8_t* data, size_t length, String& publicUrl, const String& commandId)
{
    if (!isConfigured()) {
        if (logger) {
            logger->println("[Laura] Upload skipped - not configured");
        }
        return false;
    }

    if (!ensureRegistered()) {
        return false;
    }

    String objectPath = cameraId;
    if (!objectPath.endsWith("/")) {
        objectPath += "/";
    }
    objectPath += String(millis()) + ".jpg";

    String uploadUrl = buildStorageUploadUrl(objectPath);
    if (!sendRaw(uploadUrl, data, length, "image/jpeg")) {
        if (logger) {
            logger->println("[Laura] Photo upload failed");
        }
        return false;
    }

    publicUrl = buildStoragePublicUrl(objectPath);
    if (logger) {
        logger->print("[Laura] Photo uploaded: ");
        logger->println(publicUrl);
    }

    notifyPhoto(publicUrl, commandId);
    return true;
}

bool LauraClient::uploadFrame(const uint8_t* data, size_t length, const String& format)
{
    if (!ensureRegistered()) {
        return false;
    }

    if (!format.equalsIgnoreCase("binary")) {
        if (logger) {
            logger->print("[Laura] Unsupported frame format: ");
            logger->println(format);
        }
        return false;
    }

    String endpoint = buildCameraEndpoint("frame");
    return sendRaw(endpoint, data, length, "image/jpeg");
}

bool LauraClient::sendStatus(const JsonDocument& statusDoc)
{
    if (!ensureRegistered()) {
        return false;
    }

    String endpoint = buildCameraEndpoint("status");

    if (logger) {
        logger->print("[Laura] Status endpoint: ");
        logger->println(endpoint);
    }

    String payload;
    serializeJson(statusDoc, payload);

    if (logger) {
        logger->print("[Laura] Status payload: ");
        logger->println(payload);
    }

    // Try POST first (most common for status updates)
    if (postJson(endpoint, payload)) {
        if (logger) {
            logger->println("[Laura] ✓ Status update successful");
        }
        return true;
    }

    // If POST fails, try PATCH (some APIs prefer PATCH for status updates)
    if (logger) {
        logger->println("[Laura] POST failed, trying PATCH...");
    }

    bool success = patchJson(endpoint, payload);
    if (success && logger) {
        logger->println("[Laura] ✓ Status update successful");
    } else if (!success && logger) {
        logger->println("[Laura] Status update failed with both POST and PATCH");
    }
    return success;
}

bool LauraClient::pollCommands(JsonDocument& outDoc)
{
    if (!ensureRegistered()) {
        return false;
    }

    String endpoint = buildCameraEndpoint("commands");
    String response;
    if (!requestJson("GET", endpoint, String(), response)) {
        return false;
    }

    outDoc.clear();
    DeserializationError err = deserializeJson(outDoc, response);
    if (err) {
        if (logger) {
            logger->print("[Laura] Failed to parse commands response: ");
            logger->println(err.c_str());
        }
        return false;
    }

    return outDoc.containsKey("commands");
}

bool LauraClient::acknowledgeCommand(const String& commandId,
                                     const String& status,
                                     const JsonVariantConst& result)
{
    if (!ensureRegistered()) {
        return false;
    }

    String suffix = String("commands/") + commandId + "/ack";
    String endpoint = buildCameraEndpoint(suffix.c_str());

    DynamicJsonDocument doc(512);
    doc["status"] = status;
    if (!result.isNull()) {
        doc["result"] = result;
    }

    String payload;
    serializeJson(doc, payload);
    return postJson(endpoint, payload);
}

bool LauraClient::acknowledgeCommand(const String& commandId,
                                     const String& status)
{
    if (!ensureRegistered()) {
        return false;
    }

    String suffix = String("commands/") + commandId + "/ack";
    String endpoint = buildCameraEndpoint(suffix.c_str());

    DynamicJsonDocument doc(512);
    doc["status"] = status;

    String payload;
    serializeJson(doc, payload);
    return postJson(endpoint, payload);
}

bool LauraClient::postJson(const String& url, const String& payload)
{
    String response;
    return requestJson("POST", url, payload, response);
}

bool LauraClient::patchJson(const String& url, const String& payload)
{
    String response;
    return requestJson("PATCH", url, payload, response);
}

bool LauraClient::requestJson(const char* method,
                              const String& url,
                              const String& payload,
                              String& response)
{
    HTTPClient http;
    if (!http.begin(client, url)) {
        if (logger) {
            logger->print("[Laura] HTTP begin failed for ");
            logger->println(url);
        }
        return false;
    }

    http.setTimeout(15000);
    http.addHeader("Content-Type", "application/json");
    if (supabaseKey.length() > 0) {
        http.addHeader("apikey", supabaseKey);
        http.addHeader("Authorization", String("Bearer ") + supabaseKey);
    }

    int statusCode = 0;
    uint8_t* payloadPtr = (uint8_t*)payload.c_str();

    if (strcmp(method, "GET") == 0) {
        statusCode = http.GET();
    } else if (strcmp(method, "POST") == 0) {
        statusCode = http.POST(payloadPtr, payload.length());
    } else if (strcmp(method, "PATCH") == 0) {
        statusCode = http.PATCH(payloadPtr, payload.length());
    } else if (strcmp(method, "PUT") == 0) {
        statusCode = http.PUT(payloadPtr, payload.length());
    } else {
        statusCode = http.POST(payloadPtr, payload.length());
    }

    response = http.getString();
    http.end();

    bool success = statusCode >= 200 && statusCode < 300;
    if (!success && logger) {
        logger->print("[Laura] HTTP ");
        logger->print(method);
        logger->print(" ");
        logger->print(url);
        logger->print(" failed. Status: ");
        logger->println(statusCode);
        if (response.length() > 0) {
            logger->print("[Laura] Response: ");
            logger->println(response);
        }
    }
    return success;
}

bool LauraClient::sendRaw(const String& url,
                          const uint8_t* data,
                          size_t length,
                          const char* contentType)
{
    HTTPClient http;
    if (!http.begin(client, url)) {
        if (logger) {
            logger->print("[Laura] HTTP begin failed for ");
            logger->println(url);
        }
        return false;
    }

    http.setTimeout(20000);
    http.addHeader("Content-Type", contentType);
    if (supabaseKey.length() > 0) {
        http.addHeader("apikey", supabaseKey);
        http.addHeader("Authorization", String("Bearer ") + supabaseKey);
    }

    int statusCode = http.POST((uint8_t*)data, length);
    String response = http.getString();
    http.end();

    bool success = statusCode >= 200 && statusCode < 300;
    if (!success && logger) {
        logger->print("[Laura] Raw upload failed (status ");
        logger->print(statusCode);
        logger->println(")");
        if (response.length() > 0) {
            logger->println(response);
        }
    }
    return success;
}

bool LauraClient::notifyPhoto(const String& photoUrl, const String& commandId)
{
    if (cameraUuid.isEmpty()) {
        return false;
    }

    String endpoint = buildCameraEndpoint("photos");

    DynamicJsonDocument doc(512);
    doc["camera_id"] = cameraId;
    doc["photo_url"] = photoUrl;
    if (commandId.length() > 0) {
        doc["command_id"] = commandId;
    }
    doc["captured_at"] = millis();

    String payload;
    serializeJson(doc, payload);
    return postJson(endpoint, payload);
}

String LauraClient::buildCameraEndpoint(const char* suffix) const
{
    String endpoint = apiUrl;
    if (!endpoint.endsWith("/")) {
        endpoint += "/";
    }
    if (!cameraUuid.isEmpty()) {
        endpoint += cameraUuid;
    }
    if (suffix && suffix[0] != '\0') {
        if (!endpoint.endsWith("/")) {
            endpoint += "/";
        }
        endpoint += suffix;
    }
    return endpoint;
}

String LauraClient::buildStorageUploadUrl(const String& objectPath) const
{
    String base = storageUrl;
    if (!base.endsWith("/")) {
        base += "/";
    }
    return base + objectPath;
}

String LauraClient::buildStoragePublicUrl(const String& objectPath) const
{
    String base = storageUrl;
    int idx = base.indexOf("/storage/v1/object");
    if (idx >= 0) {
        base.replace("/storage/v1/object", "/storage/v1/object/public");
    }
    if (!base.endsWith("/")) {
        base += "/";
    }
    return base + objectPath;
}
