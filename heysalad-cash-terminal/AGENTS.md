# Repository Field Guide

## Purpose
Firmware + web assets for the HeySalad camera/display built on the Seeed XIAO ESP32S3 Sense. The device boots into an HTTP/WebSocket server that streams camera frames, renders status to the round GC9A01 display, exposes BLE + REST controls, and can optionally sync state with the "Laura" cloud service.

## Key Modules
- `src/main.cpp` – Implements `HeySaladCameraServer`, orchestrating initialization (flash, display, camera, GPIO, BLE), Wi-Fi station/AP modes, AsyncWebServer endpoints (`/api/*`, `/ws`), WebSocket streaming, and in-device settings persistence via `Preferences`.
- `src/AuthManager.*` – Manages admin authentication. Passwords are salted+SHA256 hashed to NVS, sessions are bearer tokens/cookies, and defaults come from `Config::DEFAULT_AUTH_PASSWORD` (now a placeholder).
- `src/AiManager.*` – Thin TensorFlow Lite Micro inference wrapper. Loads `.tflite` models from SPIFFS (see `data/models/`) and produces detection structs consumed by the REST/BLE layers.
- `src/LauraClient.*` – HTTPS client that registers the camera, uploads frames/photos, pushes status, and polls remote commands once `Config::LAURA_API` is populated. Disabled by default because secrets were scrubbed.
- `include/Config.h` – Centralizes hardware pin maps, Wi-Fi/AP/BLE defaults, AI + Laura settings, saved locations, and the embedded HTML templates. Sensitive tokens/passwords have been replaced with `SET_ME_*`/`YOUR_*` placeholders.

## Assets & Tooling
- `data/index.html` – Dashboard served from SPIFFS for monitoring status, toggling streaming, and triggering AI actions.
- `data/assets/*.rgb565` – Display splash screens flashed to SPIFFS. Rebuild from `assets_src/*.bmp` using `scripts/convert_images_to_rgb565.py`.
- `data/models/strawberry_yolo_int8.tflite` – Example model loaded by `AiManager` when `Config::AI_CONFIG` points to it.
- `platformio.ini` – PlatformIO environment for `seeed_xiao_esp32s3` with AsyncWebServer, NimBLE, ArduinoJson, GC9A01, ESP32 camera, and Chirale TensorFlow Lite dependencies.

## Runtime Flow Highlights
1. `HeySaladCameraServer::begin()` mounts SPIFFS, powers the display, initializes the OV2640-like camera, configures GPIO/buzzer, starts BLE UART, and prepares the AsyncWebServer + WebSocket.
2. Wi-Fi tries stored credentials, falls back to the placeholder list in `Config::WIFI_NETWORKS`, then exposes an AP (`Config::AP_CONFIG`). `/api/settings` can update SSID/passwords at runtime; changes persist via `Preferences`.
3. Auth is enforced on the web UI/API: `/login` seeds the session via `AuthManager`, `/api/login` exposes JSON authentication, and cookies/bearers guard the rest endpoints.
4. Streaming grabs JPEG frames via `esp_camera`, emits them through `/ws`, and mirrors state on the GC9A01 display. AI snapshots reuse the most recent frame and run it through `AiManager`.
5. Laura cloud syncing (status, command polling, frame uploads) only runs when Wi-Fi is connected, `Config::LAURA_API.enabled` is true, and all URLs/keys are configured.

## Working With the Repo
- Build/upload with `pio run -t upload` and monitor logs via `pio device monitor -b 115200`.
- Keep production secrets out of Git. Copy `include/Config.h` to a private header or inject values over the `/api/settings` endpoints.
- Assets/UI changes require re-uploading SPIFFS (`pio run -t uploadfs`). AI model changes require placing the `.tflite` file under `data/models/` and updating `Config::AI_CONFIG`.
- When adding hardware features, extend `Config` first, then update `HeySaladCameraServer` init + the REST/WS status payloads so the dashboard reflects the new signals.
