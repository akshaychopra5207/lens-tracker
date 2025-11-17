import { useEffect, useState } from 'react';
import { listEventsDesc, saveEvent, clearAll } from '../data/repo';
import { type LensEvent, ev } from '../domain/events';

export default function Events() {
    const [items, setItems] = useState<LensEvent[]>([]);
    const lensTypeId = 'default';

    async function refresh() { setItems(await listEventsDesc(1000)); }
    useEffect(() => { refresh(); }, []);

    async function undo(e: LensEvent) {
        if (e.type === 'ADD_STOCK') await saveEvent(ev.correction(-e.qty, lensTypeId, 'undo add'));
        if (e.type === 'USE_LEFT' || e.type === 'USE_RIGHT') await saveEvent(ev.correction(+1, lensTypeId, 'undo use'));
        if (e.type === 'CORRECTION') await saveEvent(ev.correction(-e.qty, lensTypeId, 'undo correction'));
        await refresh();
    }

    async function handleClearAll() {
        if (window.confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            await clearAll();
            await refresh();
        }
    }

    return (
        <div className="grid">
            <div className="card">
                <button className="button warn" onClick={handleClearAll}>Clear All Data</button>
            </div>
            {items.map(e => (
                <div key={e.id} className="card">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div>
                            <div className="mono">{new Date(e.at).toLocaleString()}</div>
                            <div>{e.type} {e.eye ? `(${e.eye})` : ''} {e.qty ? `qty:${e.qty}` : ''}</div>
                            {e.note && <div className="small">{e.note}</div>}
                        </div>
                        <button className="button warn" onClick={() => undo(e)}>Undo</button>
                    </div>
                </div>
            ))}
            {items.length === 0 && <div className="card">No events yet.</div>}
        </div>
    );
}
