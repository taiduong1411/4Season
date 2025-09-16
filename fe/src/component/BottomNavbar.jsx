import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

function BottomNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "📊",
      path: "/admin/dashboard",
    },
    {
      id: "products",
      label: "Sản phẩm",
      icon: "📦",
      path: "/admin/products",
    },
    {
      id: "orders",
      label: "Đơn hàng",
      icon: "📋",
      path: "/admin/orders",
    },
    {
      id: "settings",
      label: "Cài đặt",
      icon: "⚙️",
      path: "/admin/settings",
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-16"></div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Background */}
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
          {/* Navigation items */}
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-around py-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group ${
                    isActive(item.path)
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg transform scale-110"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}>
                  {/* Icon */}
                  <span
                    className={`text-xl transition-all duration-300 ${
                      isActive(item.path)
                        ? "text-white"
                        : "group-hover:scale-110"
                    }`}>
                    {item.icon}
                  </span>

                  {/* Active indicator */}
                  {isActive(item.path) && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BottomNavbar;
