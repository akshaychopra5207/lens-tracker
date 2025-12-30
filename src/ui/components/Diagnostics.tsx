import React from "react";
import { getOrCreateDeviceId } from "../deviceId";

export function Diagnostics() {
    const diagnostics = React.useMemo(() => {
        const hasNotification = typeof window !== "undefined" && "Notification" in window;
        return {
            serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
            deviceId: getOrCreateDeviceId(),
            pushManager: typeof window !== "undefined" && "PushManager" in window,
            notification: hasNotification,
            permission: hasNotification ? Notification.permission : "n/a",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
            isStandalone:
                // iOS Safari standalone
                (typeof navigator !== "undefined" && (navigator as any).standalone === true) ||
                // general PWA display-mode
                (typeof window !== "undefined" &&
                    window.matchMedia?.("(display-mode: standalone)")?.matches) ||
                false,
        };
    }, []);

    return (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Diagnostics (temporary)</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(diagnostics, null, 2)}
            </pre>
        </div>
    );
}
