import { useState, useCallback } from "react";

/**
 * Shared toast notification hook.
 * Returns state + a showToastNotification(message, type) function.
 * Auto-hides after 3s with exit animation starting at 2.5s.
 */
export default function useToast() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" | "error"
  const [isToastExiting, setIsToastExiting] = useState(false);

  const showToastNotification = useCallback((message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setIsToastExiting(false);
    setShowToast(true);

    // Start exit animation after 2.5 seconds
    setTimeout(() => {
      setIsToastExiting(true);
    }, 2500);

    // Actually hide after 3 seconds (allows exit animation to complete)
    setTimeout(() => {
      setShowToast(false);
      setIsToastExiting(false);
    }, 3000);
  }, []);

  return {
    showToast,
    toastMessage,
    toastType,
    isToastExiting,
    showToastNotification,
  };
}
