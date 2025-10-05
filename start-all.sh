#!/bin/bash

# HCM Chatbot - Start All Services Script
# This script starts all three components of the HCM Chatbot system

echo "🇻🇳 Starting HCM Chatbot System..."
echo "=================================="

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use!"
        return 1
    else
        return 0
    fi
}

# Function to start a service in background and track PID
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    local log_file=$4

    echo "🚀 Starting $service_name on port $port..."

    # Check if port is available
    if ! check_port $port; then
        echo "❌ Cannot start $service_name - port $port is busy"
        return 1
    fi

    # Create logs directory if it doesn't exist
    mkdir -p logs

    # Start the service
    eval "$command" > "logs/$log_file" 2>&1 &
    local pid=$!

    # Save PID for later cleanup
    echo $pid > "logs/${service_name,,}.pid"

    echo "✅ $service_name started (PID: $pid)"
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi

        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to start within timeout"
    return 1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET is not installed. Please install .NET 8.0 or later."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or later."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   Run: brew services start postgresql"
    exit 1
fi

echo "✅ All prerequisites are met!"
echo ""

# Start services
echo "🚀 Starting services..."
echo ""

# 1. Start .NET API
if start_service "NET_API" "cd dotnet-api/hcm-chatbot-api && dotnet run --project Web_API/Web_API.csproj --urls http://localhost:9000" 9000 "dotnet-api.log"; then
    sleep 5
    if wait_for_service ".NET API" "http://localhost:9000/health"; then
        echo ""
    else
        echo "❌ Failed to start .NET API"
        exit 1
    fi
else
    exit 1
fi

# 2. Start Python AI Backend
if start_service "PYTHON_AI" "cd backend && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" 8000 "python-ai.log"; then
    sleep 5
    if wait_for_service "Python AI" "http://localhost:8000/health"; then
        echo ""
    else
        echo "❌ Failed to start Python AI"
        exit 1
    fi
else
    exit 1
fi

# 3. Start Frontend
if start_service "FRONTEND" "cd frontend && python3 -m http.server 3000" 3000 "frontend.log"; then
    sleep 3
    if wait_for_service "Frontend" "http://localhost:3000"; then
        echo ""
    else
        echo "❌ Failed to start Frontend"
        exit 1
    fi
else
    exit 1
fi

# Success message
echo "🎉 HCM Chatbot System Started Successfully!"
echo "=========================================="
echo ""
echo "📍 Service URLs:"
echo "   🌐 Frontend:    http://localhost:3000/welcome.html"
echo "   🔗 .NET API:    http://localhost:9000/swagger"
echo "   🤖 Python AI:   http://localhost:8000/docs"
echo ""
echo "👤 Admin Account:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Commands:"
echo "   🛑 Stop all:    ./stop-all.sh"
echo "   📊 Status:      ./status.sh"
echo "   📝 Logs:        tail -f logs/*.log"
echo ""
echo "🎯 Quick Start:"
echo "   1. Open: http://localhost:3000/welcome.html"
echo "   2. Click 'Đăng nhập' or 'Đăng ký'"
echo "   3. Start chatting about Hồ Chí Minh's thoughts!"
echo ""
echo "✨ Enjoy using HCM Chatbot! 🇻🇳"