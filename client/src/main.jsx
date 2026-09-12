import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "./lib/api.js";
import { TreePage } from "./pages/TreePage.jsx";
import { EventsPage } from "./pages/EventsPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { MembersPage } from "./pages/MembersPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";
import { GalleryPage } from "./pages/GalleryPage.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LayoutDashboard, GitBranch, Users, CalendarDays, Clock3, Images, Search, Settings, LogOut, ChevronUp, Menu, X, Leaf, ShieldCheck } from "lucide-react";
import "./styles.css"; import "./reactflow.css";

const menu = [
    ["/dashboard", LayoutDashboard, "Dashboard"],
    ["/tree", GitBranch, "Family Tree"],
    ["/members", Users, "Members"],
    ["/events", CalendarDays, "Events"],
    ["/timeline", Clock3, "Timeline"],
    ["/gallery", Images, "Memories & Gallery"],
    ["/search", Search, "Search"],
    ["/settings", Settings, "Settings"]
];

function ThemeToggle() {
    const [theme, setTheme] = useState(
        () => localStorage.getItem("familyroots-theme") || "system"
    );

    useEffect(() => {
        localStorage.setItem("familyroots-theme", theme);

        const root = document.documentElement;

        if (theme === "system") {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

            root.dataset.theme = prefersDark ? "dark" : "light";
        } else {
            root.dataset.theme = theme;
        }
    }, [theme]);

    return (
        <select
            aria-label="Theme"
            className="theme-select"
            value={theme}
            onChange={e => setTheme(e.target.value)}
        >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
        </select>
    );
}

function Sidebar({ user, onClose }) {
    const l = useLocation(), n = useNavigate(), [open, setOpen] = useState(false); const logout = async () => { try { await api.post("/auth/logout") } finally { n("/login") } }; return <aside className="sidebar">
        <Link className="brand" to="/dashboard" onClick={onClose}><span className="brand-icon"><Leaf size={21} /></span><span><b>FamilyRoots</b><small>Our Family, Our Story</small></span></Link>
        <nav aria-label="Primary">{menu.map(([path, Icon, label]) => <Link onClick={onClose} className={l.pathname === path ? "active" : ""} to={path} key={path}><Icon size={18} /><span>{label}</span></Link>)}</nav>
        <div className="side-bottom"><button className="account-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}><span className="avatar-sm">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user?.name?.[0]?.toUpperCase()}</span><span className="account-copy"><b>{user?.name || "Family member"}</b><small>{user?.email}</small></span><ChevronUp size={16} /></button>{open && <div className="account-menu"><Link to="/settings" onClick={() => setOpen(false)}><Settings size={16} /> Settings</Link><button onClick={logout}><LogOut size={16} /> Log out</button></div>}<div className="sidebar-footer"><ShieldCheck size={13} /> Private family space</div></div>
    </aside>
}

function MobileHeader({ onOpen }) { return <button className="mobile-menu" onClick={onOpen} aria-label="Open navigation"><Menu /></button> }

