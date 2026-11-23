import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router";
import { verifyEmail } from "wasp/client/auth";

export function EmailVerificationPage() {
  const [token] = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verificationToken = token || searchParams.get("token");
    if (!verificationToken) { setStatus("error"); setMessage("No verification token provided."); return; }
    const verify = async () => {
      try { await verifyEmail({ token: verificationToken }); setStatus("success"); setMessage("Your email has been verified! You can now sign in."); }
      catch (error: any) { setStatus("error"); setMessage(error.message || "Verification failed. The link may have expired."); }
    };
    verify();
  }, [token, searchParams]);

  return (<div style={styles.container}><div style={styles.card}><div style={styles.header}><span style={styles.logoIcon}>🌱</span><span style={styles.logoText}>Great Spring Solutions</span></div><h1 style={styles.title}>{status === "loading" && "Verifying your email..."}{status === "success" && "Email Verified!"}{status === "error" && "Verification Failed"}</h1><p style={styles.message}>{message}</p>{status === "success" && <Link to="/login" style={styles.button}>Sign In</Link>}{status === "error" && <Link to="/signup" style={styles.button}>Try Again</Link>}</div></div>); }

const styles: Record<string, React.CSSProperties> = { container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "linear-gradient(135deg, #f0fdf4 0%, #f9fafb 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }, card: { width: "100%", maxWidth: "420px", background: "white", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", padding: "48px", border: "1px solid #e5e7eb" }, header: { textAlign: "center", marginBottom: "32px" }, logoIcon: { fontSize: "32px" }, logoText: { fontSize: "24px", fontWeight: 700, color: "#111827" }, title: { fontSize: "28px", fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: "16px" }, message: { color: "#6b7280", textAlign: "center", marginBottom: "24px" }, button: { display: "block", background: "#10B981", color: "white", textDecoration: "none", fontWeight: 600, padding: "12px 24px", borderRadius: "8px", textAlign: "center", marginTop: "8px" } };