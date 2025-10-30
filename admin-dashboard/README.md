# OfficeShare Admin Dashboard

A React-based administrative interface for managing the OfficeShare platform.

## Features

- **Dashboard Overview**: Real-time statistics and activity monitoring
- **User Management**: View, manage, and moderate platform users
- **Carpool Management**: Monitor and manage carpool trips
- **Book Library**: Oversee the shared book library and borrowing activity
- **Analytics & Insights**: Comprehensive platform analytics and reporting
- **Settings**: Configure platform behavior and features

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn package manager

### Installation

1. Navigate to the admin dashboard directory:

   ```bash
   cd admin-dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:3007`

### Production Build

To create a production build:

```bash
npm run build
```

## Project Structure

```
admin-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Layout.js          # Main layout component
│   ├── pages/
│   │   ├── Dashboard.js       # Dashboard overview
│   │   ├── Users.js          # User management
│   │   ├── Carpools.js       # Carpool management
│   │   ├── Books.js          # Book library management
│   │   ├── Analytics.js      # Analytics and insights
│   │   └── Settings.js       # Platform settings
│   ├── services/
│   │   └── api.js            # API service layer
│   ├── App.js                # Main app component
│   ├── index.js              # App entry point
│   └── index.css             # Global styles
├── package.json
└── README.md
```

## Key Components

### Dashboard

- Real-time platform statistics
- Recent activity feed
- Quick action buttons
- Weekly trip activity charts
- Service usage distribution

### User Management

- User listing with search and filters
- User profile details
- Account status management
- User activity tracking

### Carpool Management

- Trip monitoring and oversight
- Trip details and rider information
- Trip cancellation capabilities
- Carpool analytics

### Book Library

- Book inventory management
- Borrowing status tracking
- Overdue book monitoring
- Library usage statistics

### Analytics

- User growth tracking
- Environmental impact metrics
- Service usage analytics
- Top user leaderboards
- Actionable insights and recommendations

### Settings

- Platform configuration
- Feature flag management
- Notification settings
- Security parameters
- Environmental calculation settings

## API Integration

The dashboard integrates with the OfficeShare backend API through the `apiService` module. All API calls include:

- Automatic authentication token handling
- Error handling and user feedback
- Request/response interceptors
- Timeout management

## Development

### Available Scripts

- `npm start` - Start development server on port 3000
- `npm run dev` - Start development server on port 3007 (recommended)
- `npm run build` - Create production build
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (not recommended)

### Environment Variables

Create a `.env` file in the admin-dashboard directory:

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
```

### Styling

The dashboard uses a custom CSS framework with:

- Responsive grid system
- Consistent color scheme
- Reusable component styles
- Mobile-first responsive design

## Features in Development

- Real-time notifications
- Advanced filtering and search
- Bulk operations
- Data export functionality
- Role-based access control
- Audit logging

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style and patterns
2. Add appropriate error handling
3. Include responsive design considerations
4. Test on multiple screen sizes
5. Update documentation as needed

## License

This project is part of the OfficeShare platform and follows the same licensing terms.
