import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import { apiService } from "../services/api";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days");
  const [libraryStats, setLibraryStats] = useState(null);
  const [popularBooks, setPopularBooks] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [libraryActivity, setLibraryActivity] = useState([]);
  const [bookAnalytics, setBookAnalytics] = useState({
    circulationTrends: [],
    categoryDistribution: [],
    userEngagement: [],
    monthlyBorrows: [],
  });
  const [bikeStats, setBikeStats] = useState(null);
  const [bikeAnalytics, setBikeAnalytics] = useState({
    usageTrends: [],
    popularBikes: [],
    bookingPatterns: [],
  });
  const [environmentalMetrics, setEnvironmentalMetrics] = useState({
    totalCO2Saved: 0,
    totalMilesSaved: 0,
    treesEquivalent: 0,
    monthlyTrends: [],
  });
  const [userBehavior, setUserBehavior] = useState({
    engagementScore: 0,
    retentionRate: 0,
    activeUsers: 0,
    churnRate: 0,
  });
  const [predictiveData, setPredictiveData] = useState({
    demandForecast: [],
    peakUsageTimes: [],
    recommendations: [],
  });

  // Mock analytics data
  const userGrowthData = [
    { month: "Jan", users: 45 },
    { month: "Feb", users: 52 },
    { month: "Mar", users: 61 },
    { month: "Apr", users: 78 },
    { month: "May", users: 89 },
    { month: "Jun", users: 103 },
    { month: "Jul", users: 118 },
    { month: "Aug", users: 134 },
    { month: "Sep", users: 142 },
    { month: "Oct", users: 156 },
  ];

  const tripActivityData = [
    { day: "Mon", carpools: 12, books: 8, bikes: 3 },
    { day: "Tue", carpools: 19, books: 12, bikes: 5 },
    { day: "Wed", carpools: 15, books: 10, bikes: 4 },
    { day: "Thu", carpools: 22, books: 15, bikes: 7 },
    { day: "Fri", carpools: 18, books: 9, bikes: 6 },
    { day: "Sat", carpools: 8, books: 6, bikes: 2 },
    { day: "Sun", carpools: 5, books: 4, bikes: 1 },
  ];

  const serviceUsageData = [
    { name: "Carpooling", value: 65, color: "#2196F3" },
    { name: "Book Sharing", value: 25, color: "#4CAF50" },
    { name: "Bike Sharing", value: 10, color: "#FF9800" },
  ];

  const environmentalImpactData = [
    { month: "Jan", co2Saved: 120, milesSaved: 450 },
    { month: "Feb", co2Saved: 145, milesSaved: 520 },
    { month: "Mar", co2Saved: 168, milesSaved: 610 },
    { month: "Apr", co2Saved: 195, milesSaved: 720 },
    { month: "May", co2Saved: 220, milesSaved: 830 },
    { month: "Jun", co2Saved: 248, milesSaved: 940 },
  ];

  const topUsersData = [
    { name: "John Doe", trips: 28, books: 5, rating: 4.9 },
    { name: "Jane Smith", trips: 25, books: 8, rating: 4.8 },
    { name: "Mike Johnson", trips: 22, books: 12, rating: 4.7 },
    { name: "Sarah Wilson", trips: 19, books: 3, rating: 4.6 },
    { name: "David Lee", trips: 17, books: 7, rating: 4.8 },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const officeId = "office_1"; // In a real app, this would come from auth context

      // Load library statistics
      const libraryStatsResponse = await apiService.getLibraryStats(officeId);
      setLibraryStats(libraryStatsResponse.data);

      // Load popular books
      const popularBooksResponse = await apiService.getPopularBooks(
        officeId,
        10
      );
      setPopularBooks(popularBooksResponse.data.popular_books || []);

      // Load overdue books
      const overdueBooksResponse = await apiService.getOverdueBooks(officeId);
      setOverdueBooks(overdueBooksResponse.data.overdue_books || []);

      // Load library activity
      const activityResponse = await apiService.getLibraryActivity(
        officeId,
        50
      );
      setLibraryActivity(activityResponse.data.activities || []);

      // Generate book analytics from the data
      generateBookAnalytics(
        libraryStatsResponse.data,
        activityResponse.data.activities || []
      );

      // Load bike sharing analytics
      const bikeStatsResponse = await apiService.getBikeStats(officeId);
      setBikeStats(bikeStatsResponse.data);

      const bikeAnalyticsResponse = await apiService.getBikeUsageAnalytics(
        officeId,
        dateRange
      );
      setBikeAnalytics(bikeAnalyticsResponse.data);

      // Load environmental metrics
      const envMetricsResponse = await apiService.getEnvironmentalMetrics(
        officeId,
        dateRange
      );
      setEnvironmentalMetrics(envMetricsResponse.data);

      // Load user behavior analytics
      const userBehaviorResponse = await apiService.getUserBehaviorAnalytics(
        officeId,
        dateRange
      );
      setUserBehavior(userBehaviorResponse.data);

      // Load predictive analytics
      const predictiveResponse = await apiService.getPredictiveAnalytics(
        officeId,
        "demand"
      );
      setPredictiveData(predictiveResponse.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      // Fallback to mock data for development
      loadMockBookData();
      loadMockBikeData();
      loadMockEnvironmentalData();
      loadMockUserBehaviorData();
      loadMockPredictiveData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockBookData = () => {
    // Mock library stats for development
    setLibraryStats({
      library_stats: {
        total_books: 89,
        available_books: 67,
        borrowed_books: 18,
        reserved_books: 4,
        unique_authors: 45,
        by_condition: { excellent: 32, good: 41, fair: 14, poor: 2 },
        popular_tags: [
          { tag: "Programming", count: 25 },
          { tag: "Business", count: 18 },
          { tag: "Design", count: 12 },
          { tag: "Science", count: 8 },
        ],
      },
      borrow_stats: {
        total_requests: 156,
        pending_requests: 8,
        approved_requests: 18,
        completed_borrows: 130,
        completion_rate: "83.3%",
      },
    });

    setPopularBooks([
      {
        book_id: "1",
        title: "Clean Code",
        author: "Robert Martin",
        borrow_count: 12,
        availability_status: "available",
      },
      {
        book_id: "2",
        title: "Design Patterns",
        author: "Gang of Four",
        borrow_count: 10,
        availability_status: "borrowed",
      },
      {
        book_id: "3",
        title: "JavaScript: The Good Parts",
        author: "Douglas Crockford",
        borrow_count: 9,
        availability_status: "available",
      },
    ]);

    setOverdueBooks([
      {
        book_title: "Learning React",
        borrower_id: "user123",
        days_past_due: 5,
      },
      {
        book_title: "Node.js in Action",
        borrower_id: "user456",
        days_past_due: 2,
      },
    ]);

    generateMockBookAnalytics();
  };

  const generateBookAnalytics = (stats, activities) => {
    // Generate circulation trends from activity data
    const circulationTrends = generateCirculationTrends(activities);

    // Generate category distribution from tags
    const categoryDistribution = stats.library_stats.popular_tags.map(
      (tag) => ({
        name: tag.tag,
        value: tag.count,
        percentage: (
          (tag.count / stats.library_stats.total_books) *
          100
        ).toFixed(1),
      })
    );

    // Generate user engagement metrics
    const userEngagement = generateUserEngagement(activities);

    // Generate monthly borrow trends
    const monthlyBorrows = generateMonthlyBorrows(activities);

    setBookAnalytics({
      circulationTrends,
      categoryDistribution,
      userEngagement,
      monthlyBorrows,
    });
  };

  const generateMockBookAnalytics = () => {
    setBookAnalytics({
      circulationTrends: [
        { month: "Jan", borrows: 15, returns: 12, new_books: 8 },
        { month: "Feb", borrows: 22, returns: 18, new_books: 5 },
        { month: "Mar", borrows: 28, returns: 25, new_books: 12 },
        { month: "Apr", borrows: 31, returns: 29, new_books: 7 },
        { month: "May", borrows: 26, returns: 24, new_books: 9 },
        { month: "Jun", borrows: 33, returns: 31, new_books: 11 },
      ],
      categoryDistribution: [
        { name: "Programming", value: 25, percentage: "28.1" },
        { name: "Business", value: 18, percentage: "20.2" },
        { name: "Design", value: 12, percentage: "13.5" },
        { name: "Science", value: 8, percentage: "9.0" },
        { name: "Other", value: 26, percentage: "29.2" },
      ],
      userEngagement: [
        { metric: "Active Borrowers", value: 42, change: 8 },
        { metric: "Avg. Books per User", value: 2.1, change: 0.3 },
        { metric: "Return Rate", value: 94, change: 2 },
        { metric: "Avg. Borrow Duration", value: 12, change: -1 },
      ],
      monthlyBorrows: [
        { month: "Jan", total: 15, completed: 12, overdue: 2, active: 1 },
        { month: "Feb", total: 22, completed: 18, overdue: 1, active: 3 },
        { month: "Mar", total: 28, completed: 25, overdue: 1, active: 2 },
        { month: "Apr", total: 31, completed: 29, overdue: 0, active: 2 },
        { month: "May", total: 26, completed: 24, overdue: 1, active: 1 },
        { month: "Jun", total: 33, completed: 31, overdue: 0, active: 2 },
      ],
    });
  };

  const generateCirculationTrends = (activities) => {
    // Group activities by month and count different types
    const monthlyData = {};

    activities.forEach((activity) => {
      const month = new Date(activity.timestamp).toLocaleDateString("en-US", {
        month: "short",
      });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, borrows: 0, returns: 0, new_books: 0 };
      }

      if (activity.type === "borrow_request") monthlyData[month].borrows++;
      if (activity.type === "book_returned") monthlyData[month].returns++;
      if (activity.type === "book_added") monthlyData[month].new_books++;
    });

    return Object.values(monthlyData);
  };

  const generateUserEngagement = (activities) => {
    const uniqueUsers = new Set();
    let totalBorrows = 0;
    let totalReturns = 0;

    activities.forEach((activity) => {
      uniqueUsers.add(activity.user_id);
      if (activity.type === "borrow_request") totalBorrows++;
      if (activity.type === "book_returned") totalReturns++;
    });

    return [
      { metric: "Active Borrowers", value: uniqueUsers.size, change: 8 },
      {
        metric: "Avg. Books per User",
        value: (totalBorrows / uniqueUsers.size || 0).toFixed(1),
        change: 0.3,
      },
      {
        metric: "Return Rate",
        value:
          totalBorrows > 0
            ? Math.round((totalReturns / totalBorrows) * 100)
            : 0,
        change: 2,
      },
      { metric: "Avg. Borrow Duration", value: 12, change: -1 },
    ];
  };

  const generateMonthlyBorrows = (activities) => {
    const monthlyData = {};

    activities.forEach((activity) => {
      const month = new Date(activity.timestamp).toLocaleDateString("en-US", {
        month: "short",
      });
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          total: 0,
          completed: 0,
          overdue: 0,
          active: 0,
        };
      }

      if (activity.type === "borrow_request") monthlyData[month].total++;
      if (activity.type === "book_returned") monthlyData[month].completed++;
    });

    return Object.values(monthlyData);
  };

  const loadMockBikeData = () => {
    setBikeStats({
      total_bikes: 24,
      available_bikes: 18,
      active_bookings: 6,
      total_bookings: 142,
      avg_booking_duration: 4.2,
      completion_rate: "91.5%",
    });

    setBikeAnalytics({
      usageTrends: [
        { month: "Jan", bookings: 18, hours: 76 },
        { month: "Feb", bookings: 22, hours: 94 },
        { month: "Mar", bookings: 28, hours: 118 },
        { month: "Apr", bookings: 31, hours: 132 },
        { month: "May", bookings: 26, hours: 109 },
        { month: "Jun", bookings: 17, hours: 71 },
      ],
      popularBikes: [
        { bike_id: "bike_001", type: "Electric", bookings: 28 },
        { bike_id: "bike_002", type: "Mountain", bookings: 24 },
        { bike_id: "bike_003", type: "Hybrid", bookings: 19 },
      ],
      bookingPatterns: [
        { day: "Mon", morning: 8, afternoon: 12, evening: 5 },
        { day: "Tue", morning: 10, afternoon: 14, evening: 6 },
        { day: "Wed", morning: 9, afternoon: 13, evening: 7 },
        { day: "Thu", morning: 11, afternoon: 15, evening: 8 },
        { day: "Fri", morning: 7, afternoon: 11, evening: 4 },
        { day: "Sat", morning: 3, afternoon: 5, evening: 2 },
        { day: "Sun", morning: 2, afternoon: 4, evening: 1 },
      ],
    });
  };

  const loadMockEnvironmentalData = () => {
    setEnvironmentalMetrics({
      totalCO2Saved: 1248,
      totalMilesSaved: 4720,
      treesEquivalent: 62,
      monthlyTrends: [
        {
          month: "Jan",
          carpoolCO2: 120,
          bikeCO2: 15,
          totalMiles: 450,
          participants: 45,
        },
        {
          month: "Feb",
          carpoolCO2: 145,
          bikeCO2: 18,
          totalMiles: 520,
          participants: 52,
        },
        {
          month: "Mar",
          carpoolCO2: 168,
          bikeCO2: 22,
          totalMiles: 610,
          participants: 61,
        },
        {
          month: "Apr",
          carpoolCO2: 195,
          bikeCO2: 28,
          totalMiles: 720,
          participants: 78,
        },
        {
          month: "May",
          carpoolCO2: 220,
          bikeCO2: 31,
          totalMiles: 830,
          participants: 89,
        },
        {
          month: "Jun",
          carpoolCO2: 248,
          bikeCO2: 26,
          totalMiles: 940,
          participants: 103,
        },
      ],
    });
  };

  const loadMockUserBehaviorData = () => {
    setUserBehavior({
      engagementScore: 78,
      retentionRate: 85,
      activeUsers: 142,
      churnRate: 8,
      avgSessionDuration: 12.5,
      featureAdoption: {
        carpooling: 92,
        bookSharing: 68,
        bikeSharing: 45,
      },
      userSegments: [
        { segment: "Power Users", count: 28, percentage: 18 },
        { segment: "Regular Users", count: 89, percentage: 57 },
        { segment: "Occasional Users", count: 25, percentage: 16 },
        { segment: "Inactive", count: 14, percentage: 9 },
      ],
    });
  };

  const loadMockPredictiveData = () => {
    setPredictiveData({
      demandForecast: [
        { week: "Week 1", carpools: 85, books: 32, bikes: 18, confidence: 92 },
        { week: "Week 2", carpools: 92, books: 38, bikes: 22, confidence: 89 },
        { week: "Week 3", carpools: 88, books: 35, bikes: 20, confidence: 87 },
        { week: "Week 4", carpools: 95, books: 41, bikes: 25, confidence: 85 },
      ],
      peakUsageTimes: [
        { time: "7-9 AM", carpools: 45, bikes: 8 },
        { time: "12-2 PM", carpools: 12, bikes: 15 },
        { time: "5-7 PM", carpools: 52, bikes: 6 },
      ],
      recommendations: [
        {
          type: "capacity",
          message: "Increase carpool capacity on Thursday evenings (5-7 PM)",
          impact: "high",
        },
        {
          type: "promotion",
          message:
            "Promote bike sharing during lunch hours for higher adoption",
          impact: "medium",
        },
        {
          type: "engagement",
          message: "Target occasional users with personalized notifications",
          impact: "medium",
        },
      ],
    });
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color = "#2196F3",
    trend,
  }) => (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon" style={{ color }}>
          {icon}
        </div>
        {trend && (
          <div className={`trend ${trend > 0 ? "trend-up" : "trend-down"}`}>
            {trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>
          {loading ? "..." : value}
        </div>
        <div className="stat-label">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="page-header">
        <h2>Analytics & Insights</h2>
        <p>Track platform performance and user engagement metrics</p>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="filters-section">
          <div className="filter-controls">
            <select
              className="form-control"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>

            <button className="btn btn-primary">📊 Export Report</button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value="156"
          subtitle="Active this month"
          icon="👥"
          color="#2196F3"
          trend={12}
        />
        <StatCard
          title="CO₂ Saved"
          value="248 kg"
          subtitle="This month"
          icon="🌱"
          color="#4CAF50"
          trend={8}
        />
        <StatCard
          title="Miles Saved"
          value="940"
          subtitle="Through carpooling"
          icon="🚗"
          color="#FF9800"
          trend={15}
        />
        <StatCard
          title="Books Circulated"
          value={libraryStats?.library_stats?.total_books || "89"}
          subtitle="Total in library"
          icon="📚"
          color="#9C27B0"
          trend={-3}
        />
        <StatCard
          title="Active Borrows"
          value={libraryStats?.library_stats?.borrowed_books || "18"}
          subtitle="Currently borrowed"
          icon="📖"
          color="#FF5722"
          trend={5}
        />
        <StatCard
          title="Completion Rate"
          value={libraryStats?.borrow_stats?.completion_rate || "83.3%"}
          subtitle="Books returned on time"
          icon="✅"
          color="#4CAF50"
          trend={2}
        />
        <StatCard
          title="Overdue Books"
          value={overdueBooks.length}
          subtitle="Need attention"
          icon="⚠️"
          color="#f44336"
          trend={overdueBooks.length > 0 ? -10 : 0}
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* User Growth Chart */}
        <div className="card chart-card">
          <h3>User Growth Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#2196F3"
                  fill="#2196F3"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Activity Chart */}
        <div className="card chart-card">
          <h3>Weekly Activity by Service</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tripActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="carpools" fill="#2196F3" name="Carpools" />
                <Bar dataKey="books" fill="#4CAF50" name="Books" />
                <Bar dataKey="bikes" fill="#FF9800" name="Bikes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Usage Distribution */}
        <div className="card chart-card">
          <h3>Service Usage Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceUsageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {serviceUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="card chart-card">
          <h3>Environmental Impact</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={environmentalImpactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="co2Saved"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  name="CO₂ Saved (kg)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="milesSaved"
                  stroke="#2196F3"
                  strokeWidth={2}
                  name="Miles Saved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Book Circulation Trends */}
        <div className="card chart-card">
          <h3>Library Circulation Trends</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={bookAnalytics.circulationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="new_books"
                  fill="#9C27B0"
                  name="New Books Added"
                />
                <Line
                  type="monotone"
                  dataKey="borrows"
                  stroke="#2196F3"
                  strokeWidth={2}
                  name="Books Borrowed"
                />
                <Line
                  type="monotone"
                  dataKey="returns"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  name="Books Returned"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Book Category Distribution */}
        <div className="card chart-card">
          <h3>Book Category Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookAnalytics.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {bookAnalytics.categoryDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 45}, 70%, 60%)`}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Borrow Status */}
        <div className="card chart-card">
          <h3>Monthly Borrow Status Breakdown</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookAnalytics.monthlyBorrows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="#4CAF50"
                  name="Completed"
                />
                <Bar
                  dataKey="active"
                  stackId="a"
                  fill="#2196F3"
                  name="Active"
                />
                <Bar
                  dataKey="overdue"
                  stackId="a"
                  fill="#f44336"
                  name="Overdue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="card">
        <h3>Top Active Users</h3>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Trips Completed</th>
              <th>Books Shared</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {topUsersData.map((user, index) => (
              <tr key={user.name}>
                <td>
                  <div className="user-rank">
                    <span className="rank">#{index + 1}</span>
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.trips}</td>
                <td>{user.books}</td>
                <td>⭐ {user.rating}</td>
                <td>
                  <span className="status-badge status-active">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popular Books Table */}
      <div className="card">
        <h3>Most Popular Books</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Title</th>
              <th>Author</th>
              <th>Times Borrowed</th>
              <th>Status</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {popularBooks.slice(0, 10).map((book, index) => (
              <tr key={book.book_id}>
                <td>
                  <span className="rank">#{index + 1}</span>
                </td>
                <td>
                  <strong>{book.title}</strong>
                </td>
                <td>{book.author}</td>
                <td>
                  <span className="borrow-count">{book.borrow_count}</span>
                </td>
                <td>
                  <span className="popularity-indicator">
                    {"🔥".repeat(Math.min(Math.ceil(book.borrow_count / 3), 3))}
                  </span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor:
                        book.availability_status === "available"
                          ? "#4CAF50"
                          : "#f44336",
                      color: "white",
                    }}
                  >
                    {book.availability_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {popularBooks.length === 0 && (
          <div className="empty-state">
            <p>No popular books data available yet.</p>
          </div>
        )}
      </div>

      {/* Library Health Metrics */}
      <div className="card">
        <h3>Library Health Metrics</h3>
        <div className="metrics-grid">
          {bookAnalytics.userEngagement.map((metric, index) => (
            <div key={metric.metric} className="metric-card">
              <div className="metric-value">
                {metric.value}
                {metric.metric.includes("Rate") ? "%" : ""}
                {metric.metric.includes("Duration") ? " days" : ""}
              </div>
              <div className="metric-label">{metric.metric}</div>
              <div
                className={`metric-change ${metric.change >= 0 ? "positive" : "negative"}`}
              >
                {metric.change >= 0 ? "↗" : "↘"} {Math.abs(metric.change)}
                {metric.metric.includes("Rate")
                  ? "pp"
                  : metric.metric.includes("Duration")
                    ? "d"
                    : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Books Alert */}
      {overdueBooks.length > 0 && (
        <div className="card alert-card">
          <h3>⚠️ Overdue Books Requiring Attention</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Borrower</th>
                <th>Days Overdue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueBooks.map((book, index) => (
                <tr key={index} className="overdue-row">
                  <td>
                    <strong>{book.book_title}</strong>
                  </td>
                  <td>{book.borrower_id}</td>
                  <td>
                    <span className="overdue-days">
                      {book.days_past_due} days
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-warning btn-sm">
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Library Activity Feed */}
      <div className="card">
        <h3>Recent Library Activity</h3>
        <div className="activity-feed">
          {libraryActivity.slice(0, 10).map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {activity.type === "book_added" && "📚"}
                {activity.type === "borrow_request" && "📖"}
                {activity.type === "borrow_approved" && "✅"}
                {activity.type === "book_returned" && "↩️"}
              </div>
              <div className="activity-content">
                <div className="activity-description">
                  <strong>User {activity.user_id}</strong>{" "}
                  {activity.activity_description}
                </div>
                <div className="activity-time">
                  {new Date(activity.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        {libraryActivity.length === 0 && (
          <div className="empty-state">
            <p>No recent library activity.</p>
          </div>
        )}
      </div>

      {/* Bike Sharing Analytics Section */}
      <div className="section-header">
        <h2>🚴 Bike Sharing Analytics</h2>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Bikes"
          value={bikeStats?.total_bikes || "24"}
          subtitle="In the system"
          icon="🚲"
          color="#FF9800"
        />
        <StatCard
          title="Available Bikes"
          value={bikeStats?.available_bikes || "18"}
          subtitle="Ready to book"
          icon="✅"
          color="#4CAF50"
        />
        <StatCard
          title="Active Bookings"
          value={bikeStats?.active_bookings || "6"}
          subtitle="Currently in use"
          icon="🔄"
          color="#2196F3"
        />
        <StatCard
          title="Completion Rate"
          value={bikeStats?.completion_rate || "91.5%"}
          subtitle="Successful returns"
          icon="📊"
          color="#9C27B0"
        />
      </div>

      <div className="charts-section">
        <div className="card chart-card">
          <h3>Bike Usage Trends</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={bikeAnalytics.usageTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar
                  yAxisId="left"
                  dataKey="bookings"
                  fill="#FF9800"
                  name="Bookings"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hours"
                  stroke="#2196F3"
                  strokeWidth={2}
                  name="Total Hours"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Booking Patterns by Day</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bikeAnalytics.bookingPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="morning"
                  stackId="a"
                  fill="#FFA726"
                  name="Morning"
                />
                <Bar
                  dataKey="afternoon"
                  stackId="a"
                  fill="#FF9800"
                  name="Afternoon"
                />
                <Bar
                  dataKey="evening"
                  stackId="a"
                  fill="#F57C00"
                  name="Evening"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Environmental Impact Section */}
      <div className="section-header">
        <h2>🌱 Comprehensive Environmental Impact</h2>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total CO₂ Saved"
          value={`${environmentalMetrics.totalCO2Saved} kg`}
          subtitle="All time"
          icon="🌍"
          color="#4CAF50"
          trend={12}
        />
        <StatCard
          title="Miles Not Driven"
          value={environmentalMetrics.totalMilesSaved.toLocaleString()}
          subtitle="Through sharing"
          icon="🚗"
          color="#2196F3"
          trend={15}
        />
        <StatCard
          title="Trees Equivalent"
          value={environmentalMetrics.treesEquivalent}
          subtitle="CO₂ absorption"
          icon="🌳"
          color="#66BB6A"
          trend={8}
        />
        <StatCard
          title="Active Participants"
          value={
            environmentalMetrics.monthlyTrends[
              environmentalMetrics.monthlyTrends.length - 1
            ]?.participants || 103
          }
          subtitle="This month"
          icon="👥"
          color="#9C27B0"
          trend={10}
        />
      </div>

      <div className="charts-section">
        <div className="card chart-card">
          <h3>CO₂ Savings by Service</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={environmentalMetrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="carpoolCO2"
                  stackId="1"
                  stroke="#2196F3"
                  fill="#2196F3"
                  name="Carpool CO₂ (kg)"
                />
                <Area
                  type="monotone"
                  dataKey="bikeCO2"
                  stackId="1"
                  stroke="#FF9800"
                  fill="#FF9800"
                  name="Bike CO₂ (kg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Environmental Impact Growth</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={environmentalMetrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalMiles"
                  stroke="#2196F3"
                  strokeWidth={2}
                  name="Miles Saved"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="participants"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  name="Participants"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Behavior Analytics Section */}
      <div className="section-header">
        <h2>👤 Advanced User Behavior Analytics</h2>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Engagement Score"
          value={`${userBehavior.engagementScore}%`}
          subtitle="Overall platform"
          icon="📊"
          color="#2196F3"
          trend={5}
        />
        <StatCard
          title="Retention Rate"
          value={`${userBehavior.retentionRate}%`}
          subtitle="30-day retention"
          icon="🔄"
          color="#4CAF50"
          trend={3}
        />
        <StatCard
          title="Active Users"
          value={userBehavior.activeUsers}
          subtitle="This month"
          icon="👥"
          color="#FF9800"
          trend={8}
        />
        <StatCard
          title="Churn Rate"
          value={`${userBehavior.churnRate}%`}
          subtitle="Monthly churn"
          icon="📉"
          color="#f44336"
          trend={-2}
        />
      </div>

      <div className="charts-section">
        <div className="card chart-card">
          <h3>Feature Adoption Rates</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    feature: "Carpooling",
                    adoption: userBehavior.featureAdoption?.carpooling || 92,
                  },
                  {
                    feature: "Book Sharing",
                    adoption: userBehavior.featureAdoption?.bookSharing || 68,
                  },
                  {
                    feature: "Bike Sharing",
                    adoption: userBehavior.featureAdoption?.bikeSharing || 45,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="adoption" fill="#2196F3" name="Adoption %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>User Segmentation</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userBehavior.userSegments || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ segment, percentage }) =>
                    `${segment}: ${percentage}%`
                  }
                >
                  {(userBehavior.userSegments || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 90}, 70%, 60%)`}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Predictive Analytics Section */}
      <div className="section-header">
        <h2>🔮 Predictive Usage & Demand Forecasting</h2>
      </div>

      <div className="charts-section">
        <div className="card chart-card">
          <h3>4-Week Demand Forecast</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={predictiveData.demandForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="carpools"
                  stroke="#2196F3"
                  strokeWidth={2}
                  name="Carpools"
                />
                <Line
                  type="monotone"
                  dataKey="books"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  name="Books"
                />
                <Line
                  type="monotone"
                  dataKey="bikes"
                  stroke="#FF9800"
                  strokeWidth={2}
                  name="Bikes"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Peak Usage Times</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={predictiveData.peakUsageTimes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="carpools" fill="#2196F3" name="Carpools" />
                <Bar dataKey="bikes" fill="#FF9800" name="Bikes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card">
        <h3>🤖 AI-Powered Recommendations</h3>
        <div className="recommendations-list">
          {predictiveData.recommendations.map((rec, index) => (
            <div
              key={index}
              className={`recommendation-item impact-${rec.impact}`}
            >
              <div className="recommendation-icon">
                {rec.impact === "high"
                  ? "🔴"
                  : rec.impact === "medium"
                    ? "🟡"
                    : "🟢"}
              </div>
              <div className="recommendation-content">
                <div className="recommendation-type">
                  {rec.type.toUpperCase()}
                </div>
                <div className="recommendation-message">{rec.message}</div>
                <div className="recommendation-impact">
                  Impact: {rec.impact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights Cards */}
      <div className="insights-section">
        <div className="card insight-card">
          <h4>📈 Key Insights</h4>
          <ul className="insights-list">
            <li>User growth increased by 12% this month</li>
            <li>Carpooling remains the most popular service at 65% usage</li>
            <li>
              Environmental impact: {environmentalMetrics.totalCO2Saved}kg CO₂
              saved total
            </li>
            <li>
              Library has {libraryStats?.library_stats?.total_books || 89} books
              with {libraryStats?.borrow_stats?.completion_rate || "83.3%"}{" "}
              completion rate
            </li>
            <li>
              Bike sharing has {bikeStats?.total_bikes || 24} bikes with{" "}
              {bikeStats?.completion_rate || "91.5%"} completion rate
            </li>
            <li>
              {overdueBooks.length > 0
                ? `${overdueBooks.length} books are overdue and need attention`
                : "No overdue books - excellent compliance!"}
            </li>
            <li>
              User engagement score is {userBehavior.engagementScore}% with{" "}
              {userBehavior.retentionRate}% retention
            </li>
          </ul>
        </div>

        <div className="card insight-card">
          <h4>🎯 Recommendations</h4>
          <ul className="insights-list">
            <li>Promote bike sharing during lunch hours for higher adoption</li>
            <li>Consider expanding carpool capacity on Thursdays</li>
            <li>Target occasional users with personalized notifications</li>
            <li>Recognize top users to encourage continued participation</li>
            <li>
              Focus marketing on environmental benefits -{" "}
              {environmentalMetrics.treesEquivalent} trees equivalent!
            </li>
            {overdueBooks.length > 0 && (
              <li>
                Send automated reminders for overdue books to improve return
                rates
              </li>
            )}
            <li>
              Increase bike availability during peak times (7-9 AM, 5-7 PM)
            </li>
          </ul>
        </div>

        <div className="card insight-card">
          <h4>📚 Library Insights</h4>
          <ul className="insights-list">
            <li>
              {libraryStats?.library_stats?.available_books || 67} books
              currently available for borrowing
            </li>
            <li>
              {libraryStats?.library_stats?.unique_authors || 45} unique authors
              in the collection
            </li>
            <li>
              Average borrow duration:{" "}
              {bookAnalytics.userEngagement.find(
                (m) => m.metric === "Avg. Borrow Duration"
              )?.value || 12}{" "}
              days
            </li>
            <li>
              {bookAnalytics.userEngagement.find(
                (m) => m.metric === "Active Borrowers"
              )?.value || 42}{" "}
              active borrowers this month
            </li>
            <li>
              Most popular tag:{" "}
              {libraryStats?.library_stats?.popular_tags?.[0]?.tag ||
                "Programming"}{" "}
              ({libraryStats?.library_stats?.popular_tags?.[0]?.count || 25}{" "}
              books)
            </li>
            <li>
              Book condition:{" "}
              {libraryStats?.library_stats?.by_condition?.excellent || 32}{" "}
              excellent, {libraryStats?.library_stats?.by_condition?.good || 41}{" "}
              good condition
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
