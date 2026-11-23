import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router";
import { resetPassword } from "wasp/client/auth";

export function PasswordResetPage() {
  const [token] = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const resetToken = token || searchParams.get("token");
    if (!resetToken) { setStatus("error"); setMessage("No reset token provided."); return; }
    setStatus("form");
  }, [token, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setMessage("Passwords do not match"); return; }
    if (password.length < 8) { setMessage("Password must be at least 8 characters"); return; }
    const resetToken = token || new URLSearchParams(window.location.search).get("token");
    if (!resetToken) { setMessage("No reset token provided"); return; }
    try { await resetPassword({ token: resetToken, password }); setStatus("success"); setMessage("Password has been reset! You can now sign in with your new password."); } catch (error: any) { setMessage(error.message || "Password reset failed. The link may have expired."); }
  };

  if (status === "loading") { return (<div style={styles.container}><div style={styles.card}><div style={styles.header}><span style={styles.logoIcon}>🌱</span><span style={styles.logoText}>Great Spring Solutions</span></div><p style={styles.loadingText}>Loading...</p></div></div>); }

  return (<div style={styles.container}><div style={styles.card}><div style={styles.header}><span style={styles.logoIcon}>🌱</span><span style={styles.logoText}>Great Spring Solutions</span></div><h1 style={styles.title}>Reset Your Password</h1><p style={styles.message}>{message}</p>{status === "form" && (<form onSubmit={handleSubmit} style={styles.form}><div style={styles.formGroup}><label htmlFor="password">New Password</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required minLength={8} autoComplete="new-password"/></div><div style={styles.formGroup}><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} required minLength={8} autoComplete="new-password"/></div><button type="submit" style={styles.submitButton}>Reset Password</button></form>)}{status === "success" && <Link to="/login" style={styles.button}>Sign In</Link>}{status === "error" && <Link to="/login" style={styles.button}>Back to Login</Link>}</div></div>); }

const styles: Record<string, React.CSSProperties> = { container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f0fdf4 0%, #f9fafb 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }, card: { width: "100%", maxWidth: "420px", background: "white", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", padding: "48px", border: "1px solid #e5e7eb" }, header: { textAlign: "center", marginBottom: "32px" }, logoIcon: { fontSize: "32px" }, logoText: { fontSize: "24px", fontWeight: 700, color: "#111827" }, title: { fontSize: "28px", fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: "8px" }, message: { color: "#6b7280", textAlign: "center", marginBottom: "24px" }, form: { display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }, formGroup: { display: "flex", flexDirection: "column", gap: "6px" }, input: { padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }, submitButton: { background: "#10B981", color: "white", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 600, fontSize: "16px", cursor: "pointer" }, button: { display: "block", background: "#10B981", color: "white", textDecoration: "none", fontWeight: 600, padding: "12px 24px", borderRadius: "8px", textAlign: "center", marginTop: "16px" }, loadingText: { textAlign: "center", color: "#6b7280" } };