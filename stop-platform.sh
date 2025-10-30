#!/bin/bash

# OfficeShare Platform - Stop Script
# This script stops all running services

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          Stopping OfficeShare Platform               ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to stop service on a port
stop_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${YELLOW}Stopping ${service_name} on port ${port}...${NC}"
    
    # Find and kill process on port
    local pid=$(lsof -ti:$port)
    
    if [ -z "$pid" ]; then
        echo -e "${BLUE}  ℹ️  No process found on port ${port}${NC}"
    else
        kill -9 $pid 2>/dev/null
        echo -e "${GREEN}  ✓ Stopped ${service_name}${NC}"
    fi
}

# Stop all services
stop_port 3000 "API Gateway"
stop_port 3001 "User Service"
stop_port 3002 "Carpooling Service"
stop_port 3003 "Matching Service"
stop_port 3004 "Tracking Service"
stop_port 3005 "Notification Service"
stop_port 3006 "Chat Service"
stop_port 3007 "Admin Dashboard"
stop_port 3008 "Gamification Service"
stop_port 3009 "Feedback Service"

# Stop any Expo processes
echo -e "${YELLOW}Stopping Expo processes...${NC}"
pkill -f "expo" 2>/dev/null && echo -e "${GREEN}  ✓ Stopped Expo${NC}" || echo -e "${BLUE}  ℹ️  No Expo processes found${NC}"

# Stop any Node processes related to the project
echo -e "${YELLOW}Cleaning up remaining Node processes...${NC}"
pkill -f "node.*officeshare" 2>/dev/null && echo -e "${GREEN}  ✓ Cleaned up Node processes${NC}" || echo -e "${BLUE}  ℹ️  No additional processes found${NC}"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║  ✓ All services stopped successfully!                ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}To start services again, run:${NC}"
echo -e "  ./start-platform.sh"
echo ""
