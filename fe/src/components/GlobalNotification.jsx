import React from "react";
import { useGlobalNotification } from "../hooks/useGlobalNotification";

const GlobalNotification = () => {
  const { newOrderNotification, dismissNotification } = useGlobalNotification();

  if (!newOrderNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🔔</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {newOrderNotification.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {newOrderNotification.timestamp.toLocaleTimeString("vi-VN")}
            </p>
          </div>
          <button
            onClick={dismissNotification}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalNotification;
