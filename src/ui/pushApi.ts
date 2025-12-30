import { getOrCreateDeviceId } from "./deviceId";

export async function registerPushSubscription(sub: PushSubscription) {
    const base = import.meta.env.VITE_PUSH_API_BASE as string;
    if (!base) throw new Error("Missing VITE_PUSH_API_BASE");

    const deviceId = getOrCreateDeviceId();

    const res = await fetch(`${base}/push/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            deviceId,
            subscription: sub.toJSON(),
        }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Register failed ${res.status}: ${text}`);

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
