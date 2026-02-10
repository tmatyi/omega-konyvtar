import React, { useRef, useState, useCallback } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import "./BarcodeScanner.css";

// Generate a short beep using the Web Audio API
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.2,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    // Audio not available — silently ignore
  }
}

// Haptic feedback
function vibrate() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  } catch (e) {
    // Vibration not available
  }
}

function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [scannedCode, setScannedCode] = useState(null);
  const hasScanned = useRef(false);
  const mountedRef = useRef(true);

  const handleScan = useCallback(
    (detectedCodes) => {
      if (hasScanned.current || !detectedCodes || detectedCodes.length === 0)
        return;
      hasScanned.current = true;

      const code = detectedCodes[0].rawValue;
      playBeep();
      vibrate();
      setScannedCode(code);

      // Small delay so user sees the scanned code before closing
      setTimeout(() => {
        if (mountedRef.current) {
          onScan(code);
        }
      }, 400);
    },
    [onScan],
  );

  const handleError = useCallback((err) => {
    const errStr = typeof err === "string" ? err : err?.message || "";
    if (errStr.includes("NotAllowedError")) {
      setError(
        "Kamera hozzáférés megtagadva. Kérjük, engedélyezze a kamerát a böngésző beállításaiban.",
      );
    } else if (errStr.includes("NotFoundError")) {
      setError("Nem található kamera az eszközön.");
    } else if (errStr) {
      setError(
        "Nem sikerült elindítani a kamerát. Kérjük, ellenőrizze a kamera engedélyeket.",
      );
    }
  }, []);

  return (
    <div className="barcode-scanner-overlay" onClick={onClose}>
      <div
        className="barcode-scanner-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="barcode-scanner-header">
          <p className="barcode-scanner-title">Vonalkód Szkennelés</p>
          <button
            className="barcode-scanner-close-btn"
            onClick={onClose}
            aria-label="Bezárás"
          >
            ✕
          </button>
        </div>

        <div className="barcode-scanner-viewfinder">
          {!scannedCode && (
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{ facingMode: "environment" }}
              formats={[
                "qr_code",
                "ean_13",
                "ean_8",
                "upc_a",
                "upc_e",
                "code_128",
                "code_39",
              ]}
              components={{
                audio: false,
                finder: false,
              }}
              styles={{
                container: {
                  width: "100%",
                  height: "100%",
                  position: "relative",
                },
                video: {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "16px",
                },
              }}
              scanDelay={300}
            />
          )}
          {!scannedCode && !error && (
            <>
              <div className="barcode-scanner-corners">
                <div className="barcode-scanner-corner-bl" />
                <div className="barcode-scanner-corner-br" />
              </div>
              <div className="barcode-scanner-line" />
            </>
          )}
        </div>

        {scannedCode ? (
          <div className="barcode-scanner-success">
            <span className="barcode-scanner-success-icon">✓</span>
            <span className="barcode-scanner-success-code">{scannedCode}</span>
          </div>
        ) : error ? (
          <p className="barcode-scanner-error">{error}</p>
        ) : (
          <p className="barcode-scanner-hint">Tartsa a vonalkódot a keretben</p>
        )}
      </div>
    </div>
  );
}

export default BarcodeScanner;
