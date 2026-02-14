import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import GuestRegister from "./GuestRegister.jsx";
import "./App.css";

// Service worker update detection — auto-reload when new version is deployed
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "activated" &&
            navigator.serviceWorker.controller
          ) {
            // New version activated, reload the page
            console.log("New version detected, reloading...");
            window.location.reload();
          }
        });
      }
    });
  });

  // Also check for updates periodically (every 5 minutes)
  setInterval(
    () => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    },
    5 * 60 * 1000,
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/register-guest" element={<GuestRegister />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
