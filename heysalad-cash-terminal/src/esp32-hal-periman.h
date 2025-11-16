#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    ESP32_BUS_TYPE_INIT = 0,
    ESP32_BUS_TYPE_GPIO = 1,
    ESP32_BUS_TYPE_MAX
} peripheral_bus_type_t;

typedef bool (*peripheral_bus_deinit_cb_t)(void *bus);

static inline const char *perimanGetTypeName(peripheral_bus_type_t) {
    return "stub";
}

static inline bool perimanSetPinBus(uint8_t, peripheral_bus_type_t, void *, int8_t, int8_t) {
    return true;
}

static inline void *perimanGetPinBus(uint8_t, peripheral_bus_type_t) {
    return NULL;
}

static inline peripheral_bus_type_t perimanGetPinBusType(uint8_t) {
    return ESP32_BUS_TYPE_INIT;
}

static inline int8_t perimanGetPinBusNum(uint8_t) {
    return -1;
}

static inline int8_t perimanGetPinBusChannel(uint8_t) {
    return -1;
}

static inline bool perimanSetBusDeinit(peripheral_bus_type_t, peripheral_bus_deinit_cb_t) {
    return true;
}

static inline peripheral_bus_deinit_cb_t perimanGetBusDeinit(peripheral_bus_type_t) {
    return NULL;
}

static inline bool perimanPinIsValid(uint8_t) {
    return true;
}

static inline bool perimanSetPinBusExtraType(uint8_t, const char *) {
    return true;
}

static inline const char *perimanGetPinBusExtraType(uint8_t) {
    return NULL;
}

#ifdef __cplusplus
}
#endif
