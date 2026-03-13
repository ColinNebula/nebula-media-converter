#!/bin/bash

# ============================================
# NEBULA MEDIA CONVERTER - GITHUB PREP
# Security & Safety Script (Bash version)
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  NEBULA MEDIA CONVERTER - GITHUB PREP${NC}"
echo -e "${CYAN}  Security & Safety Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

cd "$PROJECT_ROOT"
echo -e "${GRAY}📁 Working directory: $PROJECT_ROOT${NC}"

# ============================================
# STEP 1: Check for sensitive files
# ============================================
echo ""
echo -e "${YELLOW}🔍 STEP 1: Scanning for sensitive files...${NC}"

SENSITIVE_COUNT=0
for pattern in "*.pem" "*.key" "*.crt" "*.p12" ".env" "*credentials*.json" "*secret*"; do
    FILES=$(find . -name "$pattern" -type f ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null || true)
    if [ -n "$FILES" ]; then
        if [ $SENSITIVE_COUNT -eq 0 ]; then
            echo -e "${RED}⚠️  Found potentially sensitive files:${NC}"
        fi
        echo "$FILES" | while read -r file; do
            echo -e "${RED}   - ${file#./}${NC}"
        done
        SENSITIVE_COUNT=$((SENSITIVE_COUNT + 1))
    fi
done

if [ $SENSITIVE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No sensitive files found outside of node_modules${NC}"
fi

# ============================================
# STEP 2: Validate .env handling
# ============================================
echo ""
echo -e "${YELLOW}🔐 STEP 2: Validating environment configuration...${NC}"

if [ -f ".env" ]; then
    if grep -q "^\.env$\|^\*\.env$" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ .env is properly ignored in .gitignore${NC}"
    else
        echo -e "${RED}⚠️  WARNING: .env may not be properly ignored!${NC}"
    fi
else
    echo -e "${GRAY}ℹ️  No .env file found (this is fine if using .env.example)${NC}"
fi

if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example template exists${NC}"
else
    echo -e "${YELLOW}⚠️  Missing .env.example - users won't know required variables${NC}"
fi

# ============================================
# STEP 3: Check for large files
# ============================================
echo ""
echo -e "${YELLOW}📦 STEP 3: Checking for large files...${NC}"

LARGE_FILES=$(find . -type f -size +10M ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null || true)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Large files found (>10MB):${NC}"
    echo "$LARGE_FILES" | while read -r file; do
        SIZE=$(du -h "$file" | cut -f1)
        echo -e "${YELLOW}   - ${file#./} ($SIZE)${NC}"
    done
else
    echo -e "${GREEN}✅ No excessively large files found${NC}"
fi

# ============================================
# STEP 4: Run npm audit
# ============================================
echo ""
echo -e "${YELLOW}🛡️ STEP 4: Running npm security audit...${NC}"

if command -v npm &> /dev/null; then
    AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
    CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' || echo "0")
    HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' || echo "0")
    
    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}⚠️  Security vulnerabilities found: Critical=$CRITICAL, High=$HIGH${NC}"
        echo -e "${YELLOW}   Run 'npm audit fix' to attempt automatic fixes${NC}"
    else
        echo -e "${GREEN}✅ No high-severity vulnerabilities found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm not available, skipping audit${NC}"
fi

# ============================================
# STEP 5: Verify Git status
# ============================================
echo ""
echo -e "${YELLOW}📝 STEP 5: Checking Git status...${NC}"

if command -v git &> /dev/null && [ -d ".git" ]; then
    STAGED=$(git diff --cached --name-only 2>/dev/null || true)
    SENSITIVE_STAGED=$(echo "$STAGED" | grep -E "\.env$|\.pem$|\.key$|credentials|secret" || true)
    
    if [ -n "$SENSITIVE_STAGED" ]; then
        echo -e "${RED}🚨 DANGER: Sensitive files are staged for commit!${NC}"
        echo "$SENSITIVE_STAGED" | while read -r file; do
            echo -e "${RED}   - $file${NC}"
        done
    else
        echo -e "${GREEN}✅ No sensitive files are staged for commit${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a Git repository or Git not available${NC}"
fi

# ============================================
# Final Summary
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PREPARATION COMPLETE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Review any warnings above"
echo "  2. Run: git add ."
echo "  3. Run: git commit -m 'Prepare for GitHub'"
echo "  4. Run: git push origin main"
echo ""
echo -e "${CYAN}After pushing, enable in GitHub repository settings:${NC}"
echo "  - Branch protection rules for 'main'"
echo "  - Require pull request reviews"
echo "  - Enable secret scanning"
echo "  - Enable Dependabot alerts"
echo ""
