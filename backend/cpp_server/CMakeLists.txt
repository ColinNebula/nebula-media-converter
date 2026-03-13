cmake_minimum_required(VERSION 3.15)
project(NebulaConversionServer)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(PkgConfig REQUIRED)

# FFmpeg
pkg_check_modules(FFMPEG REQUIRED
    libavcodec
    libavformat
    libavutil
    libswscale
    libswresample
)

# Crow (header-only, assuming installed or in include path)
# Download from: https://github.com/CrowCpp/Crow

# Boost (required by Crow)
find_package(Boost REQUIRED COMPONENTS system)

# Include directories
include_directories(
    ${FFMPEG_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
    ${CMAKE_SOURCE_DIR}/../../native/include
    ${CMAKE_SOURCE_DIR}/include
)

# Source files
set(SOURCES
    main.cpp
    ../../native/src/converter.cpp
    ../../native/src/gpu_detector.cpp
    ../../native/src/utils.cpp
)

# Executable
add_executable(nebula_server ${SOURCES})

# Link libraries
target_link_libraries(nebula_server
    ${FFMPEG_LIBRARIES}
    ${Boost_LIBRARIES}
    pthread
)

# Compiler flags
if(UNIX)
    target_compile_options(nebula_server PRIVATE -Wall -Wextra -O3)
endif()

if(WIN32)
    target_compile_options(nebula_server PRIVATE /W4 /O2)
endif()

# Installation
install(TARGETS nebula_server DESTINATION bin)
