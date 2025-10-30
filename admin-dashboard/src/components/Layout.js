import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Layout.css";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "📊" },
    { name: "Users", href: "/users", icon: "👥" },
    { name: "Carpools", href: "/carpools", icon: "🚗" },
    { name: "Books", href: "/books", icon: "📚" },
    { name: "Analytics", href: "/analytics", icon: "📈" },
    { name: "Disputes", href: "/disputes", icon: "⚖️" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
  ];

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>OfficeShare Admin</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-text">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <header className="header">
          <div className="header-content">
            <h1>OfficeShare Platform Administration</h1>
            <div className="header-actions">
              <span className="user-info">Admin User</span>
              <button className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
