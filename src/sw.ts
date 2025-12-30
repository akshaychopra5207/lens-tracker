/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

declare const self: ServiceWorkerGlobalScope;

// (Optional but nice) Claim clients + skip waiting to update faster
self.addEventListener("install", () => {
    self.skipWaiting();
});
self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

// ✅ PUSH: show a notification
self.addEventListener("push", (event: PushEvent) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title ?? "LensTracker";
    const body = data.body ?? "Lens reminder";

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            tag: data.tag ?? "lenstracker",
            renotify: true,
            data: data.url ?? "/", // used when user taps notification
        })
    );
});

// ✅ CLICK: open the app
self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();
    const url = (event.notification as any).data ?? "/";

    event.waitUntil(self.clients.openWindow(url));
});
