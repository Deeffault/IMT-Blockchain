import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import Toast from "./Toast";

type NotificationType = "success" | "error";

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  transactionHash?: string; // Add transaction hash property
};

type NotificationContextType = {
  showNotification: (
    message: string,
    type: NotificationType,
    transactionHash?: string
  ) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType, transactionHash?: string) => {
      const id = Date.now().toString();

      // Check if a notification with the same transaction hash exists
      const hashExists = transactionHash
        ? notifications.some((n) => n.transactionHash === transactionHash)
        : false;

      // Check if a notification with the same message exists (fallback)
      const messageExists = !transactionHash
        ? notifications.some((n) => n.message === message)
        : false;

      if (!hashExists && !messageExists) {
        setNotifications((prev) => [
          ...prev,
          { id, message, type, transactionHash },
        ]);
      }
    },
    // Remove notifications from dependency array to prevent infinite loops
    []
  );

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
