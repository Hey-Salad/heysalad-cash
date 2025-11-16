// Minimal PDM microphone capture for ESP32-S3 (I2S PDM RX)
#pragma once

#include <Arduino.h>

class AudioCapture {
public:
  bool begin(int clk_pin, int data_pin, uint32_t sample_rate_hz);
  void end();

  // Read up to sample_count 16-bit samples into dest. Returns number of samples read.
  size_t read(int16_t* dest, size_t sample_count);
  bool isReady() const { return ready_; }

private:
  bool ready_ = false;
};

