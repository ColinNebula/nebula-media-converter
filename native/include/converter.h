#ifndef NEBULA_CONVERTER_H
#define NEBULA_CONVERTER_H

#include <napi.h>
#include <string>
#include <vector>
#include <functional>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/opt.h>
#include <libavutil/hwcontext.h>
#include <libswscale/swscale.h>
#include <libswresample/swresample.h>
}

namespace NebulaConverter {

struct ConversionOptions {
    std::string quality;
    std::string bitrate;
    bool useGPU;
    int threads;
    std::string preset;
};

struct ConversionProgress {
    double percentage;
    std::string message;
    int64_t processedBytes;
    int64_t totalBytes;
};

using ProgressCallback = std::function<void(const ConversionProgress&)>;

class MediaConverter {
public:
    MediaConverter();
    ~MediaConverter();

    bool convertMedia(
        const std::string& inputPath,
        const std::string& outputPath,
        const std::string& format,
        const ConversionOptions& options,
        ProgressCallback progressCallback = nullptr
    );

    std::string getVersion() const;
    bool hasGPUSupport() const;
    int getCPUCores() const;
    std::string getGPUInfo() const;
    std::vector<std::string> getSupportedFormats() const;

private:
    AVFormatContext* inputFormatContext;
    AVFormatContext* outputFormatContext;
    AVCodecContext* decoderContext;
    AVCodecContext* encoderContext;
    AVBufferRef* hwDeviceContext;
    
    bool initializeDecoder(const std::string& inputPath);
    bool initializeEncoder(const std::string& outputPath, const std::string& format, const ConversionOptions& options);
    bool processFrames(ProgressCallback progressCallback);
    void cleanup();
    
    bool initGPUAcceleration();
    AVCodec* findBestEncoder(const std::string& format, bool useGPU);
    void configureQuality(const ConversionOptions& options);
};

// Node.js wrapper class
class ConverterWrapper : public Napi::ObjectWrap<ConverterWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    ConverterWrapper(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;
    
    Napi::Value ConvertMedia(const Napi::CallbackInfo& info);
    Napi::Value GetVersion(const Napi::CallbackInfo& info);
    Napi::Value HasGPUSupport(const Napi::CallbackInfo& info);
    Napi::Value GetCPUCores(const Napi::CallbackInfo& info);
    Napi::Value GetGPUInfo(const Napi::CallbackInfo& info);
    Napi::Value GetFFmpegVersion(const Napi::CallbackInfo& info);
    Napi::Value GetSupportedFormats(const Napi::CallbackInfo& info);
    
    MediaConverter* converter;
};

} // namespace NebulaConverter

#endif // NEBULA_CONVERTER_H
