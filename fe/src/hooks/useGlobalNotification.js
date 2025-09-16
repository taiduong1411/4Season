import { useState, useEffect, useRef } from "react";
import {
  subscribeToOrders,
  unsubscribeFromOrders,
} from "../services/orderService";
import useNotificationSound from "./useNotificationSound";

export const useGlobalNotification = () => {
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const subscriptionRef = useRef(null);
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    // Subscribe to real-time order updates
    const subscription = subscribeToOrders((payload) => {
      // Check for INSERT event (new order)
      if (payload.eventType === "INSERT" || payload.eventType === "insert") {
        const orderData = payload.new || payload.record;
        if (orderData) {
          // New order added
          setNewOrderNotification({
            message: `Đơn hàng mới #${orderData.order_id.slice(-8)}`,
            order: orderData,
            timestamp: new Date(),
          });

          // Play notification sound
          playNotificationSound();

          // Auto hide notification after 5 seconds
          setTimeout(() => {
            setNewOrderNotification(null);
          }, 5000);
        }
      }
    });

    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromOrders(subscriptionRef.current);
      }
    };
  }, [playNotificationSound]);

  const dismissNotification = () => {
    setNewOrderNotification(null);
  };

  return {
    newOrderNotification,
    dismissNotification,
  };
};
