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

const KasszaPanel = ({ user, users = [], books = [], gifts = [] }) => {
  const [sales, setSales] = useState([]);
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
  const [viewMode, setViewMode] = useState("daily"); // "daily", "monthly", or "all"
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  ); // YYYY-MM format
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Extra transactions state
  const [extraTransactions, setExtraTransactions] = useState([]);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraData, setExtraData] = useState({
    description: "",
    amount: "",
    type: "income", // "income" or "expense"
  });

  // Shift Management state
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showShiftHistory, setShowShiftHistory] = useState(false);
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
    const shiftsRef = ref(database, "shifts");
    const extraTransRef = ref(database, "extraTransactions");

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

    const handleShiftsData = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const shiftsList = Object.keys(data).map((id) => ({ id, ...data[id] }));
        setShifts(shiftsList);
        // Find the currently open shift (status === "open")
        const openShift = shiftsList.find((s) => s.status === "open");
        setActiveShift(openShift || null);
      } else {
        setShifts([]);
        setActiveShift(null);
      }
    };

    const handleExtraTransactions = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExtraTransactions(
          Object.keys(data).map((id) => ({ id, ...data[id] })),
        );
      } else {
        setExtraTransactions([]);
      }
    };

    onValue(salesRef, handleSalesData);
    onValue(shiftsRef, handleShiftsData);
    onValue(extraTransRef, handleExtraTransactions);
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
        sellerName:
          user?.name || user?.displayName || user?.email || "ismeretlen",
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
    const extraRef = ref(database, "extraTransactions");
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

    const shiftsRef = ref(database, "shifts");
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
      alert("Kérjük, adja meg a fizikai záró egyenleget!");
      return;
    }
    if (!activeShift) return;

    const actualBalance = parseFloat(closeShiftData.actualBalance);
    const expectedBalance = shiftExpectedBalance;
    const discrepancy = actualBalance - expectedBalance;

    const shiftRef = ref(database, `shifts/${activeShift.id}`);
    update(shiftRef, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: user?.email || "ismeretlen",
      closedByName:
        user?.name || user?.displayName || user?.email || "ismeretlen",
      salesTotal: shiftSalesTotal,
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
        ? `+${(shiftExtraIncome - shiftExtraExpense).toLocaleString("hu-HU")} Ft`
        : `${(shiftExtraIncome - shiftExtraExpense).toLocaleString("hu-HU")} Ft`;

    // Build extra details
    const shiftExtrasForSummary = extraTransactions.filter(
      (t) => t.shiftId === activeShift.id,
    );
    let extraLines = "";
    shiftExtrasForSummary.forEach((t) => {
      extraLines += `  ${t.type === "income" ? "+" : "-"}${t.amount.toLocaleString("hu-HU")} Ft (${t.description})\n`;
    });

    const summary = `--- OMEGA KÖNYVTÁR NAPI ZÁRÁS ---
Dátum: ${dateStr}
Személyzet: ${staffNames}
---------------------------------
Nyitó egyenleg: ${activeShift.openingBalance.toLocaleString("hu-HU")} Ft
Összes eladás: ${shiftSalesTotal.toLocaleString("hu-HU")} Ft
Egyéb mozgás: ${extraNetText}${extraLines ? "\n" + extraLines : ""}
Várt egyenleg: ${expectedBalance.toLocaleString("hu-HU")} Ft
Fizikai záró: ${actualBalance.toLocaleString("hu-HU")} Ft
ELTÉRÉS: ${discrepancy >= 0 ? "+" : ""}${discrepancy.toLocaleString("hu-HU")} Ft
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
      `Kassza sikeresen lezárva! Eltérés: ${discrepancy >= 0 ? "+" : ""}${discrepancy.toLocaleString("hu-HU")} Ft`,
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
    (sum, s) => sum + (s.totalAmount || 0),
    0,
  );

  // Extra transactions during active shift
  const shiftExtras = activeShift
    ? extraTransactions.filter((t) => t.shiftId === activeShift.id)
    : [];
  const shiftExtraIncome = shiftExtras
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const shiftExtraExpense = shiftExtras
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const shiftExpectedBalance = activeShift
    ? activeShift.openingBalance +
      shiftSalesTotal +
      shiftExtraIncome -
      shiftExtraExpense
    : 0;

  // Shift history (sorted newest first)
  const closedShifts = [...shifts]
    .filter((s) => s.status === "closed")
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

  // --- Filtered sales calculations ---
  const dailySales = sales.filter(
    (sale) => sale.timestamp && sale.timestamp.startsWith(todayStr),
  );
  const monthlySales = sales.filter(
    (sale) => sale.timestamp && sale.timestamp.startsWith(selectedMonth),
  );

  const currentSales =
    viewMode === "daily"
      ? dailySales
      : viewMode === "monthly"
        ? monthlySales
        : sales;

  const totalRevenue = currentSales.reduce(
    (sum, sale) => sum + (sale.totalAmount || 0),
    0,
  );
  const totalSalesCount = currentSales.length;

  const filteredSales = currentSales
    .filter(
      (sale) =>
        sale.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.seller?.toLowerCase().includes(searchTerm.toLowerCase()),
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
        <span style={{ fontSize: "20px" }}>{activeShift ? "🟢" : "🔴"}</span>
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
              📋 Zárási Összegzés
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
                {copiedSummary ? "✅ Másolva!" : "📋 Másolás"}
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
                ✕
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
            🔓 Kassza Nyitás
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
            🔒 Kassza Zárás
          </button>
        )}
        <button
          onClick={() => setShowShiftHistory(!showShiftHistory)}
          style={{
            padding: "14px 20px",
            background: showShiftHistory ? "#4f46e5" : "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          📖 Műszak Napló
        </button>
      </div>

      {/* Shift History Table */}
      {showShiftHistory && (
        <div
          style={{
            margin: "0 16px 16px",
            padding: "20px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
          }}
        >
          <h3
            style={{ margin: "0 0 16px", fontSize: "16px", color: "#1e293b" }}
          >
            📖 Műszak Napló
          </h3>
          {closedShifts.length === 0 ? (
            <p
              style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}
            >
              Még nincsenek lezárt műszakok.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#e2e8f0" }}>
                    <th
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        borderRadius: "8px 0 0 0",
                      }}
                    >
                      Dátum
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>
                      Személyzet
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Nyitó
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Eladások
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Várt
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Fizikai
                    </th>
                    <th
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        borderRadius: "0 8px 0 0",
                      }}
                    >
                      Eltérés
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {closedShifts.map((shift) => (
                    <tr
                      key={shift.id}
                      style={{ borderBottom: "1px solid #e2e8f0" }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        {new Date(shift.closedAt).toLocaleDateString("hu-HU")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {shift.staffOnDuty?.join(", ") || "N/A"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {(shift.openingBalance || 0).toLocaleString("hu-HU")} Ft
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {(shift.salesTotal || 0).toLocaleString("hu-HU")} Ft
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {(shift.expectedBalance || 0).toLocaleString("hu-HU")}{" "}
                        Ft
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {(shift.actualBalance || 0).toLocaleString("hu-HU")} Ft
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            (shift.discrepancy || 0) === 0
                              ? "#059669"
                              : (shift.discrepancy || 0) > 0
                                ? "#2563eb"
                                : "#dc2626",
                        }}
                      >
                        {(shift.discrepancy || 0) >= 0 ? "+" : ""}
                        {(shift.discrepancy || 0).toLocaleString("hu-HU")} Ft
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="kassza-content">
        {/* Shift Balance Section */}
        {activeShift && (
          <div className="kassza-section daily-balance-section">
            <h3>Műszak Egyenleg</h3>
            <div className="daily-balance-grid">
              <div className="balance-card">
                <span className="balance-label">Nyitó</span>
                <span className="balance-value">
                  {activeShift.openingBalance.toLocaleString("hu-HU")} Ft
                </span>
              </div>
              <div className="balance-card positive">
                <span className="balance-label">Eladások</span>
                <span className="balance-value">
                  +{shiftSalesTotal.toLocaleString("hu-HU")} Ft
                </span>
              </div>
              <div className="balance-card positive">
                <span className="balance-label">Egyéb bevétel</span>
                <span className="balance-value">
                  +{shiftExtraIncome.toLocaleString("hu-HU")} Ft
                </span>
              </div>
              <div className="balance-card negative">
                <span className="balance-label">Egyéb kiadás</span>
                <span className="balance-value">
                  -{shiftExtraExpense.toLocaleString("hu-HU")} Ft
                </span>
              </div>
            </div>
            <div className="balance-closing">
              <span className="balance-closing-label">Várt egyenleg</span>
              <span
                className={`balance-closing-value ${shiftExpectedBalance >= 0 ? "positive" : "negative"}`}
              >
                {shiftExpectedBalance.toLocaleString("hu-HU")} Ft
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
                      {t.amount.toLocaleString("hu-HU")} Ft
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
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔒</div>
            <h3 style={{ color: "#475569", margin: "0 0 8px" }}>
              A kassza jelenleg zárva van
            </h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Nyissa meg a kasszát az eladások és tranzakciók rögzítéséhez.
            </p>
          </div>
        )}

        <div className="kassza-section">
          <h3>Eladási Történet</h3>
          <div className="view-controls">
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === "daily" ? "active" : ""}`}
                onClick={() => setViewMode("daily")}
              >
                Napi
              </button>
              <button
                className={`view-mode-btn ${viewMode === "monthly" ? "active" : ""}`}
                onClick={() => setViewMode("monthly")}
              >
                Havi
              </button>
              <button
                className={`view-mode-btn ${viewMode === "all" ? "active" : ""}`}
                onClick={() => setViewMode("all")}
              >
                Összes
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
              <p className="summary-count">{totalSalesCount}</p>
            </div>
          </div>

          <div
            className="kassza-section"
            style={{
              opacity: activeShift ? 1 : 0.5,
              pointerEvents: activeShift ? "auto" : "none",
            }}
          >
            <h3>Új Eladás</h3>
            <button
              className="kassza-scan-btn"
              onClick={() => setShowScanner(true)}
              disabled={!activeShift}
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
              disabled={!activeShift}
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
                          {sale.sellerName && (
                            <span className="sale-seller">
                              {sale.sellerName}
                            </span>
                          )}
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
            <h3>🔓 Kassza Nyitás</h3>
            <div className="kassza-modal-body">
              <div className="form-group">
                <label>Fizikai nyitó egyenleg (Ft):</label>
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
                        {isSelected ? "✓ " : ""}
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
            <h3>🔒 Kassza Zárás</h3>
            <div className="kassza-modal-body">
              <div className="sale-preview" style={{ marginBottom: "16px" }}>
                <div className="sale-details-preview">
                  <span>
                    Nyitó egyenleg:{" "}
                    {activeShift.openingBalance.toLocaleString("hu-HU")} Ft
                  </span>
                  <span>
                    Eladások: +{shiftSalesTotal.toLocaleString("hu-HU")} Ft
                  </span>
                  <span>
                    Egyéb bevétel: +{shiftExtraIncome.toLocaleString("hu-HU")}{" "}
                    Ft
                  </span>
                  <span>
                    Egyéb kiadás: -{shiftExtraExpense.toLocaleString("hu-HU")}{" "}
                    Ft
                  </span>
                  <span>
                    <strong>
                      Várt egyenleg:{" "}
                      {shiftExpectedBalance.toLocaleString("hu-HU")} Ft
                    </strong>
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: "15px", fontWeight: 700 }}>
                  Fizikai záró egyenleg (Ft):
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
              {closeShiftData.actualBalance && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    marginTop: "8px",
                    background:
                      parseFloat(closeShiftData.actualBalance) ===
                      shiftExpectedBalance
                        ? "#ecfdf5"
                        : parseFloat(closeShiftData.actualBalance) >
                            shiftExpectedBalance
                          ? "#eff6ff"
                          : "#fef2f2",
                    border: `1px solid ${
                      parseFloat(closeShiftData.actualBalance) ===
                      shiftExpectedBalance
                        ? "#a7f3d0"
                        : parseFloat(closeShiftData.actualBalance) >
                            shiftExpectedBalance
                          ? "#bfdbfe"
                          : "#fecaca"
                    }`,
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
                      color:
                        parseFloat(closeShiftData.actualBalance) ===
                        shiftExpectedBalance
                          ? "#059669"
                          : parseFloat(closeShiftData.actualBalance) >
                              shiftExpectedBalance
                            ? "#2563eb"
                            : "#dc2626",
                    }}
                  >
                    {parseFloat(closeShiftData.actualBalance) -
                      shiftExpectedBalance >=
                    0
                      ? "+"
                      : ""}
                    {(
                      parseFloat(closeShiftData.actualBalance) -
                      shiftExpectedBalance
                    ).toLocaleString("hu-HU")}{" "}
                    Ft
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      marginTop: "4px",
                    }}
                  >
                    {parseFloat(closeShiftData.actualBalance) ===
                    shiftExpectedBalance
                      ? "Tökéletes egyezés! ✅"
                      : parseFloat(closeShiftData.actualBalance) >
                          shiftExpectedBalance
                        ? "Többlet a kasszában"
                        : "Hiány a kasszában ⚠️"}
                  </div>
                </div>
              )}
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
