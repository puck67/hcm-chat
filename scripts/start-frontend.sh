#!/bin/bash

# HCM Chatbot - Start Frontend Only
# Author: HCM Chatbot Team
# Description: Start only the frontend server

echo "🎨 Starting HCM Chatbot Frontend..."
echo "==================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: ./frontend/ directory should exist"
    exit 1
fi

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running and accessible"
else
    echo "⚠️  Backend is not running or not accessible"
    echo "   Frontend will still start, but API calls will fail"
    echo "   Start backend with: ./scripts/start-backend.sh"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Check if port 3000 is available
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use!"
    echo "   Trying alternative ports..."

    # Try ports 3001-3005
    PORT=3000
    for alt_port in 3001 3002 3003 3004 3005; do
        if ! lsof -i :$alt_port > /dev/null 2>&1; then
            PORT=$alt_port
            echo "✅ Using port $PORT instead"
            break
        fi
    done

    if [ $PORT -eq 3000 ]; then
        echo "❌ No available ports found (3000-3005)"
        echo "   Please stop other services or run './scripts/stop.sh'"
        exit 1
    fi
else
    PORT=3000
fi

# Navigate to frontend directory
cd frontend

# Check if files exist
if [ ! -f "index.html" ]; then
    echo "❌ index.html not found in frontend directory"
    exit 1
fi

if [ ! -f "script.js" ] || [ ! -f "styles.css" ]; then
    echo "⚠️  Some frontend files are missing"
    echo "   Expected: index.html, script.js, styles.css"
fi

# Start frontend server
echo "🚀 Starting frontend server..."
echo "   Port: $PORT"
echo "   Method: Python HTTP Server"

# Try different Python commands
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found!"
    echo ""
    echo "🔧 Alternative options:"
    echo "   1. Install Python 3.x"
    echo "   2. Open frontend/index.html directly in browser"
    echo "   3. Use VS Code Live Server extension"
    echo "   4. Use any other web server"
    echo ""
    echo "📂 Frontend directory: $(pwd)"
    echo "🌐 Main file: $(pwd)/index.html"
    exit 1
fi

# Start server in background
nohup $PYTHON_CMD -m http.server $PORT > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid

echo "✅ Frontend started successfully!"
echo "   PID: $FRONTEND_PID"
echo "   URL: http://localhost:$PORT"
echo "   Log: tail -f logs/frontend.log"

# Wait for startup
echo "⏳ Waiting for server to start..."
sleep 3

# Test frontend accessibility
echo "🔍 Testing frontend accessibility..."
if curl -s http://localhost:$PORT > /dev/null; then
    echo "✅ Frontend is accessible"

    # Get some info about the served content
    response_size=$(curl -s http://localhost:$PORT | wc -c)
    echo "   Content size: $response_size bytes"

else
    echo "⚠️  Frontend accessibility test failed"
    echo "   Check logs: tail -f logs/frontend.log"
    echo "   The server might still be starting up..."
fi

echo ""
echo "🌐 Frontend URLs:"
echo "   Main App:     http://localhost:$PORT"
echo "   Direct Files: http://localhost:$PORT/index.html"
echo "   CSS:          http://localhost:$PORT/styles.css"
echo "   JavaScript:   http://localhost:$PORT/script.js"

echo ""
echo "📱 Frontend Features:"
echo "   ✅ Modern chat interface"
echo "   ✅ Vietnam flag theme"
echo "   ✅ Responsive design"
echo "   ✅ Real-time status indicators"
echo "   ✅ Topic suggestions"
echo "   ✅ Source citations"

echo ""
echo "📋 Management Commands:"
echo "   Stop frontend:  ./scripts/stop.sh"
echo "   Check status:   ./scripts/status.sh"
echo "   View logs:      tail -f logs/frontend.log"
echo "   Start backend:  ./scripts/start-backend.sh"

echo ""
echo "🔗 Backend Integration:"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   Backend Status: ✅ Connected"
    echo "   API Endpoint:   http://localhost:8000"
else
    echo "   Backend Status: ❌ Not connected"
    echo "   Start backend:  ./scripts/start-backend.sh"
fi

# Try to open browser
echo ""
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    # macOS
    sleep 2
    open http://localhost:$PORT
elif command -v xdg-open &> /dev/null; then
    # Linux
    sleep 2
    xdg-open http://localhost:$PORT
elif command -v start &> /dev/null; then
    # Windows (Git Bash)
    sleep 2
    start http://localhost:$PORT
else
    echo "   Please open http://localhost:$PORT manually in your browser"
fi

echo ""
echo "✨ Frontend is ready!"
echo "🇻🇳 Start chatting about Tư tưởng Hồ Chí Minh! 🇻🇳"