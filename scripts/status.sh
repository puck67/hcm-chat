#!/bin/bash

# HCM Chatbot - Status Check Script
# Author: HCM Chatbot Team
# Description: Check the status of all services

echo "📊 HCM Chatbot System Status"
echo "============================="

# Function to check if service is running
check_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3

    echo ""
    echo "🔍 $service_name Status:"
    echo "------------------------"

    # Check PID file
    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if ps -p $pid > /dev/null 2>&1; then
            echo "   Process: ✅ Running (PID: $pid)"

            # Get process info
            local cpu_mem=$(ps -p $pid -o %cpu,%mem --no-headers)
            echo "   CPU/MEM: $cpu_mem"

            # Check uptime
            local start_time=$(ps -p $pid -o lstart --no-headers)
            echo "   Started: $start_time"
        else
            echo "   Process: ❌ Not running (stale PID: $pid)"
            rm -f $pid_file
        fi
    else
        echo "   Process: ❌ No PID file found"
    fi

    # Check port
    if lsof -i :$port > /dev/null 2>&1; then
        local port_info=$(lsof -i :$port | tail -n +2 | head -1)
        echo "   Port $port: ✅ In use"
        echo "   Details: $port_info"
    else
        echo "   Port $port: ❌ Not in use"
    fi

    # Health check for backend
    if [ "$service_name" = "Backend" ] && [ "$port" = "8000" ]; then
        echo "   Health: Testing..."
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            local health_response=$(curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "Invalid JSON response")
            echo "   Health: ✅ Healthy"
            echo "   Response: $health_response"
        else
            echo "   Health: ❌ Unhealthy or not responding"
        fi
    fi

    # Accessibility check for frontend
    if [ "$service_name" = "Frontend" ] && [ "$port" = "3000" ]; then
        echo "   Access: Testing..."
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "   Access: ✅ Accessible"
        else
            echo "   Access: ❌ Not accessible"
        fi
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Check Backend
check_service "Backend" "logs/backend.pid" "8000"

# Check Frontend
check_service "Frontend" "logs/frontend.pid" "3000"

echo ""
echo "🌐 Service URLs:"
echo "----------------"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"
echo "   Frontend:     http://localhost:3000"

echo ""
echo "📁 Log Files:"
echo "-------------"
for log_file in logs/backend.log logs/frontend.log; do
    if [ -f "$log_file" ]; then
        local size=$(du -h "$log_file" | cut -f1)
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$log_file" 2>/dev/null || stat -c "%y" "$log_file" 2>/dev/null || echo "Unknown")
        echo "   $log_file: ✅ Exists ($size, modified: $modified)"
    else
        echo "   $log_file: ❌ Not found"
    fi
done

echo ""
echo "🔧 System Resources:"
echo "--------------------"

# Check Python version
if command -v python3 &> /dev/null; then
    local python_version=$(python3 --version)
    echo "   Python: ✅ $python_version"
else
    echo "   Python: ❌ Not found"
fi

# Check virtual environment
if [ -d "backend/venv" ]; then
    echo "   Virtual Env: ✅ Exists"
    if [ -f "backend/venv/pyvenv.cfg" ]; then
        local venv_python=$(grep "home" backend/venv/pyvenv.cfg | cut -d'=' -f2 | tr -d ' ')
        echo "   Venv Python: $venv_python"
    fi
else
    echo "   Virtual Env: ❌ Not found"
fi

# Check .env file
if [ -f "backend/.env" ]; then
    echo "   Environment: ✅ .env exists"
    # Check if API keys are set (without showing them)
    if grep -q "GEMINI_API_KEY=" backend/.env && grep -q "PINECONE_API_KEY=" backend/.env; then
        echo "   API Keys: ✅ Configured"
    else
        echo "   API Keys: ⚠️  Missing or incomplete"
    fi
else
    echo "   Environment: ❌ .env not found"
fi

echo ""
echo "💾 Disk Usage:"
echo "--------------"
if command -v du &> /dev/null; then
    echo "   Project size: $(du -sh . 2>/dev/null | cut -f1)"
    echo "   Backend size: $(du -sh backend 2>/dev/null | cut -f1)"
    echo "   Frontend size: $(du -sh frontend 2>/dev/null | cut -f1)"
    if [ -d "logs" ]; then
        echo "   Logs size: $(du -sh logs 2>/dev/null | cut -f1)"
    fi
fi

echo ""
echo "🚀 Quick Actions:"
echo "-----------------"
echo "   Start system:  ./scripts/start.sh"
echo "   Stop system:   ./scripts/stop.sh"
echo "   View logs:     tail -f logs/backend.log"
echo "   Restart:       ./scripts/stop.sh && ./scripts/start.sh"

# Overall status summary
echo ""
echo "📋 Overall Status:"
echo "------------------"

backend_running=false
frontend_running=false

if [ -f "logs/backend.pid" ] && ps -p $(cat logs/backend.pid) > /dev/null 2>&1; then
    backend_running=true
fi

if [ -f "logs/frontend.pid" ] && ps -p $(cat logs/frontend.pid) > /dev/null 2>&1; then
    frontend_running=true
fi

if $backend_running && $frontend_running; then
    echo "   System Status: ✅ Fully Running"
elif $backend_running; then
    echo "   System Status: ⚠️  Backend Only"
elif $frontend_running; then
    echo "   System Status: ⚠️  Frontend Only"
else
    echo "   System Status: ❌ Stopped"
fi

echo ""
echo "🇻🇳 HCM Chatbot System Monitor 🇻🇳"