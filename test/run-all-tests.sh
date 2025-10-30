#!/bin/bash

# OfficeShare Platform - Complete Test Suite Runner
# This script runs all tests across the platform

set -e

echo "🧪 OfficeShare Platform Test Suite"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
FAILED_SERVICES=()
PASSED_SERVICES=()

# Function to run service tests
run_service_tests() {
  local service_name=$1
  local service_path=$2
  
  echo -e "${YELLOW}Testing: ${service_name}${NC}"
  
  if [ -d "$service_path" ] && [ -f "$service_path/package.json" ]; then
    cd "$service_path"
    
    if npm test --silent 2>&1; then
      echo -e "${GREEN}✓ ${service_name} tests passed${NC}"
      PASSED_SERVICES+=("$service_name")
    else
      echo -e "${RED}✗ ${service_name} tests failed${NC}"
      FAILED_SERVICES+=("$service_name")
    fi
    
    cd - > /dev/null
  else
    echo -e "${YELLOW}⊘ ${service_name} - No tests found${NC}"
  fi
  
  echo ""
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "📦 Installing dependencies..."
echo ""

# Run unit tests for each service
echo "🔬 Running Unit Tests"
echo "--------------------"
run_service_tests "User Service" "services/user-service"
run_service_tests "Carpooling Service" "services/carpooling-service"
run_service_tests "Bike Sharing Service" "services/bike-sharing-service"
run_service_tests "Library Service" "services/library-service"
run_service_tests "Matching Service" "services/matching-service"
run_service_tests "Tracking Service" "services/tracking-service"
run_service_tests "Notification Service" "services/notification-service"
run_service_tests "Chat Service" "services/chat-service"
run_service_tests "Gamification Service" "services/gamification-service"
run_service_tests "Feedback Service" "services/feedback-service"
run_service_tests "API Gateway" "services/api-gateway"

# Run mobile app tests
echo "📱 Running Mobile App Tests"
echo "---------------------------"
run_service_tests "Mobile App" "mobile-app"

# Run admin dashboard tests
echo "🖥️  Running Admin Dashboard Tests"
echo "--------------------------------"
run_service_tests "Admin Dashboard" "admin-dashboard"

# Run integration tests
echo "🔗 Running Integration Tests"
echo "----------------------------"
run_service_tests "Platform Integration" "test/integration"

# Print summary
echo ""
echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo ""

if [ ${#PASSED_SERVICES[@]} -gt 0 ]; then
  echo -e "${GREEN}Passed (${#PASSED_SERVICES[@]}):${NC}"
  for service in "${PASSED_SERVICES[@]}"; do
    echo -e "  ${GREEN}✓${NC} $service"
  done
  echo ""
fi

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  echo -e "${RED}Failed (${#FAILED_SERVICES[@]}):${NC}"
  for service in "${FAILED_SERVICES[@]}"; do
    echo -e "  ${RED}✗${NC} $service"
  done
  echo ""
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
else
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
fi
