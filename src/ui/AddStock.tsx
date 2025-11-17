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

    // Initial load: read current settings to preselect frequency
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
        // 1) Persist new frequency if changed
        const current = await getSettings();
        if (current.frequency !== frequency) {
            await setFrequency(frequency);
        }

        // 2) Create ADD_STOCK with meta (eye + added date)
        const finalQty = eye === 'BOTH' ? qty * 2 : qty;
        const e = ev.addStock(finalQty, "default", note || undefined, {
            eye,
            addedDateIso: new Date(dateAdded + "T00:00:00.000Z").toISOString(),
        });
        await saveEvent(e);

        // 3) Reset light UI bits (optional)
        setNote("");
        onStockAdded();
    }

    if (loading) {
        return <div className="card">Loading settings…</div>;
    }

    return (
        <div className="grid card" style={{ gap: 16 }}>
            {/* Eye selection */}
            <div>
                <div className="small">Eye</div>
                <div className="row" style={{ gap: 16 }}>
                    <label>
                        <input
                            type="radio"
                            name="eye"
                            value="LEFT"
                            checked={eye === "LEFT"}
                            onChange={() => setEye("LEFT")}
                        />{" "}
                        Left
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="eye"
                            value="RIGHT"
                            checked={eye === "RIGHT"}
                            onChange={() => setEye("RIGHT")}
                        />{" "}
                        Right
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="eye"
                            value="BOTH"
                            checked={eye === "BOTH"}
                            onChange={() => setEye("BOTH")}
                        />{" "}
                        Both
                    </label>
                </div>
                <div className="small">
                    When “Both” is selected, the quantity will be added to each eye.
                </div>
            </div>

            {/* Expiration / Frequency */}
            <div>
                <div className="small">Expiration Type</div>
                <select
                    value={frequency}
                    onChange={(e) => setFreq(e.target.value as Frequency)}
                    style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                    }}
                >
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                </select>
                <div className="small">
                    This is global. We recompute next-change & runway using this setting.
                </div>
            </div>

            {/* Date added (audit) */}
            <div>
                <div className="small">Date added / bought</div>
                <input
                    type="date"
                    value={dateAdded}
                    onChange={(e) => setDateAdded(e.target.value)}
                    style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                    }}
                />
            </div>

            {/* Count with +/- */}
            <div>
                <div className="small">Count</div>
                <div className="row" style={{ gap: 8 }}>
                    <button
                        className="button"
                        style={{ width: 56 }}
                        onClick={() => canDecrement && setQty((q) => Math.max(1, q - 1))}
                        disabled={!canDecrement}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                        style={{
                            width: 100,
                            textAlign: "center",
                            padding: 8,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                        }}
                    />
                    <button
                        className="button"
                        style={{ width: 56 }}
                        onClick={() => setQty((q) => q + 1)}
                    >
                        +
                    </button>
                </div>
                <div className="small">
                    Example: 30 for “Both” → 30 for Left, 30 for Right.
                </div>
            </div>

            {/* Optional note */}
            <div>
                <div className="small">Note (optional)</div>
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Amazon order #123"
                    style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                    }}
                />
            </div>

            {/* Submit */}
            <button className="button primary" onClick={onSubmit}>
                Add Stock
            </button>
        </div>
    );
}
