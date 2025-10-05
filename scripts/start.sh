#!/bin/bash

# HCM Chatbot - Start Script
# Author: HCM Chatbot Team
# Description: Automatically starts backend and frontend servers

echo "🚀 Starting HCM Chatbot System..."
echo "=================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected structure: ./backend/ and ./frontend/"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is already in use!"
        echo "   Run './scripts/stop.sh' first or kill the process manually"
        return 1
    fi
    return 0
}

# Check ports availability
if ! check_port 8000; then
    echo "   Backend port (8000) is busy"
    exit 1
fi

if ! check_port 3000; then
    echo "   Frontend port (3000) is busy"
    echo "   Continuing anyway (frontend might open on different port)..."
fi

echo ""
echo "📡 Setting up Backend..."
echo "========================"

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Virtual environment not found. Creating new one..."
    if ! python3 -m venv venv; then
        echo "❌ Failed to create virtual environment"
        echo "   Please ensure Python 3.8+ is installed"
        exit 1
    fi
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if [ ! -f "venv/pyvenv.cfg" ] || [ ! -d "venv/lib" ]; then
    echo "🔧 Installing Python dependencies..."
    if ! pip install -r requirements.txt; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Virtual environment ready"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    if [ -f ".env.example" ]; then
        echo "📄 Copying .env.example to .env..."
        cp .env.example .env
        echo ""
        echo "🔑 IMPORTANT: Please add your API keys to .env file:"
        echo "   - GEMINI_API_KEY=your_key_here"
        echo "   - PINECONE_API_KEY=your_key_here"
        echo ""
        read -p "Press Enter after editing .env file (or Ctrl+C to exit)..."
    else
        echo "❌ No .env.example found. Please create .env file manually"
        exit 1
    fi
else
    echo "✅ Environment file found"
fi

# Start backend server
echo "🚀 Starting backend server..."
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

echo "✅ Backend started successfully!"
echo "   PID: $BACKEND_PID"
echo "   URL: http://localhost:8000"
echo "   Logs: logs/backend.log"

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Test backend health
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed (might still be starting up)"
fi

echo ""
echo "🎨 Setting up Frontend..."
echo "========================="

# Navigate to frontend directory
cd ../frontend

# Start frontend server
echo "🚀 Starting frontend server..."

# Try different methods to serve frontend
if command -v python3 &> /dev/null; then
    nohup python3 -m http.server 3000 > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    echo "✅ Frontend started with Python HTTP server"
    echo "   PID: $FRONTEND_PID"
    echo "   URL: http://localhost:3000"
elif command -v python &> /dev/null; then
    nohup python -m http.server 3000 > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    echo "✅ Frontend started with Python HTTP server"
    echo "   PID: $FRONTEND_PID"
    echo "   URL: http://localhost:3000"
else
    echo "⚠️  Python not found for HTTP server"
    echo "   You can:"
    echo "   1. Open frontend/index.html directly in browser"
    echo "   2. Use VS Code Live Server extension"
    echo "   3. Install Python and run this script again"
fi

echo ""
echo "🎉 HCM Chatbot System Started!"
echo "==============================="
echo ""
echo "📡 Backend API:  http://localhost:8000"
echo "📚 API Docs:     http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
if [ ! -z "$FRONTEND_PID" ]; then
    echo "🌐 Frontend:     http://localhost:3000"
fi
echo ""
echo "📋 Management Commands:"
echo "   Stop system:  ./scripts/stop.sh"
echo "   View logs:    tail -f logs/backend.log"
echo "   Check status: ./scripts/status.sh"
echo ""
echo "🔑 Don't forget to configure your API keys in backend/.env"
echo ""

# Try to open browser (optional)
if command -v open &> /dev/null; then
    echo "🌐 Opening browser..."
    sleep 2
    if [ ! -z "$FRONTEND_PID" ]; then
        open http://localhost:3000
    else
        open frontend/index.html
    fi
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Opening browser..."
    sleep 2
    if [ ! -z "$FRONTEND_PID" ]; then
        xdg-open http://localhost:3000
    else
        xdg-open frontend/index.html
    fi
fi

echo "✨ Ready to chat about Tư tưởng Hồ Chí Minh! ✨"