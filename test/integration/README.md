# OfficeShare Platform Integration Tests

Comprehensive end-to-end integration tests for the OfficeShare platform.

## Test Coverage

### 1. User Authentication Flow

- User registration
- User login
- Profile management
- Token validation
- Session management

### 2. Carpooling Complete Journey

- Trip creation
- Trip discovery
- Ride matching
- Trip participation
- Rating system

### 3. Feedback and Analytics

- Feedback submission
- Behavior tracking
- UX metrics
- Analytics retrieval
- A/B testing

### 4. Cross-Module Integration

- Reputation updates across modules
- Office-level data isolation
- Statistics aggregation
- Multi-service coordination

### 5. Error Handling

- Invalid authentication
- Missing authentication
- Invalid data submission
- Non-existent resources
- Cross-office access prevention

### 6. Service Health

- Health check endpoints
- Service availability
- Database connectivity

### 7. Performance and Load

- Concurrent operations
- Bulk data handling
- Response time validation

## Running Tests

### Prerequisites

1. Ensure all services are running:

```bash
# User Service
cd services/user-service && npm start

# Carpool Service
cd services/carpooling-service && npm start

# Feedback Service
cd services/feedback-service && npm start
```

2. MongoDB should be accessible at the configured URI

### Run All Tests

```bash
cd test/integration
npm install
npm test
```

### Run Specific Test Suite

```bash
npm test -- platform-e2e.test.js
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## Environment Variables

Create a `.env` file in the `test/integration` directory:

```
MONGODB_URI=mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/
API_GATEWAY_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
CARPOOL_SERVICE_URL=http://localhost:3002
FEEDBACK_SERVICE_URL=http://localhost:3009
```

## Test Data Management

Tests automatically:

- Create test users with unique emails
- Clean up test data before and after runs
- Use isolated test database (`officeshare_test`)
- Prevent interference with production data

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    npm install
    npm test
  env:
    MONGODB_URI: ${{ secrets.MONGODB_TEST_URI }}
```

## Test Results

Tests validate:

- ✅ All API endpoints respond correctly
- ✅ Data flows between services
- ✅ Authentication and authorization work
- ✅ Database operations succeed
- ✅ Error handling is robust
- ✅ Performance meets requirements

## Troubleshooting

### Tests Timeout

- Increase `testTimeout` in jest config
- Check if all services are running
- Verify database connectivity

### Connection Errors

- Ensure MongoDB is accessible
- Check service URLs in environment variables
- Verify network connectivity

### Authentication Failures

- Check JWT_SECRET matches across services
- Verify token generation logic
- Ensure user creation succeeds

## Adding New Tests

1. Follow existing test structure
2. Use descriptive test names
3. Clean up test data
4. Handle async operations properly
5. Test both success and failure cases

Example:

```javascript
describe("New Feature", () => {
  test("should perform expected action", async () => {
    const response = await request(SERVICE_URL)
      .post("/api/endpoint")
      .set("Authorization", `Bearer ${authToken}`)
      .send(testData)
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```
