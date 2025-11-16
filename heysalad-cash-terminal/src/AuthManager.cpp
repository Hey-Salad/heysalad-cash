#include "AuthManager.h"
#include "Config.h"

#include <mbedtls/md.h>
#include <esp_system.h>

namespace {
String toHex(uint8_t value) {
    char buf[3];
    snprintf(buf, sizeof(buf), "%02x", value);
    return String(buf);
}
}

AuthManager::AuthManager() {}

void AuthManager::begin() {
    prefs.begin("auth", false);

    if (!prefs.isKey("password_hash")) {
        const char* defaultPassword = Config::DEFAULT_AUTH_PASSWORD && Config::DEFAULT_AUTH_PASSWORD[0]
                                          ? Config::DEFAULT_AUTH_PASSWORD
                                          : "change-me";

        String salt = generateSalt();
        String hash = hashPassword(defaultPassword, salt);

        prefs.putString("password_hash", hash);
        prefs.putString("salt", salt);
        prefs.putBool("setup_complete", false);

        Serial.println("[Auth] Default admin credentials created");
        Serial.println("       Username: admin");
        Serial.println("       Password: (set in Config::DEFAULT_AUTH_PASSWORD)");
        Serial.println("       UPDATE OR ROTATE ON FIRST LOGIN!");
    }

    prefs.end();
}

String AuthManager::login(const String& password) {
    prefs.begin("auth", true);
    String storedHash = prefs.getString("password_hash", "");
    String salt = prefs.getString("salt", "");
    prefs.end();

    String inputHash = hashPassword(password, salt);

    if (inputHash == storedHash) {
        String token = generateSessionToken();
        activeSessions[token] = millis();

        Serial.println("[Auth] Login successful");
        return token;
    }

    Serial.println("[Auth] Login failed");
    return "";
}

bool AuthManager::verifySession(const String& token) {
    if (token.isEmpty()) {
        return false;
    }

    pruneExpiredSessions();

    auto it = activeSessions.find(token);
    if (it == activeSessions.end()) {
        return false;
    }

    it->second = millis();
    return true;
}

void AuthManager::logout(const String& token) {
    activeSessions.erase(token);
    Serial.println("[Auth] Logout successful");
}

bool AuthManager::changePassword(const String& oldPassword, const String& newPassword) {
    prefs.begin("auth", true);
    String storedHash = prefs.getString("password_hash", "");
    String salt = prefs.getString("salt", "");
    prefs.end();

    String oldHash = hashPassword(oldPassword, salt);
    if (oldHash != storedHash) {
        Serial.println("[Auth] Old password incorrect");
        return false;
    }

    String newSalt = generateSalt();
    String newHash = hashPassword(newPassword, newSalt);

    prefs.begin("auth", false);
    prefs.putString("password_hash", newHash);
    prefs.putString("salt", newSalt);
    prefs.putBool("setup_complete", true);
    prefs.end();

    activeSessions.clear();

    Serial.println("[Auth] Password changed successfully");
    return true;
}

bool AuthManager::isSetupComplete() {
    prefs.begin("auth", true);
    bool complete = prefs.getBool("setup_complete", false);
    prefs.end();
    return complete;
}

int AuthManager::getActiveSessionCount() {
    pruneExpiredSessions();
    return activeSessions.size();
}

bool AuthManager::isAuthenticated(AsyncWebServerRequest* request) {
    if (request->hasHeader("Authorization")) {
        String header = request->header("Authorization");
        header.trim();
        if (header.startsWith("Bearer ")) {
            header.remove(0, 7);
            header.trim();
        }
        if (verifySession(header)) {
            return true;
        }
    }

    if (request->hasHeader("Cookie")) {
        String token = extractTokenFromCookie(request->header("Cookie"));
        if (verifySession(token)) {
            return true;
        }
    }

    return false;
}

const char* AuthManager::sessionCookieName() const {
    return SESSION_COOKIE_NAME;
}

bool AuthManager::isCookieAuthenticated(const String& cookieHeader) {
    if (cookieHeader.length() == 0) {
        return false;
    }
    String token = extractTokenFromCookie(cookieHeader);
    return verifySession(token);
}

String AuthManager::hashPassword(const String& password, const String& salt) {
    String input = password + salt;
    uint8_t hash[32];

    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, reinterpret_cast<const unsigned char*>(input.c_str()), input.length());
    mbedtls_md_finish(&ctx, hash);
    mbedtls_md_free(&ctx);

    String hashStr;
    for (size_t i = 0; i < sizeof(hash); i++) {
        hashStr += toHex(hash[i]);
    }

    return hashStr;
}

String AuthManager::generateSalt() {
    String salt;
    for (int i = 0; i < 16; i++) {
        salt += toHex(static_cast<uint8_t>(esp_random() & 0xFF));
    }
    return salt;
}

String AuthManager::generateSessionToken() {
    String token;
    for (int i = 0; i < 32; i++) {
        token += toHex(static_cast<uint8_t>(esp_random() & 0xFF));
    }
    return token;
}

void AuthManager::pruneExpiredSessions() {
    unsigned long now = millis();
    for (auto it = activeSessions.begin(); it != activeSessions.end();) {
        if (now - it->second > SESSION_TIMEOUT) {
            it = activeSessions.erase(it);
        } else {
            ++it;
        }
    }
}

String AuthManager::extractTokenFromCookie(const String& cookieHeader) const {
    String needle = String(SESSION_COOKIE_NAME) + "=";
    int start = cookieHeader.indexOf(needle);
    if (start < 0) {
        return "";
    }
    start += needle.length();
    int end = cookieHeader.indexOf(';', start);
    if (end < 0) {
        end = cookieHeader.length();
    }
    return cookieHeader.substring(start, end);
}
