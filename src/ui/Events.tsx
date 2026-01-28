import { useEffect, useState } from 'react';
import { clearAll, listEventsDesc } from '../data/repo';
import { type LensEvent } from '../domain/events';

export default function Events() {
    const [items, setItems] = useState<LensEvent[]>([]);

    async function refresh() { setItems(await listEventsDesc(100)); }
    useEffect(() => { refresh(); }, []);

    async function handleClearAll() {
        if (!confirm("Are you sure you want to clear your entire history? This cannot be undone.")) return;
        await clearAll();
        await refresh();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="flex justify-between items-center" style={{ padding: '0 0.5rem' }}>
                <h2 className="font-bold text-secondary" style={{ fontSize: '1rem' }}>History</h2>
                {items.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-critical)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {items.map(e => (
                <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%',
                        background: 'var(--color-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem'
                    }}>
                        {getIcon(e.type)}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div className="font-medium" style={{ fontSize: '0.95rem' }}>
                            {formatTitle(e)}
                        </div>
                        <div className="text-xs text-secondary">
                            {new Date(e.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {e.note && <div className="text-xs" style={{ marginTop: '0.25rem', opacity: 0.8 }}>"{e.note}"</div>}
                    </div>
                </div>
            ))}

            {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍃</div>
                    <div>No history yet</div>
                </div>
            )}
        </div>
    );
}

function getIcon(type: string) {
    if (type === 'ADD_STOCK') return '📦';
    if (type.startsWith('USE')) return '👁️';
    if (type.startsWith('CHANGE')) return '✨';
    if (type === 'CORRECTION') return '🔧';
    return '📝';
}

function formatTitle(e: LensEvent) {
    if (e.type === 'ADD_STOCK') {
        const eye = e.meta?.eye;
        const qty = e.qty;

        if (eye === 'BOTH') {
            const pairs = Math.floor(qty / 2);
            return `Added Stock (Both) - ${pairs} Pair${pairs === 1 ? '' : 's'}`;
        }
        if (eye === 'LEFT') return `Added Stock (Left) - ${qty} Lens${qty === 1 ? '' : 'es'}`;
        if (eye === 'RIGHT') return `Added Stock (Right) - ${qty} Lens${qty === 1 ? '' : 'es'}`;

        return `Added Stock - ${qty}`;
    }
    if (e.type === 'USE_LEFT') return 'Used Left Lens';
    if (e.type === 'USE_RIGHT') return 'Used Right Lens';
    if (e.type === 'CHANGE_LEFT') return 'Changed Left';
    if (e.type === 'CHANGE_RIGHT') return 'Changed Right';
    if (e.type === 'CORRECTION') return 'Manual Correction';
    return e.type;
}
