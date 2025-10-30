# OfficeShare Platform Testing Guide

Complete guide for testing the OfficeShare platform across all modules and services.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## Testing Strategy

The OfficeShare platform follows a comprehensive testing pyramid:

```
        /\
       /  \      E2E Tests (10%)
      /____\     - Complete user journeys
     /      \    - Cross-service integration
    /________\   Integration Tests (20%)
   /          \  - Service-to-service
  /____________\ - API contracts
 /              \ Unit Tests (70%)
/________________\ - Business logic
                   - Individual functions
```

### Testing Principles

1. **Test Early, Test Often**: Write tests alongside code
2. **Isolation**: Each test should be independent
3. **Clarity**: Tests should be self-documenting
4. **Speed**: Unit tests should run in milliseconds
5. **Reliability**: Tests should not be flaky

## Test Types

### 1. Unit Tests

Test individual functions and components in isolation.

**Location**: `services/*/test/*.test.js`

**Example**:

```javascript
describe("Cost Calculation", () => {
  test("should calculate cost per rider correctly", () => {
    const totalCost = 20;
    const riders = 4;
    const result = calculateCostPerRider(totalCost, riders);
    expect(result).toBe(5);
  });
});
```

### 2. Integration Tests

Test interactions between services and external dependencies.

**Location**: `test/integration/*.test.js`

**Example**:

```javascript
describe("Carpool Trip Creation", () => {
  test("should create trip and notify matching service", async () => {
    const trip = await createTrip(tripData);
    const matches = await getMatches(trip.id);
    expect(matches).toBeInstanceOf(Array);
  });
});
```

### 3. End-to-End Tests

Test complete user journeys across the entire platform.

**Location**: `test/integration/platform-e2e.test.js`

**Example**:

```javascript
describe("Complete Carpooling Journey", () => {
  test("user can create, join, and complete a trip", async () => {
    // Register user
    // Create trip
    // Find matches
    // Join trip
    // Complete trip
    // Rate experience
  });
});
```

### 4. Mobile App Tests

Test React Native components and user interactions.

**Location**: `mobile-app/src/__tests__/**/*.test.js`

**Technologies**: Jest, React Native Testing Library

### 5. Admin Dashboard Tests

Test React web components and admin workflows.

**Location**: `admin-dashboard/src/**/__tests__/*.test.js`

**Technologies**: Jest, React Testing Library

## Running Tests

### Run All Tests

```bash
# From project root
./test/run-all-tests.sh
```

### Run Service-Specific Tests

```bash
# User Service
cd services/user-service
npm test

# Carpooling Service
cd services/carpooling-service
npm test

# Feedback Service
cd services/feedback-service
npm test
```

### Run Integration Tests

```bash
cd test/integration
npm install
npm test
```

### Run Mobile App Tests

```bash
cd mobile-app
npm test
```

### Run Admin Dashboard Tests

```bash
cd admin-dashboard
npm test
```

### Run Tests with Coverage

```bash
# Service tests
cd services/user-service
npm test -- --coverage

# Integration tests
cd test/integration
npm run test:coverage
```

### Watch Mode (Development)

```bash
cd services/user-service
npm test -- --watch
```

## Test Coverage

### Current Coverage Goals

- **Unit Tests**: 80% code coverage
- **Integration Tests**: All critical paths
- **E2E Tests**: All user journeys

### Services Coverage

| Service              | Unit Tests | Integration Tests | E2E Tests |
| -------------------- | ---------- | ----------------- | --------- |
| User Service         | ✅         | ✅                | ✅        |
| Carpooling Service   | ✅         | ✅                | ✅        |
| Bike Sharing Service | ✅         | ✅                | ✅        |
| Library Service      | ✅         | ✅                | ✅        |
| Matching Service     | ✅         | ✅                | ✅        |
| Tracking Service     | ✅         | ✅                | ✅        |
| Notification Service | ✅         | ✅                | ✅        |
| Chat Service         | ✅         | ✅                | ✅        |
| Gamification Service | ✅         | ✅                | ✅        |
| Feedback Service     | ✅         | ✅                | ✅        |

### Viewing Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Template

