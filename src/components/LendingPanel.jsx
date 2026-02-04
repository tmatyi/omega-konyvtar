import React, { useState, useEffect } from "react";
import "./LendingPanel.css";

const LendingPanel = ({ books, users }) => {
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [loans, setLoans] = useState([]);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [loanPeriod, setLoanPeriod] = useState(4);

  useEffect(() => {
    const filtered = books.filter((book) => book.category === "Könyvtár");
    setLibraryBooks(filtered);

    const savedLoans = localStorage.getItem("libraryLoans");
    if (savedLoans) {
      setLoans(JSON.parse(savedLoans));
    }
  }, [books]);

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
      id: Date.now().toString(),
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

    const updatedLoans = [...loans, newLoan];
    setLoans(updatedLoans);
    localStorage.setItem("libraryLoans", JSON.stringify(updatedLoans));

    setSelectedBook(null);
    setSelectedUser(null);
    setUserSearchTerm("");
    setSearchTerm("");
    setMemberCode("");
    setShowLoanModal(false);

    alert(
      `Könyv sikeresen kölcsönözve: ${selectedBook.title} → ${selectedUser.name || selectedUser.displayName || "Ismeretlen felhasználó"}!`,
    );
  };

  const handleReturnBook = (loanId) => {
    const updatedLoans = loans.map((loan) =>
      loan.id === loanId
        ? { ...loan, status: "returned", returnDate: new Date().toISOString() }
        : loan,
    );
    setLoans(updatedLoans);
    localStorage.setItem("libraryLoans", JSON.stringify(updatedLoans));
    alert("Könyv sikeresen visszahozva!");
  };

  const handleRenewLoan = (loanId) => {
    const loan = loans.find((l) => l.id === loanId);
    if (loan.renewals >= 2) {
      alert("Ezt a kölcsönzést már nem lehet meghosszabbítani!");
      return;
    }

    const newDueDate = calculateDueDate(new Date(loan.dueDate), 4);
    const updatedLoans = loans.map((l) =>
      l.id === loanId
        ? { ...l, dueDate: newDueDate.toISOString(), renewals: l.renewals + 1 }
        : l,
    );
    setLoans(updatedLoans);
    localStorage.setItem("libraryLoans", JSON.stringify(updatedLoans));
    alert("Kölcsönzés meghosszabbítva!");
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

  // Debug logging
  console.log("showLoanModal:", showLoanModal);

  const handleBookSelect = (book) => {
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
          <h3>� Könyvkeresés</h3>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Keresés cím vagy szerző szerint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          {searchTerm && !selectedBook && (
            <div className="search-results">
              <h4>Keresési eredmények ({filteredBooks.length})</h4>
              {filteredBooks.length === 0 ? (
                <p className="no-results">Nincs találat a keresésre.</p>
              ) : (
                <div className="results-list">
                  {filteredBooks.map((book) => (
                    <div
                      key={book.id}
                      className={`search-result-item ${selectedBook?.id === book.id ? "selected" : ""}`}
                      onClick={() => handleBookSelect(book)}
                    >
                      <div className="result-info">
                        <h4>{book.title}</h4>
                        <p>{book.author}</p>
                        {book.year && <small>{book.year}</small>}
                      </div>
                      <div className="result-action">
                        {selectedBook?.id === book.id
                          ? "✓ Kiválasztva"
                          : "Kiválasztás"}
                      </div>
                    </div>
                  ))}
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
                autoFocus
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
        <div className="loans-list">
          {activeLoans.length === 0 ? (
            <p className="no-loans">Nincsenek aktív kölcsönzések</p>
          ) : (
            activeLoans.map((loan) => {
              const isOverdue = new Date(loan.dueDate) < new Date();
              const daysLeft = Math.ceil(
                (new Date(loan.dueDate) - new Date()) / (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={loan.id}
                  className={`loan-card ${isOverdue ? "overdue" : ""}`}
                >
                  <div className="loan-info">
                    <h4>{loan.bookTitle}</h4>
                    <p style={{ marginBottom: "12px" }}>{loan.bookAuthor}</p>
                    <p>
                      <strong>Kölcsönző:</strong>{" "}
                      {loan.userName || "Ismeretlen felhasználó"}
                    </p>
                    {loan.userEmail && (
                      <p>
                        <strong>Email:</strong> {loan.userEmail}
                      </p>
                    )}
                    <p>
                      <strong>Kölcsönzés dátuma:</strong>{" "}
                      {new Date(loan.loanDate).toLocaleDateString("hu-HU")}
                    </p>
                    <p>
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
                  <div className="loan-actions">
                    <button
                      className="return-btn"
                      onClick={() => handleReturnBook(loan.id)}
                    >
                      Visszahozás
                    </button>
                    {loan.renewals < 2 && !isOverdue && (
                      <button
                        className="renew-btn"
                        onClick={() => handleRenewLoan(loan.id)}
                      >
                        Meghosszabbítás ({loan.renewals}/2)
                      </button>
                    )}
                  </div>
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
    </div>
  );
};

export default LendingPanel;
