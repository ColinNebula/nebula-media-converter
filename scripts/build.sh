#!/bin/bash
# Build scripts for C++ native addon and Electron packaging (Linux/macOS)

echo "🔨 Building Nebula C++ Components..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check FFmpeg installation
echo -e "\n${YELLOW}📦 Checking FFmpeg installation...${NC}"

if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}✅ FFmpeg is installed${NC}"
else
    echo -e "${YELLOW}FFmpeg not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install -y build-essential cmake pkg-config
        sudo apt-get install -y libavcodec-dev libavformat-dev libavutil-dev \
                                libswscale-dev libswresample-dev
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ffmpeg cmake
        else
            echo -e "${RED}❌ Homebrew not installed. Please install FFmpeg manually${NC}"
            exit 1
        fi
    fi
fi

# Step 2: Install Node.js dependencies
echo -e "\n${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install

# Step 3: Build C++ native addon
echo -e "\n${YELLOW}🔧 Building C++ native addon...${NC}"

if npm run addon:build; then
    echo -e "${GREEN}✅ C++ addon built successfully${NC}"
else
    echo -e "${YELLOW}⚠️ C++ addon build failed (will fallback to FFmpeg.wasm)${NC}"
fi

# Step 4: Build React app
echo -e "\n${YELLOW}⚛️ Building React application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ React build failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ All builds completed successfully!${NC}"
echo -e "\n${CYAN}Next steps:${NC}"
echo -e "  • Run desktop app: npm run electron:dev"
echo -e "  • Package for distribution: npm run electron:build"
echo -e "  • Start C++ backend server: See backend/cpp_server/README.md"
