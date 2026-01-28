import { useEffect, useMemo, useState } from "react";
import { saveEvent } from "../data/repo";
import { ev } from "../domain/events";
import { getSettings, setFrequency } from "../data/settingsRepo";
import type { Frequency } from "../domain/settings";

// Helpers
function todayYMD(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type EyeOpt = "LEFT" | "RIGHT" | "BOTH";

export default function AddStock({ onStockAdded }: { onStockAdded: () => void }) {
    const [loading, setLoading] = useState(true);

    // Form state
    const [eye, setEye] = useState<EyeOpt>("BOTH");
    const [frequency, setFreq] = useState<Frequency>("MONTHLY");
    const [dateAdded, setDateAdded] = useState<string>(todayYMD());
    const [qty, setQty] = useState<number>(1);
    const [note, setNote] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                const s = await getSettings();
                setFreq(s.frequency);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const canDecrement = useMemo(() => qty > 1, [qty]);

    async function onSubmit() {
        const current = await getSettings();
        if (current.frequency !== frequency) {
            await setFrequency(frequency);
        }

        const finalQty = eye === 'BOTH' ? qty * 2 : qty;
        const e = ev.addStock(finalQty, "default", note || undefined, {
            eye,
            addedDateIso: new Date(dateAdded + "T00:00:00.000Z").toISOString(),
        });
        await saveEvent(e);

        setNote("");
        onStockAdded();
    }

    if (loading) return <div className="card text-secondary" style={{ textAlign: 'center' }}>Loading...</div>;

    return (
        <div className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>

            <div className="card">
                <label className="text-sm font-black text-secondary" style={{ display: 'block', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Which eye?</label>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: 'var(--radius-md)', gap: '6px' }}>
                    {['LEFT', 'RIGHT', 'BOTH'].map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setEye(opt as EyeOpt)}
                            className={eye === opt ? "btn btn-green" : ""}
                            style={{
                                flex: 1,
                                padding: '0.75rem 0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: eye === opt ? undefined : 'transparent',
                                color: eye === opt ? 'white' : 'var(--color-text-secondary)',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {opt === 'BOTH' ? 'Both Eyes' : opt === 'LEFT' ? 'Left' : 'Right'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <FormField label="Expiration Type">
                        <select
                            value={frequency}
                            onChange={(e) => setFreq(e.target.value as Frequency)}
                            style={inputStyle}
                        >
                            <option value="DAILY">Daily (1 Day)</option>
                            <option value="MONTHLY">Monthly (30 Days)</option>
                            <option value="BIMONTHLY">Bimonthly (60 Days)</option>
                            <option value="QUARTERLY">Quarterly (90 Days)</option>
                            <option value="HALF_YEARLY">Half Yearly (180 Days)</option>
                            <option value="YEARLY">Yearly (365 Days)</option>
                        </select>
                    </FormField>

                    <FormField label="Date Bought">
                        <input
                            type="date"
                            value={dateAdded}
                            onChange={(e) => setDateAdded(e.target.value)}
                            style={inputStyle}
                        />
                    </FormField>

                    <FormField label="Quantity">
                        <div className="flex items-center gap-4">
                            <button
                                className="btn btn-secondary"
                                style={{ width: '40px', height: '40px', padding: 0 }}
                                onClick={() => canDecrement && setQty(q => Math.max(1, q - 1))}
                                disabled={!canDecrement}
                            >
                                −
                            </button>
                            <div className="font-bold" style={{ fontSize: '1.25rem', width: '40px', textAlign: 'center' }}>{qty}</div>
                            <button
                                className="btn btn-secondary"
                                style={{ width: '40px', height: '40px', padding: 0 }}
                                onClick={() => setQty(q => q + 1)}
                            >
                                +
                            </button>
                        </div>
                    </FormField>

                    <FormField label="Note (Optional)">
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Acuvue Oasys"
                            style={inputStyle}
                        />
                    </FormField>
                </div>
            </div>

            <button className="btn btn-green btn-block" onClick={onSubmit} style={{ padding: '1.25rem', fontSize: '1.1rem', fontWeight: 900 }}>
                Add to Inventory
            </button>
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    color: 'var(--color-text)'
};

function FormField({ label, children }: any) {
    return (
        <div>
            <label className="text-xs font-bold text-secondary" style={{ display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {label}
            </label>
            {children}
        </div>
    );
}
