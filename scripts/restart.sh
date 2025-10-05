#!/bin/bash

# HCM Chatbot - Restart Script
# Author: HCM Chatbot Team
# Description: Restart the entire system (stop then start)

echo "🔄 Restarting HCM Chatbot System..."
echo "==================================="

# Check if we're in the right directory
if [ ! -d "scripts" ] || [ ! -f "scripts/start.sh" ] || [ ! -f "scripts/stop.sh" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: scripts/ directory with start.sh and stop.sh"
    exit 1
fi

# Stop the system first
echo "🛑 Step 1: Stopping current services..."
./scripts/stop.sh

# Wait a moment for cleanup
echo ""
echo "⏳ Waiting for cleanup to complete..."
sleep 3

# Check that ports are free
echo "🔍 Verifying ports are free..."
for port in 8000 3000; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is still in use, force killing..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
done

echo "✅ Cleanup complete"

# Start the system
echo ""
echo "🚀 Step 2: Starting services..."
./scripts/start.sh

echo ""
echo "🔄 Restart completed!"
echo "🇻🇳 HCM Chatbot is ready! 🇻🇳"