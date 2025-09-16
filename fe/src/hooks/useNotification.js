import { useState, useCallback } from "react";

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback(
    (message, type = "info", duration = 3000) => {
      setNotification({
        message,
        type, // 'success', 'error', 'warning', 'info'
        id: Date.now(),
      });

      // Auto hide after duration
      setTimeout(() => {
        setNotification(null);
      }, duration);
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
  };
};