```javascript
const { functionToTest } = require("../module");

describe("Module Name", () => {
  describe("functionToTest", () => {
    test("should handle normal case", () => {
      const result = functionToTest(validInput);
      expect(result).toBe(expectedOutput);
    });

    test("should handle edge case", () => {
      const result = functionToTest(edgeCase);
      expect(result).toBeDefined();
    });

    test("should throw error for invalid input", () => {
      expect(() => functionToTest(invalidInput)).toThrow();
    });
  });
});
```

### Integration Test Template

```javascript
const request = require("supertest");
const app = require("../server");

describe("API Endpoint", () => {
  let authToken;

  beforeAll(async () => {
    // Setup: Create test user, get token
    authToken = await getTestToken();
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await cleanupTestData();
  });

  test("should perform action successfully", async () => {
    const response = await request(app)
      .post("/api/endpoint")
      .set("Authorization", `Bearer ${authToken}`)
      .send(testData)
      .expect(200);

    expect(response.body).toMatchObject(expectedShape);
  });
});
```

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names

   ```javascript
   // Good
   test("should return 404 when user not found");

   // Bad
   test("test user");
   ```

2. **Arrange-Act-Assert**: Structure tests clearly

   ```javascript
   test("should calculate total correctly", () => {
     // Arrange
     const items = [10, 20, 30];

     // Act
     const total = calculateTotal(items);

     // Assert
     expect(total).toBe(60);
   });
   ```

3. **Test One Thing**: Each test should verify one behavior

   ```javascript
   // Good
   test("should validate email format");
   test("should validate email length");

   // Bad
   test("should validate email");
   ```

4. **Use Meaningful Assertions**

   ```javascript
   // Good
   expect(user.email).toBe("test@example.com");
   expect(response.status).toBe(200);

   // Bad
   expect(user).toBeTruthy();
   ```

5. **Clean Up After Tests**
   ```javascript
   afterEach(async () => {
     await db.collection("test_data").deleteMany({});
   });
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Dependencies
        run: npm install

      - name: Run Tests
        run: ./test/run-all-tests.sh
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

## Troubleshooting

### Common Issues

#### Tests Timeout

**Problem**: Tests hang or timeout

**Solutions**:

- Increase timeout: `jest.setTimeout(30000)`
- Check for unresolved promises
- Ensure database connections close
- Use `--detectOpenHandles` flag

#### Database Connection Errors

**Problem**: Cannot connect to MongoDB

**Solutions**:

- Verify MongoDB is running
- Check connection string
- Ensure network access
- Use test database

#### Flaky Tests

**Problem**: Tests pass/fail inconsistently

**Solutions**:

- Remove time-dependent logic
- Use proper async/await
- Clean up test data
- Avoid shared state

#### Authentication Failures

**Problem**: Auth tokens invalid in tests

**Solutions**:

- Check JWT_SECRET matches
- Verify token generation
- Ensure user exists
- Check token expiration

### Debug Mode

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test file
npm test -- path/to/test.js

# Run with verbose output
npm test -- --verbose
```

### Test Data Management

```javascript
// Create test fixtures
const testUser = {
  email: "test@example.com",
  password: "TestPass123!",
  office_id: "test_office",
};

// Clean up after tests
afterAll(async () => {
  await db.collection("users").deleteMany({
    email: /test.*@example\.com/,
  });
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Create Trip"
    flow:
      - post:
          url: "/api/trips"
          headers:
            Authorization: "Bearer {{token}}"
          json:
            trip_type: "driver"
            departure_time: "{{$timestamp}}"
```

Run load tests:

```bash
artillery run artillery-config.yml
```

## Continuous Improvement

### Test Metrics to Track

1. **Code Coverage**: Aim for 80%+
2. **Test Execution Time**: Keep under 5 minutes
3. **Flaky Test Rate**: Keep under 1%
4. **Bug Escape Rate**: Track bugs found in production

### Regular Test Maintenance

- Review and update tests quarterly
- Remove obsolete tests
- Refactor duplicated test code
- Update test data and fixtures
- Keep dependencies updated

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [React Testing Library](https://testing-library.com/react)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

## Support

For testing questions or issues:

- Check this guide first
- Review existing tests for examples
- Ask in team chat
- Create an issue in the repository
