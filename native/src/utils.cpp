#include <string>
#include <vector>
#include <algorithm>

namespace NebulaConverter {

// Utility helper functions

std::string toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string getFileExtension(const std::string& filename) {
    size_t pos = filename.find_last_of('.');
    if (pos != std::string::npos) {
        return filename.substr(pos + 1);
    }
    return "";
}

bool isVideoFormat(const std::string& format) {
    std::vector<std::string> videoFormats = {"mp4", "avi", "mkv", "mov", "webm", "flv", "wmv"};
    std::string lower = toLower(format);
    return std::find(videoFormats.begin(), videoFormats.end(), lower) != videoFormats.end();
}

bool isAudioFormat(const std::string& format) {
    std::vector<std::string> audioFormats = {"mp3", "aac", "flac", "wav", "m4a", "ogg", "wma"};
    std::string lower = toLower(format);
    return std::find(audioFormats.begin(), audioFormats.end(), lower) != audioFormats.end();
}

bool isImageFormat(const std::string& format) {
    std::vector<std::string> imageFormats = {"jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff"};
    std::string lower = toLower(format);
    return std::find(imageFormats.begin(), imageFormats.end(), lower) != imageFormats.end();
}

} // namespace NebulaConverter
