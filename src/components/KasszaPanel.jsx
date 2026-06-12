import { useState, useEffect, useRef, useCallback } from "react";
import {
  database,
  dbRef,
  remove,
  update,
  push,
  set,
} from "../firebase.js";
import useToast from "../hooks/useToast";
import { ClipboardList, CircleCheck, CircleX, CircleDollarSign, Check, X, Lock, LockOpen, Trash2, Pencil, BookOpen, Gift, AlertTriangle, Banknote, CreditCard, Landmark } from "lucide-react";

import BarcodeScanner from "./BarcodeScanner.jsx";
import POSOverlay from "./POSOverlay.jsx";
import "./BarcodeScanner.css";

const fmt = (val) => {
  const n = Math.round(Number(val || 0));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const KasszaPanel = ({ user, users = [], books = [], gifts = [], sales = [], shifts = [], extraTransactions = [] }) => {
  const {
    showToast,
    toastMessage,
    toastType,
    isToastExiting,
    showToastNotification,
  } = useToast();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showPOSOverlay, setShowPOSOverlay] = useState(false);

  // Extra transactions state
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraData, setExtraData] = useState({
    description: "",
    amount: "",
    type: "income", // "income" or "expense"
  });

  // Shift Management state
  const activeShift = shifts.find((s) => s.status === "open") || null;
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openShiftData, setOpenShiftData] = useState({
    openingBalance: "",
    staffOnDuty: [],
  });
  const [closeShiftData, setCloseShiftData] = useState({
    actualBalance: "",
  });
  const [closingSummary, setClosingSummary] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [copiedSummary, setCopiedSummary] = useState(false);

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
          message: `(Könyv) ${matchedBook.title} (${matchedBook.author})`,
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
          message: `(Ajándék) ${matchedGift.name}`,
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
      const itemRef = dbRef(
        database,
        `${saleData.itemType === "book" ? "books" : "gifts"}/${saleData.itemId}`,
      );
      update(itemRef, {
        quantity: item.quantity - quantityDifference,
      });

      // Update the sale record
      const saleRef = dbRef(database, `sales/${editingSale.id}`);
      update(saleRef, {
        itemType: saleData.itemType,
        itemId: saleData.itemId,
        itemName: saleData.itemName,
        quantity: parseInt(saleData.quantity),
        price: parseFloat(saleData.price),
        paymentMethod: saleData.paymentMethod || "cash",
        timestamp: editingSale.timestamp, // Keep original timestamp
        seller: user?.email || "ismeretlen",
        sellerName:
          user?.name || user?.displayName || user?.email || "ismeretlen",
        totalAmount: parseFloat(saleData.price) * parseInt(saleData.quantity),
      });
    } else {
      // New sale - check stock availability
      if (item.quantity < parseInt(saleData.quantity)) {
        alert("Nincs elég raktárkészlet a kiválasztott mennyiséghez!");
        return;
      }

      // Create new sale record
      const salesRef = dbRef(database, "sales");
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
        sellerName:
          user?.name || user?.displayName || user?.email || "ismeretlen",
        totalAmount: parseFloat(saleData.price) * parseInt(saleData.quantity),
      };

      set(newSaleRef, saleDataToSave);

      // Decrease stock
      const itemRef = dbRef(
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
      const itemRef = dbRef(
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
      const saleRef = dbRef(database, `sales/${saleToDelete.id}`);
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

  // Extra Transaction handler
  const handleExtraSubmit = () => {
    if (!extraData.description || !extraData.amount) {
      alert("Kérjük, töltse ki az összes mezőt!");
      return;
    }
    if (!activeShift) {
      showToastNotification("Először nyissa ki a kasszát!", "error");
      return;
    }
    const extraRef = dbRef(database, "extraTransactions");
    const newRef = push(extraRef);
    set(newRef, {
      description: extraData.description,
      amount: parseFloat(extraData.amount),
      type: extraData.type,
      timestamp: new Date().toISOString(),
      shiftId: activeShift.id,
      recordedBy: user?.email || "ismeretlen",
      sellerName:
        user?.name || user?.displayName || user?.email || "ismeretlen",
    });
    setExtraData({ description: "", amount: "", type: "income" });
    setShowExtraForm(false);
    showToastNotification(
      `${extraData.type === "income" ? "Bevétel" : "Kiadás"} rögzítve: ${extraData.description}`,
      "success",
    );
  };

  // --- Shift Management Handlers ---

  const handleOpenShift = () => {
    if (
      !openShiftData.openingBalance ||
      openShiftData.staffOnDuty.length === 0
    ) {
      alert(
        "Kérjük, adja meg a nyitó egyenleget és válassza ki a személyzetet!",
      );
      return;
    }

    const shiftsRef = dbRef(database, "shifts");
    const newShiftRef = push(shiftsRef);
    set(newShiftRef, {
      status: "open",
      date: new Date().toISOString().slice(0, 10),
      openedAt: new Date().toISOString(),
      openingBalance: parseFloat(openShiftData.openingBalance),
      staffOnDuty: openShiftData.staffOnDuty,
      openedBy: user?.email || "ismeretlen",
      openedByName:
        user?.name || user?.displayName || user?.email || "ismeretlen",
    });

    setOpenShiftData({ openingBalance: "", staffOnDuty: [] });
    setShowOpenShiftModal(false);
    showToastNotification("Kassza sikeresen megnyitva!", "success");
  };

  const handleCloseShift = () => {
    if (!closeShiftData.actualBalance) {
      alert("Kérjük, adja meg a tényleges záró egyenleget!");
      return;
    }
    if (!activeShift) return;

    const actualBalance = parseFloat(closeShiftData.actualBalance);
    const expectedBalance = shiftExpectedBalance;
    const discrepancy = actualBalance - expectedBalance;

    const shiftRef = dbRef(database, `shifts/${activeShift.id}`);
    update(shiftRef, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: user?.email || "ismeretlen",
      closedByName:
        user?.name || user?.displayName || user?.email || "ismeretlen",
      salesTotal: shiftSalesTotal,
      cashTotal: shiftCashTotal,
      cardTotal: shiftCardTotal,
      transferTotal: shiftTransferTotal,
      extraIncome: shiftExtraIncome,
      extraExpense: shiftExtraExpense,
      expectedBalance,
      actualBalance,
      discrepancy,
    });

    // Generate summary text
    const staffNames = activeShift.staffOnDuty?.join(", ") || "N/A";
    const dateStr = new Date().toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const extraNetText =
      shiftExtraIncome - shiftExtraExpense >= 0
        ? `+${fmt(shiftExtraIncome - shiftExtraExpense)} Ft`
        : `${fmt(shiftExtraIncome - shiftExtraExpense)} Ft`;

    // Build extra details
    const shiftExtrasForSummary = extraTransactions.filter(
      (t) => t.shiftId === activeShift.id,
    );
    let extraLines = "";
    shiftExtrasForSummary.forEach((t) => {
      extraLines += `  ${t.type === "income" ? "+" : "-"}${fmt(t.amount)} Ft (${t.description})\n`;
    });

    const netChange = actualBalance - Number(activeShift.openingBalance || 0);

    const summary = `--- OMEGA KÖNYVTÁR NAPI ZÁRÁS ---
Dátum: ${dateStr}
Személyzet: ${staffNames}
---------------------------------
Nyitó egyenleg: ${fmt(activeShift.openingBalance)} Ft
Készpénzes eladások: ${fmt(shiftCashTotal)} Ft
Bankkártyás eladások: ${fmt(shiftCardTotal)} Ft
${shiftTransferTotal > 0 ? `Átutalásos eladások: ${fmt(shiftTransferTotal)} Ft\n` : ""}Összes eladás: ${fmt(shiftSalesTotal)} Ft
Egyéb mozgás: ${extraNetText}${extraLines ? "\n" + extraLines : ""}
Várt készpénz egyenleg: ${fmt(expectedBalance)} Ft
Tényleges záró: ${fmt(actualBalance)} Ft
Eltérés: ${discrepancy === 0 ? "0" : discrepancy > 0 ? `+${fmt(discrepancy)}` : `${fmt(discrepancy)}`} Ft
Összesen változás: ${netChange >= 0 ? "+" : ""}${fmt(netChange)} Ft
---------------------------------
Zárta: ${user?.name || user?.displayName || user?.email || "ismeretlen"}`;

    setSummaryText(summary);
    setClosingSummary({
      expectedBalance,
      actualBalance,
      discrepancy,
      staffNames,
      dateStr,
    });
    setCloseShiftData({ actualBalance: "" });
    setShowCloseShiftModal(false);
    setCopiedSummary(false);
    showToastNotification(
      `Kassza sikeresen lezárva! Eltérés: ${discrepancy === 0 ? "0" : discrepancy > 0 ? `+${fmt(discrepancy)}` : `${fmt(discrepancy)}`} Ft`,
      discrepancy === 0 ? "success" : "error",
    );
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedSummary(true);
      showToastNotification("Összegzés vágólapra másolva!", "success");
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  };

  const toggleStaffMember = (name) => {
    setOpenShiftData((prev) => {
      const current = prev.staffOnDuty;
      if (current.includes(name)) {
        return { ...prev, staffOnDuty: current.filter((n) => n !== name) };
      } else {
        return { ...prev, staffOnDuty: [...current, name] };
      }
    });
  };

  // --- Shift Balance Calculations ---
  const todayStr = new Date().toISOString().slice(0, 10);

  // Sales during active shift
  const shiftSales = activeShift
    ? sales.filter(
        (s) =>
          s.timestamp &&
          new Date(s.timestamp) >= new Date(activeShift.openedAt),
      )
    : [];
  const shiftSalesTotal = shiftSales.reduce(
    (sum, s) => sum + Number(s.totalAmount || 0),
    0,
  );

  // Payment method breakdown for active shift
  const shiftCashTotal = shiftSales
    .filter((s) => (s.paymentMethod || "cash") === "cash")
    .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const shiftCardTotal = shiftSales
    .filter((s) => s.paymentMethod === "card")
    .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const shiftTransferTotal = shiftSales
    .filter((s) => s.paymentMethod === "transfer")
    .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

  // Extra transactions during active shift
  const shiftExtras = activeShift
    ? extraTransactions.filter((t) => t.shiftId === activeShift.id)
    : [];
  const shiftExtraIncome = shiftExtras
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const shiftExtraExpense = shiftExtras
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const shiftExpectedBalance = activeShift
    ? Number(activeShift.openingBalance) +
      shiftCashTotal +
      shiftExtraIncome -
      shiftExtraExpense
    : 0;

  // Today's sales only (Kassza shows today)
  const todaySales = sales
    .filter((sale) => sale.timestamp && sale.timestamp.startsWith(todayStr))
    .filter(
      (sale) =>
        sale.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.seller?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="kassza-panel">
      <div className="panel-header">
        <h2><CircleDollarSign size={20} style={{verticalAlign: "middle", marginRight: 6}} /> Kassza</h2>
      </div>

      {/* Status Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "12px 20px",
          margin: "0 16px 16px",
          borderRadius: "12px",
          background: activeShift
            ? "linear-gradient(135deg, #059669, #10b981)"
            : "linear-gradient(135deg, #dc2626, #ef4444)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "16px",
          letterSpacing: "0.5px",
          boxShadow: activeShift
            ? "0 4px 12px rgba(5, 150, 105, 0.3)"
            : "0 4px 12px rgba(220, 38, 38, 0.3)",
        }}
      >
        <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: activeShift ? "#22c55e" : "#ef4444", marginRight: 8, flexShrink: 0 }} />
        {activeShift ? "KASSZA NYITVA" : "KASSZA ZÁRVA"}
        {activeShift && activeShift.staffOnDuty && (
          <span style={{ fontWeight: 400, fontSize: "13px", opacity: 0.9 }}>
            — {activeShift.staffOnDuty.join(", ")}
          </span>
        )}
      </div>

      {/* Closing Summary (shown after closing) */}
      {closingSummary && summaryText && (
        <div
          style={{
            margin: "0 16px 16px",
            padding: "20px",
            background: "#fffbeb",
            border: "1px solid #fbbf24",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ margin: 0, color: "#92400e", fontSize: "16px" }}>
              <ClipboardList size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Zárási Összegzés
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCopySummary}
                style={{
                  padding: "8px 16px",
                  background: copiedSummary ? "#059669" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedSummary ? <><CircleCheck size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Másolva!</> : <><ClipboardList size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Másolás</>}
              </button>
              <button
                onClick={() => {
                  setClosingSummary(null);
                  setSummaryText("");
                }}
                style={{
                  padding: "8px 12px",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={summaryText}
            style={{
              width: "100%",
              minHeight: "220px",
              padding: "14px",
              background: "#1f2937",
              color: "#e5e7eb",
              border: "none",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.6",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Open/Close Shift Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          margin: "0 16px 16px",
          flexWrap: "wrap",
        }}
      >
        {!activeShift ? (
          <button
            onClick={() => setShowOpenShiftModal(true)}
            style={{
              flex: 1,
              padding: "14px 20px",
              background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <LockOpen size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Kassza Nyitás
          </button>
        ) : (
          <button
            onClick={() => setShowCloseShiftModal(true)}
            style={{
              flex: 1,
              padding: "14px 20px",
              background: "linear-gradient(135deg, #dc2626, #ef4444)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Lock size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Kassza Zárás
          </button>
        )}
      </div>

      <div className="kassza-content">
        {/* Shift Balance Section */}
        {activeShift && (
          <div className="kassza-section daily-balance-section">
            <h3>Műszak Egyenleg</h3>
            <div className="daily-balance-grid">
              <div className="balance-card">
                <span className="balance-label">Nyitó</span>
                <span className="balance-value">
                  {fmt(activeShift.openingBalance)} Ft
                </span>
              </div>
              <div className="balance-card positive">
                <span className="balance-label">Készpénzes eladások</span>
                <span className="balance-value">
                  +{fmt(shiftCashTotal)} Ft
                </span>
              </div>
              <div className="balance-card card-payment">
                <span className="balance-label">Bankkártyás eladások</span>
                <span className="balance-value">
                  +{fmt(shiftCardTotal)} Ft
                </span>
              </div>
              {shiftTransferTotal > 0 && (
                <div className="balance-card transfer-payment">
                  <span className="balance-label">Átutalásos eladások</span>
                  <span className="balance-value">
                    +{fmt(shiftTransferTotal)} Ft
                  </span>
                </div>
              )}
              <div className="balance-card positive">
                <span className="balance-label">Egyéb bevétel</span>
                <span className="balance-value">
                  +{fmt(shiftExtraIncome)} Ft
                </span>
              </div>
              <div className="balance-card negative">
                <span className="balance-label">Egyéb kiadás</span>
                <span className="balance-value">
                  -{fmt(shiftExtraExpense)} Ft
                </span>
              </div>
            </div>
            {shiftCardTotal > 0 && (
              <div className="balance-card-terminal">
                <Banknote size={14} style={{verticalAlign: "middle", marginRight: 4}} />
                Bankkártya terminál: {fmt(shiftCardTotal)} Ft
                {shiftTransferTotal > 0 && ` + Átutalás: ${fmt(shiftTransferTotal)} Ft`}
              </div>
            )}
            <div className="balance-closing">
              <span className="balance-closing-label">Várt készpénz egyenleg</span>
              <span
                className={`balance-closing-value ${shiftExpectedBalance >= 0 ? "positive" : "negative"}`}
              >
                {fmt(shiftExpectedBalance)} Ft
              </span>
            </div>
            <div className="daily-balance-actions">
              <button
                className="kassza-btn primary"
                onClick={() => setShowExtraForm(true)}
              >
                + Egyéb Tétel
              </button>
            </div>
            {shiftExtras.length > 0 && (
              <div className="today-extras-list">
                <h4>Műszak egyéb tételek</h4>
                {shiftExtras.map((t) => (
                  <div key={t.id} className={`extra-item ${t.type}`}>
                    <span className="extra-desc">{t.description}</span>
                    <span className={`extra-amount ${t.type}`}>
                      {t.type === "income" ? "+" : "-"}
                      {fmt(t.amount)} Ft
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disabled overlay when shift is closed */}
        {!activeShift && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: "#f1f5f9",
              borderRadius: "12px",
              margin: "0 0 16px",
              border: "2px dashed #cbd5e1",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}><Lock size={16} style={{verticalAlign: "middle", marginRight: 4}} /></div>
            <h3 style={{ color: "#475569", margin: "0 0 8px" }}>
              A kassza jelenleg zárva van
            </h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Nyissa meg a kasszát az eladások és tranzakciók rögzítéséhez.
            </p>
          </div>
        )}

        {/* Sale Recording Section */}
        <div
          className="kassza-section"
          style={{
            opacity: activeShift ? 1 : 0.5,
            pointerEvents: activeShift ? "auto" : "none",
          }}
        >
          <h3>Eladás Rögzítése</h3>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={() => setShowScanner(true)}
              disabled={!activeShift}
              style={{
                flex: 1,
                padding: "14px",
                minHeight: "48px",
                background: activeShift ? "#3741A8" : "#e9ecef",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: activeShift ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
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

            <button
              onClick={() => setShowSaleForm(true)}
              disabled={!activeShift}
              style={{
                flex: 1,
                padding: "14px",
                minHeight: "48px",
                background: activeShift ? "#495057" : "#e9ecef",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: activeShift ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="white" />
              </svg>
              Manuális
            </button>
          </div>

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
        </div>

        {/* Search + Today's Sales */}
        <div className="kassza-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Mai Eladások</h3>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              {todaySales.length} db
            </span>
          </div>
          <input
            type="text"
            placeholder="Keresés könyv cím vagy vásárló szerint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="kassza-search"
            style={{ marginBottom: "12px" }}
          />

          <div className="sales-list">
            {todaySales.length === 0 ? (
              <div className="no-sales">
                <p>Még nincsenek rögzített eladások.</p>
              </div>
            ) : (
              todaySales.map((sale) => (
                <div key={sale.id} className="sale-item">
                  <div className="sale-info">
                    <div className="sale-book">
                      <h4>{sale.itemName}</h4>
                      <div className="sale-meta-line">
                        {new Date(sale.timestamp).toLocaleTimeString("hu-HU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {sale.quantity} db
                        {" · "}
                        {fmt(sale.price)} Ft/db
                        {" · "}
                        {sale.paymentMethod === "cash"
                          ? "Készpénz"
                          : sale.paymentMethod === "card"
                            ? "Bankkártya"
                            : "Átutalás"}
                        {" · "}
                        <strong>{fmt(sale.totalAmount)} Ft</strong>
                        {sale.sellerName && (
                          <>
                            {" · "}
                            <span style={{ color: "#64748b", fontSize: "12px" }}>
                              {sale.sellerName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="sale-actions">
                      {activeShift &&
                      sale.timestamp &&
                      new Date(sale.timestamp) >=
                        new Date(activeShift.openedAt) ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleSaleEdit(sale)}
                            className="kassza-btn edit"
                            style={{ fontSize: "13px", padding: "6px 12px", minHeight: "36px" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleSaleDelete(sale)}
                            className="kassza-btn delete"
                            style={{ fontSize: "13px", padding: "6px 12px", minHeight: "36px" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            fontStyle: "italic",
                          }}
                        >
                          Lezárt műszak
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
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
                      <BookOpen size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Könyv
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
                      <Gift size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Ajándéktárgy
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
              <div className="delete-warning-icon"><AlertTriangle size={32} /></div>
              <p>Biztosan törölni szeretnéd ezt az eladást?</p>
              {saleToDelete && (
                <div className="sale-preview">
                  <h4>{saleToDelete.itemName}</h4>
                  <div className="sale-details-preview">
                    <span>Mennyiség: {saleToDelete.quantity} db</span>
                    <span>
                      Ár: {fmt(saleToDelete.price)}{" "}
                      Ft/db
                    </span>
                    <span>
                      Összesen:{" "}
                      {fmt(saleToDelete.totalAmount)} Ft
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

      {/* Extra Transaction Modal */}
      {showExtraForm && (
        <div className="kassza-modal">
          <div className="kassza-modal-content">
            <h3>Egyéb Tétel Rögzítése</h3>
            <div className="kassza-modal-body">
              <div className="form-group">
                <label>Típus:</label>
                <div className="product-type-buttons">
                  <button
                    type="button"
                    className={`product-type-btn ${extraData.type === "income" ? "active" : ""}`}
                    onClick={() =>
                      setExtraData({ ...extraData, type: "income" })
                    }
                  >
                    + Bevétel
                  </button>
                  <button
                    type="button"
                    className={`product-type-btn ${extraData.type === "expense" ? "active" : ""}`}
                    onClick={() =>
                      setExtraData({ ...extraData, type: "expense" })
                    }
                  >
                    - Kiadás
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Leírás:</label>
                <input
                  type="text"
                  value={extraData.description}
                  onChange={(e) =>
                    setExtraData({ ...extraData, description: e.target.value })
                  }
                  placeholder="Pl. borravaló, irodaszer, stb."
                />
              </div>
              <div className="form-group">
                <label>Összeg (Ft):</label>
                <input
                  type="number"
                  value={extraData.amount}
                  onChange={(e) =>
                    setExtraData({ ...extraData, amount: e.target.value })
                  }
                  placeholder="Add meg az összeget"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <div className="kassza-modal-footer">
              <button
                onClick={handleExtraSubmit}
                className="kassza-btn primary"
              >
                Rögzítés
              </button>
              <button
                onClick={() => {
                  setShowExtraForm(false);
                  setExtraData({ description: "", amount: "", type: "income" });
                }}
                className="kassza-btn secondary"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="kassza-modal">
          <div className="kassza-modal-content">
            <h3><LockOpen size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Kassza Nyitás</h3>
            <div className="kassza-modal-body">
              <div className="form-group">
                <label>Tényleges nyitó egyenleg (Ft):</label>
                <input
                  type="number"
                  value={openShiftData.openingBalance}
                  onChange={(e) =>
                    setOpenShiftData({
                      ...openShiftData,
                      openingBalance: e.target.value,
                    })
                  }
                  placeholder="Számolja meg a kasszában lévő összeget"
                  min="0"
                  step="1"
                  style={{ fontSize: "18px", padding: "14px", fontWeight: 600 }}
                />
              </div>
              <div className="form-group">
                <label>Személyzet (ki van szolgálatban):</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {users.map((u) => {
                    const name = u.name || u.displayName || u.email || "N/A";
                    const isSelected = openShiftData.staffOnDuty.includes(name);
                    return (
                      <button
                        key={u.id || u.email}
                        type="button"
                        onClick={() => toggleStaffMember(name)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "20px",
                          border: isSelected
                            ? "2px solid #059669"
                            : "2px solid #e2e8f0",
                          background: isSelected ? "#ecfdf5" : "#fff",
                          color: isSelected ? "#059669" : "#64748b",
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <Check size={18} />}
                        {name}
                      </button>
                    );
                  })}
                </div>
                {openShiftData.staffOnDuty.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13px",
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    Kiválasztva: {openShiftData.staffOnDuty.join(", ")}
                  </div>
                )}
              </div>
            </div>
            <div className="kassza-modal-footer">
              <button
                onClick={handleOpenShift}
                className="kassza-btn primary"
                disabled={
                  !openShiftData.openingBalance ||
                  openShiftData.staffOnDuty.length === 0
                }
                style={{
                  opacity:
                    !openShiftData.openingBalance ||
                    openShiftData.staffOnDuty.length === 0
                      ? 0.5
                      : 1,
                }}
              >
                Kassza Megnyitása
              </button>
              <button
                onClick={() => {
                  setShowOpenShiftModal(false);
                  setOpenShiftData({ openingBalance: "", staffOnDuty: [] });
                }}
                className="kassza-btn secondary"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseShiftModal && activeShift && (
        <div className="kassza-modal">
          <div className="kassza-modal-content">
            <h3><Lock size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Kassza Zárás</h3>
            <div className="kassza-modal-body">
              <div className="sale-preview" style={{ marginBottom: "16px" }}>
                <div className="sale-details-preview">
                  <span>
                    Nyitó egyenleg:{" "}
                    {fmt(activeShift.openingBalance)} Ft
                  </span>
                  <span style={{ color: "#059669" }}>
                    Készpénzes eladások: +{fmt(shiftCashTotal)} Ft
                  </span>
                  <span style={{ color: "#2563eb" }}>
                    Bankkártyás eladások: +{fmt(shiftCardTotal)} Ft
                  </span>
                  {shiftTransferTotal > 0 && (
                    <span style={{ color: "#7c3aed" }}>
                      Átutalásos eladások: +{fmt(shiftTransferTotal)} Ft
                    </span>
                  )}
                  <span>
                    Eladások összesen: +{fmt(shiftSalesTotal)} Ft
                  </span>
                  <span>
                    Egyéb bevétel: +{fmt(shiftExtraIncome)}{" "}
                    Ft
                  </span>
                  <span>
                    Egyéb kiadás: -{fmt(shiftExtraExpense)}{" "}
                    Ft
                  </span>
                  <span>
                    <strong>
                      Várt készpénz egyenleg:{" "}
                      {fmt(shiftExpectedBalance)} Ft
                    </strong>
                  </span>
                  {shiftCardTotal > 0 && (
                    <span style={{fontSize: "12px", color: "#6b7280", fontStyle: "italic"}}>
                      A bankkártyás forgalom ({fmt(shiftCardTotal)} Ft) a terminálban van, nem a kasszában.
                    </span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: "15px", fontWeight: 700 }}>
                  Tényleges készpénz egyenleg (Ft):
                </label>
                <input
                  type="number"
                  value={closeShiftData.actualBalance}
                  onChange={(e) =>
                    setCloseShiftData({ actualBalance: e.target.value })
                  }
                  placeholder="Számolja meg a kasszában lévő összeget"
                  min="0"
                  step="1"
                  style={{ fontSize: "18px", padding: "14px", fontWeight: 600 }}
                />
              </div>
              {closeShiftData.actualBalance && (() => {
                  const elteres = parseFloat(closeShiftData.actualBalance) - shiftExpectedBalance;
                  const isZero = Math.abs(elteres) < 0.01;
                  const isPositive = elteres > 0;
                  return (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    marginTop: "8px",
                    background: isZero ? "#ecfdf5" : isPositive ? "#fefce8" : "#fef2f2",
                    border: `1px solid ${isZero ? "#a7f3d0" : isPositive ? "#fde68a" : "#fecaca"}`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Eltérés
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: isZero ? "#059669" : isPositive ? "#b45309" : "#dc2626",
                    }}
                  >
                    {isZero ? "0" : isPositive ? `+${fmt(elteres)}` : `${fmt(elteres)}`}{" "}
                    Ft
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      marginTop: "4px",
                    }}
                  >
                    {isZero
                      ? "Pontosan egyezik"
                      : isPositive
                        ? "Többlet a várt egyenleghez képest"
                        : "Hiány a várt egyenleghez képest"}
                  </div>
                </div>
                  );
                })()}
            </div>
            <div className="kassza-modal-footer">
              <button
                onClick={handleCloseShift}
                className="kassza-btn daily-close"
                disabled={!closeShiftData.actualBalance}
                style={{
                  opacity: !closeShiftData.actualBalance ? 0.5 : 1,
                }}
              >
                Kassza Lezárása
              </button>
              <button
                onClick={() => {
                  setShowCloseShiftModal(false);
                  setCloseShiftData({ actualBalance: "" });
                }}
                className="kassza-btn secondary"
              >
                Mégse
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
        <div className={`kassza-toast ${toastType} ${isToastExiting ? "exiting" : ""}`}>
          <span className="kassza-toast-icon">
            {toastType === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}
          </span>
          <div>
            <div className="kassza-toast-title">
              {toastType === "success" ? "Siker" : "Hiba"}
            </div>
            <div>{toastMessage}</div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for POS */}
      {activeShift && (
        <button
          onClick={() => setShowPOSOverlay(true)}
          className="pos-fab"
          aria-label="Gyors eladás"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      )}

      {/* POS Overlay */}
      <POSOverlay
        isOpen={showPOSOverlay}
        onClose={() => setShowPOSOverlay(false)}
        books={books}
        gifts={gifts}
        sales={sales}
        activeShift={activeShift}
        user={user}
        onSaleComplete={() => {
          showToastNotification("Eladás sikeresen rögzítve!", "success");
        }}
        onToast={showToastNotification}
      />
    </div>
  );
};

export default KasszaPanel;
