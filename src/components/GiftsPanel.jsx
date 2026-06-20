import React, { useState, useRef } from "react";
import { Plus, Gift, Pencil, Trash2, Save, X } from "lucide-react";
import {
  addGiftToDb,
  updateGiftInDb,
  deleteGiftFromDb,
} from "../services/firebaseService.js";
import { database, dbRef, ref, push, set, uploadImageToStorage } from "../firebase.js";
import "./BooksTable.css";

function GiftsPanel({ user, gifts }) {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [giftQuantity, setGiftQuantity] = useState("");
  const [giftPrice, setGiftPrice] = useState("");
  const [giftPurchasePrice, setGiftPurchasePrice] = useState("");
  const [deductFromCashier, setDeductFromCashier] = useState(false);
  const [giftImage, setGiftImage] = useState("");
  const giftImageBlobRef = useRef(null); // Holds the processed Blob for Storage upload
  const [giftBarcode, setGiftBarcode] = useState("");
  const [giftToDelete, setGiftToDelete] = useState(null);
  const [showDeleteGiftConfirm, setShowDeleteGiftConfirm] = useState(false);
  const [showEditGiftForm, setShowEditGiftForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [popupImage, setPopupImage] = useState(null);
  const [expandedGiftId, setExpandedGiftId] = useState(null);
  const [giftSortBy, setGiftSortBy] = useState("name");

  // Sort gifts
  const sortedGifts = [...gifts].sort((a, b) => {
    const field = giftSortBy.replace("-desc", "");
    const desc = giftSortBy.endsWith("-desc");
    let valA, valB;
    if (field === "name") {
      valA = a.name || "";
      valB = b.name || "";
      // Use Hungarian locale-aware sorting for proper ABC order
      const comparison = valA.localeCompare(valB, "hu", {
        sensitivity: "base",
      });
      return desc ? -comparison : comparison;
    } else if (field === "price") {
      valA = a.price || 0;
      valB = b.price || 0;
      const comparison = valA - valB;
      return desc ? -comparison : comparison;
    } else if (field === "createdAt") {
      valA = a.createdAt || "";
      valB = b.createdAt || "";
      const comparison = new Date(valA) - new Date(valB);
      return desc ? -comparison : comparison;
    } else {
      valA = a.name || "";
      valB = b.name || "";
      const comparison = valA.localeCompare(valB, "hu", {
        sensitivity: "base",
      });
      return desc ? -comparison : comparison;
    }
  });

  // Delete gift function
  const deleteGift = (giftId) => {
    deleteGiftFromDb(giftId);
    setShowDeleteGiftConfirm(false);
    setGiftToDelete(null);
  };

  // Update gift function
  const updateGift = (giftId, updatedData) => {
    updateGiftInDb(giftId, updatedData);
    setShowEditGiftForm(false);
    setEditingGift(null);
  };

  // Handle gift image click for popup
  const handleGiftImageClick = (gift) => {
    if (gift.image) {
      setPopupImage(gift.image);
      setShowImagePopup(true);
    }
  };

  // Close image popup
  const closeImagePopup = () => {
    setShowImagePopup(false);
    setPopupImage(null);
  };

  return (
    <>
      <div className="gifts-panel custom-scrollbar">
        <div className="panel-header">
          <h2><Gift size={20} style={{verticalAlign: "middle", marginRight: 6}} /> Ajándéktárgyak</h2>
        </div>
        <div className="panel-controls">
          <div className="controls-left">
            <div className="book-stats">
              {user?.role === "admin" && (
                <span className="total-books">
                  Raktáron: {gifts.length} ajándéktárgy
                </span>
              )}
            </div>
          </div>
          <div className="controls-right">
            <select
              value={giftSortBy}
              onChange={(e) => setGiftSortBy(e.target.value)}
              className="filter-select"
              style={{ minWidth: "140px" }}
            >
              <option value="name">Név (A-Z)</option>
              <option value="name-desc">Név (Z-A)</option>
              <option value="price">Ár (növekvő)</option>
              <option value="price-desc">Ár (csökkenő)</option>
              <option value="createdAt-desc">Legújabb</option>
              <option value="createdAt">Legrégebbi</option>
            </select>
            <button
              className="filter-toggle-btn"
              onClick={() => setShowAddGiftForm(true)}
            >
              <Plus size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Új Ajándéktárgy
            </button>
          </div>
        </div>
        <main className={`App-main gifts-padding`}>
          <div className="content-wrapper">
            <div className="inventory-table">
              {/* Desktop: original table */}
              <div className="table-container gifts-table-desktop">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Kép</th>
                      <th>Név</th>
                      <th>Vonalkód</th>
                      {user?.role === "admin" && <th>Mennyiség</th>}
                      <th>Beszerzési ár</th>
                      <th>Eladási ár</th>
                      <th>Státusz</th>
                      {user?.role === "admin" && <th>Műveletek</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGifts.map((gift) => {
                      const isAtRecommendedStock =
                        gift.recommendedStock &&
                        gift.quantity === gift.recommendedStock;
                      const isBelowRecommendedStock =
                        gift.recommendedStock &&
                        gift.quantity < gift.recommendedStock;
                      const statusClass = isBelowRecommendedStock
                        ? "critical-stock"
                        : isAtRecommendedStock
                          ? "warning-stock"
                          : "in-stock";
                      const statusText = isBelowRecommendedStock
                        ? "Töltés szükséges"
                        : isAtRecommendedStock
                          ? "Fogyóban"
                          : "Készleten";
                      const quantityClass = isBelowRecommendedStock
                        ? "quantity-critical"
                        : isAtRecommendedStock
                          ? "quantity-warning"
                          : "quantity-good";

                      return (
                        <tr key={gift.id} className="inventory-item">
                          <td>
                            <div
                              className="item-image"
                              onClick={() =>
                                gift.image &&
                                gift.image !== "" &&
                                handleGiftImageClick(gift)
                              }
                              style={{
                                cursor:
                                  gift.image && gift.image !== ""
                                    ? "pointer"
                                    : "default",
                              }}
                            >
                              {gift.image &&
                              (gift.image.startsWith("data:image/") ||
                                gift.image.startsWith("blob:")) ? (
                                <img
                                  src={gift.image}
                                  alt={gift.name}
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                  }}
                                />
                              ) : gift.image &&
                                gift.image.startsWith("http") ? (
                                <img
                                  src={gift.image}
                                  alt={gift.name}
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                  }}
                                />
                              ) : (
                                <span className="placeholder-icon">
                                  {gift.image || <Gift size={24} />}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{gift.name}</td>
                          <td
                            style={{
                              fontFamily: '"SF Mono", "Menlo", monospace',
                              fontSize: "12px",
                              color: "#6b7280",
                            }}
                          >
                            {gift.barcode || "—"}
                          </td>
                          {user?.role === "admin" && (
                            <td>
                              <span className={`quantity ${quantityClass}`}>
                                {gift.quantity}
                              </span>
                            </td>
                          )}
                          <td>{gift.purchasePrice || 0} Ft</td>
                          <td>{gift.price} Ft</td>
                          <td>
                            <span className={`status ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                          {user?.role === "admin" && (
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-btn"
                                  onClick={() => {
                                    setEditingGift(gift);
                                    setShowEditGiftForm(true);
                                  }}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => {
                                    setGiftToDelete(gift);
                                    setShowDeleteGiftConfirm(true);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: expandable compact rows */}
              <div className="compact-rows-container gifts-rows-mobile">
                {sortedGifts.map((gift) => {
                  const isExpanded = expandedGiftId === gift.id;
                  const isAtRecommendedStock =
                    gift.recommendedStock &&
                    gift.quantity === gift.recommendedStock;
                  const isBelowRecommendedStock =
                    gift.recommendedStock &&
                    gift.quantity < gift.recommendedStock;
                  const statusClass = isBelowRecommendedStock
                    ? "critical-stock"
                    : isAtRecommendedStock
                      ? "warning-stock"
                      : "in-stock";
                  const statusText = isBelowRecommendedStock
                    ? "Töltés szükséges"
                    : isAtRecommendedStock
                      ? "Fogyóban"
                      : "Készleten";

                  const giftThumb =
                    gift.image &&
                    (gift.image.startsWith("data:image/") ||
                      gift.image.startsWith("blob:") ||
                      gift.image.startsWith("http"));

                  return (
                    <div
                      key={gift.id}
                      className={`compact-row ${isExpanded ? "compact-row--expanded" : ""}`}
                    >
                      <div
                        className="compact-row__summary"
                        onClick={() =>
                          setExpandedGiftId((prev) =>
                            prev === gift.id ? null : gift.id,
                          )
                        }
                      >
                        <div className="compact-row__thumb">
                          {giftThumb ? (
                            <img src={gift.image} alt={gift.name} />
                          ) : (
                            <span className="compact-row__thumb-placeholder">
                              {gift.image || <Gift size={20} />}
                            </span>
                          )}
                        </div>
                        <div className="compact-row__info">
                          <span className="compact-row__title">
                            {gift.name}
                          </span>
                          <span className="compact-row__subtitle">
                            {gift.price} Ft
                          </span>
                        </div>
                        <div className="compact-row__end">
                          <span
                            className={`compact-row__badge ${statusClass === "in-stock" ? "in-stock" : "out-of-stock"}`}
                          >
                            {gift.quantity} db
                          </span>
                          <svg
                            className={`compact-row__chevron ${isExpanded ? "compact-row__chevron--open" : ""}`}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                      <div className="compact-row__details">
                        <div className="compact-row__details-inner">
                          <div className="compact-row__detail-grid">
                            <div className="compact-row__detail-item">
                              <span className="compact-row__detail-label">
                                Státusz
                              </span>
                              <span className={`status ${statusClass}`}>
                                {statusText}
                              </span>
                            </div>
                            <div className="compact-row__detail-item">
                              <span className="compact-row__detail-label">
                                Eladási ár
                              </span>
                              <span>{gift.price} Ft</span>
                            </div>
                            <div className="compact-row__detail-item">
                              <span className="compact-row__detail-label">
                                Beszerzési ár
                              </span>
                              <span>{gift.purchasePrice || 0} Ft</span>
                            </div>
                            {gift.barcode && (
                              <div className="compact-row__detail-item">
                                <span className="compact-row__detail-label">
                                  Vonalkód
                                </span>
                                <span
                                  style={{
                                    fontFamily: '"SF Mono", "Menlo", monospace',
                                    fontSize: "12px",
                                  }}
                                >
                                  {gift.barcode}
                                </span>
                              </div>
                            )}
                          </div>
                          {user?.role === "admin" && (
                            <div className="compact-row__actions">
                              <button
                                className="compact-row__action-btn compact-row__action-btn--primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGift(gift);
                                  setShowEditGiftForm(true);
                                }}
                              >
                                Szerkesztés
                              </button>
                              <button
                                className="compact-row__action-btn compact-row__action-btn--danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGiftToDelete(gift);
                                  setShowDeleteGiftConfirm(true);
                                }}
                              >
                                Törlés
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Gift Modal */}
      {showAddGiftForm && (
        <>
          <div
            className="gift-modal-backdrop"
            onClick={() => setShowAddGiftForm(false)}
          ></div>

          <div
            className="gift-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 30px 0",
                color: "#2c3e50",
                fontSize: "28px",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Új Ajándéktárgy
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Kép
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file size (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        alert("A képfájl mérete nem haladhatja meg az 5MB-ot!");
                        return;
                      }
                      // Process image: resize to max 800x800, convert to JPEG
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          let { width, height } = img;
                          const maxSize = 800;
                          if (width > maxSize || height > maxSize) {
                            if (width > height) {
                              height = (height * maxSize) / width;
                              width = maxSize;
                            } else {
                              width = (width * maxSize) / height;
                              height = maxSize;
                            }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          ctx.drawImage(img, 0, 0, width, height);
                          canvas.toBlob(
                            (blob) => {
                              if (blob) {
                                giftImageBlobRef.current = blob;
                                setGiftImage(URL.createObjectURL(blob));
                              }
                            },
                            "image/jpeg",
                            0.8,
                          );
                        };
                        img.src = ev.target.result;
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Név
                </label>
                <input
                  type="text"
                  value={giftName}
                  onChange={(e) => setGiftName(e.target.value)}
                  placeholder="Add meg az ajándéktárgy nevét"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Mennyiség
                </label>
                <input
                  type="number"
                  value={giftQuantity}
                  onChange={(e) => setGiftQuantity(e.target.value)}
                  placeholder="Add meg a mennyiséget"
                  min="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Beszerzési ár
                </label>
                <input
                  type="number"
                  value={giftPurchasePrice}
                  onChange={(e) => setGiftPurchasePrice(e.target.value)}
                  placeholder="Add meg a beszerzési árat (Ft)"
                  min="0"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Eladási ár
                </label>
                <input
                  type="number"
                  value={giftPrice}
                  onChange={(e) => setGiftPrice(e.target.value)}
                  placeholder="Add meg az eladási árat (Ft)"
                  min="0"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Vonalkód
                </label>
                <input
                  type="text"
                  value={giftBarcode}
                  onChange={(e) => setGiftBarcode(e.target.value)}
                  placeholder="Add meg a vonalkódot (opcionális)"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  background: deductFromCashier ? "#ecfdf5" : "#f8fafc",
                  borderRadius: "8px",
                  border: `1px solid ${deductFromCashier ? "#86efac" : "#e9ecef"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginBottom: "15px",
                }}
                onClick={() => setDeductFromCashier(!deductFromCashier)}
              >
                <div
                  style={{
                    width: "40px",
                    height: "22px",
                    borderRadius: "11px",
                    background: deductFromCashier ? "#059669" : "#d1d5db",
                    position: "relative",
                    transition: "background 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: "2px",
                      left: deductFromCashier ? "20px" : "2px",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  Levonjuk a kasszából?
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={async () => {
                  // Add gift to Firebase
                  if (giftName && giftQuantity && giftPrice) {
                    // Upload image to Storage if we have a new blob
                    let imageUrl = giftImage || "";
                    if (giftImageBlobRef.current) {
                      try {
                        const fileName = `gifts/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                        imageUrl = await uploadImageToStorage(giftImageBlobRef.current, fileName);
                        // Revoke the preview object URL and use the permanent one
                        URL.revokeObjectURL(giftImage);
                        setGiftImage(imageUrl);
                      } catch (err) {
                        console.error("Failed to upload gift image:", err);
                        alert("Hiba történt a kép feltöltése során!");
                        return;
                      }
                    }

                    const newGift = {
                      name: giftName,
                      quantity: parseInt(giftQuantity),
                      price: parseFloat(giftPrice),
                      purchasePrice: parseFloat(giftPurchasePrice) || 0,
                      barcode: giftBarcode || "",
                      image: imageUrl,
                      status: "Raktáron",
                      createdAt: new Date().toISOString(),
                      addedBy: user?.email || "unknown",
                    };

                    addGiftToDb(newGift);

                    // If deduct from cashier is enabled, create an expense record
                    if (deductFromCashier && giftPurchasePrice) {
                      const totalCost =
                        parseFloat(giftPurchasePrice) * parseInt(giftQuantity);
                      const extraRef = dbRef(database, "extraTransactions");
                      const newRef = push(extraRef);
                      set(newRef, {
                        description: `Ajándéktárgy beszerzés: ${giftName} (${giftQuantity} db)`,
                        amount: totalCost,
                        type: "expense",
                        timestamp: new Date().toISOString(),
                        recordedBy: user?.email || "ismeretlen",
                        sellerName:
                          user?.name ||
                          user?.displayName ||
                          user?.email ||
                          "ismeretlen",
                      });
                    }

                    // Reset form
                    setShowAddGiftForm(false);
                    setGiftName("");
                    setGiftQuantity("");
                    setGiftPrice("");
                    setGiftPurchasePrice("");
                    setGiftBarcode("");
                    if (giftImage && giftImage.startsWith("blob:")) {
                      URL.revokeObjectURL(giftImage);
                    }
                    setGiftImage("");
                    giftImageBlobRef.current = null;
                    setDeductFromCashier(false);
                  }
                }}
                disabled={!giftName || !giftQuantity || !giftPrice}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor:
                    !giftName || !giftQuantity || !giftPrice
                      ? "#94a3b8"
                      : "#3741A8",
                  color: "white",
                  cursor:
                    !giftName || !giftQuantity || !giftPrice
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (giftName && giftQuantity && giftPrice) {
                    e.target.style.backgroundColor = "#424EB5";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (giftName && giftQuantity && giftPrice) {
                    e.target.style.backgroundColor = "#3741A8";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                <Save size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Ajándéktárgy Hozzáadása
              </button>
              <button
                onClick={() => {
                  setShowAddGiftForm(false);
                  setGiftName("");
                  setGiftQuantity("");
                  setGiftPrice("");
                  setGiftPurchasePrice("");
                  setGiftBarcode("");
                  if (giftImage && giftImage.startsWith("blob:")) {
                    URL.revokeObjectURL(giftImage);
                  }
                  setGiftImage("");
                  giftImageBlobRef.current = null;
                }}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e2e8f0";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f1f5f9";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <X size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Mégse
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Gift Confirmation Modal */}
      {showDeleteGiftConfirm && (
        <>
          <div
            className="gift-modal-backdrop"
            onClick={() => setShowDeleteGiftConfirm(false)}
          ></div>

          <div
            className="gift-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                color: "#2c3e50",
                fontSize: "24px",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Ajándéktárgy Törlése
            </h2>

            <p
              style={{
                margin: "0 0 30px 0",
                color: "#64748b",
                fontSize: "16px",
                textAlign: "center",
                lineHeight: "1.5",
              }}
            >
              Biztosan törölni szeretnéd ezt az ajándéktárgyat?
              <br />
              <strong>{giftToDelete?.name}</strong>
            </p>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => deleteGift(giftToDelete?.id)}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#dc2626",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#b91c1c";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#dc2626";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <Trash2 size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Törlés
              </button>
              <button
                onClick={() => {
                  setShowDeleteGiftConfirm(false);
                  setGiftToDelete(null);
                }}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e2e8f0";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f1f5f9";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <X size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Mégse
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Gift Modal */}
      {showEditGiftForm && editingGift && (
        <>
          <div
            className="gift-modal-backdrop"
            onClick={() => setShowEditGiftForm(false)}
          ></div>

          <div
            className="gift-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 30px 0",
                color: "#2c3e50",
                fontSize: "28px",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Ajándéktárgy Szerkesztése
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Név
                </label>
                <input
                  type="text"
                  defaultValue={editingGift.name}
                  id="edit-gift-name"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Mennyiség
                </label>
                <input
                  type="number"
                  defaultValue={editingGift.quantity}
                  id="edit-gift-quantity"
                  min="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Beszerzési ár
                </label>
                <input
                  type="number"
                  defaultValue={editingGift.purchasePrice || 0}
                  id="edit-gift-purchase-price"
                  min="0"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Eladási ár
                </label>
                <input
                  type="number"
                  defaultValue={editingGift.price}
                  id="edit-gift-price"
                  min="0"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Ajánlott készlet
                </label>
                <input
                  type="number"
                  defaultValue={editingGift.recommendedStock || ""}
                  id="edit-gift-recommended-stock"
                  min="1"
                  placeholder="Ajánlott készlet mennyisége"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Vonalkód
                </label>
                <input
                  type="text"
                  defaultValue={editingGift.barcode || ""}
                  id="edit-gift-barcode"
                  placeholder="Vonalkód (opcionális)"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontFamily: '"Source Sans Pro", sans-serif',
                    backgroundColor: "#f8fafc",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3741A8";
                    e.target.style.backgroundColor = "#fff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(55, 65, 168, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef";
                    e.target.style.backgroundColor = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => {
                  const name = document.getElementById("edit-gift-name").value;
                  const quantity =
                    document.getElementById("edit-gift-quantity").value;
                  const purchasePrice = document.getElementById(
                    "edit-gift-purchase-price",
                  ).value;
                  const price =
                    document.getElementById("edit-gift-price").value;
                  const recommendedStock = document.getElementById(
                    "edit-gift-recommended-stock",
                  ).value;
                  const barcode =
                    document.getElementById("edit-gift-barcode").value;

                  if (name && quantity && price) {
                    updateGift(editingGift.id, {
                      name,
                      quantity: parseInt(quantity),
                      purchasePrice: parseFloat(purchasePrice) || 0,
                      price: parseFloat(price),
                      barcode: barcode || "",
                      recommendedStock: recommendedStock
                        ? parseInt(recommendedStock)
                        : null,
                    });
                  }
                }}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#3741A8",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#424EB5";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#3741A8";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <Save size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Változtatások Mentése
              </button>
              <button
                onClick={() => {
                  setShowEditGiftForm(false);
                  setEditingGift(null);
                }}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e2e8f0";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f1f5f9";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <X size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Mégse
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gift Image Popup Modal */}
      {showImagePopup && popupImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={closeImagePopup}
        >
          <div
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={popupImage}
              alt="Gift Image"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            />
            <button
              onClick={closeImagePopup}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default GiftsPanel;
