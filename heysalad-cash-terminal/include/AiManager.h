#pragma once

#include <Arduino.h>
#include <vector>

#include "esp_camera.h"

#include <Chirale_TensorFlowLite.h>
#include "tensorflow/lite/c/common.h"
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

class AiManager {
public:
    struct Detection {
        String label;
        float score = 0.0f;
        float x = 0.0f;
        float y = 0.0f;
        float w = 0.0f;
        float h = 0.0f;
    };

    AiManager() = default;
    ~AiManager();

    bool begin(const char* modelPath, float scoreThreshold);
    void end();

    bool isReady() const { return ready; }
    const String& currentModelPath() const { return modelPath; }

    bool run(const camera_fb_t* frame, std::vector<Detection>& outDetections);

private:
    bool loadModelFromFile(const char* path);
    bool prepareInput(const camera_fb_t* frame);
    float readValue(const TfLiteTensor* tensor, size_t index) const;
    void downscaleRgb(const uint8_t* src, int srcW, int srcH, uint8_t* dst, int dstW, int dstH);

    bool ready = false;
    float threshold = 0.5f;
    String modelPath;

    std::vector<uint8_t> modelBuffer;
    std::vector<uint8_t> rgbBuffer;
    std::vector<uint8_t> resizedBuffer;

    uint8_t* tensorArena = nullptr;
    size_t tensorArenaSize = 0;

    tflite::AllOpsResolver resolver;
    tflite::MicroInterpreter* interpreter = nullptr;
    const tflite::Model* model = nullptr;
};
