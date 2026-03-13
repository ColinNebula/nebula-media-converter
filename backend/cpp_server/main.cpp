#include <crow.h>
#include <fstream>
#include <filesystem>
#include <memory>
#include <random>
#include <sstream>
#include <iomanip>
#include "../native/include/converter.h"

namespace fs = std::filesystem;

class ConversionServer {
public:
    ConversionServer() : app() {
        setupRoutes();
    }

    void run(int port = 8080) {
        app.port(port).multithreaded().run();
    }

private:
    crow::SimpleApp app;

    static std::string generateUniqueId() {
        std::random_device rd;
        std::mt19937_64 gen(rd());
        std::uniform_int_distribution<uint64_t> dis;
        std::ostringstream oss;
        oss << std::hex << std::setfill('0')
            << std::setw(16) << dis(gen)
            << std::setw(16) << dis(gen);
        return oss.str();
    }

    void setupRoutes() {
        // Health check endpoint
        CROW_ROUTE(app, "/health")
        ([](){
            crow::json::wvalue response;
            response["status"] = "healthy";
            response["service"] = "Nebula C++ Conversion Service";
            response["version"] = "1.0.0";
            return response;
        });

        // System info endpoint
        CROW_ROUTE(app, "/api/system/info")
        ([this](){
            auto conv = std::make_unique<NebulaConverter::MediaConverter>();
            
            crow::json::wvalue response;
            response["cpuCores"] = conv->getCPUCores();
            response["gpuSupport"] = conv->hasGPUSupport();
            response["gpuInfo"] = conv->getGPUInfo();
            response["ffmpegVersion"] = conv->getVersion();
            
            auto formats = conv->getSupportedFormats();
            crow::json::wvalue::list formatList;
            for (const auto& fmt : formats) {
                formatList.push_back(fmt);
            }
            response["supportedFormats"] = std::move(formatList);
            
            return response;
        });

        // Upload and convert endpoint
        CROW_ROUTE(app, "/api/convert")
        .methods(crow::HTTPMethod::POST)
        ([this](const crow::request& req){
            try {
                auto multipart = crow::multipart::message(req);
                
                // Extract file
                auto filePart = multipart.get_part_by_name("file");
                if (!filePart.body.size()) {
                    return crow::response(400, "No file uploaded");
                }

                // Extract parameters
                std::string outputFormat = multipart.get_part_by_name("format").body;
                std::string quality = multipart.get_part_by_name("quality").body;
                bool useGPU = multipart.get_part_by_name("useGPU").body == "true";

                // Save uploaded file temporarily with a unique name to avoid race conditions
                std::string tempDir = fs::temp_directory_path().string();
                std::string uniqueId = generateUniqueId();
                std::string inputPath = tempDir + "/nebula_in_" + uniqueId;
                std::string outputPath = tempDir + "/nebula_out_" + uniqueId + "." + outputFormat;

                std::ofstream outFile(inputPath, std::ios::binary);
                outFile.write(filePart.body.data(), filePart.body.size());
                outFile.close();

                // Convert
                auto conv = std::make_unique<NebulaConverter::MediaConverter>();
                NebulaConverter::ConversionOptions options;
                options.quality = quality.empty() ? "medium" : quality;
                options.useGPU = useGPU;
                options.threads = 0; // Auto-detect
                options.preset = "medium";
                options.bitrate = "auto";

                bool success = conv->convertMedia(inputPath, outputPath, outputFormat, options);

                if (!success) {
                    fs::remove(inputPath);
                    return crow::response(500, "Conversion failed");
                }

                // Read converted file
                std::ifstream convertedFile(outputPath, std::ios::binary);
                std::vector<char> fileData((std::istreambuf_iterator<char>(convertedFile)),
                                          std::istreambuf_iterator<char>());
                convertedFile.close();

                // Cleanup
                fs::remove(inputPath);
                fs::remove(outputPath);

                // Return converted file
                crow::response res;
                res.code = 200;
                res.set_header("Content-Type", "application/octet-stream");
                res.set_header("Content-Disposition", "attachment; filename=converted." + outputFormat);
                res.body = std::string(fileData.begin(), fileData.end());
                return res;

            } catch (const std::exception& e) {
                crow::json::wvalue error;
                error["error"] = e.what();
                return crow::response(500, error);
            }
        });

        // Batch conversion endpoint
        CROW_ROUTE(app, "/api/batch-convert")
        .methods(crow::HTTPMethod::POST)
        ([this](const crow::request& req){
            // Implement batch conversion
            crow::json::wvalue response;
            response["message"] = "Batch conversion endpoint - implementation pending";
            response["status"] = "not_implemented";
            return crow::response(501, response);
        });

        // Queue status endpoint
        CROW_ROUTE(app, "/api/queue/status")
        ([this](){
            crow::json::wvalue response;
            response["queueSize"] = 0;
            response["processing"] = 0;
            response["completed"] = 0;
            return response;
        });
    }
};

int main() {
    std::cout << "🚀 Nebula C++ Conversion Server Starting..." << std::endl;
    std::cout << "⚡ High-performance FFmpeg processing with GPU acceleration" << std::endl;
    
    ConversionServer server;
    
    std::cout << "✅ Server running on http://localhost:8080" << std::endl;
    std::cout << "📊 Health check: http://localhost:8080/health" << std::endl;
    std::cout << "🔧 System info: http://localhost:8080/api/system/info" << std::endl;
    
    server.run(8080);
    
    return 0;
}
