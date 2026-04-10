import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  registerPushToken,
  setupNotificationCategories,
  setupNotificationListeners,
} from "../services/notifications";

export function useNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up action categories and register token
    setupNotificationCategories();
    registerPushToken();

    // Set up listeners — invalidate medicines query on successful mark_taken
    const cleanup = setupNotificationListeners(() => {
      queryClient.invalidateQueries({ queryKey: ["todaysMedicines"] });
    });

    return cleanup;
  }, [queryClient]);
}
