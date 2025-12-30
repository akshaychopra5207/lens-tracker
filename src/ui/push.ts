export function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeForPush(): Promise<PushSubscription> {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers not supported");
    if (!("PushManager" in window)) throw new Error("PushManager not supported");
    if (!("Notification" in window)) throw new Error("Notifications not supported");
    if (Notification.permission !== "granted") throw new Error("Notification permission not granted");

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    if (!publicKey) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");

    const reg = await navigator.serviceWorker.ready;

    // idempotent: reuse existing subscription if present
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
}
