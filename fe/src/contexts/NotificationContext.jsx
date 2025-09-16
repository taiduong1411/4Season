import React from "react";
import { NotificationContext } from "../hooks/useNotificationContext";
import GlobalNotification from "../components/GlobalNotification";

export const NotificationProvider = ({ children }) => {
  return (
    <NotificationContext.Provider value={{}}>
      {children}
      <GlobalNotification />
    </NotificationContext.Provider>
  );
};
