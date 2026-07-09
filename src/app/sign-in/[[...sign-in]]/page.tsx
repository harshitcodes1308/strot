"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SignInPage() {
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
        style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center" }}
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

        <SignIn appearance={{ variables: { colorPrimary: "#3b82f6" } }} />
      </motion.div>
    </div>
  );
}
