import React, { useState } from "react";
import { database, ref, push, set } from "./firebase.js";
import "./GuestRegister.css";

function GuestRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Kérjük, töltse ki mindkét mezőt!");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Kérjük, adjon meg egy érvényes email címet!");
      return;
    }

    setLoading(true);
    try {
      const guestRef = ref(database, "pendingGuests");
      const newRef = push(guestRef);
      await set(newRef, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        status: "pending",
        registeredAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Guest registration error:", err);
      setError("Hiba történt a regisztráció során. Kérjük, próbálja újra!");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="guest-register-page">
        <div className="guest-register-card">
          <div className="guest-success">
            <div className="success-icon">✅</div>
            <h2>Sikeres Regisztráció!</h2>
            <p>
              Köszönjük, <strong>{name}</strong>! A regisztrációd beérkezett.
            </p>
            <p className="success-note">
              Egy adminisztrátor hamarosan jóváhagyja a fiókodat, és beállítja a
              jelszavadat. Ezután tudsz majd bejelentkezni.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-register-page">
      <div className="guest-register-card">
        <div className="guest-register-header">
          <h1>Omega Könyvtár</h1>
          <p>Vendég Regisztráció</p>
        </div>

        <form onSubmit={handleSubmit} className="guest-register-form">
          <div className="guest-form-group">
            <label htmlFor="guest-name">Név</label>
            <input
              id="guest-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Teljes név"
              required
              autoComplete="name"
            />
          </div>

          <div className="guest-form-group">
            <label htmlFor="guest-email">Email</label>
            <input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pelda@email.com"
              required
              autoComplete="email"
            />
          </div>

          {error && <div className="guest-error">{error}</div>}

          <button
            type="submit"
            className="guest-submit-btn"
            disabled={loading}
          >
            {loading ? "Regisztráció..." : "Regisztráció"}
          </button>

          <p className="guest-info-text">
            A regisztráció után egy adminisztrátor jóváhagyja a fiókodat és
            beállítja a jelszavadat.
          </p>
        </form>
      </div>
    </div>
  );
}

export default GuestRegister;
