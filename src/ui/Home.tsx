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
    const [adjustingEye, setAdjustingEye] = useState<"LEFT" | "RIGHT" | null>(null);

    async function useEye(eye: "LEFT" | "RIGHT") {
        const eventsBefore = await listEventsDesc(1000);
        const s = await getSettings();
        const pBefore = project([...eventsBefore].reverse(), s.frequency);
        const invEye = eye === "LEFT" ? pBefore.invL : pBefore.invR;

        if (invEye <= 0) {
            alert(`No ${eye.toLowerCase()} inventory left.`);
            return;
        }

        const e = eye === "LEFT"
            ? ev.useLeft(lensTypeId)
            : ev.useRight(lensTypeId);

        await saveEvent(e);

        // Calculate and sync default next due date
        const cycleDays = pBefore.cycleDays;
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + cycleDays);

        try {
            await upsertCycle(eye, nextDue);
        } catch (err: any) {
            console.error("cycle/upsert failed:", err);
        }

        await refresh();
    }

    async function onConfirmAdjust(manualDate: string) {
        if (!adjustingEye) return;
        const eye = adjustingEye;
        setAdjustingEye(null);

        const e = ev.updateDueDate(eye, manualDate, lensTypeId);
        await saveEvent(e);

        try {
            const d = new Date(manualDate);
            await upsertCycle(eye, d);
        } catch (err: any) {
            console.error("cycle/upsert failed:", err);
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
                        <div
                            className="text-xs"
                            style={{ opacity: 0.7, cursor: nextL ? 'pointer' : 'default', textDecoration: nextL ? 'underline' : 'none' }}
                            onClick={() => nextL && setAdjustingEye("LEFT")}
                        >
                            Next: {nextL ? nextL.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm" style={{ opacity: 0.8, marginBottom: '4px' }}>Inventory (R)</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{invR}</div>
                        <div
                            className="text-xs"
                            style={{ opacity: 0.7, cursor: nextR ? 'pointer' : 'default', textDecoration: nextR ? 'underline' : 'none' }}
                            onClick={() => nextR && setAdjustingEye("RIGHT")}
                        >
                            Next: {nextR ? nextR.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Row) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div title={!canUseLeft ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm"
                        onClick={() => useEye("LEFT")}
                        disabled={!canUseLeft}
                        style={{ width: '100%', height: '100%', minHeight: '48px', padding: '0.5rem' }}
                    >
                        Use Left
                    </button>
                </div>
                <div title={!canUseRight ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm"
                        onClick={() => useEye("RIGHT")}
                        disabled={!canUseRight}
                        style={{ width: '100%', height: '100%', minHeight: '48px', padding: '0.5rem' }}
                    >
                        Use Right
                    </button>
                </div>
                <div title={!canChangeBoth ? "there is no lens available please buy or add first" : ""}>
                    <button
                        className="btn btn-orange btn-sm"
                        onClick={changeBoth}
                        disabled={!canChangeBoth}
                        style={{ width: '100%', height: '100%', minHeight: '48px', padding: '0.5rem' }}
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

            {adjustingEye && (
                <AdjustDateModal
                    eye={adjustingEye}
                    initialDate={(adjustingEye === "LEFT" ? nextL : nextR)?.toISOString().split("T")[0] || ""}
                    onClose={() => setAdjustingEye(null)}
                    onConfirm={onConfirmAdjust}
                />
            )}

        </div>
    );
}

function AdjustDateModal({ eye, initialDate, onClose, onConfirm }: any) {
    const [date, setDate] = useState(initialDate);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{
                width: '95%',
                maxWidth: '340px',
                padding: '1.25rem',
                margin: '1rem',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <h3 className="text-lg font-bold mb-2">Adjust {eye} Due Date?</h3>
                <p className="text-sm text-secondary mb-4">Change the expected expiry date for the current lens.</p>

                <div className="mb-5">
                    <label className="text-xs font-bold text-secondary block mb-1.5 uppercase tracking-wider">New Due Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            borderRadius: '12px',
                            border: '2px solid var(--color-border)',
                            fontSize: '1rem',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        className="btn btn-secondary flex-1"
                        onClick={onClose}
                        style={{ padding: '0.875rem', borderRadius: '12px', fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-green flex-1"
                        onClick={() => onConfirm(date)}
                        style={{ padding: '0.875rem', borderRadius: '12px', fontWeight: 600 }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
