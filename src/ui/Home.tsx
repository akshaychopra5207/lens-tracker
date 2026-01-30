import { useEffect, useState } from "react";
import { listEventsDesc, saveEvent } from "../data/repo";
import { getSettings } from "../data/settingsRepo";
import { ev } from "../domain/events";
import { project } from "../domain/projection";
import { upsertCycle } from "./cycleApi";

export default function Home() {
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
    const [confirmingEye, setConfirmingEye] = useState<"LEFT" | "RIGHT" | null>(null);
    const [proposedDue, setProposedDue] = useState<string>("");

    async function promptUse(eye: "LEFT" | "RIGHT") {
        const eventsBefore = await listEventsDesc(1000);
        const s = await getSettings();
        const pBefore = project([...eventsBefore].reverse(), s.frequency);
        const invEye = eye === "LEFT" ? pBefore.invL : pBefore.invR;

        if (invEye <= 0) {
            alert(`No ${eye.toLowerCase()} inventory left.`);
            return;
        }

        // Calculate expected due date
        const cycleDays = pBefore.cycleDays;
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + cycleDays);
        setProposedDue(nextDue.toISOString().split("T")[0]); // YYYY-MM-DD
        setConfirmingEye(eye);
    }

    async function onConfirmUse(manualDate: string) {
        if (!confirmingEye) return;
        const eye = confirmingEye;
        setConfirmingEye(null);

        const e = eye === "LEFT"
            ? ev.useLeft(lensTypeId, { manualDueDate: manualDate })
            : ev.useRight(lensTypeId, { manualDueDate: manualDate });

        await saveEvent(e);

        if (manualDate) {
            try {
                // Ensure we pass the full ISO string if it's just YYYY-MM-DD
                const d = new Date(manualDate);
                // If the user picked a date, we probably want it to be "end of day" or "same time as now"?
                // Actually cycleApi expects a Date object.
                // We should probably set it to the specific time matching current time to preserve precision, or just noon.
                // Let's keep it simple: strict date.
                await upsertCycle(eye, d);
            } catch (err: any) {
                console.error("cycle/upsert failed:", err);
            }
        }
        await refresh();
    }

    async function changeBoth() {
        // For "Change Both", we skip the manual confirmation for now to keep flow fast,
        // or we could assume default. The user asked for "option to override".
        // Let's leave Change Both as automatic for now (MVP).
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
                        onClick={() => promptUse("LEFT")}
                        disabled={!canUseLeft}
                        style={{ height: '100%' }}
                    >
                        Use Left
                    </button>
                </div>
                <div className="flex-1" title={!canUseRight ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm w-full"
                        onClick={() => promptUse("RIGHT")}
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

            {confirmingEye && (
                <UsageModal
                    eye={confirmingEye}
                    initialDate={proposedDue}
                    onClose={() => setConfirmingEye(null)}
                    onConfirm={onConfirmUse}
                />
            )}

        </div>
    );
}

function UsageModal({ eye, initialDate, onClose, onConfirm }: any) {
    const [date, setDate] = useState(initialDate);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '320px', padding: '1.5rem' }}>
                <h3 className="text-lg font-bold mb-4">Start {eye} Lens?</h3>
                <p className="text-sm text-secondary mb-4">Confirm or adjust the expected expiry date.</p>

                <div className="mb-4">
                    <label className="text-xs font-bold text-secondary block mb-1">DUE DATE</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)', fontSize: '1rem'
                        }}
                    />
                </div>

                <div className="flex gap-2">
                    <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
                    <button className="btn btn-green flex-1" onClick={() => onConfirm(date)}>Confirm</button>
                </div>
            </div>
        </div>
    );
}
