import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface Prefs {
  breaking: boolean;
  morning: boolean;
}

/**
 * Web Push (VAPID) subscription management for this browser. Backed by
 * /api/v1/push/*; a real feature, not a preference flag that does nothing —
 * see app/services/push_service.py for the sending side.
 */
export function usePushNotifications() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
  }, []);

  const getExistingSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!supported) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }, [supported]);

  const subscribe = useCallback(
    async (prefs: Prefs): Promise<PushSubscription> => {
      if (!supported) {
        throw new Error("Push notifications aren't supported in this browser.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          "Notifications are blocked — enable them in your browser's site settings."
        );
      }

      const { key } = await apiFetch<{ key: string }>("/push/vapid-public-key");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const json = sub.toJSON();
      await apiFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          breaking: prefs.breaking,
          morning: prefs.morning,
        }),
      });
      return sub;
    },
    [supported]
  );

  const updatePreferences = useCallback(
    async (prefs: Partial<Prefs>): Promise<void> => {
      const sub = await getExistingSubscription();
      if (!sub) return;
      await apiFetch("/push/preferences", {
        method: "PATCH",
        body: JSON.stringify({ endpoint: sub.endpoint, ...prefs }),
      });
    },
    [getExistingSubscription]
  );

  const unsubscribe = useCallback(async (): Promise<void> => {
    const sub = await getExistingSubscription();
    if (!sub) return;
    await apiFetch("/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }, [getExistingSubscription]);

  return { supported, subscribe, updatePreferences, unsubscribe, getExistingSubscription };
}
