import { useState, useEffect, useRef, useCallback } from "react";
import {
  database,
  ref,
  onValue,
  off,
  remove,
  update,
  push,
  set,
} from "../firebase.js";

import BarcodeScanner from "./BarcodeScanner.jsx";
import "./BarcodeScanner.css";

const KasszaPanel = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [books, setBooks] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [saleData, setSaleData] = useState({
    itemType: "book", // "book" or "gift"
    itemId: "",
    itemName: "",
    quantity: "",
    price: "",
    paymentMethod: "cash",
  });
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [isToastExiting, setIsToastExiting] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // "all" or "monthly"
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM format
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  useEffect(() => {
    const salesRef = ref(database, "sales");
    const booksRef = ref(database, "books");
    const giftsRef = ref(database, "gifts");

    const handleSalesData = (snapshot) => {
      const salesData = snapshot.val();
      if (salesData) {
        const salesList = Object.keys(salesData).map((saleId) => ({
          id: saleId,
          ...salesData[saleId],
        }));
        setSales(salesList);
      } else {
        setSales([]);
      }
      setLoading(false);
    };

    const handleBooksData = (snapshot) => {
      const booksData = snapshot.val();
      if (booksData) {
        const booksList = Object.keys(booksData).map((bookId) => ({
          id: bookId,
          ...booksData[bookId],
        }));
        setBooks(booksList);
      } else {
        setBooks([]);
      }
    };

    const handleGiftsData = (snapshot) => {
      const giftsData = snapshot.val();
      if (giftsData) {
        const giftsList = Object.keys(giftsData).map((giftId) => ({
          id: giftId,
          ...giftsData[giftId],
        }));
        setGifts(giftsList);
      } else {
        setGifts([]);
      }
    };

    onValue(salesRef, handleSalesData);
    onValue(booksRef, handleBooksData);
    onValue(giftsRef, handleGiftsData);
  }, []);

  // Barcode scan handler — find book by ISBN or gift by barcode
  const handleBarcodeScan = useCallback(
    (scannedCode) => {
      setShowScanner(false);
      setScanResult(null);

      // 1. Try to find a book with matching ISBN (Bolt category only)
      const matchedBook = books.find(
        (b) => b.isbn && b.isbn === scannedCode && b.category === "Bolt",
      );

      if (matchedBook) {
        setSaleData({
          itemType: "book",
          itemId: matchedBook.id,
          itemName: matchedBook.title,
          quantity: "1",
          price: matchedBook.price || "",
          paymentMethod: "cash",
        });
        setProductSearchTerm(`${matchedBook.title} - ${matchedBook.author}`);
        setScanResult({
          type: "success",
          message: `📚 ${matchedBook.title} (${matchedBook.author})`,
        });
        setShowSaleForm(true);
        return;
      }

      // 2. Try to find a gift with matching barcode
      const matchedGift = gifts.find(
        (g) => g.barcode && g.barcode === scannedCode,
      );

      if (matchedGift) {
        setSaleData({
          itemType: "gift",
          itemId: matchedGift.id,
          itemName: matchedGift.name,
          quantity: "1",
          price: matchedGift.price || "",
          paymentMethod: "cash",
        });
        setProductSearchTerm(matchedGift.name);
        setScanResult({
          type: "success",
          message: `🎁 ${matchedGift.name}`,
        });
        setShowSaleForm(true);
        return;
      }

      // 3. Not found
      setScanResult({
        type: "error",
        message: `Nem található termék ezzel a vonalkóddal: ${scannedCode}`,
      });
      showToastNotification(`Nem található termék: ${scannedCode}`, "error");
    },
    [books, gifts],
  );

  const handleSaleSubmit = (e) => {
    e.preventDefault();

    if (
      !saleData.itemId ||
      !saleData.itemName ||
      !saleData.quantity ||
      !saleData.price
    ) {
      alert("Kérjük, töltse ki az összes szükséges mezőt!");
      return;
    }

    // Check if enough stock is available
    const item =
      saleData.itemType === "book"
        ? books.find((b) => b.id === saleData.itemId)
        : gifts.find((g) => g.id === saleData.itemId);

    if (!item) {
      alert("A kiválasztott termék nem található!");
      return;
    }

    // Handle editing vs new sale
    if (editingSale) {
      // Editing existing sale - adjust stock difference
      const quantityDifference =
        parseInt(saleData.quantity) - editingSale.quantity;

      if (quantityDifference > 0) {
        // Selling more items - check if enough stock
        const currentStock = item.quantity + editingSale.quantity; // Original stock + what was sold
        if (currentStock < quantityDifference) {
          alert("Nincs elég raktárkészlet a kiválasztott mennyiséghez!");
          return;
        }
      }

      // Update stock with the difference
      const itemRef = ref(
        database,
        `${saleData.itemType === "book" ? "books" : "gifts"}/${saleData.itemId}`,
      );
      update(itemRef, {
        quantity: item.quantity - quantityDifference,
      });

      // Update the sale record
      const saleRef = ref(database, `sales/${editingSale.id}`);
      update(saleRef, {
        itemType: saleData.itemType,
        itemId: saleData.itemId,
        itemName: saleData.itemName,
        quantity: parseInt(saleData.quantity),
        price: parseFloat(saleData.price),
        paymentMethod: saleData.paymentMethod || "cash",
        timestamp: editingSale.timestamp, // Keep original timestamp
        seller: user?.email || "ismeretlen",
        totalAmount: parseFloat(saleData.price) * parseInt(saleData.quantity),
      });
    } else {
      // New sale - check stock availability
      if (item.quantity < parseInt(saleData.quantity)) {
        alert("Nincs elég raktárkészlet a kiválasztott mennyiséghez!");
        return;
      }

      // Create new sale record
      const salesRef = ref(database, "sales");
      const newSaleRef = push(salesRef);

      const saleDataToSave = {
        itemType: saleData.itemType,
        itemId: saleData.itemId,
        itemName: saleData.itemName,
        quantity: parseInt(saleData.quantity),
        price: parseFloat(saleData.price),
        paymentMethod: saleData.paymentMethod || "cash",
        timestamp: new Date().toISOString(),
        seller: user?.email || "ismeretlen",
        totalAmount: parseFloat(saleData.price) * parseInt(saleData.quantity),
      };

      set(newSaleRef, saleDataToSave);

      // Decrease stock
      const itemRef = ref(
        database,
        `${saleData.itemType === "book" ? "books" : "gifts"}/${saleData.itemId}`,
      );
      update(itemRef, {
        quantity: item.quantity - parseInt(saleData.quantity),
      });
    }

    // Reset form
    setSaleData({
      itemType: "book",
      itemId: "",
      itemName: "",
      quantity: "",
      price: "",
      paymentMethod: "cash",
    });
    setProductSearchTerm(""); // Clear the search input
    setShowSaleForm(false);
    setEditingSale(null);

    // Show success toast
    showToastNotification(
      `${saleData.itemName} (${saleData.quantity} db) sikeresen eladva!`,
      "success",
    );
  };

  const handleSaleEdit = (sale) => {
    setEditingSale(sale);
    setSaleData({
      itemType: sale.itemType || "book",
      itemId: sale.itemId || "",
      itemName: sale.itemName || "",
      quantity: sale.quantity || "",
      price: sale.price || "",
      paymentMethod: sale.paymentMethod || "cash",
    });
    setShowSaleForm(true);
  };

  const handleSaleDelete = (sale) => {
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      // Restore stock first
      const itemRef = ref(
        database,
        `${saleToDelete.itemType === "book" ? "books" : "gifts"}/${saleToDelete.itemId}`,
      );

      // Get current item to restore stock
      const item =
        saleToDelete.itemType === "book"
          ? books.find((b) => b.id === saleToDelete.itemId)
          : gifts.find((g) => g.id === saleToDelete.itemId);

      if (item) {
        update(itemRef, {
          quantity: item.quantity + saleToDelete.quantity,
        });
      }

      // Then delete the sale
      const saleRef = ref(database, `sales/${saleToDelete.id}`);
      remove(saleRef);

      // Show success toast
      showToastNotification(
        `${saleToDelete.itemName} (${saleToDelete.quantity} db) eladása törölve, készlet helyreállítva!`,
        "success",
      );
    }
    setShowDeleteConfirm(false);
    setSaleToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSaleToDelete(null);
  };

  // Calculate monthly revenue if in monthly view
  const monthlySales =
    viewMode === "monthly"
      ? sales.filter((sale) => sale.timestamp.startsWith(selectedMonth))
      : [];

  const monthlyRevenue = monthlySales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0,
  );
  const totalRevenue =
    viewMode === "monthly"
      ? monthlyRevenue
      : sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalSales =
    viewMode === "monthly" ? monthlySales.length : sales.length;

  const filteredSales = (viewMode === "monthly" ? monthlySales : sales)
    .filter(
      (sale) =>
        sale.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="kassza-panel">
      <header className="App-header">
        <div className="header-section header-title">
          <div className="title-container">
            <h1>Kassza</h1>
            <p>Értékesítési és bevételi nyilvántartás</p>
          </div>
        </div>
      </header>

      <div className="kassza-content">
        <div className="kassza-section">
          <h3>Eladási Történet</h3>
          <div className="view-controls">
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === "all" ? "active" : ""}`}
                onClick={() => setViewMode("all")}
              >
                Összes
              </button>
              <button
                className={`view-mode-btn ${viewMode === "monthly" ? "active" : ""}`}
                onClick={() => setViewMode("monthly")}
              >
                Havi
              </button>
            </div>
            {viewMode === "monthly" && (
              <div className="month-picker">
                <label>Válassz hónapot:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="month-input"
                />
              </div>
            )}
          </div>
          <div className="sales-summary">
            <div className="summary-card">
              <h4>Összes Bevétel</h4>
              <p className="summary-amount">
                {totalRevenue.toLocaleString("hu-HU")} Ft
              </p>
            </div>
            <div className="summary-card">
              <h4>Eladások Száma</h4>
              <p className="summary-count">{totalSales}</p>
            </div>
          </div>

          <div className="kassza-section">
            <h3>Új Eladás</h3>
            <button
              className="kassza-scan-btn"
              onClick={() => setShowScanner(true)}
            >
              <svg
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
              Vonalkód Szkennelés
            </button>
            {scanResult && (
              <div
                className={`scan-result-banner ${scanResult.type}`}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "12px",
                  fontSize: "14px",
                  fontWeight: "500",
                  background:
                    scanResult.type === "success"
                      ? "rgba(52, 199, 89, 0.1)"
                      : "rgba(255, 59, 48, 0.1)",
                  color: scanResult.type === "success" ? "#1d7a3a" : "#d32f2f",
                  border: `1px solid ${scanResult.type === "success" ? "rgba(52, 199, 89, 0.3)" : "rgba(255, 59, 48, 0.3)"}`,
                }}
              >
                {scanResult.message}
              </div>
            )}
            <button
              onClick={() => setShowSaleForm(true)}
              className="kassza-btn primary"
            >
              + Új Eladás Rögzítése
            </button>
          </div>

          <div className="kassza-section">
            <h3>Keresés</h3>
            <input
              type="text"
              placeholder="Keresés könyv cím vagy vásárló szerint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="kassza-search"
            />
          </div>

          <div className="kassza-section sales-list-section">
            <h3>Eladási Lista</h3>
            <div className="sales-list">
              {filteredSales.length === 0 ? (
                <div className="no-sales">
                  <p>Még nincsenek rögzített eladások.</p>
                </div>
              ) : (
                filteredSales.map((sale) => (
                  <div key={sale.id} className="sale-item">
                    <div className="sale-info">
                      <div className="sale-book">
                        <h4>{sale.itemName}</h4>
                        <div className="sale-badges">
                          <span className="sale-date">
                            {new Date(sale.timestamp).toLocaleString("hu-HU", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span
                            className={`sale-type ${sale.itemType === "book" ? "book" : "gift"}`}
                          >
                            {sale.itemType === "book"
                              ? "📚 Könyv"
                              : "🎁 Ajándék"}
                          </span>
                          <span className="sale-quantity">
                            {sale.quantity} db
                          </span>
                          <span className="sale-price">
                            {parseInt(sale.price).toLocaleString("hu-HU")} Ft/db
                          </span>
                          <span className="sale-payment">
                            {sale.paymentMethod === "cash"
                              ? "Készpénz"
                              : sale.paymentMethod === "card"
                                ? "Bankkártya"
                                : "Átutalás"}
                          </span>
                          <span className="sale-amount">
                            {sale.totalAmount.toLocaleString("hu-HU")} Ft
                          </span>
                        </div>
                      </div>
                      <div className="sale-actions">
                        <button
                          onClick={() => handleSaleEdit(sale)}
                          className="kassza-btn edit"
                        >
                          ✏️ Szerkesztés
                        </button>
                        <button
                          onClick={() => handleSaleDelete(sale)}
                          className="kassza-btn delete"
                        >
                          🗑️ Törlés
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showSaleForm && (
        <div className="kassza-modal">
          <div className="kassza-modal-content">
            <h3>{editingSale ? "Eladás Szerkesztése" : "Új Eladás"}</h3>
            <div className="kassza-modal-body">
              <form onSubmit={handleSaleSubmit}>
                <div className="form-group">
                  <label>Termék Típusa:</label>
                  <div className="product-type-buttons">
                    <button
                      type="button"
                      className={`product-type-btn ${saleData.itemType === "book" ? "active" : ""}`}
                      onClick={() => {
                        setSaleData({
                          ...saleData,
                          itemType: "book",
                          itemId: "",
                          itemName: "",
                          price: "",
                        });
                      }}
                    >
                      📚 Könyv
                    </button>
                    <button
                      type="button"
                      className={`product-type-btn ${saleData.itemType === "gift" ? "active" : ""}`}
                      onClick={() => {
                        setSaleData({
                          ...saleData,
                          itemType: "gift",
                          itemId: "",
                          itemName: "",
                          price: "",
                        });
                      }}
                    >
                      🎁 Ajándéktárgy
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    {saleData.itemType === "book"
                      ? "Könyv Kiválasztása:"
                      : "Ajándéktárgy Kiválasztása:"}
                  </label>
                  <div className="searchable-dropdown" ref={dropdownRef}>
                    <input
                      type="text"
                      className="searchable-input"
                      placeholder={`Keresés ${saleData.itemType === "book" ? "könyv" : "ajándéktárgy"} szerint...`}
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      onClick={() => setShowProductDropdown(true)}
                    />
                    {showProductDropdown && (
                      <div className="dropdown-options">
                        {saleData.itemType === "book"
                          ? books
                              .filter((book) => book.category === "Bolt")
                              .filter(
                                (book) =>
                                  book.title
                                    .toLowerCase()
                                    .includes(
                                      productSearchTerm.toLowerCase(),
                                    ) ||
                                  book.author
                                    .toLowerCase()
                                    .includes(productSearchTerm.toLowerCase()),
                              )
                              .map((book) => (
                                <div
                                  key={book.id}
                                  className="dropdown-option"
                                  onClick={() => {
                                    setSaleData({
                                      ...saleData,
                                      itemId: book.id,
                                      itemName: book.title,
                                      price: book.price || 0,
                                    });
                                    setProductSearchTerm(
                                      `${book.title} - ${book.author}`,
                                    );
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  <div className="option-title">
                                    {book.title}
                                  </div>
                                  <div className="option-subtitle">
                                    {book.author}
                                  </div>
                                  <div className="option-stock">
                                    Készlet: {book.quantity}
                                  </div>
                                </div>
                              ))
                          : gifts
                              .filter((gift) =>
                                gift.name
                                  .toLowerCase()
                                  .includes(productSearchTerm.toLowerCase()),
                              )
                              .map((gift) => (
                                <div
                                  key={gift.id}
                                  className="dropdown-option"
                                  onClick={() => {
                                    setSaleData({
                                      ...saleData,
                                      itemId: gift.id,
                                      itemName: gift.name,
                                      price: gift.price || 0,
                                    });
                                    setProductSearchTerm(gift.name);
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  <div className="option-title">
                                    {gift.name}
                                  </div>
                                  <div className="option-stock">
                                    Készlet: {gift.quantity}
                                  </div>
                                </div>
                              ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Termék Neve:</label>
                  <input
                    type="text"
                    value={saleData.itemName}
                    onChange={(e) =>
                      setSaleData({ ...saleData, itemName: e.target.value })
                    }
                    placeholder="Termék neve"
                    readOnly
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mennyiség:</label>
                  <input
                    type="number"
                    value={saleData.quantity}
                    onChange={(e) =>
                      setSaleData({ ...saleData, quantity: e.target.value })
                    }
                    placeholder="Add meg az eladott mennyiséget"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Eladási Ár (Ft):</label>
                  <input
                    type="number"
                    value={saleData.price}
                    onChange={(e) =>
                      setSaleData({ ...saleData, price: e.target.value })
                    }
                    placeholder="Add meg az eladási árat"
                    min="0"
                    step="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fizetési Mód:</label>
                  <select
                    value={saleData.paymentMethod}
                    onChange={(e) =>
                      setSaleData({
                        ...saleData,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="kassza-select"
                  >
                    <option value="cash">Készpénz</option>
                    <option value="card">Bankkártya</option>
                    <option value="transfer">Átutalás</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="kassza-modal-footer">
              <button
                type="submit"
                onClick={handleSaleSubmit}
                className="kassza-btn primary"
              >
                {editingSale ? "Eladás Frissítése" : "Eladás Mentése"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaleForm(false);
                  setEditingSale(null);
                  setSaleData({
                    itemType: "book",
                    itemId: "",
                    itemName: "",
                    quantity: "",
                    price: "",
                    paymentMethod: "cash",
                  });
                  setProductSearchTerm(""); // Clear the search input
                }}
                className="kassza-btn secondary"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="kassza-modal">
          <div className="kassza-modal-content delete-modal">
            <div className="delete-modal-header">
              <h3>Eladás Törlése</h3>
            </div>
            <div className="delete-modal-body">
              <div className="delete-warning-icon">⚠️</div>
              <p>Biztosan törölni szeretnéd ezt az eladást?</p>
              {saleToDelete && (
                <div className="sale-preview">
                  <h4>{saleToDelete.itemName}</h4>
                  <div className="sale-details-preview">
                    <span>Mennyiség: {saleToDelete.quantity} db</span>
                    <span>
                      Ár: {parseInt(saleToDelete.price).toLocaleString("hu-HU")}{" "}
                      Ft/db
                    </span>
                    <span>
                      Összesen:{" "}
                      {saleToDelete.totalAmount.toLocaleString("hu-HU")} Ft
                    </span>
                  </div>
                </div>
              )}
              <p className="delete-note">
                A készlet automatikusan helyreállításra kerül.
              </p>
            </div>
            <div className="delete-modal-footer">
              <button onClick={cancelDelete} className="kassza-btn secondary">
                Mégse
              </button>
              <button onClick={confirmDelete} className="kassza-btn delete">
                Igen, Törlés
              </button>
            </div>
          </div>
        </div>
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
            padding: "16px 20px",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
            fontWeight: "500",
            maxWidth: "400px",
            wordWrap: "break-word",
            animation: isToastExiting
              ? "slideOutRight 0.3s ease-in forwards"
              : "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 9999,
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

export default KasszaPanel;
