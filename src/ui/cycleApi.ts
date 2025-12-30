import { getOrCreateDeviceId } from "./deviceId";

export async function upsertCycle(eye: "LEFT" | "RIGHT", dueAt: Date) {
    const base = import.meta.env.VITE_PUSH_API_BASE as string;
    if (!base) throw new Error("Missing VITE_PUSH_API_BASE");

    const deviceId = getOrCreateDeviceId();

    const res = await fetch(`${base}/cycle/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, eye, dueAt: dueAt.toISOString() }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`cycle/upsert failed ${res.status}: ${text}`);
    return JSON.parse(text);
}
