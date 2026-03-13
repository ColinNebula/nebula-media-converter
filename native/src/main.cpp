#include "converter.h"
#include <iostream>

namespace NebulaConverter {

Napi::FunctionReference ConverterWrapper::constructor;

Napi::Object ConverterWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "NativeConverter", {
        InstanceMethod("convertMedia", &ConverterWrapper::ConvertMedia),
        InstanceMethod("getVersion", &ConverterWrapper::GetVersion),
        InstanceMethod("hasGPUSupport", &ConverterWrapper::HasGPUSupport),
        InstanceMethod("getCPUCores", &ConverterWrapper::GetCPUCores),
        InstanceMethod("getGPUInfo", &ConverterWrapper::GetGPUInfo),
        InstanceMethod("getFFmpegVersion", &ConverterWrapper::GetFFmpegVersion),
        InstanceMethod("getSupportedFormats", &ConverterWrapper::GetSupportedFormats),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("NativeConverter", func);
    return exports;
}

ConverterWrapper::ConverterWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<ConverterWrapper>(info) {
    converter = new MediaConverter();
}

Napi::Value ConverterWrapper::ConvertMedia(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object params = info[0].As<Napi::Object>();

    std::string inputPath = params.Get("inputPath").As<Napi::String>().Utf8Value();
    std::string outputPath = params.Get("outputPath").As<Napi::String>().Utf8Value();
    std::string format = params.Get("format").As<Napi::String>().Utf8Value();

    ConversionOptions options;
    if (params.Has("options")) {
        Napi::Object opts = params.Get("options").As<Napi::Object>();
        options.quality = opts.Get("quality").As<Napi::String>().Utf8Value();
        options.bitrate = opts.Get("bitrate").As<Napi::String>().Utf8Value();
        options.useGPU = opts.Get("useGPU").As<Napi::Boolean>().Value();
        options.threads = opts.Get("threads").As<Napi::Number>().Int32Value();
        options.preset = opts.Get("preset").As<Napi::String>().Utf8Value();
    }

    // Progress callback (simplified for now)
    ProgressCallback progressCallback = nullptr;
    if (params.Has("progressCallback") && params.Get("progressCallback").IsFunction()) {
        Napi::Function jsCallback = params.Get("progressCallback").As<Napi::Function>();
        // Note: Full async implementation would require ThreadSafeFunction
    }

    bool success = converter->convertMedia(inputPath, outputPath, format, options, progressCallback);

    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, success));
    result.Set("outputPath", Napi::String::New(env, outputPath));

    return result;
}

Napi::Value ConverterWrapper::GetVersion(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), converter->getVersion());
}

Napi::Value ConverterWrapper::HasGPUSupport(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), converter->hasGPUSupport());
}

Napi::Value ConverterWrapper::GetCPUCores(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), converter->getCPUCores());
}

Napi::Value ConverterWrapper::GetGPUInfo(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), converter->getGPUInfo());
}

Napi::Value ConverterWrapper::GetFFmpegVersion(const Napi::CallbackInfo& info) {
    char version[64];
    snprintf(version, sizeof(version), "FFmpeg %d.%d.%d",
             LIBAVCODEC_VERSION_MAJOR,
             LIBAVCODEC_VERSION_MINOR,
             LIBAVCODEC_VERSION_MICRO);
    return Napi::String::New(info.Env(), version);
}

Napi::Value ConverterWrapper::GetSupportedFormats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::vector<std::string> formats = converter->getSupportedFormats();
    
    Napi::Array result = Napi::Array::New(env, formats.size());
    for (size_t i = 0; i < formats.size(); i++) {
        result.Set(i, Napi::String::New(env, formats[i]));
    }
    
    return result;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return ConverterWrapper::Init(env, exports);
}

NODE_API_MODULE(nebula_native_converter, InitAll)

} // namespace NebulaConverter
