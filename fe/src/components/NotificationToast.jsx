import React from "react";

const NotificationToast = ({ notification, onClose }) => {
  if (!notification) return null;

  const getNotificationStyles = (type) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-white/95",
          border: "border-green-200/50",
          iconBg: "bg-gradient-to-br from-green-400 to-emerald-500",
          icon: "✓",
          text: "text-gray-800",
          accent: "text-green-600",
          glow: "shadow-green-200/50",
        };
      case "error":
        return {
          bg: "bg-white/95",
          border: "border-red-200/50",
          iconBg: "bg-gradient-to-br from-red-400 to-rose-500",
          icon: "✕",
          text: "text-gray-800",
          accent: "text-red-600",
          glow: "shadow-red-200/50",
        };
      case "warning":
        return {
          bg: "bg-white/95",
          border: "border-yellow-200/50",
          iconBg: "bg-gradient-to-br from-yellow-400 to-amber-500",
          icon: "⚠",
          text: "text-gray-800",
          accent: "text-yellow-600",
          glow: "shadow-yellow-200/50",
        };
      case "info":
      default:
        return {
          bg: "bg-white/95",
          border: "border-blue-200/50",
          iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500",
          icon: "i",
          text: "text-gray-800",
          accent: "text-blue-600",
          glow: "shadow-blue-200/50",
        };
    }
  };

  const styles = getNotificationStyles(notification.type);

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
      <div
        className={`${styles.bg} ${styles.border} border backdrop-blur-xl rounded-2xl shadow-2xl ${styles.glow} max-w-sm overflow-hidden relative`}>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>

        {/* Progress bar */}
        <div className={`h-0.5 ${styles.iconBg} animate-progress relative`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </div>

        <div className="p-4 relative">
          <div className="flex items-start space-x-3">
            {/* Icon with enhanced styling */}
            <div
              className={`${styles.iconBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <span className="text-white text-sm font-bold relative z-10">
                {styles.icon}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`${styles.text} font-semibold text-sm leading-relaxed`}>
                {notification.message}
              </p>
            </div>

            {/* Enhanced close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100/50 group">
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
