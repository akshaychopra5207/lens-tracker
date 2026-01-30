import { useEffect, useState } from "react";
import Home from "./ui/Home";
import AddStock from "./ui/AddStock";
import Events from "./ui/Events";
import Login from "./ui/Login";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { subscribeForPush } from "./ui/push";
import { registerPushSubscription } from "./ui/pushApi";

// Simple router hook
function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (r: string) => (window.location.hash = r)] as const;
}

export default function App() {
  const [route, nav] = useRoute();
  const [user, setUser] = useState<{ email: string | null, name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User"
        });
        if (window.location.hash === "#/login") {
          nav("/");
        }
      } else {
        setUser(null);
        nav("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  function handleLogout() {
    signOut(auth);
    setShowSettings(false);
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'var(--color-primary)', fontWeight: 700 }}>LensTracker loading...</div>;
  }

  if (!user && route !== "/login") {
    return <Login onLogin={() => { }} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="flex items-center justify-between" style={{ padding: '1.5rem', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.8px', margin: 0 }}>LensTracker</h1>
          {user && (
            <div className="text-sm font-bold" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
              Hi, <span className="text-gradient" style={{ filter: 'brightness(1.5)', fontWeight: 900 }}>{user.name}</span>
            </div>
          )}
        </div>

        {user && (
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            style={{
              fontSize: '1.5rem',
              background: 'var(--color-bg)',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)'
            }}
          >
            ⚙️
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1rem', paddingBottom: '6rem' }}>
        {route === "/login" && <Login onLogin={() => { }} />}
        {route === "/" && <Home />}
        {route === "/add" && <AddStock onStockAdded={() => nav('/')} />}
        {route === "/events" && <Events />}
      </main>

      {/* Settings Modal - Global */}
      {showSettings && user && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 className="font-bold">Settings</h3>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-2">
              <SettingsRow icon="🔔" label="Enable Reminders" onClick={async () => {
                try {
                  const result = await Notification.requestPermission();
                  if (result !== "granted") {
                    alert("Notifications permission denied.");
                    return;
                  }

                  // Subscribe to push service
                  const sub = await subscribeForPush();
                  // Register with our backend, sending the email if available
                  await registerPushSubscription(sub, user?.email || undefined);

                  alert("Notifications enabled and linked to your email! ✅");
                } catch (err: any) {
                  console.error(err);
                  alert(`Error: ${err.message}`);
                }
              }} />
              <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
              <SettingsRow icon="🚪" label="Sign Out" onClick={handleLogout} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0.75rem',
          zIndex: 50
        }}
      >
        <NavButton label="Home" active={route === "/"} onClick={() => nav("/")} icon="🏠" />
        <NavButton label="Add" active={route === "/add"} onClick={() => nav("/add")} icon="➕" />
        <NavButton label="History" active={route === "/events"} onClick={() => nav("/events")} icon="📅" />
      </nav>
    </div>
  );
}

function NavButton({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        fontSize: '0.75rem',
        fontWeight: 600
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      {label}
    </button>
  );
}

function SettingsRow({ icon, label, onClick, destructive }: { icon: string, label: string, onClick: () => void, destructive?: boolean }) {
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
