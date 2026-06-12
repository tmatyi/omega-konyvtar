import React, { useState, useEffect } from "react";
import { CircleCheck, AlertTriangle } from "lucide-react";
import {
  auth,
  createUserWithEmailAndPassword,
  signOut,
  database,
  dbRef,
  set,
  validateInvite,
  acceptInviteCallable,
} from "./firebase.js";
import "./AcceptInvite.css";

function AcceptInvite() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invite, setInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState("loading"); // "loading" | "valid" | "not_found" | "accepted" | "expired"

  // Read token and email from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const urlEmail = params.get("email");

    if (!urlToken || !urlEmail) {
      setInviteStatus("not_found");
      setError("Érvénytelen meghívó link.");
      setLoading(false);
      return;
    }

    setToken(urlToken);
    setEmail(urlEmail);
  }, []);

  // Validate the invite token via Cloud Function (secure — no client access to invites/)
  useEffect(() => {
    if (!token || !email) return;

    let cancelled = false;

    const checkInvite = async () => {
      try {
        const result = await validateInvite(token, email);
        if (cancelled) return;

        const data = result.data;
        if (data.valid) {
          setInvite({ token, email });
          setInviteStatus("valid");
        } else if (data.status === "accepted") {
          setInviteStatus("accepted");
          setError("Ezt a meghívót már elfogadták.");
        } else if (data.status === "expired") {
          setInviteStatus("expired");
          setError("Ez a meghívó lejárt.");
        } else {
          setInviteStatus("not_found");
          setError("Ez a meghívó nem található.");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Invite validation error:", err);
        setInviteStatus("not_found");
        setError("Hiba történt a meghívó ellenőrzése során.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkInvite();
    return () => { cancelled = true; };
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (!name.trim()) {
      setError("A teljes név megadása kötelező.");
      return;
    }

    if (password.length < 6) {
      setError("A jelszónak legalább 6 karakter hosszúnak kell lennie.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A két jelszó nem egyezik meg.");
      return;
    }

    setSubmitting(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Write user profile to Realtime Database
      const userRef = dbRef(database, `users/${userCredential.user.uid}`);
      await set(userRef, {
        uid: userCredential.user.uid,
        email: email,
        displayName: name.trim(),
        role: "owner",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        photoURL: null,
        bio: "",
        phone: "",
        address: "",
      });

      // Mark invite as accepted via Cloud Function
      await acceptInviteCallable(token, email);

      // Sign out the newly created user (they should log in through the normal flow)
      await signOut(auth);

      setSuccess(true);
    } catch (err) {
      console.error("Registration error:", err);
      const code = err.code || "";
      if (code === "auth/email-already-in-use") {
        setError("Ez az email cím már regisztrálva van.");
      } else if (code === "auth/weak-password") {
        setError("A jelszó túl gyenge. Legalább 6 karakter szükséges.");
      } else if (code === "auth/invalid-email") {
        setError("Érvénytelen email cím formátum.");
      } else {
        setError(err.message || "Hiba történt a regisztráció során.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-loading">
            <div className="loading-spinner"></div>
            <p>A meghívó ellenőrzése...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-success">
            <div className="success-icon"><CircleCheck size={48} /></div>
            <h2>Sikeres Regisztráció!</h2>
            <p>
              <strong>{name.trim()}</strong>, a fiókod létrejött.
            </p>
            <p>
              Most már bejelentkezhetsz az Omega Könyvekbe a megadott email
              címmel és jelszavaddal.
            </p>
            <a href="/" className="invite-login-btn">
              Tovább a Bejelentkezéshez
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid invite)
  if (inviteStatus !== "valid") {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-error">
            <div className="error-icon"><AlertTriangle size={48} /></div>
            <h2>Érvénytelen Meghívó</h2>
            <p>{error}</p>
            <p className="invite-note">
              Ha úgy gondolod, hogy ez hiba, kérjük vedd fel a kapcsolatot az
              adminisztrátorral.
            </p>
            <a href="/" className="invite-login-btn">
              Vissza a Bejelentkezéshez
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-header">
          <h1>Omega Könyvek</h1>
          <p>
            Üdvözlünk, <strong>{email}</strong>!
          </p>
          <p>A regisztráció befejezéséhez add meg az adataidat.</p>
        </div>

        <form onSubmit={handleSubmit} className="accept-invite-form">
          {error && <div className="accept-accept-invite-form-error">{error}</div>}

          <div className="form-group">
            <label>Teljes Név</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adja meg a teljes nevét"
              required
              autoFocus
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
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Jelszó Megerősítése</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Jelszó újra"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="invite-submit-btn" disabled={submitting}>
            {submitting ? (
              <span className="loading-spinner">
                <span className="spinner"></span>
              </span>
            ) : (
              "Regisztráció Befejezése"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AcceptInvite;
