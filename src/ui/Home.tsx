import { useEffect, useState } from "react";
import { clearAll, listEventsDesc, saveEvent } from "../data/repo";
import { getSettings } from "../data/settingsRepo";
import { ev } from "../domain/events";
import { project } from "../domain/projection";
import { subscribeForPush } from "./push";
import { registerPushSubscription } from "./pushApi";
import { getOrCreateDeviceId } from "./deviceId";
import { upsertCycle } from "./cycleApi";

export default function Home({ onLogout, forceShowSettings, onSettingsClose }: { onLogout: () => void, forceShowSettings?: boolean, onSettingsClose?: () => void }) {
    const [invL, setInvL] = useState(0);
    const [invR, setInvR] = useState(0);
    const [nextL, setNextL] = useState<Date | null>(null);
    const [nextR, setNextR] = useState<Date | null>(null);
    const [runOut, setRunOut] = useState(0);

    const lensTypeId = "default";

    const [recentEvents, setRecentEvents] = useState<any[]>([]);

    async function refresh() {
        const settings = await getSettings();
        const events = await listEventsDesc(1000);
        const p = project([...events].reverse(), settings.frequency);

        setInvL(p.invL);
        setInvR(p.invR);
        setNextL(p.nextL);
        setNextR(p.nextR);
        setRunOut(p.runOutDays);
        setRecentEvents(events.slice(0, 3));
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
        const eventsBefore = await listEventsDesc(1000);
        const s = await getSettings();
        const pBefore = project([...eventsBefore].reverse(), s.frequency);
        const invEye = eye === "LEFT" ? pBefore.invL : pBefore.invR;

        if (invEye <= 0) {
            alert(`No ${eye.toLowerCase()} inventory left.`);
            return;
        }

        const e = eye === "LEFT" ? ev.useLeft(lensTypeId) : ev.useRight(lensTypeId);
        await saveEvent(e);

        const eventsAfter = await listEventsDesc(1000);
        const pAfter = project([...eventsAfter].reverse(), s.frequency);
        const due = eye === "LEFT" ? pAfter.nextL : pAfter.nextR;

        if (due) {
            try {
                await upsertCycle(eye, due);
            } catch (err: any) {
                console.error("cycle/upsert failed:", err);
            }
        }
        await refresh();
    }

    const [localShowSettings, setLocalShowSettings] = useState(false);
    const showSettings = forceShowSettings ?? localShowSettings;
    const setShowSettings = onSettingsClose ?? setLocalShowSettings;

    async function changeBoth() {
        await saveEvent(ev.changeLeft(lensTypeId));
        await saveEvent(ev.changeRight(lensTypeId));
        await saveEvent(ev.useLeft(lensTypeId));
        await saveEvent(ev.useRight(lensTypeId));
        await refresh();

        const s = await getSettings();
        const events = await listEventsDesc(1000);
        const p = project([...events].reverse(), s.frequency);
        if (p.nextL) await upsertCycle("LEFT", p.nextL);
        if (p.nextR) await upsertCycle("RIGHT", p.nextR);
    }

    async function clearAllData() {
        if (!confirm("Are you sure? This will delete all history.")) return;
        await clearAll();
        await refresh();
        setShowSettings(false);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Status Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', color: 'white', border: 'none' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <span className="font-medium" style={{ opacity: 0.9 }}>Runway</span>
                    <span className="text-sm" style={{ opacity: 0.8 }}>{runOut} days left</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <div className="text-sm" style={{ opacity: 0.8, marginBottom: '4px' }}>Inventory (L)</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{invL}</div>
                        <div className="text-xs" style={{ opacity: 0.7 }}>Next: {nextL ? nextL.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</div>
                    </div>
                    <div>
                        <div className="text-sm" style={{ opacity: 0.8, marginBottom: '4px' }}>Inventory (R)</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{invR}</div>
                        <div className="text-xs" style={{ opacity: 0.7 }}>Next: {nextR ? nextR.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Row) */}
            <div className="flex gap-2">
                <div className="flex-1" title={!canUseLeft ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm w-full"
                        onClick={() => doUse("LEFT")}
                        disabled={!canUseLeft}
                        style={{ height: '100%' }}
                    >
                        Use Left
                    </button>
                </div>
                <div className="flex-1" title={!canUseRight ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm w-full"
                        onClick={() => doUse("RIGHT")}
                        disabled={!canUseRight}
                        style={{ height: '100%' }}
                    >
                        Use Right
                    </button>
                </div>
                <div className="flex-1" title={!canChangeBoth ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm w-full"
                        onClick={changeBoth}
                        disabled={!canChangeBoth}
                        style={{ height: '100%' }}
                    >
                        Use Both
                    </button>
                </div>
            </div>

            {/* Recent Activity Section to fill the 'missing' gap */}
            <div style={{ marginTop: '1rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Activity</h3>
                </div>
                {recentEvents.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem', borderStyle: 'dashed' }}>
                        No recent activity. Start by using your lenses!
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {recentEvents.map(e => (
                            <div key={e.id} className="card" style={{ padding: '0.85rem 1rem', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'var(--color-bg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1rem'
                                    }}>
                                        {e.type.includes('LEFT') ? '👁️' : e.type.includes('RIGHT') ? '👁️' : '📦'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>{e.type.replace(/_/g, ' ')}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                            {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
                                    {e.eye === 'LEFT' ? 'L' : e.eye === 'RIGHT' ? 'R' : 'B'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                            <h3 className="font-bold">Settings</h3>
                            <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <SettingsRow icon="🔔" label="Enable Reminders" onClick={enableReminders} />
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
                            <SettingsRow icon="🚪" label="Sign Out" onClick={onLogout} />
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
                            <SettingsRow icon="🗑️" label="Clear All Data" onClick={clearAllData} destructive />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingsRow({ icon, label, onClick, destructive }: any) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'none',
                border: 'none',
                color: destructive ? 'var(--color-critical)' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500
            }}
        >
            <span>{icon}</span>
            {label}
        </button>
    );
}