function Auth({ mode }) {
    const [f, setF] = useState({ name: "", email: "", password: "" }), [e, setE] = useState(""), [busy, setBusy] = useState(false), n = useNavigate(); useEffect(() => { const q = new URLSearchParams(location.search); if (q.get("error")) setE(q.get("error")) }, []);
    const submit = async ev => { ev.preventDefault(); setE(""); setBusy(true); try { const email = f.email.trim().toLowerCase(); const response = await api.post("/auth/" + mode, { ...f, email }); if (mode === "register" && response.data?.data?.requiresEmailVerification) { n("/verify-email-code?email=" + encodeURIComponent(email)); return; } const next = new URLSearchParams(location.search).get("next"); n(next || "/dashboard") } catch (err) { if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") { n("/verify-email-code?email=" + encodeURIComponent(f.email.trim().toLowerCase())); return; } setE(err.response?.data?.message || "Something went wrong") } finally { setBusy(false) } }; return <main className="auth-shell"><section className="auth-card"><Link to="/" className="auth-brand"><span className="brand-icon"><Leaf size={21} /></span><b>FamilyRoots</b></Link><p className="eyebrow">OUR FAMILY, OUR STORY</p><h1>{mode === "login" ? "Welcome back" : "Preserve your family story"}</h1><p className="muted">{mode === "login" ? "Return to the people and memories that matter." : "Build a living archive your family can grow together."}</p><form onSubmit={submit}>{mode === "register" && <label>Name<input autoComplete="name" value={f.name} onChange={x => setF({ ...f, name: x.target.value })} required minLength="2" placeholder="Your full name" /></label>}<label>Email<input autoComplete="email" type="email" value={f.email} onChange={x => setF({ ...f, email: x.target.value })} required placeholder="you@example.com" /></label><label>Password<input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" value={f.password} onChange={x => setF({ ...f, password: x.target.value })} required minLength="8" placeholder="At least 8 characters" /></label>{e && <div className="error" role="alert">{e}</div>}<button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button></form><button
    type="button"
    className="google-btn"
    onClick={() =>
        location.href =
            (import.meta.env.VITE_API_URL || "http://localhost:5000/api") +
            "/auth/google"
    }
>
    <svg
        className="google-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            fill="#4285F4"
            d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42z"
        />
        <path
            fill="#34A853"
            d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.99z"
        />
        <path
            fill="#FBBC05"
            d="M6.51 14.07A5.86 5.86 0 0 1 6.2 12c0-.72.12-1.42.31-2.07V7.4H3.27A9.99 9.99 0 0 0 2 12c0 1.66.4 3.23 1.27 4.6l3.24-2.53z"
        />
        <path
            fill="#EA4335"
            d="M12 5.89c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 2.98 14.63 2 12 2a9.74 9.74 0 0 0-8.73 5.4l3.24 2.53C7.29 7.61 9.45 5.89 12 5.89z"
        />
    </svg>

    <span className="google-text">
        Continue with Google
    </span>
</button>{mode === "login" && <p className="auth-note">Use your FamilyRoots password or Google account to continue.</p>}<p className="switch">{mode === "login" ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}</p></section></main>
}

function Protected() { const [session, setSession] = useState(null), [mobile, setMobile] = useState(false); useEffect(() => { api.get("/auth/me").then(r => setSession(r.data.data)).catch(() => setSession(false)) }, []); if (session === null) return <div className="loading-screen">Loading FamilyRoots…</div>; if (session === false) return <Navigate to="/login" replace />; return <div className="app-layout"><div className={"sidebar-wrap " + (mobile ? "open" : "")}><Sidebar user={session.user} onClose={() => setMobile(false)} /></div><main className="main-content"><MobileHeader onOpen={() => setMobile(true)} /><Routes><Route path="/dashboard" element={<DashboardPage user={session.user} tree={session.tree} role={session.role} />} /><Route path="/tree" element={<TreePage />} /><Route path="/events" element={<EventsPage />} /><Route path="/timeline" element={<EventsPage timeline />} /><Route path="/members" element={<MembersPage />} /><Route path="/gallery" element={<GalleryPage role={session.role} />} /><Route path="/search" element={<SearchPage />} /><Route path="/settings" element={<SettingsPage user={session.user} tree={session.tree} role={session.role} />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></main>{mobile && <button className="drawer-scrim" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button>}</div> }

function VerifyEmailCode() {
    const [code, setCode] = useState("");
    const [e, setE] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [resending, setResending] = useState(false);
    const n = useNavigate();
    const email = new URLSearchParams(location.search).get("email") || "";

    const submit = async ev => {
        ev.preventDefault();
        setE("");
        setMessage("");

        if (code.length !== 6) {
            setE("Enter the 6-digit verification code.");
            return;
        }

        setBusy(true);
        try {
            await api.post("/auth/verify-email-code", { email, code });
            n("/dashboard", { replace: true });
        } catch (err) {
            setE(err.response?.data?.message || "Unable to verify your email.");
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setE("");
        setMessage("");
        setResending(true);

        try {
            const response = await api.post("/auth/resend-code", { email });
            setMessage(response.data?.message || "A new verification code has been sent.");
        } catch (err) {
            setE(err.response?.data?.message || "Unable to send a new verification code.");
        } finally {
            setResending(false);
        }
    };

    return <main className="auth-shell">
        <section className="auth-card centered">
            <Link to="/" className="auth-brand"><span className="brand-icon"><Leaf size={21} /></span><b>FamilyRoots</b></Link>
            <p className="eyebrow">EMAIL VERIFICATION</p>
            <h1>Check your email</h1>
            <p className="muted">We sent a 6-digit verification code to</p>
            <p><strong>{email}</strong></p>

            <form onSubmit={submit}>
                <label>Verification code
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={x => setCode(x.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        required
                    />
                </label>

                {e && <div className="error" role="alert">{e}</div>}
                {message && <div className="success" role="status">{message}</div>}

                <button className="primary full" disabled={busy || code.length !== 6}>
                    {busy ? "Verifying…" : "Verify email"}
                </button>
            </form>

            <p className="switch">
                Didn't receive the code?{" "}
                <button type="button" className="text-button" onClick={resend} disabled={resending}>
                    {resending ? "Sending…" : "Send again"}
                </button>
            </p>
        </section>
    </main>
}

function Placeholder({ title, text, icon }) { return <div className="feature-page"><div className="page-heading"><div><p className="eyebrow">FAMILY ARCHIVE</p><h1>{icon}{title}</h1><p className="muted">{text}</p></div></div><div className="empty-state"><Images size={28} /><h3>Your story deserves a beautiful home.</h3><p>Media and memory tools can be added here without exposing private family data.</p></div></div> }

function App() { return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<Auth mode="login" />} /><Route path="/register" element={<Auth mode="register" />} /><Route path="/verify-email-code" element={<VerifyEmailCode />} /><Route path="/verify-email" element={<Verify />} /><Route path="/accept-invitation" element={<AcceptInvitation />} /><Route path="/*" element={<Protected />} /></Routes> }
function Verify() { const [s, setS] = useState("Verifying…"), n = useNavigate(); useEffect(() => { api.get("/auth/verify-email" + location.search).then(() => setS("Your email is verified. Welcome to FamilyRoots.")).catch(e => setS(e.response?.data?.message || "This verification link is invalid or expired.")) }, []); return <main className="auth-shell"><section className="auth-card centered"><span className="brand-icon large"><Leaf /></span><h1>{s}</h1><button className="primary full" onClick={() => n("/dashboard")}>Continue</button></section></main> }
function AcceptInvitation() { const [token] = useState(() => new URLSearchParams(location.search).get("token") || ""), [s, setS] = useState("Checking invitation…"), [needsLogin, setNeedsLogin] = useState(false), n = useNavigate(); useEffect(() => { if (!token) { setS("This invitation link is missing its token."); return } api.get("/auth/me").then(() => api.post("/collaborators/accept", { token })).then(() => setS("You joined the family tree.")).catch(e => { if (e.response?.status === 401) { setNeedsLogin(true); setS("Sign in or create your FamilyRoots account to accept this invitation.") } else setS(e.response?.data?.message || "Unable to accept invitation.") }) }, [token]); return <main className="auth-shell"><section className="auth-card centered"><span className="brand-icon large"><Leaf /></span><h1>{s}</h1>{needsLogin ? <><p className="muted">Use the same email address that received the invitation.</p><div className="two"><button className="primary" onClick={() => n("/login?next=" + encodeURIComponent("/accept-invitation?token=" + token))}>Log in</button><button className="secondary" onClick={() => n("/register?next=" + encodeURIComponent("/accept-invitation?token=" + token))}>Create account</button></div></> : <button className="primary full" onClick={() => n("/dashboard")}>Open FamilyRoots</button>}</section></main> }
// Apply the saved theme BEFORE React renders.
// This prevents the dashboard from briefly/incorrectly showing
// light mode while the Appearance setting says Dark.
const savedTheme = localStorage.getItem("familyroots-theme") || "system";

const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
).matches;

const resolvedTheme =
    savedTheme === "system"
        ? (systemPrefersDark ? "dark" : "light")
        : savedTheme;

document.documentElement.dataset.theme = resolvedTheme;

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
