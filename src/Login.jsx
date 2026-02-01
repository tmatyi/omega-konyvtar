import React, { useState } from "react";
import "./Login.css";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegistering) {
        // Registration
        if (!name || !email || !password || !phone) {
          setError("Minden mező kötelező");
          setLoading(false);
          return;
        }

        // Validate phone format
        if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
          setError("Adjon meg érvényes telefonszámot");
          setLoading(false);
          return;
        }

        await onRegister(email, password, name, phone);
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
      setError(error.message || "Hiba történt a bejelentkezés során");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Omega Könyvtár</h1>
          <p>
            {isRegistering
              ? "Hozzon létre új fiókot"
              : "Jelentkezzen be a könyvtárhoz"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

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

          <div className="form-group">
            <label>Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 karakter"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner">
                <span className="spinner"></span>
                {isRegistering ? "Fiók létrehozása..." : "Bejelentkezés..."}
              </span>
            ) : isRegistering ? (
              "Fiók Létrehozása"
            ) : (
              "Bejelentkezés"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegistering ? "Már van fiókja?" : "Még nincs fiókja?"}
            <button
              type="button"
              className="toggle-btn"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
            >
              {isRegistering ? "Bejelentkezés" : "Fiók Létrehozása"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
