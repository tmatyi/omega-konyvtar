import React, { useState, useEffect, useCallback } from "react";
import { database, dbRef, ref, onValue, off, update, push, set } from "../firebase.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { hu } from "date-fns/locale";
import BarcodeScanner from "./BarcodeScanner.jsx";
import "./BarcodeScanner.css";
import "./LendingPanel.css";

const LendingPanel = ({ books, users, loans = [] }) => {
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [loanPeriod, setLoanPeriod] = useState(4);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [renewalDate, setRenewalDate] = useState(new Date());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [isToastExiting, setIsToastExiting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [loanSearchTerm, setLoanSearchTerm] = useState("");

  useEffect(() => {
    const filtered = books.filter((book) => book.category === "Könyvtár");
    setLibraryBooks(filtered);
  }, [books]);

  const showToastNotification = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setIsToastExiting(false);
    setShowToast(true);

    // Start exit animation after 2.5 seconds
    setTimeout(() => {
      setIsToastExiting(true);
    }, 2500);

    // Actually hide after 3 seconds (allows exit animation to complete)
    setTimeout(() => {
      setShowToast(false);
      setIsToastExiting(false);
    }, 3000);
  };

  const calculateDueDate = (startDate, weeks) => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + weeks * 7);
    return due;
  };

  const getNextSunday = () => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday;
  };

  const handleLoanBook = () => {
    if (!selectedBook || !selectedUser) {
      alert("Kérlek, válassz ki egy könyvet és egy felhasználót!");
      return;
    }

    const startDate = getNextSunday();
    const dueDate = calculateDueDate(startDate, loanPeriod);

    const newLoan = {
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      bookAuthor: selectedBook.author,
      userId: selectedUser.id,
      userName:
        selectedUser.name ||
        selectedUser.displayName ||
        "Ismeretlen felhasználó",
      userEmail: selectedUser.email,
      memberCode: selectedUser.id,
      loanDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: "active",
      renewals: 0,
    };

    // Save to Firebase instead of localStorage
    const loansRef = dbRef(database, "loans");
    const newLoanRef = push(loansRef);
    set(newLoanRef, newLoan)
      .then(() => {
        console.log("Loan saved to Firebase:", newLoan);
      })
      .catch((error) => {
        console.error("Error saving loan to Firebase:", error);
        showToastNotification(
          "Hiba történt a kölcsönzés mentése közben!",
          "error",
        );
      });

    setSelectedBook(null);
    setSelectedUser(null);
    setUserSearchTerm("");
    setSearchTerm("");
    setMemberCode("");
    setShowLoanModal(false);

    showToastNotification(
      `Könyv sikeresen kölcsönözve: ${selectedBook.title} → ${selectedUser.name || selectedUser.displayName || "Ismeretlen felhasználó"}!`,
      "success",
    );
  };

  const handleReturnBook = (loanId) => {
    // Update loan in Firebase
    const loanRef = dbRef(database, `loans/${loanId}`);
    const updatedLoan = {
      status: "returned",
      returnDate: new Date().toISOString(),
    };

    update(loanRef, updatedLoan)
      .then(() => {
        console.log("Loan returned in Firebase:", loanId);
        showToastNotification("Könyv sikeresen visszahozva!", "success");
      })
      .catch((error) => {
        console.error("Error returning loan:", error);
        showToastNotification("Hiba történt a visszahozás során!", "error");
      });
  };

  const handleRenewLoan = (loanId) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    // Set the selected loan and show renewal modal
    setSelectedLoan(loan);
    // Set default renewal date to the current due date (not 4 weeks ahead)
    setRenewalDate(new Date(loan.dueDate));
    setShowRenewModal(true);
  };

  const handleRenewalConfirm = () => {
    if (!selectedLoan || !renewalDate) return;

    // Update loan in Firebase
    const loanRef = dbRef(database, `loans/${selectedLoan.id}`);
    const updatedLoan = {
      dueDate: renewalDate.toISOString(),
    };

    update(loanRef, updatedLoan)
      .then(() => {
        console.log("Loan renewed in Firebase:", selectedLoan.id);
        showToastNotification(
          "Kölcsönzés sikeresen meghosszabbítva!",
          "success",
        );
        setShowRenewModal(false);
        setSelectedLoan(null);
        setRenewalDate(new Date());
      })
      .catch((error) => {
        console.error("Error renewing loan:", error);
        showToastNotification("Hiba történt a meghosszabbítás során!", "error");
      });
  };

  const filteredBooks = libraryBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeLoans = loans.filter((loan) => loan.status === "active");
  const overdueLoans = activeLoans.filter(
    (loan) => new Date(loan.dueDate) < new Date(),
  );

  // Check which books are currently lent out
  const lentOutBookIds = new Set(activeLoans.map((loan) => loan.bookId));

  // Debug logging
  console.log("showLoanModal:", showLoanModal);

  const handleBookSelect = (book) => {
    // Prevent selection if book is already lent out
    if (lentOutBookIds.has(book.id)) {
      return;
    }
    setSelectedBook(book);
  };

  const clearSelection = () => {
    setSelectedBook(null);
  };

  const handleConfirmLoan = () => {
    // User selection will appear automatically when a book is selected
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMemberCode(user.id); // Auto-fill member code with user ID
  };

  const filteredUsers = (users || []).filter(
    (user) =>
      user.name &&
      user.email &&
      (user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())),
  );

  // Barcode scan handler — find library book by ISBN
  const handleBarcodeScan = useCallback(
    (scannedCode) => {
      setShowScanner(false);

      const matchedBook = libraryBooks.find(
        (b) => b.isbn && b.isbn === scannedCode,
      );

      if (matchedBook) {
        if (lentOutBookIds.has(matchedBook.id)) {
          showToastNotification(
            `"${matchedBook.title}" már ki van kölcsönözve!`,
            "error",
          );
          return;
        }
        setSelectedBook(matchedBook);
        setSearchTerm(matchedBook.title);
        showToastNotification(
          `Könyv megtalálva: ${matchedBook.title}`,
          "success",
        );
      } else {
        showToastNotification(
          `Nem található könyvtári könyv ezzel a vonalkóddal: ${scannedCode}`,
          "error",
        );
      }
    },
    [libraryBooks, lentOutBookIds],
  );

  return (
    <div className="lending-panel">
      <div className="lending-header">
        <h2>📖 Könyvtári Kölcsönzés</h2>
        <div className="lending-stats">
          <div className="stat-card">
            <span className="stat-number">{activeLoans.length}</span>
            <span className="stat-label">Aktív kölcsönzés</span>
          </div>
          <div className="stat-card overdue">
            <span className="stat-number">{overdueLoans.length}</span>
            <span className="stat-label">Lejárt</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{libraryBooks.length}</span>
            <span className="stat-label">Könyv állomány</span>
          </div>
        </div>
      </div>

      <div className="lending-content">
        <div className="books-section">
          <h3>🔍 Könyvkeresés</h3>
          <div
            className="search-bar"
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <input
              type="text"
              placeholder="Keresés cím vagy szerző szerint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: "100%" }}
            />
            <button
              className="kassza-scan-btn"
              onClick={() => setShowScanner(true)}
              style={{
                padding: "10px 14px",
                background: "#844a59",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              Szkennelés
            </button>
          </div>

          {searchTerm && !selectedBook && (
            <div className="search-results">
              <h4>Keresési eredmények ({filteredBooks.length})</h4>
              {filteredBooks.length === 0 ? (
                <p className="no-results">Nincs találat a keresésre.</p>
              ) : (
                <div className="results-list">
                  {filteredBooks.map((book) => {
                    const isLentOut = lentOutBookIds.has(book.id);
                    return (
                      <div
                        key={book.id}
                        className={`search-result-item ${selectedBook?.id === book.id ? "selected" : ""} ${isLentOut ? "lent-out" : ""}`}
                        onClick={() => !isLentOut && handleBookSelect(book)}
                      >
                        <div className="result-info">
                          <h4>{book.title}</h4>
                          <p>{book.author}</p>
                          {book.year && <small>{book.year}</small>}
                        </div>
                        <div className="result-action">
                          {isLentOut
                            ? "📚 Kikölcsönözve"
                            : selectedBook?.id === book.id
                              ? "✓ Kiválasztva"
                              : "Kiválasztás"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedBook && (
            <div className="selected-book-display">
              <div className="selected-book-header">
                <h4>📖 Kiválasztott könyv:</h4>
                <button className="back-btn" onClick={clearSelection}>
                  ← Törlés
                </button>
              </div>
              <div className="selected-book-info">
                <p>
                  <strong>Cím:</strong> {selectedBook.title}
                </p>
                <p>
                  <strong>Szerző:</strong> {selectedBook.author}
                </p>
                {selectedBook.year && (
                  <p>
                    <strong>Év:</strong> {selectedBook.year}
                  </p>
                )}
                {selectedBook.publisher && (
                  <p>
                    <strong>Kiadó:</strong> {selectedBook.publisher}
                  </p>
                )}
              </div>
            </div>
          )}

          {!searchTerm && !selectedBook && (
            <div className="search-prompt">
              <p>
                Kezdjen el gépelni a könyv címét vagy szerzőjét a kereséshez...
              </p>
            </div>
          )}
        </div>

        {/* User Selection - Only visible when book is selected */}
        {selectedBook && (
          <div className="user-selection-section">
            <div className="user-selection-header">
              <h3>👤 Felhasználó kiválasztása</h3>
            </div>
            <div className="user-search-bar">
              <input
                type="text"
                placeholder="Keresés név vagy email szerint..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {userSearchTerm && (
              <div className="user-search-results">
                <h4>Keresési eredmények ({filteredUsers.length})</h4>
                {filteredUsers.length === 0 ? (
                  <p className="no-results">Nincs találat a keresésre.</p>
                ) : (
                  <div className="results-list">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`search-result-item ${selectedUser?.id === user.id ? "selected" : ""}`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="result-info">
                          <h4>
                            {user.name ||
                              user.displayName ||
                              "Ismeretlen felhasználó"}
                          </h4>
                          <p>{user.email}</p>
                          <small>
                            Szerepkör:{" "}
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "owner"
                                ? "Szolgáló"
                                : "Tag"}
                          </small>
                        </div>
                        <div className="result-action">
                          {selectedUser?.id === user.id
                            ? "✓ Kiválasztva"
                            : "Kiválasztás"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedUser && (
              <div className="selected-user-display">
                <h4>🎯 Kiválasztott felhasználó:</h4>
                <div className="selected-user-info">
                  <p>
                    <strong>Név:</strong>{" "}
                    {selectedUser.name ||
                      selectedUser.displayName ||
                      "Ismeretlen felhasználó"}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                  <p>
                    <strong>Szerepkör:</strong>{" "}
                    {selectedUser.role === "admin"
                      ? "Admin"
                      : selectedUser.role === "owner"
                        ? "Szolgáló"
                        : "Tag"}
                  </p>
                </div>
                <div className="final-loan-actions">
                  <button
                    className="final-confirm-btn"
                    onClick={() => {
                      console.log("Final confirm button clicked");
                      console.log("showLoanModal before:", showLoanModal);
                      setShowLoanModal(true);
                      setTimeout(() => {
                        console.log(
                          "showLoanModal after timeout:",
                          showLoanModal,
                        );
                      }, 100);
                    }}
                  >
                    ✅ Kölcsönzés megerősítése
                  </button>
                </div>
              </div>
            )}

            {!userSearchTerm && !selectedUser && (
              <div className="search-prompt">
                <p>
                  Kezdjen el gépelni a felhasználó nevét vagy email címét a
                  kereséshez...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Loans Section - Always Visible */}
      <div className="loans-section">
        <h3>📋 Aktív kölcsönzések</h3>
        <div className="loan-search-bar" style={{ marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="Keresés kölcsönzések között (könyv, kölcsönző)..."
            value={loanSearchTerm}
            onChange={(e) => setLoanSearchTerm(e.target.value)}
            className="search-input"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div className="loans-list">
          {activeLoans.length === 0 ? (
            <p className="no-loans">Nincsenek aktív kölcsönzések</p>
          ) : (
            activeLoans
              .filter((loan) => {
                if (!loanSearchTerm) return true;
                const term = loanSearchTerm.toLowerCase();
                return (
                  (loan.bookTitle || "").toLowerCase().includes(term) ||
                  (loan.bookAuthor || "").toLowerCase().includes(term) ||
                  (loan.userName || "").toLowerCase().includes(term) ||
                  (loan.userEmail || "").toLowerCase().includes(term)
                );
              })
              .map((loan) => {
                const isOverdue = new Date(loan.dueDate) < new Date();
                const daysLeft = Math.ceil(
                  (new Date(loan.dueDate) - new Date()) / (1000 * 60 * 60 * 24),
                );
                const isExpanded = expandedLoanId === loan.id;

                return (
                  <div
                    key={loan.id}
                    className={`loan-card ${isOverdue ? "overdue" : ""} ${isExpanded ? "expanded" : ""}`}
                  >
                    <div
                      className="loan-card-header"
                      onClick={() =>
                        setExpandedLoanId(isExpanded ? null : loan.id)
                      }
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "15px",
                            fontWeight: 600,
                          }}
                        >
                          📖 {loan.bookTitle}
                        </h4>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "13px",
                            color: "#6b7280",
                          }}
                        >
                          {loan.userName || "Ismeretlen felhasználó"}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                        }}
                      >
                        {isOverdue && (
                          <span
                            style={{
                              background: "#fef2f2",
                              color: "#dc2626",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            Lejárt
                          </span>
                        )}
                        {!isOverdue && daysLeft <= 7 && (
                          <span
                            style={{
                              background: "#fffbeb",
                              color: "#d97706",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {daysLeft} nap
                          </span>
                        )}
                        <span
                          style={{
                            transition: "transform 0.2s ease",
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            fontSize: "14px",
                            color: "#9ca3af",
                          }}
                        >
                          ▼
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div
                        className="loan-card-body"
                        style={{
                          padding: "0 16px 14px",
                          borderTop: "1px solid #f3f4f6",
                        }}
                      >
                        <div
                          className="loan-info"
                          style={{ paddingTop: "12px" }}
                        >
                          <p style={{ marginBottom: "4px" }}>
                            <strong>Szerző:</strong> {loan.bookAuthor}
                          </p>
                          <p style={{ marginBottom: "4px" }}>
                            <strong>Kölcsönző:</strong>{" "}
                            {loan.userName || "Ismeretlen felhasználó"}
                          </p>
                          {loan.userEmail && (
                            <p style={{ marginBottom: "4px" }}>
                              <strong>Email:</strong> {loan.userEmail}
                            </p>
                          )}
                          <p style={{ marginBottom: "4px" }}>
                            <strong>Kölcsönzés dátuma:</strong>{" "}
                            {new Date(loan.loanDate).toLocaleDateString(
                              "hu-HU",
                            )}
                          </p>
                          <p style={{ marginBottom: "4px" }}>
                            <strong>Lejárat:</strong>{" "}
                            {new Date(loan.dueDate).toLocaleDateString("hu-HU")}
                          </p>
                          {isOverdue && (
                            <p className="overdue-text">
                              ⚠️ {Math.abs(daysLeft)} napja lejárt
                            </p>
                          )}
                          {!isOverdue && daysLeft <= 7 && (
                            <p className="warning-text">
                              ⚠️ {daysLeft} nap van hátra
                            </p>
                          )}
                        </div>
                        <div
                          className="loan-actions"
                          style={{ marginTop: "10px" }}
                        >
                          <button
                            className="return-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturnBook(loan.id);
                            }}
                          >
                            Visszahozás
                          </button>
                          {!isOverdue && (
                            <button
                              className="renew-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenewLoan(loan.id);
                              }}
                            >
                              Meghosszabbítás
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {showLoanModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setShowLoanModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "20px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>📖 Kölcsönzés megerősítése</h3>
            {selectedBook && (
              <div className="selected-book-info">
                <p>
                  <strong>Könyv:</strong> {selectedBook.title}
                </p>
                <p>
                  <strong>Szerző:</strong> {selectedBook.author}
                </p>
              </div>
            )}
            {selectedUser && (
              <div className="selected-user-info">
                <p>
                  <strong>Felhasználó:</strong>{" "}
                  {selectedUser.name ||
                    selectedUser.displayName ||
                    "Ismeretlen felhasználó"}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
              </div>
            )}
            <div className="loan-form">
              <div className="form-group">
                <label>Kölcsönzési idő (hetek):</label>
                <select
                  value={loanPeriod}
                  onChange={(e) => setLoanPeriod(Number(e.target.value))}
                  className="form-select"
                >
                  <option value={2}>2 hét</option>
                  <option value={4}>4 hét (alapértelmezett)</option>
                  <option value={6}>6 hét</option>
                  <option value={8}>8 hét</option>
                </select>
              </div>
              <p className="library-info">
                ℹ️ A könyvtár csak vasárnapokon van nyitva. A kölcsönzés a
                következő vasárnaptól kezdődik.
              </p>
            </div>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleLoanBook}>
                Kölcsönzés megerősítése
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowLoanModal(false)}
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewModal && selectedLoan && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 9999,
            }}
          ></div>

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "12px",
              padding: "0",
              maxWidth: "500px",
              width: "90%",
              zIndex: 10000,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e9ecef",
                background: "#f8f9fa",
                borderRadius: "12px 12px 0 0",
              }}
            >
              <h3
                style={{
                  margin: "0",
                  color: "#2c3e50",
                  fontSize: "1.25rem",
                  fontWeight: "600",
                }}
              >
                Kölcsönzés Meghosszabbítása
              </h3>
            </div>

            {/* Body */}
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <p style={{ margin: "5px 0", color: "#495057" }}>
                  <strong style={{ color: "#2c3e50" }}>Könyv:</strong>{" "}
                  {selectedLoan.bookTitle}
                </p>
                <p style={{ margin: "5px 0", color: "#495057" }}>
                  <strong style={{ color: "#2c3e50" }}>Kölcsönző:</strong>{" "}
                  {selectedLoan.userName}
                </p>
                <p style={{ margin: "5px 0", color: "#495057" }}>
                  <strong style={{ color: "#2c3e50" }}>
                    Jelenlegi lejárat:
                  </strong>{" "}
                  {new Date(selectedLoan.dueDate).toLocaleDateString("hu-HU")}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    color: "#2c3e50",
                  }}
                >
                  Új lejárat dátuma:
                </label>
                <DatePicker
                  selected={renewalDate}
                  onChange={(date) => setRenewalDate(date)}
                  minDate={new Date()}
                  locale={hu}
                  dateFormat="yyyy. MM. dd."
                  className="custom-datepicker"
                  popperPlacement="bottom-start"
                  popperModifiers={[
                    {
                      name: "offset",
                      options: {
                        offset: [0, 10],
                      },
                    },
                    {
                      name: "preventOverflow",
                      options: {
                        rootBoundary: "viewport",
                        tether: false,
                      },
                    },
                  ]}
                />
              </div>

              <p
                style={{
                  margin: "0",
                  color: "#6c757d",
                  fontSize: "0.9rem",
                }}
              >
                ℹ️ Válassza ki az új lejárat dátumát a naptárból.
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "20px 24px",
                borderTop: "1px solid #e9ecef",
                background: "#f8f9fa",
                borderRadius: "0 0 12px 12px",
              }}
            >
              <button
                onClick={handleRenewalConfirm}
                style={{
                  background: "linear-gradient(135deg, #28a745, #20c997)",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                Meghosszabbítás megerősítése
              </button>
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setSelectedLoan(null);
                  setRenewalDate(new Date());
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                Mégse
              </button>
            </div>
          </div>
        </>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background:
              toastType === "success"
                ? "linear-gradient(135deg, #28a745, #20c997)"
                : "linear-gradient(135deg, #dc3545, #c82333)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            zIndex: 10001,
            fontSize: "1rem",
            fontWeight: "500",
            maxWidth: "400px",
            wordWrap: "break-word",
            animation: isToastExiting
              ? "slideOutRight 0.3s ease-in forwards"
              : "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            {toastType === "success" ? "✅" : "❌"}
          </span>
          <div>
            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
              {toastType === "success" ? "Siker" : "Hiba"}
            </div>
            <div>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LendingPanel;
