import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Carpools from "./pages/Carpools";
import Books from "./pages/Books";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Disputes from "./pages/Disputes";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/carpools" element={<Carpools />} />
          <Route path="/books" element={<Books />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
