# Gamification Service

The Gamification Service manages badges, achievements, leaderboards, and environmental impact tracking for the OfficeShare platform.

## Features

- **Badge System**: Automated badge awarding based on user achievements
- **Achievement Tracking**: Track user milestones across all platform modules
- **Leaderboards**: Office-wide rankings for various categories
- **Environmental Impact**: Calculate and visualize CO2 savings and environmental benefits
- **Social Recognition**: Community contribution metrics and recognition

## API Endpoints

### Badge Management

- `GET /api/gamification/badges/definitions` - Get all available badge definitions
- `GET /api/gamification/badges/:user_id` - Get user's earned badges

### Achievement Tracking

- `GET /api/gamification/achievements/:user_id` - Get user's achievements and progress
- `POST /api/gamification/achievements/update` - Update user achievements (service-to-service)
- `POST /api/gamification/achievements/increment` - Increment achievement counters

### Leaderboards

- `GET /api/gamification/leaderboard/:category` - Get office-wide leaderboard for a category
  - Categories: `carpoolTrips`, `bikeTransactions`, `bookTransactions`, `co2Saved`, `totalTransactions`
  - Query params: `period` (default: all_time), `limit` (default: 10)
- `GET /api/gamification/rank/:user_id/:category` - Get user's rank in a specific category

### Environmental Impact

- `GET /api/gamification/environmental-impact/:user_id` - Get user's environmental impact metrics
- `GET /api/gamification/environmental-impact/office/:office_id` - Get office-wide environmental impact

## Badge Definitions

### Carpooling Badges

- **First Ride** 🚗 - Completed first carpool trip
- **Carpooler** 🚙 - Completed 10 carpool trips
- **Carpool Champion** 🏆 - Completed 50 carpool trips

### Bike Sharing Badges

- **First Ride** 🚴 - First bike sharing transaction
- **Bike Enthusiast** 🚲 - Completed 10 bike sharing transactions

### Book Sharing Badges

- **Bookworm** 📚 - First book sharing transaction
- **Librarian** 📖 - Shared 10 books with colleagues

### Environmental Badges

- **Eco Warrior** 🌱 - Saved 100kg of CO2 emissions
- **Eco Champion** 🌍 - Saved 500kg of CO2 emissions

### Community Badges

- **Community Hero** ⭐ - Maintain 4.5+ rating with 20+ transactions

## Achievement Milestones

- **Carpool Trips**: 1, 5, 10, 25, 50, 100
- **Bike Transactions**: 1, 5, 10, 25, 50
- **Book Transactions**: 1, 5, 10, 25, 50
- **CO2 Saved (kg)**: 10, 50, 100, 250, 500, 1000
- **Total Transactions**: 5, 10, 20, 50, 100

## Environmental Impact Calculations

- **Trees Equivalent**: CO2 saved / 21kg (average tree absorbs ~21kg CO2/year)
- **Miles Not Driven**: CO2 saved / 0.404kg (average car emits ~0.404kg CO2/mile)

## Integration with Other Services

Other services should call the gamification service to update achievements when:

1. **Carpooling Service**: After trip completion

   ```javascript
   POST /api/gamification/achievements/increment
   {
     "user_id": "user123",
     "field": "carpoolTrips",
     "amount": 1
   }
   ```

2. **Bike Sharing Service**: After bike transaction completion

   ```javascript
   POST /api/gamification/achievements/increment
   {
     "user_id": "user123",
     "field": "bikeTransactions",
     "amount": 1
   }
   ```

3. **Library Service**: After book transaction completion

   ```javascript
   POST /api/gamification/achievements/increment
   {
     "user_id": "user123",
     "field": "bookTransactions",
     "amount": 1
   }
   ```

4. **Environmental Impact**: Update CO2 savings
   ```javascript
   POST /api/gamification/achievements/increment
   {
     "user_id": "user123",
     "field": "co2Saved",
     "amount": 5.2
   }
   ```

## Running the Service

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm start
```

### Testing

```bash
npm test
```

## Environment Variables

- `GAMIFICATION_SERVICE_PORT` - Service port (default: 3008)
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name
- `JWT_SECRET` - JWT secret for authentication
- `NODE_ENV` - Environment (development/production)

## Database Collections

### user_achievements

Stores user achievement counters and progress.

### user_badges

Stores earned badges for each user.

### leaderboards

Cached leaderboard data for performance (optional).
