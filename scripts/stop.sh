#!/bin/bash

# HCM Chatbot - Stop Script
# Author: HCM Chatbot Team
# Description: Stops all running services gracefully

echo "🛑 Stopping HCM Chatbot System..."
echo "=================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to stop process by PID file
stop_service() {
    local service_name=$1
    local pid_file=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔸 Stopping $service_name (PID: $pid)..."
            kill $pid

            # Wait for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done

            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "   ⚠️  Force killing $service_name..."
                kill -9 $pid
            fi

            echo "   ✅ $service_name stopped"
        else
            echo "🔸 $service_name process not found (PID: $pid)"
        fi
        rm -f $pid_file
    else
        echo "🔸 No $service_name PID file found"
    fi
}

# Stop backend service
echo "📡 Stopping Backend..."
stop_service "Backend" "logs/backend.pid"

# Stop frontend service
echo "🎨 Stopping Frontend..."
stop_service "Frontend" "logs/frontend.pid"

echo ""
echo "🔍 Cleaning up remaining processes..."

# Kill any remaining uvicorn processes
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "🔸 Killing remaining uvicorn processes..."
    pkill -f "uvicorn app.main:app"
    echo "   ✅ Uvicorn processes killed"
fi

# Kill any remaining Python HTTP server processes on port 3000
if pgrep -f "python.*http.server.*3000" > /dev/null; then
    echo "🔸 Killing remaining HTTP server processes..."
    pkill -f "python.*http.server.*3000"
    echo "   ✅ HTTP server processes killed"
fi

# Kill any processes using our ports
for port in 8000 3000; do
    if lsof -ti :$port > /dev/null 2>&1; then
        echo "🔸 Killing processes on port $port..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        echo "   ✅ Port $port freed"
    fi
done

echo ""
echo "🧹 Cleaning up temporary files..."

# Clean up log files (optional)
if [ "$1" = "--clean-logs" ]; then
    echo "🔸 Removing log files..."
    rm -f logs/backend.log logs/frontend.log
    echo "   ✅ Log files removed"
fi

# Deactivate virtual environment if active
if [ ! -z "$VIRTUAL_ENV" ]; then
    echo "🔸 Deactivating virtual environment..."
    deactivate 2>/dev/null || true
    echo "   ✅ Virtual environment deactivated"
fi

echo ""
echo "🏁 HCM Chatbot System Stopped Successfully!"
echo "==========================================="
echo ""
echo "📋 System Status:"
echo "   Backend:  ❌ Stopped"
echo "   Frontend: ❌ Stopped"
echo "   Port 8000: ✅ Free"
echo "   Port 3000: ✅ Free"
echo ""
echo "🚀 To start again: ./scripts/start.sh"
echo "📊 To check status: ./scripts/status.sh"
echo ""

# Show final port check
echo "🔍 Final port check:"
for port in 8000 3000; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "   Port $port: ⚠️  Still in use"
    else
        echo "   Port $port: ✅ Free"
    fi
done

echo ""
echo "✨ Thank you for using HCM Chatbot! ✨"