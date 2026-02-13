import React, { useState } from "react";
import "./Login.css";

function Login({ onLogin, onRegister, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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
      } else if (isRegistering) {
        // Registration
        if (!name || !email || !password || !phone || !address) {
          setError("Minden mező kötelező");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError("A jelszónak legalább 6 karakter hosszúnak kell lennie");
          setLoading(false);
          return;
        }

        // Validate phone format
        if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
          setError("Adjon meg érvényes telefonszámot");
          setLoading(false);
          return;
        }

        await onRegister(email, password, name, phone, address);
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
      } else if (code === "auth/email-already-in-use") {
        setError("Ez az email cím már regisztrálva van.");
      } else if (code === "auth/weak-password") {
        setError("A jelszó túl gyenge. Legalább 6 karakter szükséges.");
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
    setIsRegistering(mode === "register");
    setIsForgotPassword(mode === "forgot");
    setError("");
    setSuccessMessage("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Omega Könyvtár</h1>
          <p>
            {isForgotPassword
              ? "Jelszó visszaállítása"
              : isRegistering
                ? "Hozzon létre új fiókot"
                : "Jelentkezzen be a könyvtárhoz"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          {isRegistering && (
            <>
              <div className="form-group">
                <label>Teljes Név</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adja meg a teljes nevét"
                  required
                />
              </div>

              <div className="form-group">
                <label>Telefonszám</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+36 20 123 4567"
                  required
                />
              </div>

              <div className="form-group">
                <label>Lakcím</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Budapest, Utca utca 1."
                  required
                />
              </div>
            </>
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

          {!isRegistering && !isForgotPassword && (
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
            ) : isRegistering ? (
              "Fiók Létrehozása"
            ) : (
              "Bejelentkezés"
            )}
          </button>
        </form>

        <div className="login-footer">
          {isForgotPassword ? (
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
          ) : (
            <p>
              {isRegistering ? "Már van fiókja?" : "Még nincs fiókja?"}
              <button
                type="button"
                className="toggle-btn"
                onClick={() => switchMode(isRegistering ? "login" : "register")}
              >
                {isRegistering ? "Bejelentkezés" : "Fiók Létrehozása"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
