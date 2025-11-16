#include "AudioCapture.h"

#include <driver/i2s.h>

// ESP32-S3: PDM mode is only supported on I2S0.
static i2s_port_t kPort = I2S_NUM_0;

bool AudioCapture::begin(int clk_pin, int data_pin, uint32_t sample_rate_hz) {
  if (clk_pin < 0 || data_pin < 0) {
    Serial.println(F("[Audio] Mic pins not set; audio disabled"));
    ready_ = false;
    return false;
  }

  i2s_driver_uninstall(kPort);

  i2s_config_t config = {};
  config.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_PDM);
  config.sample_rate = (int)sample_rate_hz;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  config.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  // Use non-deprecated constant (equivalent to I2S_COMM_FORMAT_I2S)
  config.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = 256; // samples per DMA buffer
  config.use_apll = false;
#ifdef CONFIG_IDF_TARGET_ESP32S3
  config.mclk_multiple = I2S_MCLK_MULTIPLE_256;
#endif

  if (i2s_driver_install(kPort, &config, 0, nullptr) != ESP_OK) {
    Serial.println(F("[Audio] i2s_driver_install failed"));
    return false;
  }

  i2s_pin_config_t pins = {};
  pins.bck_io_num = I2S_PIN_NO_CHANGE;
  pins.ws_io_num = clk_pin;     // PDM clk
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = data_pin;  // PDM data
  if (i2s_set_pin(kPort, &pins) != ESP_OK) {
    Serial.println(F("[Audio] i2s_set_pin failed"));
    i2s_driver_uninstall(kPort);
    return false;
  }

  if (i2s_set_clk(kPort, sample_rate_hz, I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_MONO) != ESP_OK) {
    Serial.println(F("[Audio] i2s_set_clk failed"));
    i2s_driver_uninstall(kPort);
    return false;
  }

  ready_ = true;
  Serial.printf("[Audio] PDM ready @ %lu Hz, clk=%d, data=%d\n", (unsigned long)sample_rate_hz, clk_pin, data_pin);
  return true;
}

void AudioCapture::end() {
  if (!ready_) return;
  i2s_driver_uninstall(kPort);
  ready_ = false;
}

size_t AudioCapture::read(int16_t* dest, size_t sample_count) {
  if (!ready_ || !dest || sample_count == 0) return 0;
  size_t to_read_bytes = sample_count * sizeof(int16_t);
  size_t total_read = 0;
  while (total_read < to_read_bytes) {
    size_t just_read = 0;
    esp_err_t err = i2s_read(kPort, ((uint8_t*)dest) + total_read, to_read_bytes - total_read, &just_read, 10);
    if (err != ESP_OK) break;
    if (just_read == 0) break;
    total_read += just_read;
  }
  return total_read / sizeof(int16_t);
}
