# LensTracker PWA — Build Guide & Starter Code

This document is your copy‑paste scaffolding and step‑by‑step instructions to get a fully working **Progressive Web App** running on your iPhone (Add to Home Screen), with offline storage, event sourcing, and a clean minimal UI. Start top to bottom.

---

## 0) Prerequisites

* **macOS** with a recent **Node.js LTS** (≥ 18)
* A terminal (macOS Terminal or iTerm)
* A code editor (VS Code)

Check versions:

```bash
node -v
npm -v
```

If Node < 18: install from [https://nodejs.org](https://nodejs.org) (LTS) or `brew install node`.

---

## 1) Create the project (Vite + React + TypeScript)

```bash
# 1) Create the project
npm create vite@latest lens-tracker -- --template react-ts
cd lens-tracker

# 2) Install deps
npm i

# 3) Add PWA + IndexedDB helpers + UUID
npm i vite-plugin-pwa idb uuid

# 4) (Optional) Install a tiny toast lib
npm i sonner
```

Project structure (we’ll create/replace files below):

```
lens-tracker/
  index.html
  vite.config.ts
  public/
    manifest.webmanifest
    icons/
      icon-192.png
      icon-512.png
  src/
    main.tsx
    App.tsx
    styles.css
    service-worker.ts
    domain/
      events.ts
      projection.ts
      constants.ts
    data/
      db.ts
      repo.ts
    ui/
      Home.tsx
      AddStock.tsx
      Events.tsx
      components/
        BigButton.tsx
        Header.tsx
```

---

## 2) Configure Vite with PWA

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'LensTracker',
        short_name: 'LensTracker',
        description: 'Track contact lens stock and change schedule',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    })
  ],
})
```

Create `public/manifest.webmanifest` (kept in sync with the plugin):

```json
{
  "name": "LensTracker",
  "short_name": "LensTracker",
  "description": "Track contact lens stock and change schedule",
  "theme_color": "#0f172a",
  "background_color": "#0f172a",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add placeholder icons (simple solid PNGs are fine for now). You can generate via any online favicon generator.

---

## 3) App entry

Replace `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LensTracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/styles.css` for minimal styling:

```css
:root{ color-scheme: light dark; }
*{ box-sizing:border-box; }
body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
.app{ max-width: 640px; margin: 0 auto; padding: 16px; }
.row{ display:flex; gap:12px; align-items:center; }
.grid{ display:grid; gap:12px; }
.grid-2{ grid-template-columns: 1fr 1fr; }
.card{ border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#fff; }
.big{ font-size: 28px; font-weight: 700; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.button{ width:100%; padding:16px; border-radius:12px; border:none; font-size:18px; cursor:pointer; }
.primary{ background:#0ea5e9; color:white; }
.left{ background:#10b981; color:white; }
.right{ background:#f59e0b; color:white; }
.warn{ background:#ef4444; color:white; }
.small{ font-size:12px; color:#475569; }
.header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.link{ color:#0ea5e9; text-decoration:underline; cursor:pointer; }
```

Create `src/main.tsx`:

```ts
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'

// Register the service worker created by vite-plugin-pwa
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Create `src/App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import Home from './ui/Home'
import AddStock from './ui/AddStock'
import Events from './ui/Events'

// super tiny router via location.hash
function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return [route, (r: string) => (window.location.hash = r)] as const
}

export default function App(){
  const [route, nav] = useRoute()
  useEffect(()=>{ /* warm up db, sw, etc. */ },[])

  return (
    <div className="app">
      <div className="header">
        <div className="big">LensTracker</div>
        <nav>
          <a className="link" onClick={()=>nav('/')}>Home</a>{' '}·{' '}
          <a className="link" onClick={()=>nav('/add')}>Add Stock</a>{' '}·{' '}
          <a className="link" onClick={()=>nav('/events')}>Events</a>
        </nav>
      </div>
      {route === '/' && <Home toast={toast} />}
      {route === '/add' && <AddStock toast={toast} />}
      {route === '/events' && <Events toast={toast} />}
      <Toaster position="bottom-center" richColors />
    </div>
  )
}
```

---

## 4) Domain: events & projections

Create `src/domain/constants.ts`:

```ts
export const DEFAULT_CYCLE_DAYS = 30 // change to 1 if using dailies
export const LEFT = 'LEFT' as const
export const RIGHT = 'RIGHT' as const
```

Create `src/domain/events.ts`:

```ts
import { v4 as uuid } from 'uuid'
export type Eye = 'LEFT'|'RIGHT'
export type EventType = 'ADD_STOCK'|'USE_LEFT'|'USE_RIGHT'|'CHANGE_LEFT'|'CHANGE_RIGHT'|'CORRECTION'

