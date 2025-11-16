#pragma once

#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <map>

class AuthManager {
public:
    AuthManager();

    void begin();
    String login(const String& password);
    bool verifySession(const String& token);
    void logout(const String& token);
    bool changePassword(const String& oldPassword, const String& newPassword);
    bool isSetupComplete();
    int getActiveSessionCount();

    bool isAuthenticated(AsyncWebServerRequest* request);
    const char* sessionCookieName() const;
    bool isCookieAuthenticated(const String& cookieHeader);

private:
    static constexpr const char* SESSION_COOKIE_NAME = "heysaladSession";

    Preferences prefs;
    std::map<String, unsigned long> activeSessions;
    const unsigned long SESSION_TIMEOUT = 86400000; // 24 hours

    String hashPassword(const String& password, const String& salt);
    String generateSalt();
    String generateSessionToken();
    void pruneExpiredSessions();
    String extractTokenFromCookie(const String& cookieHeader) const;
};
