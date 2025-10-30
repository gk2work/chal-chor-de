import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Form, Input, Button, Typography, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [form] = Form.useForm();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (values) => {
    setLoading(true);
    const result = await login(values.email, values.password);
    setLoading(false);

    if (!result.success) {
      // Error message is handled in AuthContext
      form.setFields([
        {
          name: "password",
          errors: ["Invalid credentials"],
        },
      ]);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ color: "#2196F3", marginBottom: 8 }}>
              OfficeShare Admin
            </Title>
            <Text type="secondary">Sign in to access the admin dashboard</Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Please enter your password!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 48 }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Use your OfficeShare account credentials to access the admin panel
            </Text>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default Login;
