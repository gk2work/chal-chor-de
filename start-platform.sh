#!/bin/bash

# OfficeShare Platform - Quick Start Script
# This script starts all services in the correct order

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          OfficeShare Platform Launcher               ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm --version) detected${NC}"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo -e "${YELLOW}Starting ${service_name}...${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ ${service_name} directory not found at ${service_path}${NC}"
        return 1
    fi
    
    # Check if port is already in use
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port ${port} is already in use. ${service_name} may already be running.${NC}"
        return 0
    fi
    
    # Install dependencies if needed
    if [ ! -d "$service_path/node_modules" ]; then
        echo -e "${BLUE}📦 Installing dependencies for ${service_name}...${NC}"
        (cd "$service_path" && npm install --silent > /dev/null 2>&1)
    fi
    
    # Start service in background
    (cd "$service_path" && npm start > /dev/null 2>&1 &)
    
    # Wait a moment for service to start
    sleep 2
    
    # Check if service started successfully
    if check_port $port; then
        echo -e "${GREEN}✓ ${service_name} started on port ${port}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to start ${service_name}${NC}"
        return 1
    fi
}

# Main execution
echo -e "${BLUE}🚀 Starting OfficeShare Platform Services...${NC}"
echo ""

# Start backend services
start_service "API Gateway" "services/api-gateway" 3000
start_service "User Service" "services/user-service" 3001
start_service "Carpooling Service" "services/carpooling-service" 3002
start_service "Matching Service" "services/matching-service" 3003
start_service "Tracking Service" "services/tracking-service" 3004
start_service "Notification Service" "services/notification-service" 3005
start_service "Chat Service" "services/chat-service" 3006
start_service "Gamification Service" "services/gamification-service" 3008
start_service "Feedback Service" "services/feedback-service" 3009

echo ""
echo -e "${BLUE}🎨 Starting Frontend Applications...${NC}"
echo ""

# Start admin dashboard
start_service "Admin Dashboard" "admin-dashboard" 3007

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║  ✓ All services started successfully!                ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📍 Service URLs:${NC}"
echo ""
echo -e "  ${GREEN}API Gateway:${NC}          http://localhost:3000"
echo -e "  ${GREEN}User Service:${NC}         http://localhost:3001"
echo -e "  ${GREEN}Carpooling Service:${NC}   http://localhost:3002"
echo -e "  ${GREEN}Matching Service:${NC}     http://localhost:3003"
echo -e "  ${GREEN}Tracking Service:${NC}     http://localhost:3004"
echo -e "  ${GREEN}Notification Service:${NC} http://localhost:3005"
echo -e "  ${GREEN}Chat Service:${NC}         http://localhost:3006"
echo -e "  ${GREEN}Admin Dashboard:${NC}      http://localhost:3007"
echo -e "  ${GREEN}Gamification Service:${NC} http://localhost:3008"
echo -e "  ${GREEN}Feedback Service:${NC}     http://localhost:3009"
echo ""

echo -e "${BLUE}📱 To start the mobile app:${NC}"
echo ""
echo -e "  cd mobile-app"
echo -e "  npm install"
echo -e "  npx expo start"
echo ""

echo -e "${BLUE}🧪 To run tests:${NC}"
echo ""
echo -e "  ./test/run-all-tests.sh"
echo ""

echo -e "${BLUE}🛑 To stop all services:${NC}"
echo ""
echo -e "  ./stop-platform.sh"
echo ""

echo -e "${YELLOW}💡 Tip: Check service health at http://localhost:3001/health${NC}"
echo ""

echo -e "${GREEN}Happy coding! 🎉${NC}"
