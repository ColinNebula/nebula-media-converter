#include "converter.h"
#include <thread>
#include <iostream>
#include <cstring>

namespace NebulaConverter {

MediaConverter::MediaConverter()
    : inputFormatContext(nullptr),
      outputFormatContext(nullptr),
      decoderContext(nullptr),
      encoderContext(nullptr),
      hwDeviceContext(nullptr) {
}

MediaConverter::~MediaConverter() {
    cleanup();
}

bool MediaConverter::convertMedia(
    const std::string& inputPath,
    const std::string& outputPath,
    const std::string& format,
    const ConversionOptions& options,
    ProgressCallback progressCallback
) {
    try {
        // Initialize decoder
        if (!initializeDecoder(inputPath)) {
            return false;
        }

        // Initialize encoder
        if (!initializeEncoder(outputPath, format, options)) {
            cleanup();
            return false;
        }

        // Process frames
        if (!processFrames(progressCallback)) {
            cleanup();
            return false;
        }

        // Write trailer and cleanup
        av_write_trailer(outputFormatContext);
        cleanup();

        return true;
    } catch (const std::exception& e) {
        std::cerr << "Conversion error: " << e.what() << std::endl;
        cleanup();
        return false;
    }
}

bool MediaConverter::initializeDecoder(const std::string& inputPath) {
    // Open input file
    if (avformat_open_input(&inputFormatContext, inputPath.c_str(), nullptr, nullptr) < 0) {
        std::cerr << "Could not open input file: " << inputPath << std::endl;
        return false;
    }

    // Get stream information
    if (avformat_find_stream_info(inputFormatContext, nullptr) < 0) {
        std::cerr << "Could not find stream information" << std::endl;
        return false;
    }

    // Find best stream
    int streamIndex = av_find_best_stream(inputFormatContext, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    if (streamIndex < 0) {
        streamIndex = av_find_best_stream(inputFormatContext, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
    }

    if (streamIndex < 0) {
        std::cerr << "Could not find valid stream" << std::endl;
        return false;
    }

    AVStream* stream = inputFormatContext->streams[streamIndex];
    
    // Find decoder
    AVCodec* decoder = avcodec_find_decoder(stream->codecpar->codec_id);
    if (!decoder) {
        std::cerr << "Decoder not found" << std::endl;
        return false;
    }

    // Allocate decoder context
    decoderContext = avcodec_alloc_context3(decoder);
    if (!decoderContext) {
        std::cerr << "Could not allocate decoder context" << std::endl;
        return false;
    }

    // Copy codec parameters to decoder context
    if (avcodec_parameters_to_context(decoderContext, stream->codecpar) < 0) {
        std::cerr << "Could not copy codec parameters" << std::endl;
        return false;
    }

    // Open decoder
    if (avcodec_open2(decoderContext, decoder, nullptr) < 0) {
        std::cerr << "Could not open decoder" << std::endl;
        return false;
    }

    return true;
}

bool MediaConverter::initializeEncoder(
    const std::string& outputPath,
    const std::string& format,
    const ConversionOptions& options
) {
    // Allocate output format context
    avformat_alloc_output_context2(&outputFormatContext, nullptr, nullptr, outputPath.c_str());
    if (!outputFormatContext) {
        std::cerr << "Could not create output context" << std::endl;
        return false;
    }

    // Find encoder
    AVCodec* encoder = findBestEncoder(format, options.useGPU);
    if (!encoder) {
        std::cerr << "Encoder not found for format: " << format << std::endl;
        return false;
    }

    // Create output stream
    AVStream* outStream = avformat_new_stream(outputFormatContext, nullptr);
    if (!outStream) {
        std::cerr << "Could not create output stream" << std::endl;
        return false;
    }

    // Allocate encoder context
    encoderContext = avcodec_alloc_context3(encoder);
    if (!encoderContext) {
        std::cerr << "Could not allocate encoder context" << std::endl;
        return false;
    }

    // Configure encoder
    if (decoderContext->codec_type == AVMEDIA_TYPE_VIDEO) {
        encoderContext->width = decoderContext->width;
        encoderContext->height = decoderContext->height;
        encoderContext->sample_aspect_ratio = decoderContext->sample_aspect_ratio;
        encoderContext->pix_fmt = options.useGPU ? AV_PIX_FMT_CUDA : AV_PIX_FMT_YUV420P;
        encoderContext->time_base = decoderContext->time_base;
        encoderContext->framerate = decoderContext->framerate;
    } else if (decoderContext->codec_type == AVMEDIA_TYPE_AUDIO) {
        encoderContext->sample_rate = decoderContext->sample_rate;
        encoderContext->channel_layout = decoderContext->channel_layout;
        encoderContext->channels = decoderContext->channels;
        encoderContext->sample_fmt = encoder->sample_fmts[0];
        encoderContext->time_base = { 1, decoderContext->sample_rate };
    }

    // Set threads
    encoderContext->thread_count = options.threads > 0 ? options.threads : std::thread::hardware_concurrency();

    // Configure quality
    configureQuality(options);

    // GPU acceleration
    if (options.useGPU && initGPUAcceleration()) {
        encoderContext->hw_device_ctx = av_buffer_ref(hwDeviceContext);
    }

    // Open encoder
    if (avcodec_open2(encoderContext, encoder, nullptr) < 0) {
        std::cerr << "Could not open encoder" << std::endl;
        return false;
    }

    // Copy encoder parameters to output stream
    if (avcodec_parameters_from_context(outStream->codecpar, encoderContext) < 0) {
        std::cerr << "Could not copy encoder parameters" << std::endl;
        return false;
    }

    outStream->time_base = encoderContext->time_base;

    // Open output file
    if (!(outputFormatContext->oformat->flags & AVFMT_NOFILE)) {
        if (avio_open(&outputFormatContext->pb, outputPath.c_str(), AVIO_FLAG_WRITE) < 0) {
            std::cerr << "Could not open output file: " << outputPath << std::endl;
            return false;
        }
    }

    // Write header
    if (avformat_write_header(outputFormatContext, nullptr) < 0) {
        std::cerr << "Could not write header" << std::endl;
        return false;
    }

    return true;
}

bool MediaConverter::processFrames(ProgressCallback progressCallback) {
    AVPacket* packet = av_packet_alloc();
    AVFrame* frame = av_frame_alloc();
    AVFrame* encodedFrame = av_frame_alloc();

    if (!packet || !frame || !encodedFrame) {
        av_packet_free(&packet);
        av_frame_free(&frame);
        av_frame_free(&encodedFrame);
        return false;
    }

    int64_t totalDuration = inputFormatContext->duration;
    int64_t processedDuration = 0;

    // Read frames
    while (av_read_frame(inputFormatContext, packet) >= 0) {
        // Decode
        if (avcodec_send_packet(decoderContext, packet) >= 0) {
            while (avcodec_receive_frame(decoderContext, frame) >= 0) {
                // Update progress
                processedDuration = frame->pts * av_q2d(decoderContext->time_base) * AV_TIME_BASE;
                if (progressCallback && totalDuration > 0) {
                    ConversionProgress progress;
                    progress.percentage = (double)processedDuration / totalDuration * 100.0;
                    progress.message = "Converting...";
                    progress.processedBytes = processedDuration;
                    progress.totalBytes = totalDuration;
                    progressCallback(progress);
                }

                // Encode
                if (avcodec_send_frame(encoderContext, frame) >= 0) {
                    AVPacket* outPacket = av_packet_alloc();
                    while (avcodec_receive_packet(encoderContext, outPacket) >= 0) {
                        // Write packet
                        av_packet_rescale_ts(outPacket, encoderContext->time_base,
                                           outputFormatContext->streams[0]->time_base);
                        outPacket->stream_index = 0;
                        av_interleaved_write_frame(outputFormatContext, outPacket);
                    }
                    av_packet_free(&outPacket);
                }
            }
        }
        av_packet_unref(packet);
    }

    // Flush encoders
    avcodec_send_frame(encoderContext, nullptr);
    AVPacket* outPacket = av_packet_alloc();
    while (avcodec_receive_packet(encoderContext, outPacket) >= 0) {
        av_packet_rescale_ts(outPacket, encoderContext->time_base,
                           outputFormatContext->streams[0]->time_base);
        outPacket->stream_index = 0;
        av_interleaved_write_frame(outputFormatContext, outPacket);
    }
    av_packet_free(&outPacket);

    av_packet_free(&packet);
    av_frame_free(&frame);
    av_frame_free(&encodedFrame);

    return true;
}

bool MediaConverter::initGPUAcceleration() {
    // Try NVIDIA CUDA first
    if (av_hwdevice_ctx_create(&hwDeviceContext, AV_HWDEVICE_TYPE_CUDA, nullptr, nullptr, 0) >= 0) {
        std::cout << "✅ NVIDIA CUDA acceleration enabled" << std::endl;
        return true;
    }

    // Try AMD on Windows
#ifdef _WIN32
    if (av_hwdevice_ctx_create(&hwDeviceContext, AV_HWDEVICE_TYPE_D3D11VA, nullptr, nullptr, 0) >= 0) {
        std::cout << "✅ D3D11 acceleration enabled" << std::endl;
        return true;
    }
#endif

    // Try VAAPI on Linux
#ifdef __linux__
    if (av_hwdevice_ctx_create(&hwDeviceContext, AV_HWDEVICE_TYPE_VAAPI, nullptr, nullptr, 0) >= 0) {
        std::cout << "✅ VAAPI acceleration enabled" << std::endl;
        return true;
    }
#endif

    // Try VideoToolbox on macOS
#ifdef __APPLE__
    if (av_hwdevice_ctx_create(&hwDeviceContext, AV_HWDEVICE_TYPE_VIDEOTOOLBOX, nullptr, nullptr, 0) >= 0) {
        std::cout << "✅ VideoToolbox acceleration enabled" << std::endl;
        return true;
    }
#endif

    std::cout << "⚠️ GPU acceleration not available, using CPU" << std::endl;
    return false;
}

AVCodec* MediaConverter::findBestEncoder(const std::string& format, bool useGPU) {
    std::string codecName;

    // Map formats to codecs
    if (format == "mp4" || format == "m4v") {
        codecName = useGPU ? "h264_nvenc" : "libx264";
    } else if (format == "mkv") {
        codecName = useGPU ? "hevc_nvenc" : "libx265";
    } else if (format == "webm") {
        codecName = useGPU ? "vp9_vaapi" : "libvpx-vp9";
    } else if (format == "mp3") {
        codecName = "libmp3lame";
    } else if (format == "aac" || format == "m4a") {
        codecName = "aac";
    } else if (format == "flac") {
        codecName = "flac";
    } else if (format == "wav") {
        codecName = "pcm_s16le";
    }

    AVCodec* encoder = avcodec_find_encoder_by_name(codecName.c_str());
    if (!encoder && useGPU) {
        // Fallback to CPU encoder
        codecName = format == "mp4" ? "libx264" : "libx265";
        encoder = avcodec_find_encoder_by_name(codecName.c_str());
    }

    return encoder;
}

void MediaConverter::configureQuality(const ConversionOptions& options) {
    if (options.quality == "high") {
        encoderContext->bit_rate = 5000000; // 5 Mbps
        av_opt_set(encoderContext->priv_data, "preset", "slow", 0);
    } else if (options.quality == "medium") {
        encoderContext->bit_rate = 2500000; // 2.5 Mbps
        av_opt_set(encoderContext->priv_data, "preset", "medium", 0);
    } else if (options.quality == "low") {
        encoderContext->bit_rate = 1000000; // 1 Mbps
        av_opt_set(encoderContext->priv_data, "preset", "fast", 0);
    }

    if (!options.bitrate.empty() && options.bitrate != "auto") {
        encoderContext->bit_rate = std::stoi(options.bitrate);
    }
}

void MediaConverter::cleanup() {
    if (decoderContext) {
        avcodec_free_context(&decoderContext);
    }
    if (encoderContext) {
        avcodec_free_context(&encoderContext);
    }
    if (inputFormatContext) {
        avformat_close_input(&inputFormatContext);
    }
    if (outputFormatContext) {
        if (!(outputFormatContext->oformat->flags & AVFMT_NOFILE)) {
            avio_closep(&outputFormatContext->pb);
        }
        avformat_free_context(outputFormatContext);
        outputFormatContext = nullptr;
    }
    if (hwDeviceContext) {
        av_buffer_unref(&hwDeviceContext);
    }
}

std::string MediaConverter::getVersion() const {
    return "1.0.0-native";
}

bool MediaConverter::hasGPUSupport() const {
    AVBufferRef* testContext = nullptr;
    bool hasGPU = av_hwdevice_ctx_create(&testContext, AV_HWDEVICE_TYPE_CUDA, nullptr, nullptr, 0) >= 0;
    if (testContext) {
        av_buffer_unref(&testContext);
    }
    return hasGPU;
}

int MediaConverter::getCPUCores() const {
    return std::thread::hardware_concurrency();
}

std::string MediaConverter::getGPUInfo() const {
    // Simplified GPU detection
    if (hasGPUSupport()) {
        return "NVIDIA CUDA Compatible GPU";
    }
    return "No GPU acceleration available";
}

std::vector<std::string> MediaConverter::getSupportedFormats() const {
    return {
        "mp4", "avi", "mkv", "mov", "webm", "flv",
        "mp3", "aac", "flac", "wav", "m4a", "ogg",
        "jpg", "png", "gif", "bmp", "webp"
    };
}

} // namespace NebulaConverter
