/**
 * HeySalad Cash Terminal - QR Code Payment Display
 * 
 * Simple payment terminal that displays QR codes for receiving payments
 * Works with Seeed XIAO ESP32-S3 and GC9A01A circular display
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>
#include <qrcode.h>

// Display pins for XIAO ESP32-S3
#define TFT_CS    D3
#define TFT_DC    D4
#define TFT_RST   D5
#define TFT_MOSI  D10
#define TFT_SCLK  D8

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// HeySalad API
const char* apiEndpoint = "https://heysalad.cash/api/terminal/create-payment";
const char* terminalId = "TERM_001";

// Display
Adafruit_GC9A01A tft(TFT_CS, TFT_DC, TFT_RST);

// QR Code
QRCode qrcode;

// Payment state
String currentPaymentAddress = "";
float currentAmount = 0.0;
bool paymentActive = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("HeySalad Cash Terminal Starting...");
  
  // Initialize display
  tft.begin();
  tft.setRotation(0);
  tft.fillScreen(GC9A01A_BLACK);
  
  // Show startup screen
  showStartupScreen();
  
  // Connect to WiFi
  connectWiFi();
  
  // Show ready screen
  showReadyScreen();
}

void loop() {
  // Check for button press or serial command to create payment
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("PAY:")) {
      // Format: PAY:10.50
      float amount = command.substring(4).toFloat();
      if (amount > 0) {
        createPayment(amount);
      }
    }
  }
  
  // Check payment status if active
  if (paymentActive) {
    checkPaymentStatus();
    delay(2000); // Check every 2 seconds
  }
  
  delay(100);
}

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  showMessage("Connecting\nWiFi...", GC9A01A_YELLOW);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    showMessage("WiFi\nConnected!", GC9A01A_GREEN);
    delay(1000);
  } else {
    Serial.println("\nWiFi Failed!");
    showMessage("WiFi\nFailed!", GC9A01A_RED);
    delay(2000);
  }
}

void showStartupScreen() {
  tft.fillScreen(GC9A01A_BLACK);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(2);
  
  // Center text
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds("HeySalad", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 80);
  tft.println("HeySalad");
  
  tft.setTextSize(1);
  tft.getTextBounds("Cash Terminal", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 120);
  tft.println("Cash Terminal");
  
  delay(2000);
}

void showReadyScreen() {
  tft.fillScreen(GC9A01A_BLACK);
  tft.setTextColor(GC9A01A_GREEN);
  tft.setTextSize(2);
  
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds("READY", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 100);
  tft.println("READY");
  
  tft.setTextSize(1);
  tft.setTextColor(GC9A01A_WHITE);
  tft.getTextBounds("Send PAY:amount", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 140);
  tft.println("Send PAY:amount");
}

void showMessage(const char* message, uint16_t color) {
  tft.fillScreen(GC9A01A_BLACK);
  tft.setTextColor(color);
  tft.setTextSize(2);
  
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds(message, 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, (240 - h) / 2);
  tft.println(message);
}

void createPayment(float amount) {
  Serial.print("Creating payment for $");
  Serial.println(amount);
  
  showMessage("Creating\nPayment...", GC9A01A_YELLOW);
  
  if (WiFi.status() != WL_CONNECTED) {
    showMessage("WiFi\nError!", GC9A01A_RED);
    delay(2000);
    showReadyScreen();
    return;
  }
  
  HTTPClient http;
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["terminalId"] = terminalId;
  doc["amount"] = String(amount, 2);
  doc["currency"] = "USDC";
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    // Parse response
    StaticJsonDocument<512> responseDoc;
    deserializeJson(responseDoc, response);
    
    if (responseDoc.containsKey("address")) {
      currentPaymentAddress = responseDoc["address"].as<String>();
      currentAmount = amount;
      paymentActive = true;
      
      // Display QR code
      displayPaymentQR();
    } else {
      showMessage("API\nError!", GC9A01A_RED);
      delay(2000);
      showReadyScreen();
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
    showMessage("API\nError!", GC9A01A_RED);
    delay(2000);
    showReadyScreen();
  }
  
  http.end();
}

void displayPaymentQR() {
  tft.fillScreen(GC9A01A_WHITE);
  
  // Create QR code
  uint8_t qrcodeData[qrcode_getBufferSize(3)];
  qrcode_initText(&qrcode, qrcodeData, 3, 0, currentPaymentAddress.c_str());
  
  // Calculate QR code size and position
  int scale = 3; // Pixel size for each QR module
  int qrSize = qrcode.size * scale;
  int offsetX = (240 - qrSize) / 2;
  int offsetY = 20;
  
  // Draw QR code
  for (uint8_t y = 0; y < qrcode.size; y++) {
    for (uint8_t x = 0; x < qrcode.size; x++) {
      uint16_t color = qrcode_getModule(&qrcode, x, y) ? GC9A01A_BLACK : GC9A01A_WHITE;
      tft.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, color);
    }
  }
  
  // Display amount
  tft.setTextColor(GC9A01A_BLACK);
  tft.setTextSize(2);
  
  String amountText = "$" + String(currentAmount, 2);
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds(amountText.c_str(), 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, offsetY + qrSize + 10);
  tft.println(amountText);
  
  tft.setTextSize(1);
  tft.getTextBounds("Scan to Pay", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, offsetY + qrSize + 35);
  tft.println("Scan to Pay");
  
  Serial.println("QR Code displayed");
  Serial.println("Address: " + currentPaymentAddress);
}

void checkPaymentStatus() {
  // Check if payment has been received
  HTTPClient http;
  String statusUrl = String(apiEndpoint) + "/status?address=" + currentPaymentAddress;
  http.begin(statusUrl);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);
    
    if (doc["status"] == "completed") {
      paymentActive = false;
      showPaymentSuccess();
      delay(3000);
      showReadyScreen();
    } else if (doc["status"] == "failed") {
      paymentActive = false;
      showMessage("Payment\nFailed!", GC9A01A_RED);
      delay(2000);
      showReadyScreen();
    }
  }
  
  http.end();
}

void showPaymentSuccess() {
  tft.fillScreen(GC9A01A_GREEN);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(3);
  
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds("SUCCESS!", 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 90);
  tft.println("SUCCESS!");
  
  tft.setTextSize(2);
  String amountText = "$" + String(currentAmount, 2);
  tft.getTextBounds(amountText.c_str(), 0, 0, &x1, &y1, &w, &h);
  tft.setCursor((240 - w) / 2, 130);
  tft.println(amountText);
  
  Serial.println("Payment received!");
}
