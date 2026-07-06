"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeSlash, Envelope, LockSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        style={{ width: "100%", maxWidth: 360 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span className="display" style={{ fontSize: 28, color: "var(--primary)", letterSpacing: "-0.04em" }}>
              STROT
            </span>
          </Link>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 6, fontStyle: "italic" }}>
            Sign in to your workspace
          </div>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: 24,
            background: "var(--surface)",
            boxShadow: "0 24px 60px oklch(0 0 0 / 0.4)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6, letterSpacing: "0.03em" }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Envelope
                  size={13}
                  color="var(--ink-muted)"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ paddingLeft: 30 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6, letterSpacing: "0.03em" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <LockSimple
                  size={13}
                  color="var(--ink-muted)"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
                <input
                  type={showPass ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingLeft: 30, paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-muted)",
                    display: "flex",
                  }}
                >
                  {showPass ? <EyeSlash size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "var(--error)", background: "var(--error-subtle)", padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid oklch(0.62 0.150 25 / 0.3)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "10px 0", gap: 8, marginTop: 4 }}
            >
              {loading ? "Signing in..." : <>Sign in <ArrowRight size={14} weight="bold" /></>}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              No account?{" "}
              <Link href="/sign-up" style={{ color: "var(--primary)", textDecoration: "none" }}>
                Sign up free
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
