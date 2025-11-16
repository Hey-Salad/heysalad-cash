#include "AiManager.h"

#include <algorithm>
#include <cmath>
#include <vector>

#include <SPIFFS.h>
#include <esp_heap_caps.h>

#include "img_converters.h"

#include <Chirale_TensorFlowLite.h>
#include "tensorflow/lite/c/common.h"
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/tflite_bridge/micro_error_reporter.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

namespace {
constexpr int kInputSize = 192;
constexpr size_t kTensorArenaSize = 1400 * 1024;  // ~1.37 MB

float clamp01(float value)
{
    if (value < 0.0f) {
        return 0.0f;
    }
    if (value > 1.0f) {
        return 1.0f;
    }
    return value;
}

float dequantize(int32_t value, float scale, int32_t zeroPoint)
{
    return (static_cast<float>(value) - static_cast<float>(zeroPoint)) * scale;
}

int8_t quantizeFloat(float value, float scale, int32_t zeroPoint)
{
    const int32_t quantized = static_cast<int32_t>(std::round(value / scale) + zeroPoint);
    return static_cast<int8_t>(std::max(-128, std::min(127, quantized)));
}

}  // namespace

AiManager::~AiManager()
{
    end();
}

void AiManager::end()
{
    ready = false;
    modelBuffer.clear();
    rgbBuffer.clear();
    resizedBuffer.clear();

    if (interpreter != nullptr) {
        delete interpreter;
        interpreter = nullptr;
    }
    model = nullptr;
    modelPath.clear();

    if (tensorArena != nullptr) {
        heap_caps_free(tensorArena);
        tensorArena = nullptr;
    }
    tensorArenaSize = 0;
}

bool AiManager::begin(const char* modelPathIn, float scoreThreshold)
{
    end();

    if (!loadModelFromFile(modelPathIn)) {
        Serial.println(F("[AI] Failed to load model file"));
        return false;
    }

    threshold = scoreThreshold;
    modelPath = modelPathIn;

    model = tflite::GetModel(modelBuffer.data());
    if (!model || model->version() != TFLITE_SCHEMA_VERSION) {
        Serial.println(F("[AI] Invalid model schema"));
        end();
        return false;
    }

    tensorArenaSize = kTensorArenaSize;
    tensorArena = static_cast<uint8_t*>(heap_caps_malloc(tensorArenaSize, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT));
    if (!tensorArena) {
        Serial.println(F("[AI] Failed to allocate tensor arena"));
        end();
        return false;
    }

    interpreter = new tflite::MicroInterpreter(model, resolver, tensorArena, tensorArenaSize, nullptr, nullptr);
    if (!interpreter) {
        Serial.println(F("[AI] Failed to create interpreter"));
        end();
        return false;
    }

    if (interpreter->AllocateTensors() != kTfLiteOk) {
        Serial.println(F("[AI] AllocateTensors failed"));
        end();
        return false;
    }

    ready = true;
    Serial.println(F("[AI] Runtime ready"));
    return true;
}

bool AiManager::run(const camera_fb_t* frame, std::vector<Detection>& outDetections)
{
    if (!ready || frame == nullptr) {
        return false;
    }

    if (!prepareInput(frame)) {
        Serial.println(F("[AI] Failed to prepare input tensor"));
        return false;
    }

    if (interpreter->Invoke() != kTfLiteOk) {
        Serial.println(F("[AI] Interpreter invoke failed"));
        return false;
    }

    outDetections.clear();
    const TfLiteTensor* output = interpreter->output(0);
    if (!output) {
        Serial.println(F("[AI] Missing output tensor"));
        return false;
    }

    const size_t elementSize =
        (output->type == kTfLiteFloat32) ? sizeof(float) :
        (output->type == kTfLiteInt8)    ? sizeof(int8_t) :
        (output->type == kTfLiteUInt8)   ? sizeof(uint8_t) :
        sizeof(float);

    const size_t elementCount = output->bytes / elementSize;
    if (elementCount < 6) {
        Serial.println(F("[AI] Output tensor too small"));
        return false;
    }

    const size_t boxes = elementCount / 6;
    for (size_t i = 0; i < boxes; ++i) {
        const float score = readValue(output, i * 6 + 4);
        if (score < threshold) {
            continue;
        }

        Detection detection;
        detection.label = F("strawberry");
        detection.score = score;
        detection.x = clamp01(readValue(output, i * 6 + 0));
        detection.y = clamp01(readValue(output, i * 6 + 1));
        detection.w = clamp01(readValue(output, i * 6 + 2));
        detection.h = clamp01(readValue(output, i * 6 + 3));

        outDetections.emplace_back(std::move(detection));
        if (outDetections.size() >= 25) {
            break;
        }
    }

    return true;
}

