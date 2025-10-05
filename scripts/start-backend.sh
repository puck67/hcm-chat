#!/bin/bash

# HCM Chatbot - Start Backend Only
# Author: HCM Chatbot Team
# Description: Start only the backend server

echo "📡 Starting HCM Chatbot Backend..."
echo "=================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: ./backend/ directory should exist"
    exit 1
fi

# Check if port is available
if lsof -i :8000 > /dev/null 2>&1; then
    echo "❌ Port 8000 is already in use!"
    echo "   Run './scripts/stop.sh' first or kill the process manually:"
    echo "   lsof -ti :8000 | xargs kill -9"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
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

# Install dependencies if needed
if [ ! -f "venv/pyvenv.cfg" ] || [ ! -d "venv/lib" ]; then
    echo "📦 Installing dependencies..."
    if ! pip install -r requirements.txt; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    if [ -f ".env.example" ]; then
        echo "📄 Copying .env.example to .env..."
        cp .env.example .env
        echo ""
        echo "🔑 IMPORTANT: Please add your API keys to .env file:"
        echo "   - GEMINI_API_KEY=your_gemini_key"
        echo "   - PINECONE_API_KEY=your_pinecone_key"
        echo ""
        read -p "Press Enter after editing .env file (or Ctrl+C to exit)..."
    else
        echo "❌ No .env.example found. Please create .env file manually"
        exit 1
    fi
fi

# Validate API keys
echo "🔑 Validating API keys..."
if ! grep -q "GEMINI_API_KEY=.*[^=]" .env || ! grep -q "PINECONE_API_KEY=.*[^=]" .env; then
    echo "⚠️  API keys appear to be missing or empty in .env file"
    echo "   Please ensure both GEMINI_API_KEY and PINECONE_API_KEY are set"
fi

# Start backend server
echo "🚀 Starting backend server..."
echo "   Host: 0.0.0.0"
echo "   Port: 8000"
echo "   Mode: Development (with reload)"

# Start in background
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

echo "✅ Backend started successfully!"
echo "   PID: $BACKEND_PID"
echo "   Log: tail -f logs/backend.log"

# Wait for startup
echo "⏳ Waiting for server to initialize..."
sleep 5

# Health check
echo "🔍 Testing backend health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is healthy and responding"

    # Show API info
    echo ""
    echo "📡 Backend API Information:"
    echo "   Base URL:     http://localhost:8000"
    echo "   Health Check: http://localhost:8000/health"
    echo "   API Docs:     http://localhost:8000/docs"
    echo "   OpenAPI:      http://localhost:8000/openapi.json"

    # Test a sample request
    echo ""
    echo "🧪 Testing chat endpoint..."
    response=$(curl -s -X POST "http://localhost:8000/chat" \
        -H "Content-Type: application/json" \
        -d '{"question": "Xin chào"}' | head -c 100)

    if [ ! -z "$response" ]; then
        echo "✅ Chat endpoint is working"
        echo "   Sample response: ${response}..."
    else
        echo "⚠️  Chat endpoint test failed"
    fi

else
    echo "⚠️  Backend health check failed"
    echo "   Check logs: tail -f logs/backend.log"
    echo "   The server might still be starting up..."
fi

echo ""
echo "📋 Management Commands:"
echo "   Stop backend:   ./scripts/stop.sh"
echo "   Check status:   ./scripts/status.sh"
echo "   View logs:      tail -f logs/backend.log"
echo "   Start frontend: ./scripts/start-frontend.sh"
echo ""
echo "🎉 Backend is ready to serve requests!"
echo "🌐 Test it at: http://localhost:8000/docs"