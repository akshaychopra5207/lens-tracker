# 👁️ LensTracker – Offline-first PWA for Contact Lens Management

**LensTracker** helps contact-lens users track inventory per eye, usage start dates, change cycles, and replacement reminders.
It’s a lightweight, privacy-first Progressive Web App (PWA) — no cloud sync, no account required.
All data stays on your device in IndexedDB.

---

## 🚀 Features

- **Offline-first PWA**: installable on iPhone & Android; works without internet.
- **Event-sourced core**: every action is an immutable event (`ADD_STOCK`, `USE_LEFT`, `USE_RIGHT`, `CHANGE_*`, `CORRECTION`).
- **Per-eye tracking**: separate inventory (L/R), last use/change, next change, and runway per eye.
- **Global frequency**: Daily / Monthly / Quarterly / Yearly cycles control change dates and runway math.
- **Safety rails**: no negative inventory, Reset Inventory (via correction events), Wipe All (destructive reset).
- **Reminders (roadmap)**: `.ics` calendar export and Web Push via Cloudflare Worker.

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React + TypeScript (Vite) |
| Storage | IndexedDB via `idb` |
| PWA | `vite-plugin-pwa` |
| Deployment | Vercel (free tier) |
| Agent | Gemini CLI / Code Assist (`gemini.md`) |

## 🧩 Project Structure

lens-tracker/
├── public/
│   ├── icons/
│   └── manifest.webmanifest
├── src/
│   ├── domain/…
│   ├── data/…
│   ├── ui/…
│   ├── App.tsx
│   └── main.tsx
├── gemini.md
├── README.md
├── package.json
└── vite.config.ts

---

## 🧭 Getting Started

```bash
git clone https://github.com/<your-username>/lens-tracker.git
cd lens-tracker
npm install
npm run dev

Open http://localhost:5173
 in your browser.

npm run build
npm run preview

'''bash

---

### 🧩 Part 3 – Dev Tools, Gemini, Roadmap & Author
```markdown
## 🧪 Developer Utilities
- **Reset Inventory** → adds `CORRECTION` events to bring both eyes to 0.
- **Wipe All** → clears events + resets settings.
- **Guards** → UI disables “Use” when inventory is 0.

---

## 🤖 Gemini Integration

`gemini.md` defines contracts, schema, and rules for AI assist.

### In VS Code
Gemini Code Assist auto-reads `gemini.md`.

### In CLI
```bash
gemini run fix
gemini run explain src/domain/projection.ts
