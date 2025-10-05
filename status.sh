#!/bin/bash

# HCM Chatbot - Status Check Script
# This script checks the status of all services

echo "📊 HCM Chatbot System Status"
echo "============================="

# Function to check service status
check_service() {
    local service_name=$1
    local url=$2
    local port=$3

    echo -n "🔍 $service_name (port $port): "

    # Check if port is listening
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        # Check if service responds
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            echo "🟢 RUNNING"
        else
            echo "🟡 PORT OPEN but not responding"
        fi
    else
        echo "🔴 STOPPED"
    fi
}

# Function to check database
check_database() {
    echo -n "🗄️  PostgreSQL Database: "
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo "🟢 RUNNING"
    else
        echo "🔴 STOPPED"
    fi
}

# Check all services
check_service "Frontend Server" "http://localhost:3000" "3000"
check_service ".NET API" "http://localhost:9000/health" "9000"
check_service "Python AI Backend" "http://localhost:8000/health" "8000"
check_database

echo ""

# Show process information
echo "🔧 Process Information:"
echo "======================="

# Check PIDs
for service in frontend net_api python_ai; do
    pid_file="logs/${service}.pid"
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "📌 ${service^^}: PID $pid (running)"
        else
            echo "📌 ${service^^}: PID $pid (not running)"
        fi
    else
        echo "📌 ${service^^}: No PID file"
    fi
done

echo ""

# Show URLs if services are running
frontend_running=$(lsof -Pi :3000 -sTCP:LISTEN -t 2>/dev/null)
api_running=$(lsof -Pi :9000 -sTCP:LISTEN -t 2>/dev/null)
ai_running=$(lsof -Pi :8000 -sTCP:LISTEN -t 2>/dev/null)

if [[ ! -z "$frontend_running" || ! -z "$api_running" || ! -z "$ai_running" ]]; then
    echo "🌐 Service URLs:"
    echo "================"

    if [ ! -z "$frontend_running" ]; then
        echo "   Frontend:     http://localhost:3000/welcome.html"
    fi

    if [ ! -z "$api_running" ]; then
        echo "   .NET API:     http://localhost:9000/swagger"
        echo "   Health Check: http://localhost:9000/health"
    fi

    if [ ! -z "$ai_running" ]; then
        echo "   Python AI:    http://localhost:8000/docs"
        echo "   AI Health:    http://localhost:8000/health"
    fi

    echo ""
fi

# Show log files
echo "📝 Log Files:"
echo "============="
if [ -d "logs" ]; then
    for log_file in logs/*.log; do
        if [ -f "$log_file" ]; then
            size=$(du -h "$log_file" | cut -f1)
            echo "   $log_file ($size)"
        fi
    done
else
    echo "   No logs directory found"
fi

echo ""

# Show available commands
echo "🛠️  Available Commands:"
echo "======================"
echo "   🚀 Start all:  ./start-all.sh"
echo "   🛑 Stop all:   ./stop-all.sh"
echo "   📊 Status:     ./status.sh"
echo "   📝 View logs:  tail -f logs/*.log"

# Final summary
echo ""
echo "💡 Quick Actions:"
if [ -z "$frontend_running" ] && [ -z "$api_running" ] && [ -z "$ai_running" ]; then
    echo "   All services are stopped. Run: ./start-all.sh"
elif [ ! -z "$frontend_running" ] && [ ! -z "$api_running" ] && [ ! -z "$ai_running" ]; then
    echo "   All services are running! 🎉"
    echo "   Access: http://localhost:3000/welcome.html"
else
    echo "   Some services are not running. Check individual services above."
    echo "   To restart all: ./stop-all.sh && ./start-all.sh"
fi