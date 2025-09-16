import React from "react";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./contexts/NotificationContext";
import Order from "./page/Order";
import AdminDashboard from "./page/Admin/Dashboard";
import AdminProduct from "./page/Admin/Product";
import AdminOrders from "./page/Admin/Orders";
import AdminSettings from "./page/Admin/Settings";

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<Order />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProduct />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}
export default App;
