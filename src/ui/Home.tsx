import { useEffect, useState } from "react";
import BigButton from "./components/BigButton";
import { clearAll, listEventsDesc, saveEvent } from "../data/repo";
import { getSettings } from "../data/settingsRepo";
import { ev } from "../domain/events";
import { project } from "../domain/projection";
import { Diagnostics } from "./components/Diagnostics";
import { subscribeForPush } from "./push";
import { registerPushSubscription } from "./pushApi";
import { getOrCreateDeviceId } from "./deviceId";
import { upsertCycle } from "./cycleApi";

export default function Home() {
    const [invL, setInvL] = useState(0);
    const [invR, setInvR] = useState(0);
    const [nextL, setNextL] = useState<Date | null>(null);
    const [nextR, setNextR] = useState<Date | null>(null);
    const [runOut, setRunOut] = useState(0);

    const lensTypeId = "default";

    async function refresh() {
        const settings = await getSettings();
        const events = await listEventsDesc(1000);
        const p = project([...events].reverse(), settings.frequency);

        setInvL(p.invL);
        setInvR(p.invR);
        setNextL(p.nextL);
        setNextR(p.nextR);
        setRunOut(p.runOutDays);
    }

    useEffect(() => {
        refresh();
    }, []);

    const canUseLeft = invL > 0;
    const canUseRight = invR > 0;
    const canChangeBoth = invL > 0 && invR > 0;

    async function enableReminders() {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
            alert("Notifications not enabled.");
            return;
        }

        try {
            const sub = await subscribeForPush();
            const resp = await registerPushSubscription(sub);
            const deviceId = getOrCreateDeviceId();

            alert(`Registered ✅\nDeviceId: ${deviceId}\nResp: ${JSON.stringify(resp)}`);
        } catch (e: any) {
            alert(`Enable reminders failed: ${e?.message ?? String(e)}`);
        }
    }

    async function doUse(eye: "LEFT" | "RIGHT") {
        // 1) prevent negative inventory
        const eventsBefore = await listEventsDesc(1000);
        const s = await getSettings();
        const pBefore = project([...eventsBefore].reverse(), s.frequency);
        const invEye = eye === "LEFT" ? pBefore.invL : pBefore.invR;

        if (invEye <= 0) {
            alert(`No ${eye.toLowerCase()} inventory left.`);
            return;
        }

        // 2) Save USE event
        const e = eye === "LEFT" ? ev.useLeft(lensTypeId) : ev.useRight(lensTypeId);
        await saveEvent(e);

        // 3) Recompute projection AFTER saving to get the new due date
        const eventsAfter = await listEventsDesc(1000);
        const pAfter = project([...eventsAfter].reverse(), s.frequency);

        const due = eye === "LEFT" ? pAfter.nextL : pAfter.nextR;

        // 4) Tell Worker about this cycle (server-side “single source of truth”)
        if (due) {
            try {
                await upsertCycle(eye, due);
            } catch (err: any) {
                // Don’t block lens usage if push infra is down
                console.error("cycle/upsert failed:", err);
                alert(`Saved usage, but reminder sync failed: ${err?.message ?? String(err)}`);
            }
        } else {
            console.warn("No due date computed for eye", eye);
        }

        await refresh();
    }

    async function changeBoth() {
        await saveEvent(ev.changeLeft(lensTypeId));
        await saveEvent(ev.changeRight(lensTypeId));
        await saveEvent(ev.useLeft(lensTypeId));
        await saveEvent(ev.useRight(lensTypeId));
        await refresh();

        // Optional: also upsert cycles for both based on latest projection
        const s = await getSettings();
        const events = await listEventsDesc(1000);
        const p = project([...events].reverse(), s.frequency);

        if (p.nextL) await upsertCycle("LEFT", p.nextL);
        if (p.nextR) await upsertCycle("RIGHT", p.nextR);
    }

    async function clearAllData() {
        await clearAll();
        await refresh();
    }

    return (
        <div className="grid">
            <div className="card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                        <div className="small">Inventory</div>
                        <div className="big mono">
                            L: {invL} | R: {invR}
                        </div>
                        <div className="small">Run-out in ~{runOut} days</div>
                    </div>

                    <div>
                        <div className="small">Next Left</div>
                        <div>{nextL ? nextL.toDateString() : "—"}</div>
                        <div className="small">Next Right</div>
                        <div>{nextR ? nextR.toDateString() : "—"}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-2">
                <BigButton className="left" label="Use Left" onClick={() => doUse("LEFT")} disabled={!canUseLeft} />
                <BigButton className="right" label="Use Right" onClick={() => doUse("RIGHT")} disabled={!canUseRight} />
            </div>

            <BigButton className="primary" label="Change Both" onClick={changeBoth} disabled={!canChangeBoth} />
            <BigButton className="warn" label="Clear All" onClick={clearAllData} />

            <button className="button primary" onClick={enableReminders}>
                Enable Reminders
            </button>

            <Diagnostics />
        </div>
    );
}