export interface LensEvent {
  id: string
  type: EventType
  qty: number
  eye?: Eye
  lensTypeId: string
  at: string // ISO UTC
  note?: string
  source?: 'PWA'|'DEVICE'|'IMPORT'
}

export const nowIso = () => new Date().toISOString()

export const ev = {
  addStock: (qty:number, lensTypeId:string, note?:string): LensEvent => ({
    id: uuid(), type:'ADD_STOCK', qty, lensTypeId, at: nowIso(), note
  }),
  useLeft: (lensTypeId:string): LensEvent => ({ id: uuid(), type:'USE_LEFT', qty:1, eye:'LEFT', lensTypeId, at: nowIso() }),
  useRight:(lensTypeId:string): LensEvent => ({ id: uuid(), type:'USE_RIGHT', qty:1, eye:'RIGHT', lensTypeId, at: nowIso() }),
  changeLeft:(lensTypeId:string): LensEvent => ({ id: uuid(), type:'CHANGE_LEFT', qty:1, eye:'LEFT', lensTypeId, at: nowIso() }),
  changeRight:(lensTypeId:string): LensEvent => ({ id: uuid(), type:'CHANGE_RIGHT', qty:1, eye:'RIGHT', lensTypeId, at: nowIso() }),
  correction:(delta:number, lensTypeId:string, note?:string): LensEvent => ({ id: uuid(), type:'CORRECTION', qty:delta, lensTypeId, at: nowIso(), note })
}
```

Create `src/domain/projection.ts`:

```ts
import { LensEvent } from './events'
import { DEFAULT_CYCLE_DAYS } from './constants'

export function project(events: LensEvent[]) {
  let inv = 0
  let lastL: Date | null = null
  let lastR: Date | null = null

  for (const e of events) {
    switch (e.type) {
      case 'ADD_STOCK': inv += e.qty; break
      case 'USE_LEFT':
      case 'USE_RIGHT': inv -= 1; break
      case 'CORRECTION': inv += e.qty; break
      case 'CHANGE_LEFT': lastL = new Date(e.at); break
      case 'CHANGE_RIGHT': lastR = new Date(e.at); break
    }
  }

  const cycle = DEFAULT_CYCLE_DAYS
  const nextL = lastL ? addDays(lastL, cycle) : null
  const nextR = lastR ? addDays(lastR, cycle) : null
  const daily = 2 / cycle
  const runOutDays = inv > 0 ? Math.floor(inv / daily) : 0

  return { inventory: inv, lastL, lastR, nextL, nextR, runOutDays }
}

function addDays(d: Date, days: number) {
  const t = new Date(d)
  t.setDate(t.getDate() + days)
  return t
}
```

---

## 5) Data: IndexedDB repo

Create `src/data/db.ts`:

```ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { LensEvent } from '../domain/events'

interface LTDB extends DBSchema {
  events: {
    key: string
    value: LensEvent
    indexes: { 'by-at': string }
  }
}

let dbPromise: Promise<IDBPDatabase<LTDB>> | null = null

export function db(){
  if (!dbPromise) {
    dbPromise = openDB<LTDB>('lens-tracker-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('events', { keyPath: 'id' })
        store.createIndex('by-at', 'at')
      }
    })
  }
  return dbPromise
}
```

Create `src/data/repo.ts`:

```ts
import { db } from './db'
import { LensEvent } from '../domain/events'

export async function saveEvent(e: LensEvent){
  const d = await db()
  await d.put('events', e)
}

export async function listEventsDesc(limit = 200): Promise<LensEvent[]> {
  const d = await db()
  const tx = d.transaction('events')
  const idx = tx.store.index('by-at')
  const all: LensEvent[] = []
  let cursor = await idx.openCursor(null, 'prev')
  while (cursor && all.length < limit) {
    all.push(cursor.value)
    cursor = await cursor.continue()
  }
  await tx.done
  return all
}

export async function clearAll(){
  const d = await db()
  await d.clear('events')
}
```

---

## 6) UI components & screens

Create `src/ui/components/BigButton.tsx`:

```tsx
export default function BigButton({label, onClick, className}:{label:string; onClick:()=>void; className?:string}){
  return <button className={`button ${className||''}`} onClick={onClick}>{label}</button>
}
```

Create `src/ui/components/Header.tsx` (optional):

```tsx
export default function Header({title}:{title:string}){
  return <div className="header"><div className="big">{title}</div></div>
}
```

Create `src/ui/Home.tsx`:

```tsx
import { useEffect, useState } from 'react'
import BigButton from './components/BigButton'
import { listEventsDesc, saveEvent } from '../data/repo'
import { ev } from '../domain/events'
import { project } from '../domain/projection'

