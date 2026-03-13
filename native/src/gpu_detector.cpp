#include "converter.h"
#include <iostream>

#ifdef _WIN32
#include <windows.h>
#elif __linux__
#include <unistd.h>
#include <fstream>
#elif __APPLE__
#include <sys/sysctl.h>
#endif

namespace NebulaConverter {

// Utility functions for GPU detection and system info

std::string detectNVIDIAGPU() {
#ifdef _WIN32
    // Windows NVIDIA detection via registry or NVML
    return "NVIDIA GPU (Windows detection placeholder)";
#elif __linux__
    // Check for NVIDIA driver
    if (access("/proc/driver/nvidia/version", F_OK) != -1) {
        std::ifstream file("/proc/driver/nvidia/version");
        std::string line;
        if (std::getline(file, line)) {
            return "NVIDIA GPU: " + line;
        }
    }
#endif
    return "";
}

std::string detectAMDGPU() {
#ifdef _WIN32
    // Windows AMD detection
    return "AMD GPU (Windows detection placeholder)";
#elif __linux__
    // Check for AMD driver
    if (access("/sys/class/drm/card0/device/vendor", F_OK) != -1) {
        std::ifstream file("/sys/class/drm/card0/device/vendor");
        std::string vendor;
        if (std::getline(file, vendor) && vendor.find("1002") != std::string::npos) {
            return "AMD GPU detected";
        }
    }
#endif
    return "";
}

std::string detectIntelGPU() {
#ifdef _WIN32
    return "Intel GPU (Windows detection placeholder)";
#elif __linux__
    if (access("/sys/class/drm/card0/device/vendor", F_OK) != -1) {
        std::ifstream file("/sys/class/drm/card0/device/vendor");
        std::string vendor;
        if (std::getline(file, vendor) && vendor.find("8086") != std::string::npos) {
            return "Intel GPU detected";
        }
    }
#endif
    return "";
}

} // namespace NebulaConverter
