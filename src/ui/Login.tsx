import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";

interface LoginProps {
    onLogin: (user: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                onLogin(res.user.email || "New User");
            } else {
                const res = await signInWithEmailAndPassword(auth, email, password);
                onLogin(res.user.email || "User");
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setLoading(true);
        try {
            const res = await signInWithPopup(auth, googleProvider);
            onLogin(res.user.email || "Google User");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            maxWidth: '320px',
            margin: '4rem auto',
            padding: '2rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center'
        }}>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>{isRegister ? "Create Account" : "Welcome Back"}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                {isRegister ? "Join LensTracker today" : "Sign in to track your lenses"}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)'
                    }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)'
                    }}
                />
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                    {loading ? "Processing..." : (isRegister ? "Sign Up" : "Sign In")}
                </button>
            </form>

            <div style={{ margin: '1.5rem 0', position: 'relative' }}>
                <div style={{ borderTop: '1px solid var(--color-border)' }} />
                <span style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--color-surface)',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)'
                }}>OR</span>
            </div>

            <button
                onClick={handleGoogleLogin}
                className="btn btn-secondary"
                disabled={loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
                {loading ? "Loading..." : "Sign in with Google"}
            </button>

            <button
                onClick={() => setIsRegister(!isRegister)}
                disabled={loading}
                style={{
                    background: 'none',
                    border: 'none',
                    marginTop: '1.5rem',
                    color: 'var(--color-primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    opacity: loading ? 0.5 : 1
                }}
            >
                {isRegister ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
        </div>
    );
}
