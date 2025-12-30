import { useEffect, useState } from 'react';
import BigButton from './components/BigButton';
import { clearAll, listEventsDesc, saveEvent } from '../data/repo';
import { getSettings } from '../data/settingsRepo';
import { ev } from '../domain/events';
import { project } from '../domain/projection';
import { Diagnostics } from "./components/Diagnostics";

export function getOrCreateDeviceId(): string {
    const key = "lenstracker_device_id";
    if (typeof window === 'undefined' || !window.localStorage) {
        return "no-localstorage";
    }
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const id =
        crypto.randomUUID?.() ??
        `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(key, id);
    return id;
}

export default function Home() {
    const [invL, setInvL] = useState(0);
    const [invR, setInvR] = useState(0);
    const [runOut, setRunOut] = useState(0);
    const lensTypeId = 'default'; // MVP: single type
    async function enableReminders() {
        const result = await Notification.requestPermission();
        if (result !== "granted") return;
        await subscribeToPush();
    }

    async function subscribeToPush() {
        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
        if (!publicKey) {
            alert("Missing VITE_VAPID_PUBLIC_KEY");
            return;
        }

        const reg = await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
        });

        console.log("Push subscription:", sub);
        alert("Subscribed to push. Next: send this subscription to Cloudflare Worker.");
    }

    async function refresh() {
        const settings = await getSettings();
        const events = await listEventsDesc(1000);
        const p = project([...events].reverse(), settings.frequency);
        setInvL(p.invL);
        setInvR(p.invR);
        setRunOut(p.runOutDays);
    }

    useEffect(() => { refresh(); }, []);

    const canUseLeft = invL > 0;
    const canUseRight = invR > 0;

    const canChangeBoth = invL > 0 && invR > 0;


    async function doUse(eye: 'LEFT' | 'RIGHT') {
        const lensTypeId = "default";

        // 1) Check current inventory to prevent going negative
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
        await refresh();
    }

    async function changeBoth() {
        await saveEvent(ev.changeLeft(lensTypeId));
        await saveEvent(ev.changeRight(lensTypeId));
        // If change consumes a pair, decrement both:
        await saveEvent(ev.useLeft(lensTypeId));
        await saveEvent(ev.useRight(lensTypeId));
        await refresh();
    }

    async function clearAllData() {
        await clearAll();
        await refresh();
    }


    return (
        <div className="grid">
            <div className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <div className="small">Inventory</div>
                        <div className="big mono">L: {invL} | R: {invR}</div>
                        <div className="small">Run-out in ~{runOut} days</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-2">
                <BigButton className="left" label="Use Left" onClick={() => doUse('LEFT')} disabled={!canUseLeft} />
                <BigButton className="right" label="Use Right" onClick={() => doUse('RIGHT')} disabled={!canUseRight} />
            </div>

            <BigButton className="primary" label="Change Both" onClick={changeBoth} disabled={!canChangeBoth} />

            <BigButton className="warn" label="Clear All" onClick={clearAllData} />
            <button className="button primary" onClick={enableReminders}>
                Enable Reminders
            </button>
            {<Diagnostics />}


        </div>
    );
}
