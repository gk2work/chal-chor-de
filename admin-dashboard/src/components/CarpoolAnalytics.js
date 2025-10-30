import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Progress,
  Tag,
  Typography,
  Select,
  DatePicker,
  Space,
} from "antd";
import {
  CarOutlined,
  UserOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CarpoolAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(false);

  // Mock data for carpooling analytics
  const [kpiData] = useState({
    totalTrips: 342,
    completedTrips: 267,
    cancelledTrips: 51,
    activeTrips: 24,
    completionRate: 78.1,
    avgTripDistance: 18.5,
    avgTripCost: 15.25,
    avgRating: 4.7,
    totalDrivers: 45,
    totalRiders: 89,
    repeatUsers: 67,
    newUsers: 23,
    co2Saved: 2450,
    fuelSaved: 890,
    moneySaved: 8750,
    carsReduced: 156,
  });

  const [routeData] = useState([
    {
      route: "Downtown → Office Park",
      trips: 89,
      avgCost: 16.5,
      rating: 4.8,
      co2Saved: 445,
    },
    {
      route: "Suburbs → City Center",
      trips: 67,
      avgCost: 14.25,
      rating: 4.6,
      co2Saved: 334,
    },
    {
      route: "Airport → Downtown",
      trips: 45,
      avgCost: 22.75,
      rating: 4.9,
      co2Saved: 289,
    },
    {
      route: "Mall → Residential",
      trips: 34,
      avgCost: 12.0,
      rating: 4.5,
      co2Saved: 178,
    },
    {
      route: "University → Tech Hub",
      trips: 28,
      avgCost: 18.5,
      rating: 4.7,
      co2Saved: 156,
    },
  ]);

  const [timeSlotData] = useState([
    { time: "6-8 AM", trips: 45, utilization: 78 },
    { time: "8-10 AM", trips: 89, utilization: 92 },
    { time: "10-12 PM", trips: 23, utilization: 45 },
    { time: "12-2 PM", trips: 34, utilization: 56 },
    { time: "2-4 PM", trips: 28, utilization: 48 },
    { time: "4-6 PM", trips: 67, utilization: 85 },
    { time: "6-8 PM", trips: 78, utilization: 89 },
    { time: "8-10 PM", trips: 12, utilization: 25 },
  ]);

  const [driverPerformance] = useState([
    { name: "John D.", trips: 45, rating: 4.9, earnings: 687.5, co2Saved: 234 },
    {
      name: "Sarah M.",
      trips: 38,
      rating: 4.8,
      earnings: 579.0,
      co2Saved: 198,
    },
    { name: "Mike R.", trips: 34, rating: 4.7, earnings: 518.5, co2Saved: 167 },
    {
      name: "Lisa K.",
      trips: 29,
      rating: 4.8,
      earnings: 442.75,
      co2Saved: 145,
    },
    { name: "Tom W.", trips: 25, rating: 4.6, earnings: 381.25, co2Saved: 123 },
  ]);

  const routeColumns = [
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Total Trips",
      dataIndex: "trips",
      key: "trips",
      sorter: (a, b) => a.trips - b.trips,
    },
    {
      title: "Avg Cost",
      dataIndex: "avgCost",
      key: "avgCost",
      render: (cost) => `$${cost.toFixed(2)}`,
      sorter: (a, b) => a.avgCost - b.avgCost,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating) => (
        <Space>
          <TrophyOutlined style={{ color: "#faad14" }} />
          {rating.toFixed(1)}
        </Space>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: "CO₂ Saved (kg)",
      dataIndex: "co2Saved",
      key: "co2Saved",
      render: (co2) => <Tag color="green">{co2} kg</Tag>,
      sorter: (a, b) => a.co2Saved - b.co2Saved,
    },
  ];

  const driverColumns = [
    {
      title: "Driver",
      dataIndex: "name",
      key: "name",
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: "Trips",
      dataIndex: "trips",
      key: "trips",
      sorter: (a, b) => a.trips - b.trips,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating) => (
        <Space>
          <TrophyOutlined style={{ color: "#faad14" }} />
          {rating.toFixed(1)}
        </Space>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: "Earnings",
      dataIndex: "earnings",
      key: "earnings",
      render: (earnings) => `$${earnings.toFixed(2)}`,
      sorter: (a, b) => a.earnings - b.earnings,
    },
    {
      title: "CO₂ Impact",
      dataIndex: "co2Saved",
      key: "co2Saved",
      render: (co2) => <Tag color="green">{co2} kg</Tag>,
      sorter: (a, b) => a.co2Saved - b.co2Saved,
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Carpooling Analytics & KPIs
        </Title>
        <Space>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { label: "Last 7 days", value: "7d" },
              { label: "Last 30 days", value: "30d" },
              { label: "Last 90 days", value: "90d" },
              { label: "Last year", value: "1y" },
            ]}
            style={{ width: 150 }}
          />
        </Space>
      </div>

      {/* Core KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Trips"
              value={kpiData.totalTrips}
              prefix={<CarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={Math.round(
                  (kpiData.completedTrips / kpiData.totalTrips) * 100
                )}
                size="small"
                status="active"
              />
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {kpiData.completedTrips} completed, {kpiData.cancelledTrips}{" "}
                cancelled
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={kpiData.completionRate}
              suffix="%"
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                Target: 85% | Current: {kpiData.completionRate}%
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Trip Cost"
              value={kpiData.avgTripCost}
              prefix="$"
              precision={2}
              valueStyle={{ color: "#722ed1" }}
            />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                Distance: {kpiData.avgTripDistance} km avg
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="User Rating"
              value={kpiData.avgRating}
              suffix="/5.0"
              precision={1}
              valueStyle={{ color: "#faad14" }}
            />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                {kpiData.totalDrivers} drivers, {kpiData.totalRiders} riders
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Environmental Impact */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="CO₂ Saved"
              value={kpiData.co2Saved}
              suffix="kg"
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fuel Saved"
              value={kpiData.fuelSaved}
              suffix="L"
              valueStyle={{ color: "#13c2c2" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Money Saved"
              value={kpiData.moneySaved}
              prefix="$"
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Cars Reduced"
              value={kpiData.carsReduced}
              valueStyle={{ color: "#eb2f96" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Time Slot Utilization */}
        <Col xs={24} lg={12}>
          <Card title="Peak Hours Analysis" className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSlotData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="trips"
                  fill="#1890ff"
                  name="Total Trips"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilization"
                  stroke="#52c41a"
                  name="Utilization %"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* User Engagement */}
        <Col xs={24} lg={12}>
          <Card title="User Engagement" className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Repeat Users",
                      value: kpiData.repeatUsers,
                      color: "#52c41a",
                    },
                    {
                      name: "New Users",
                      value: kpiData.newUsers,
                      color: "#1890ff",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#52c41a" />
                  <Cell fill="#1890ff" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <div style={{ fontSize: 14, color: "#666" }}>
                Retention Rate:{" "}
                {Math.round(
                  (kpiData.repeatUsers /
                    (kpiData.repeatUsers + kpiData.newUsers)) *
                    100
                )}
                %
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Data Tables */}
      <Row gutter={[16, 16]}>
        {/* Popular Routes */}
        <Col xs={24} lg={12}>
          <Card title="Most Popular Routes">
            <Table
              columns={routeColumns}
              dataSource={routeData}
              rowKey="route"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Top Drivers */}
        <Col xs={24} lg={12}>
          <Card title="Top Performing Drivers">
            <Table
              columns={driverColumns}
              dataSource={driverPerformance}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Automated Alerts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Automated Alerts & Recommendations">
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#f6ffed",
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#52c41a",
                      marginBottom: 8,
                    }}
                  >
                    ✅ Performance Alert
                  </div>
                  <div style={{ fontSize: 14, color: "#666" }}>
                    Trip completion rate is above target (78.1% vs 75% target)
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#fff7e6",
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#faad14",
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ Capacity Alert
                  </div>
                  <div style={{ fontSize: 14, color: "#666" }}>
                    Friday 6-8 PM slot is at 89% capacity - consider driver
                    incentives
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#e6f7ff",
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#1890ff",
                      marginBottom: 8,
                    }}
                  >
                    📊 Growth Opportunity
                  </div>
                  <div style={{ fontSize: 14, color: "#666" }}>
                    Weekend utilization is low (25%) - promote weekend carpools
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CarpoolAnalytics;
