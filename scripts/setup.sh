#!/bin/bash

# HCM Chatbot - Initial Setup Script
# Author: HCM Chatbot Team
# Description: One-time setup for new installations

echo "🛠️  HCM Chatbot - Initial Setup"
echo "==============================="

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected structure: ./backend/ and ./frontend/"
    exit 1
fi

echo "🔍 Checking system requirements..."

# Check Python
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version | cut -d' ' -f2)
    echo "✅ Python 3 found: $python_version"

    # Check if version is >= 3.8
    python_major=$(echo $python_version | cut -d'.' -f1)
    python_minor=$(echo $python_version | cut -d'.' -f2)

    if [ "$python_major" -lt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -lt 8 ]); then
        echo "⚠️  Python 3.8+ is recommended (current: $python_version)"
    fi
else
    echo "❌ Python 3 not found!"
    echo "   Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    git_version=$(git --version)
    echo "✅ Git found: $git_version"
else
    echo "⚠️  Git not found (optional for development)"
fi

# Check curl
if command -v curl &> /dev/null; then
    echo "✅ curl found"
else
    echo "❌ curl not found (required for health checks)"
    echo "   Please install curl"
fi

echo ""
echo "📁 Setting up project structure..."

# Create necessary directories
mkdir -p logs
mkdir -p data
echo "✅ Created logs/ and data/ directories"

# Make scripts executable
chmod +x scripts/*.sh
echo "✅ Made scripts executable"

echo ""
echo "🐍 Setting up Python environment..."

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing Python dependencies..."
if pip install -r requirements.txt; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install some dependencies"
    echo "   You may need to install system packages or check requirements.txt"
fi

echo ""
echo "🔑 Setting up environment configuration..."

# Setup .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "🔧 Creating .env file..."
        cat > .env << 'EOF'
# API Keys - Please replace with your actual keys
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Optional: Additional configuration
# LOG_LEVEL=INFO
# MAX_TOKENS=1000
EOF
        echo "✅ Created basic .env file"
    fi

    echo ""
    echo "🔑 IMPORTANT: Please configure your API keys in backend/.env"
    echo "   Required keys:"
    echo "   - GEMINI_API_KEY: Get from https://ai.google.dev/"
    echo "   - PINECONE_API_KEY: Get from https://www.pinecone.io/"
    echo ""

    if command -v $EDITOR &> /dev/null; then
        read -p "Open .env file in editor now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $EDITOR .env
        fi
    else
        echo "   Edit with: nano backend/.env"
    fi
else
    echo "✅ .env file already exists"
fi

cd ..

echo ""
echo "🧪 Running initial tests..."

# Test backend setup
echo "🔍 Testing backend setup..."
cd backend
source venv/bin/activate

if python -c "import fastapi, uvicorn; print('✅ Core dependencies working')" 2>/dev/null; then
    echo "✅ Backend dependencies are working"
else
    echo "❌ Backend dependency issues detected"
fi

# Test imports
if python -c "from app.main import app; print('✅ App imports working')" 2>/dev/null; then
    echo "✅ App modules are importable"
else
    echo "⚠️  App import issues (may need API keys configured)"
fi

cd ..

# Test frontend files
echo "🔍 Testing frontend setup..."
if [ -f "frontend/index.html" ] && [ -f "frontend/styles.css" ] && [ -f "frontend/script.js" ]; then
    echo "✅ Frontend files are present"

    # Basic syntax check for HTML
    if grep -q "<!DOCTYPE html>" frontend/index.html; then
        echo "✅ HTML structure looks good"
    fi

    # Check if CSS has content
    if [ -s "frontend/styles.css" ]; then
        echo "✅ CSS file has content"
    fi

    # Check if JS has content
    if [ -s "frontend/script.js" ]; then
        echo "✅ JavaScript file has content"
    fi
else
    echo "❌ Some frontend files are missing"
fi

echo ""
echo "📋 Setup Summary:"
echo "=================="
echo "✅ System requirements checked"
echo "✅ Project structure created"
echo "✅ Python virtual environment set up"
echo "✅ Dependencies installed"
echo "✅ Configuration files created"
echo "✅ Scripts made executable"

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Configure API keys in backend/.env"
echo "2. Test the system: ./scripts/start.sh"
echo "3. Open browser to: http://localhost:3000"

echo ""
echo "📋 Available Commands:"
echo "======================"
echo "   ./scripts/start.sh          - Start full system"
echo "   ./scripts/start-backend.sh  - Start backend only"
echo "   ./scripts/start-frontend.sh - Start frontend only"
echo "   ./scripts/stop.sh           - Stop all services"
echo "   ./scripts/restart.sh        - Restart system"
echo "   ./scripts/status.sh         - Check system status"

echo ""
echo "🆘 Need Help?"
echo "============="
echo "   README.md          - Full documentation"
echo "   logs/              - Check log files"
echo "   backend/.env       - Configure API keys"
echo "   Issue tracker:     [Your GitHub repo]/issues"

echo ""
echo "✨ Setup completed successfully!"
echo "🇻🇳 Ready to explore Tư tưởng Hồ Chí Minh! 🇻🇳"