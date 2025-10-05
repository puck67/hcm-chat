#!/bin/bash

# HCM Chatbot - Stop All Services Script
# This script stops all running services and cleans up

echo "🛑 Stopping HCM Chatbot System..."
echo "================================="

# Function to stop a service by PID file
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name,,}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2

            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "   Force killing $service_name..."
                kill -9 $pid
            fi

            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name process not found (PID: $pid)"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop individual services
stop_service "FRONTEND"
stop_service "PYTHON_AI"
stop_service "NET_API"

# Kill any remaining processes by port
echo ""
echo "🧹 Cleaning up remaining processes..."

# Kill processes on specific ports
for port in 3000 9000 8000; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🛑 Killing process on port $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null
    fi
done

# Kill by process name patterns
pkill -f "dotnet.*Web_API" 2>/dev/null
pkill -f "uvicorn.*app.main" 2>/dev/null
pkill -f "python.*http.server.*3000" 2>/dev/null

echo ""
echo "✅ All services stopped successfully!"
echo ""
echo "📝 Log files are preserved in logs/ directory:"
echo "   - logs/dotnet-api.log"
echo "   - logs/python-ai.log"
echo "   - logs/frontend.log"
echo ""
echo "🚀 To restart: ./start-all.sh"