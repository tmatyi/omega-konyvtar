import { useState, useEffect } from "react";
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
    customerName: "",
    paymentMethod: "cash",
  });

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

  const handleSaleSubmit = (e) => {
    e.preventDefault();

    if (
      !saleData.itemId ||
      !saleData.itemName ||
      !saleData.quantity ||
      !saleData.price ||
      !saleData.customerName
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
        customerName: saleData.customerName,
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
        customerName: saleData.customerName,
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
      customerName: "",
      paymentMethod: "cash",
    });
    setShowSaleForm(false);
    setEditingSale(null);
  };

  const handleSaleEdit = (sale) => {
    setEditingSale(sale);
    setSaleData({
      itemType: sale.itemType || "book",
      itemId: sale.itemId || "",
      itemName: sale.itemName || "",
      quantity: sale.quantity || "",
      price: sale.price || "",
      customerName: sale.customerName || "",
      paymentMethod: sale.paymentMethod || "cash",
    });
    setShowSaleForm(true);
  };

  const handleSaleDelete = (sale) => {
    if (window.confirm("Biztosan törölni szeretnéd ezt az eladást?")) {
      // Restore stock first
      const itemRef = ref(
        database,
        `${sale.itemType === "book" ? "books" : "gifts"}/${sale.itemId}`,
      );
      const item =
        sale.itemType === "book"
          ? books.find((b) => b.id === sale.itemId)
          : gifts.find((g) => g.id === sale.itemId);

      if (item) {
        update(itemRef, {
          quantity: item.quantity + sale.quantity,
        });
      }

      // Then delete the sale
      const saleRef = ref(database, `sales/${sale.id}`);
      remove(saleRef);
    }
  };

  const filteredSales = sales.filter(
    (sale) =>
      sale.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="kassza-panel">
      <div className="kassza-header">
        <h2>Kassza</h2>
        <p>Értékesítési és bevételi nyilvántartás</p>
      </div>

      <div className="kassza-controls">
        <div className="kassza-section">
          <h3>Új Eladás</h3>
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
      </div>

      {showSaleForm && (
        <div className="kassza-modal">
          <div className="kassza-modal-content">
            <h3>{editingSale ? "Eladás Szerkesztése" : "Új Eladás"}</h3>
            <form onSubmit={handleSaleSubmit}>
              <div className="form-group">
                <label>Termék Típusa:</label>
                <select
                  value={saleData.itemType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSaleData({
                      ...saleData,
                      itemType: newType,
                      itemId: "",
                      itemName: "",
                      price: "",
                    });
                  }}
                  className="kassza-select"
                >
                  <option value="book">Könyv</option>
                  <option value="gift">Ajándéktárgy</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {saleData.itemType === "book"
                    ? "Könyv Kiválasztása:"
                    : "Ajándéktárgy Kiválasztása:"}
                </label>
                <select
                  value={saleData.itemId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedItem =
                      saleData.itemType === "book"
                        ? books.find((b) => b.id === selectedId)
                        : gifts.find((g) => g.id === selectedId);

                    if (selectedItem) {
                      setSaleData({
                        ...saleData,
                        itemId: selectedId,
                        itemName: selectedItem.name || selectedItem.title,
                        price: selectedItem.price || 0,
                      });
                    }
                  }}
                  className="kassza-select"
                  required
                >
                  <option value="">Válassz terméket...</option>
                  {saleData.itemType === "book"
                    ? books
                        .filter((book) => book.category === "Bolt")
                        .map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.title} - {book.author} (Készlet:{" "}
                            {book.quantity})
                          </option>
                        ))
                    : gifts.map((gift) => (
                        <option key={gift.id} value={gift.id}>
                          {gift.name} (Készlet: {gift.quantity})
                        </option>
                      ))}
                </select>
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
                <label>Vásárló Neve:</label>
                <input
                  type="text"
                  value={saleData.customerName}
                  onChange={(e) =>
                    setSaleData({ ...saleData, customerName: e.target.value })
                  }
                  placeholder="Add meg a vásárló nevét"
                  required
                />
              </div>

              <div className="form-group">
                <label>Fizetési Mód:</label>
                <select
                  value={saleData.paymentMethod}
                  onChange={(e) =>
                    setSaleData({ ...saleData, paymentMethod: e.target.value })
                  }
                  className="kassza-select"
                >
                  <option value="cash">Készpénz</option>
                  <option value="card">Bankkártya</option>
                  <option value="transfer">Átutalás</option>
                </select>
              </div>

              <div className="form-buttons">
                <button type="submit" className="kassza-btn primary">
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
                      customerName: "",
                      paymentMethod: "cash",
                    });
                  }}
                  className="kassza-btn secondary"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="kassza-content">
        <div className="kassza-section">
          <h3>Eladási Történet</h3>
          <div className="sales-summary">
            <div className="summary-card">
              <h4>Összes Bevétel</h4>
              <p className="summary-amount">
                {totalRevenue.toLocaleString("hu-HU")} Ft
              </p>
            </div>
            <div className="summary-card">
              <h4>Eladások Száma</h4>
              <p className="summary-count">{sales.length}</p>
            </div>
          </div>
        </div>

        <div className="kassza-section">
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
                      <p className="sale-customer">
                        Vásárló: {sale.customerName}
                      </p>
                      <p className="sale-type">
                        Típus:{" "}
                        {sale.itemType === "book" ? "Könyv" : "Ajándéktárgy"}
                      </p>
                    </div>
                    <div className="sale-details">
                      <p>
                        <strong>Mennyiség:</strong> {sale.quantity} db
                      </p>
                      <p>
                        <strong>Ár:</strong>{" "}
                        {parseInt(sale.price).toLocaleString("hu-HU")} Ft
                      </p>
                      <p>
                        <strong>Összesen:</strong>{" "}
                        {sale.totalAmount.toLocaleString("hu-HU")} Ft
                      </p>
                      <p>
                        <strong>Fizetés:</strong>{" "}
                        {sale.paymentMethod === "cash"
                          ? "Készpénz"
                          : sale.paymentMethod === "card"
                            ? "Bankkártya"
                            : "Átutalás"}
                      </p>
                      <p>
                        <strong>Dátum:</strong>{" "}
                        {new Date(sale.timestamp).toLocaleDateString("hu-HU")}
                      </p>
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
  );
};

export default KasszaPanel;
