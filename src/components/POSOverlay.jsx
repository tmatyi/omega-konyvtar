import React, { useState, useEffect, useRef } from "react";
import { database, dbRef, ref, update, push, set } from "../firebase.js";
import BarcodeScanner from "./BarcodeScanner.jsx";
import "./POSOverlay.css";

const POSOverlay = ({
  isOpen,
  onClose,
  books = [],
  gifts = [],
  sales = [],
  activeShift,
  user,
  onSaleComplete,
}) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const overlayRef = useRef(null);

  // Calculate top 12 most sold items
  const getTopItems = () => {
    const itemCounts = {};

    sales.forEach((sale) => {
      const key = `${sale.itemType}-${sale.itemId}`;
      if (!itemCounts[key]) {
        itemCounts[key] = {
          itemType: sale.itemType,
          itemId: sale.itemId,
          itemName: sale.itemName,
          count: 0,
          price: sale.price,
        };
      }
      itemCounts[key].count += sale.quantity;
    });

    const sortedItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Fill with popular books/gifts if less than 12
    const allItems = [
      ...books
        .filter((b) => b.category === "Bolt" && b.quantity > 0)
        .map((b) => ({
          itemType: "book",
          itemId: b.id,
          itemName: b.title,
          price: b.price,
          count: 0,
        })),
      ...gifts
        .filter((g) => g.quantity > 0)
        .map((g) => ({
          itemType: "gift",
          itemId: g.id,
          itemName: g.name,
          price: g.price,
          count: 0,
        })),
    ];

    while (sortedItems.length < 12 && allItems.length > 0) {
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      if (!sortedItems.find((item) => item.itemId === randomItem.itemId)) {
        sortedItems.push(randomItem);
      }
      allItems.splice(allItems.indexOf(randomItem), 1);
    }

    return sortedItems;
  };

  const topItems = getTopItems();

  // Search items (books + gifts)
  const searchResults = searchTerm.trim()
    ? [
        ...books
          .filter(
            (b) =>
              b.category === "Bolt" &&
              b.quantity > 0 &&
              (b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.isbn?.includes(searchTerm)),
          )
          .map((b) => ({
            ...b,
            itemType: "book",
            itemName: b.title,
            itemId: b.id,
          })),
        ...gifts
          .filter(
            (g) =>
              g.quantity > 0 &&
              g.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((g) => ({
            ...g,
            itemType: "gift",
            itemName: g.name,
            itemId: g.id,
          })),
      ].slice(0, 10)
    : [];

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(
      (c) => c.itemId === item.itemId && c.itemType === item.itemType,
    );

    if (existingItem) {
      setCart(
        cart.map((c) =>
          c.itemId === item.itemId && c.itemType === item.itemType
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
    setSearchTerm("");
  };

  // Update cart item quantity
  const updateQuantity = (itemId, itemType, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, itemType);
    } else {
      setCart(
        cart.map((c) =>
          c.itemId === itemId && c.itemType === itemType
            ? { ...c, quantity: newQuantity }
            : c,
        ),
      );
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId, itemType) => {
    setCart(
      cart.filter((c) => !(c.itemId === itemId && c.itemType === itemType)),
    );
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setShowCart(false);
    setShowPayment(false);
    setAmountReceived("");
  };

  // Calculate totals
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const changeDue = amountReceived ? parseFloat(amountReceived) - cartTotal : 0;

  // Handle barcode scan
  const handleBarcodeScan = (code) => {
    const book = books.find(
      (b) => b.isbn === code && b.category === "Bolt" && b.quantity > 0,
    );
    if (book) {
      addToCart({
        itemType: "book",
        itemId: book.id,
        itemName: book.title,
        price: book.price,
      });
      setShowScanner(false);
    } else {
      alert("Könyv nem található vagy nincs raktáron!");
    }
  };

  // Finalize sale
  const finalizeSale = async () => {
    if (!activeShift) {
      alert("Nincs nyitott műszak!");
      return;
    }

    if (cart.length === 0) {
      alert("A kosár üres!");
      return;
    }

    // Validate stock for all items
    for (const cartItem of cart) {
      const item =
        cartItem.itemType === "book"
          ? books.find((b) => b.id === cartItem.itemId)
          : gifts.find((g) => g.id === cartItem.itemId);

      if (!item || item.quantity < cartItem.quantity) {
        alert(`Nincs elég raktárkészlet: ${cartItem.itemName}`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Process each cart item
      for (const cartItem of cart) {
        // Create sale record
        const salesRef = dbRef(database, "sales");
        const newSaleRef = push(salesRef);

        const saleData = {
          itemType: cartItem.itemType,
          itemId: cartItem.itemId,
          itemName: cartItem.itemName,
          quantity: cartItem.quantity,
          price: cartItem.price,
          paymentMethod: "cash",
          timestamp: new Date().toISOString(),
          shiftId: activeShift.id,
          seller: user?.email || "ismeretlen",
          sellerName:
            user?.name || user?.displayName || user?.email || "ismeretlen",
          totalAmount: cartItem.price * cartItem.quantity,
        };

        await set(newSaleRef, saleData);

        // Update stock
        const item =
          cartItem.itemType === "book"
            ? books.find((b) => b.id === cartItem.itemId)
            : gifts.find((g) => g.id === cartItem.itemId);

        const itemRef = ref(
          database,
          `${cartItem.itemType === "book" ? "books" : "gifts"}/${cartItem.itemId}`,
        );
        await update(itemRef, {
          quantity: item.quantity - cartItem.quantity,
        });
      }

      // Success!
      if (onSaleComplete) {
        onSaleComplete();
      }

      // Reset and close
      clearCart();
      onClose();

      // Show success message
      setTimeout(() => {
        alert(
          `✅ Eladás sikeresen rögzítve!\nÖsszeg: ${cartTotal.toLocaleString("hu-HU")} Ft\nVisszajáró: ${changeDue.toLocaleString("hu-HU")} Ft`,
        );
      }, 300);
    } catch (error) {
      console.error("Error finalizing sale:", error);
      alert("Hiba történt az eladás rögzítése során!");
    } finally {
      setIsProcessing(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={`pos-overlay ${isOpen ? "pos-overlay-open" : ""}`}>
        <div className="pos-container" ref={overlayRef}>
          {/* Header */}
          <div className="pos-header">
            <button className="pos-close-btn" onClick={onClose}>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2>Gyors Eladás</h2>
            <div className="pos-shift-indicator">
              {activeShift ? "🟢 Nyitva" : "🔴 Zárva"}
            </div>
          </div>

          {/* Search Bar */}
          <div className="pos-search-section">
            <div className="pos-search-bar">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Keresés könyvek és ajándékok között..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="pos-clear-search"
                  onClick={() => setSearchTerm("")}
                >
                  ×
                </button>
              )}
            </div>
            <button
              className="pos-scan-btn"
              onClick={() => setShowScanner(true)}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v3h-3v2h5v-5zm-2 7h2v2h-2v-2zm2-10h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
              </svg>
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="pos-search-results">
              {searchResults.map((item) => (
                <div
                  key={`${item.itemType}-${item.itemId}`}
                  className="pos-search-result-item"
                  onClick={() => addToCart(item)}
                >
                  <div className="pos-result-info">
                    <div className="pos-result-name">{item.itemName}</div>
                    <div className="pos-result-meta">
                      {item.itemType === "book"
                        ? `📚 ${item.author || ""}`
                        : "🎁 Ajándék"}
                      {" • "}
                      Raktár: {item.quantity} db
                    </div>
                  </div>
                  <div className="pos-result-price">
                    {item.price?.toLocaleString("hu-HU")} Ft
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Buttons Grid */}
          {!searchTerm && (
            <div className="pos-quick-section">
              <h3>Gyakori Termékek</h3>
              <div className="pos-quick-grid">
                {topItems.map((item, index) => {
                  const fullItem =
                    item.itemType === "book"
                      ? books.find((b) => b.id === item.itemId)
                      : gifts.find((g) => g.id === item.itemId);

                  if (!fullItem || fullItem.quantity === 0) return null;

                  const imageUrl =
                    item.itemType === "book"
                      ? fullItem.thumbnail
                      : fullItem.image;

                  return (
                    <button
                      key={`${item.itemType}-${item.itemId}`}
                      className="pos-quick-btn"
                      onClick={() =>
                        addToCart({ ...item, price: fullItem.price })
                      }
                    >
                      <div className="pos-quick-thumbnail">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.itemName}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="pos-quick-icon-fallback"
                          style={{ display: imageUrl ? "none" : "flex" }}
                        >
                          {item.itemType === "book" ? "📚" : "🎁"}
                        </div>
                      </div>
                      <div className="pos-quick-name">{item.itemName}</div>
                      <div className="pos-quick-price">
                        {fullItem.price?.toLocaleString("hu-HU")} Ft
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Cart Indicator */}
          {cart.length > 0 && (
            <button
              className="pos-cart-float"
              onClick={() => setShowCart(true)}
            >
              <div className="pos-cart-icon">
                🛒
                {cartItemCount > 0 && (
                  <span className="pos-cart-badge">{cartItemCount}</span>
                )}
              </div>
              <div className="pos-cart-total">
                {cartTotal.toLocaleString("hu-HU")} Ft
              </div>
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Cart Bottom Sheet */}
      {showCart && (
        <div
          className="pos-bottom-sheet-overlay"
          onClick={() => setShowCart(false)}
        >
          <div
            className="pos-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-sheet-handle" />

            <div className="pos-sheet-header">
              <h3>Kosár ({cartItemCount} termék)</h3>
              <button className="pos-clear-btn" onClick={clearCart}>
                Kosár Ürítése
              </button>
            </div>

            <div className="pos-cart-items">
              {cart.map((item) => (
                <div
                  key={`${item.itemType}-${item.itemId}`}
                  className="pos-cart-item"
                >
                  <div className="pos-cart-item-info">
                    <div className="pos-cart-item-name">{item.itemName}</div>
                    <div className="pos-cart-item-price">
                      {item.price.toLocaleString("hu-HU")} Ft × {item.quantity}
                    </div>
                  </div>
                  <div className="pos-cart-item-controls">
                    <button
                      className="pos-qty-btn"
                      onClick={() =>
                        updateQuantity(
                          item.itemId,
                          item.itemType,
                          item.quantity - 1,
                        )
                      }
                    >
                      −
                    </button>
                    <span className="pos-qty-display">{item.quantity}</span>
                    <button
                      className="pos-qty-btn"
                      onClick={() =>
                        updateQuantity(
                          item.itemId,
                          item.itemType,
                          item.quantity + 1,
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      className="pos-remove-btn"
                      onClick={() => removeFromCart(item.itemId, item.itemType)}
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="pos-cart-item-total">
                    {(item.price * item.quantity).toLocaleString("hu-HU")} Ft
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Section */}
            <div className="pos-payment-section">
              <div className="pos-total-row">
                <span>Végösszeg:</span>
                <span className="pos-total-amount">
                  {cartTotal.toLocaleString("hu-HU")} Ft
                </span>
              </div>

              {!showPayment ? (
                <button
                  className="pos-payment-btn"
                  onClick={() => setShowPayment(true)}
                >
                  Fizetés
                </button>
              ) : (
                <div className="pos-payment-form">
                  <div className="pos-payment-input-group">
                    <label>Kapott összeg (Ft):</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>

                  {amountReceived && (
                    <div className="pos-change-display">
                      <span>Visszajáró:</span>
                      <span
                        className={
                          changeDue >= 0
                            ? "pos-change-positive"
                            : "pos-change-negative"
                        }
                      >
                        {changeDue.toLocaleString("hu-HU")} Ft
                      </span>
                    </div>
                  )}

                  <button
                    className="pos-finalize-btn"
                    onClick={finalizeSale}
                    disabled={isProcessing || !amountReceived || changeDue < 0}
                  >
                    {isProcessing ? "Feldolgozás..." : "✓ ELADÁS RÖGZÍTÉSE"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
};

export default POSOverlay;
