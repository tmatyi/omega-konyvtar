import React, { useState } from "react";
import "./Login.css";

function Login({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (isForgotPassword) {
        // Forgot password
        if (!email) {
          setError("Adja meg az email címét");
          setLoading(false);
          return;
        }
        await onForgotPassword(email);
        setSuccessMessage(
          "Jelszó-visszaállító email elküldve! Ellenőrizze a postaládáját (és a spam mappát is).",
        );
      } else {
        // Login
        if (!email || !password) {
          setError("Email és jelszó szükséges");
          setLoading(false);
          return;
        }

        await onLogin(email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
      // Translate common Firebase error messages to Hungarian
      const code = error.code || "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential"
      ) {
        setError("Hibás email cím vagy jelszó.");
      } else if (code === "auth/invalid-email") {
        setError("Érvénytelen email cím formátum.");
      } else if (code === "auth/too-many-requests") {
        setError("Túl sok próbálkozás. Kérjük, próbálja újra később.");
      } else {
        setError(error.message || "Hiba történt. Próbálja újra.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setIsForgotPassword(mode === "forgot");
    setError("");
    setSuccessMessage("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Omega Könyvek</h1>
          <p>
            {isForgotPassword
              ? "Jelszó visszaállítása"
              : "Jelentkezzen be a könyvtárhoz"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          <div className="form-group">
            <label>Email Cím</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@pelda.com"
              required
            />
          </div>

          {!isForgotPassword && (
            <div className="form-group">
              <label>Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 karakter"
                required
                minLength={6}
              />
            </div>
          )}

          {!isForgotPassword && (
            <div className="forgot-password-link">
              <button
                type="button"
                className="forgot-btn"
                onClick={() => switchMode("forgot")}
              >
                Elfelejtette a jelszavát?
              </button>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span>
              </span>
            ) : isForgotPassword ? (
              "Jelszó Visszaállítása"
            ) : (
              "Bejelentkezés"
            )}
          </button>
        </form>

        {isForgotPassword && (
          <div className="login-footer">
            <p>
              Visszatérés a bejelentkezéshez
              <button
                type="button"
                className="toggle-btn"
                onClick={() => switchMode("login")}
              >
                Bejelentkezés
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