export default function Home({toast}:{toast:any}){
  const [inv, setInv] = useState(0)
  const [nextL, setNextL] = useState<Date|null>(null)
  const [nextR, setNextR] = useState<Date|null>(null)
  const [runOut, setRunOut] = useState(0)
  const lensTypeId = 'default' // single type MVP

  async function refresh(){
    const events = await listEventsDesc(1000)
    const p = project([...events].reverse())
    setInv(p.inventory)
    setNextL(p.nextL)
    setNextR(p.nextR)
    setRunOut(p.runOutDays)
  }

  useEffect(()=>{ refresh() },[])

  async function doUse(eye:'LEFT'|'RIGHT'){
    const e = eye==='LEFT' ? ev.useLeft(lensTypeId) : ev.useRight(lensTypeId)
    await saveEvent(e)
    toast.success(`${eye === 'LEFT' ? 'Left' : 'Right'} used (−1).`, { action: { label: 'Undo', onClick: async ()=>{
      // undo by adding a CORRECTION +1
      await saveEvent(ev.correction(+1, lensTypeId, 'undo use'))
      refresh()
    }}})
    refresh()
  }

  async function changeBoth(){
    await saveEvent(ev.changeLeft(lensTypeId))
    await saveEvent(ev.changeRight(lensTypeId))
    // If changing consumes a pair for you, also decrement two:
    await saveEvent(ev.useLeft(lensTypeId))
    await saveEvent(ev.useRight(lensTypeId))
    toast.success('Changed both. Next cycle scheduled.')
    refresh()
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div>
            <div className="small">Inventory</div>
            <div className="big mono">{inv}</div>
            <div className="small">Run‑out in ~{runOut} days</div>
          </div>
          <div>
            <div className="small">Next Left</div>
            <div>{nextL? nextL.toDateString(): '—'}</div>
            <div className="small">Next Right</div>
            <div>{nextR? nextR.toDateString(): '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <BigButton className="left" label="Use Left" onClick={()=>doUse('LEFT')} />
        <BigButton className="right" label="Use Right" onClick={()=>doUse('RIGHT')} />
      </div>

      <BigButton className="primary" label="Change Both" onClick={changeBoth} />

      <div className="small">Tip: set cycle in code (DEFAULT_CYCLE_DAYS = 30 for monthlies, 1 for dailies).</div>
    </div>
  )
}
```

Create `src/ui/AddStock.tsx`:

```tsx
import { useState } from 'react'
import { saveEvent } from '../data/repo'
import { ev } from '../domain/events'

export default function AddStock({toast}:{toast:any}){
  const [qty, setQty] = useState(30)
  const [note, setNote] = useState('')
  const lensTypeId = 'default'

  async function add(){
    await saveEvent(ev.addStock(qty, lensTypeId, note || undefined))
    toast.success(`Added +${qty}`)
  }

  return (
    <div className="grid card">
      <label>Units to add
        <input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1'}} />
      </label>
      <label>Note (optional)
        <input value={note} onChange={e=>setNote(e.target.value)} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1'}} />
      </label>
      <button className="button primary" onClick={add}>Add Stock</button>
    </div>
  )
}
```

Create `src/ui/Events.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { listEventsDesc, saveEvent } from '../data/repo'
import { LensEvent, ev } from '../domain/events'

export default function Events({toast}:{toast:any}){
  const [items, setItems] = useState<LensEvent[]>([])
  const lensTypeId = 'default'

  async function refresh(){
    setItems(await listEventsDesc(1000))
  }
  useEffect(()=>{ refresh() },[])

  async function undo(e: LensEvent){
    if (e.type === 'ADD_STOCK') await saveEvent(ev.correction(-e.qty, lensTypeId, 'undo add'))
    if (e.type === 'USE_LEFT' || e.type === 'USE_RIGHT') await saveEvent(ev.correction(+1, lensTypeId, 'undo use'))
    if (e.type === 'CORRECTION') await saveEvent(ev.correction(-e.qty, lensTypeId, 'undo correction'))
    toast.success('Undone via correction')
    refresh()
  }

  return (
    <div className="grid">
      {items.map(e=> (
        <div key={e.id} className="card">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div>
              <div className="mono">{new Date(e.at).toLocaleString()}</div>
              <div>{e.type} {e.eye? `(${e.eye})`: ''} {e.qty? `qty:${e.qty}`: ''}</div>
              {e.note && <div className="small">{e.note}</div>}
            </div>
            <button className="button warn" onClick={()=>undo(e)}>Undo</button>
          </div>
        </div>
      ))}
      {items.length===0 && <div className="card">No events yet.</div>}
    </div>
  )
}
```

---

## 7) Service Worker (offline + future push handler)

Create `src/service-worker.ts`:

```ts
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

// VitePWA will replace __WB_MANIFEST at build time
declare let self: ServiceWorkerGlobalScope

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || { title: 'LensTracker', body: 'Update' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      data: data,
      actions: data.actions || []
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = '/' // could deep-link e.g., '/events'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
```

Update `package.json` scripts to build the SW correctly by telling vite-plugin-pwa where the sw is. Add this to `vite.config.ts` above inside `VitePWA({ ... })` if missing:

```ts
// inside VitePWA({...})
srcDir: 'src',
filename: 'sw.ts',
workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
```

And rename `service-worker.ts` → **`sw.ts`** to match.

Rename file accordingly.

---

## 8) Run locally

```bash
npm run dev
```

Open on your Mac browser: [http://localhost:5173](http://localhost:5173)

On your **iPhone** (same Wi‑Fi), open Safari to `http://<your-mac-ip>:5173` (find IP via `ifconfig` or System Settings ▸ Network).

Add to Home Screen: Safari Share ▸ **Add to Home Screen**. Launch from the icon; it will run full‑screen and offline after first load.

---

## 9) Deploy (free) on Vercel

1. Create a GitHub repo and push the project.
2. Go to [https://vercel.com](https://vercel.com) → New Project → import your repo → Framework: **Vite** (or Other) → Deploy.
3. Open the Vercel URL on iPhone Safari → **Add to Home Screen**.

Updates are instant; PWA will auto‑update on next load.

---

## 10) Reminders without servers (simple & free)

Add an **Export .ics** button (later) that creates calendar entries for next due dates. Steps:

* Generate an `.ics` string client‑side for `nextLeft`/`nextRight`.
* Create a blob + download link; the user taps it and adds to Apple Calendar.
* When you press **Change Both**, also prompt to replace next reminders.

(You can add **Web Push** via a free Cloudflare Worker later.)

---

## 11) What to tweak next

* Change `DEFAULT_CYCLE_DAYS` to 30 or 1 depending on monthly/daily.
* Add low‑stock threshold banner when `runOutDays < 14`.
* Add a setting page to persist your cycle days and thresholds in IndexedDB.
* Add barcode scan for quick stock add (webcam APIs + `@zxing/library`).

---

## 12) Sanity checklist

* App loads offline (toggle Airplane mode).
* Add stock, use L/R, change both, see events.
* Undo creates matching corrections.
* Add to Home Screen icon; full‑screen launch.

You now have a functional offline PWA you can run daily on iPhone with **no cost**.

---

## gemini.md — Project brief for AI code assistant

**Purpose:** Give a junior AI agent (Gemini CLI/Agent) the exact context, architecture, and guardrails to generate code/fixes consistently for the LensTracker PWA.

### 1) Project summary

* **App:** LensTracker — offline-first PWA to track contact lens inventory per eye and change cadence.
* **Stack:** Vite + React + TypeScript, IndexedDB (`idb`), `vite-plugin-pwa` for SW/manifest.
* **Status:** Scaffold running; icons/manifest set; data layer added; projections per eye; UI wiring in progress.

### 2) Architectural principles

* **Event-sourced core:** append-only events → derive read models (projections). Never mutate past events; corrections are events.
* **Per-eye inventory:** `invL`, `invR` managed independently. "Both" splits qty ≈ evenly (floor to L, ceil to R).
* **Single frequency (global):** `Settings.frequency ∈ {DAILY, MONTHLY, QUARTERLY, YEARLY}`; projections use the current frequency to compute cycle days and runway.
* **PWA-first:** SW in production build; dev SW optional. Offline by default.

### 3) Domain contracts

```
src/domain/settings.ts
  type Frequency = 'DAILY'|'MONTHLY'|'QUARTERLY'|'YEARLY'
  const FREQ_TO_CYCLE_DAYS: Record<Frequency, number>
  interface Settings { id:'settings'; frequency:Frequency; createdAt:string }

src/domain/events.ts
  type EventType = 'ADD_STOCK'|'USE_LEFT'|'USE_RIGHT'|'CHANGE_LEFT'|'CHANGE_RIGHT'|'CORRECTION'
  interface AddStockMeta { eye:'LEFT'|'RIGHT'|'BOTH'; addedDateIso:string }
  interface LensEvent { id:string; type:EventType; qty:number; eye?; lensTypeId:string; at:string; note?; source?; meta?:AddStockMeta }
  factory `ev` provides constructors; timestamps must be ISO UTC.

src/domain/utilCycle.ts
  export function getCycleDays(freq: Frequency): number

src/domain/projection.ts
  export function project(events: LensEvent[], freq: Frequency): {
    invL:number; invR:number;
    lastUseL:Date|null; lastUseR:Date|null;
    lastChangeL:Date|null; lastChangeR:Date|null;
    nextL:Date|null; nextR:Date|null;
    runwayL:number; runwayR:number;
    cycleDays:number;
  }
  Rules:
   - ADD_STOCK: allocate to L/R/BOTH as specified.
   - USE_LEFT/USE_RIGHT: decrement respective inventory by 1 and set lastUse*.
   - CHANGE_LEFT/CHANGE_RIGHT: set lastChange* (no inventory change unless explicitly modeled elsewhere).
   - CORRECTION: for MVP, apply to Right (later, add eye field).
   - next* = lastUse* + cycleDays; runway* = inv* / (1/cycleDays).
```

### 4) Data layer contracts

```
src/data/db.ts
  IndexedDB name 'lens-tracker-db' version 2
  stores:
    events (keyPath 'id', index 'by-at')
    settings (keyPath 'id') — seed default settings if missing

src/data/repo.ts
  saveEvent(e: LensEvent): Promise<void>
  listEventsDesc(limit?: number): Promise<LensEvent[]>
  clearAll(): Promise<void>

src/data/settingsRepo.ts
  getSettings(): Promise<Settings>
  setFrequency(freq: Frequency): Promise<Settings>
```

### 5) UI contracts (screens/components)

```
src/ui/Home.tsx
  - Displays invL/invR, runway per eye, last/next change dates.
  - Buttons: Use Left, Use Right, Change Both → create events and refresh.

src/ui/AddStock.tsx
  - Form fields:
     • Eye: LEFT / RIGHT / BOTH (radio)
     • Expiration Type: DAILY / MONTHLY / QUARTERLY / YEARLY (dropdown; preselect current settings)
     • Date added: defaults to today; editable
     • Count: integer with +/− controls
  - On submit:
     • If frequency changed, update settings via setFrequency
     • Create ADD_STOCK with qty and meta {eye, addedDateIso}

src/ui/Events.tsx
  - Reverse-chronological list; Undo creates correcting events (see rules).
```

### 6) PWA contract

* **Dev:** do not register SW in dev (guard: `if (import.meta.env.PROD)`), unless `devOptions.enabled` is set in VitePWA.
* **Prod:** `vite-plugin-pwa` generates `sw.js` from `src/sw.ts`; pre-cache app shell; basic push handler stub present.
* **Icons/manifest:** `public/manifest.webmanifest`; icons under `public/icons/` (192, 512). Optional `apple-touch-icon` at 180×180.

### 7) Coding standards

* **Type-only imports** from `idb`: `import type { DBSchema, IDBPDatabase } from 'idb'`.
* **UTC timestamps** only (`toISOString()`).
* **Pure functions** in domain layer; no side-effects.
* **No external state in projections**; all derived from event array + provided settings.
* **Small components**; no heavy state in App.tsx.

### 8) Non-goals for the agent

* Do not add server APIs, authentication, or routing frameworks.
* Do not introduce Redux or global stores; keep state local + IndexedDB.
* Do not enable BLE/WebUSB.

### 9) Common tasks for the agent (examples)

* Implement `src/ui/AddStock.tsx` form UX per spec (radio, select, date, +/-).
* Add a Settings UI to change frequency (writes to settingsRepo).
* Write unit tests for `project()` given event fixtures.
* Implement `.ics` export utility for next-change and low-runway reminders.
* Add a low-stock banner if `runwayL < 90 || runwayR < 90`.

### 10) Test scenarios

1. AddStock BOTH qty=30, freq=MONTHLY → invL=15, invR=15.
2. UseLeft x1 → invL=14; lastUseL set; nextL = lastUseL + 30.
3. ChangeRight → lastChangeR set; inventory unchanged.
4. Correction +2 → (MVP applies to Right) invR += 2.
5. Frequency switch to DAILY → next*recompute from lastUse* with cycle=1; runway per eye uses new cycle.

### 11) Known pitfalls

* Wrong imports from `idb` (must be type-only for types).
* Service worker registration in dev causing MIME errors.
* Forgetting to seed default settings.
* Mutating events instead of appending `CORRECTION`.

### 12) Deliverables format

* Provide file diffs or full file bodies under the exact paths above.
* Preserve function signatures and contracts.
* Include brief rationale with each change.