bool AiManager::loadModelFromFile(const char* path)
{
    File modelFile = SPIFFS.open(path, "r");
    if (!modelFile) {
        Serial.printf("[AI] Unable to open model: %s\n", path);
        return false;
    }

    const size_t size = modelFile.size();
    modelBuffer.resize(size);
    if (modelFile.read(modelBuffer.data(), size) != size) {
        Serial.println(F("[AI] Failed to read model file"));
        modelBuffer.clear();
        return false;
    }
    return true;
}

bool AiManager::prepareInput(const camera_fb_t* frame)
{
    TfLiteTensor* input = interpreter->input(0);
    if (!input) {
        return false;
    }

    const size_t srcSize = static_cast<size_t>(frame->width) * frame->height * 3;
    rgbBuffer.resize(srcSize);

    bool converted = false;
    if (frame->format == PIXFORMAT_JPEG) {
        converted = fmt2rgb888(frame->buf, frame->len, PIXFORMAT_JPEG, rgbBuffer.data());
    } else if (frame->format == PIXFORMAT_RGB888) {
        converted = true;
        memcpy(rgbBuffer.data(), frame->buf, srcSize);
    } else {
        converted = fmt2rgb888(frame->buf, frame->len, frame->format, rgbBuffer.data());
    }

    if (!converted) {
        Serial.println(F("[AI] Unable to convert frame to RGB888"));
        return false;
    }

    resizedBuffer.resize(kInputSize * kInputSize * 3);
    downscaleRgb(rgbBuffer.data(), frame->width, frame->height, resizedBuffer.data(), kInputSize, kInputSize);

    const size_t pixelCount = kInputSize * kInputSize * 3;
    switch (input->type) {
    case kTfLiteUInt8: {
        if (input->bytes < pixelCount) {
            Serial.println(F("[AI] Input tensor size mismatch"));
            return false;
        }
        memcpy(input->data.uint8, resizedBuffer.data(), pixelCount);
        break;
    }
    case kTfLiteInt8: {
        if (input->bytes < pixelCount) {
            Serial.println(F("[AI] Input tensor size mismatch"));
            return false;
        }
        const float scale = input->params.scale;
        const int32_t zeroPoint = input->params.zero_point;
        for (size_t i = 0; i < pixelCount; ++i) {
            const float normalized = static_cast<float>(resizedBuffer[i]) / 255.0f;
            input->data.int8[i] = quantizeFloat(normalized, scale, zeroPoint);
        }
        break;
    }
    case kTfLiteFloat32: {
        if (input->bytes < pixelCount * sizeof(float)) {
            Serial.println(F("[AI] Input tensor size mismatch"));
            return false;
        }
        for (size_t i = 0; i < pixelCount; ++i) {
            input->data.f[i] = static_cast<float>(resizedBuffer[i]) / 255.0f;
        }
        break;
    }
    default:
        Serial.println(F("[AI] Unsupported input tensor type"));
        return false;
    }

    return true;
}

float AiManager::readValue(const TfLiteTensor* tensor, size_t index) const
{
    switch (tensor->type) {
    case kTfLiteFloat32:
        return tensor->data.f[index];
    case kTfLiteUInt8:
        return dequantize(tensor->data.uint8[index], tensor->params.scale, tensor->params.zero_point);
    case kTfLiteInt8:
        return dequantize(tensor->data.int8[index], tensor->params.scale, tensor->params.zero_point);
    default:
        return 0.0f;
    }
}

void AiManager::downscaleRgb(const uint8_t* src, int srcW, int srcH, uint8_t* dst, int dstW, int dstH)
{
    for (int y = 0; y < dstH; ++y) {
        const int srcY = (y * srcH) / dstH;
        for (int x = 0; x < dstW; ++x) {
            const int srcX = (x * srcW) / dstW;
            const size_t srcIndex = (static_cast<size_t>(srcY) * srcW + srcX) * 3;
            const size_t dstIndex = (static_cast<size_t>(y) * dstW + x) * 3;
            dst[dstIndex + 0] = src[srcIndex + 0];
            dst[dstIndex + 1] = src[srcIndex + 1];
            dst[dstIndex + 2] = src[srcIndex + 2];
        }
    }
}
