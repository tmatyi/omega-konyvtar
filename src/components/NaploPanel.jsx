import React, { useState } from "react";
import { database, dbRef } from "../firebase";
import { remove } from "firebase/database";
import useToast from "../hooks/useToast";
import { ClipboardList, CircleCheck, CircleX, ChevronRight, BarChart3, Printer, Trash2, Banknote, CreditCard, Landmark, Users, AlertTriangle, BookOpen, BookMarked, Gift, CircleDollarSign } from "lucide-react";

const fmt = (val) => {
  const n = Math.round(Number(val || 0));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const NaploPanel = ({
  user,
  users = [],
  books = [],
  gifts = [],
  sales = [],
  shifts = [],
  extraTransactions = [],
}) => {
  const {
    showToast,
    toastMessage,
    toastType,
    isToastExiting,
    showToastNotification,
  } = useToast();

  // View mode: daily / monthly / all
  const [viewMode, setViewMode] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Shift history
  const [expandedShiftId, setExpandedShiftId] = useState(null);
  const [activeAnchor, setActiveAnchor] = useState("shifts");

  // Shift delete
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  // --- Computed values ---

  // Closed shifts (newest first)
  const closedShifts = [...shifts]
    .filter((s) => s.status === "closed")
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

  // Sales filtering by view mode
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

  // --- Handlers ---

  const handleDeleteShift = async () => {
    if (deleteConfirmText !== "JÓVÁHAGY") {
      alert("Kérjük, írja be pontosan: JÓVÁHAGY");
      return;
    }

    if (!shiftToDelete) return;

    try {
      const shiftSalesData = sales.filter(
        (s) =>
          s.timestamp &&
          new Date(s.timestamp) >= new Date(shiftToDelete.openedAt) &&
          new Date(s.timestamp) <= new Date(shiftToDelete.closedAt),
      );

      for (const sale of shiftSalesData) {
        await remove(dbRef(database, `sales/${sale.id}`));
      }

      const shiftExtrasData = extraTransactions.filter(
        (t) => t.shiftId === shiftToDelete.id,
      );
      for (const extra of shiftExtrasData) {
        await remove(dbRef(database, `extraTransactions/${extra.id}`));
      }

      await remove(dbRef(database, `shifts/${shiftToDelete.id}`));

      showToastNotification(
        `Műszak és ${shiftSalesData.length} eladás sikeresen törölve!`,
        "success",
      );
      setShiftToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("Hiba történt a műszak törlése közben!");
    }
  };

  const handlePrintShift = (shift, shiftSalesData, shiftExtrasData) => {
    const printWindow = window.open("", "_blank");
    const dateStr = new Date(shift.closedAt).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = new Date(shift.closedAt).toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let salesHTML = "";
    if (shiftSalesData.length > 0) {
      salesHTML = `
        <h3>Eladások (${shiftSalesData.length} db)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Időpont</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Termék</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">Mennyiség</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e2e8f0;">Egységár</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e2e8f0;">Összeg</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">Fizetés</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Eladó</th>
            </tr>
          </thead>
          <tbody>
            ${shiftSalesData
              .map(
                (sale) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(sale.timestamp).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${sale.itemType === "book" ? "(Könyv) " : "(Ajándék) "}${sale.itemName}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">${sale.quantity}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e2e8f0;">${fmt(sale.price)} Ft</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600;">${fmt(sale.totalAmount)} Ft</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">${sale.paymentMethod === "cash" ? "Készpénz" : sale.paymentMethod === "card" ? "Kártya" : "Átutalás"}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${sale.sellerName || "N/A"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    let extrasHTML = "";
    if (shiftExtrasData.length > 0) {
      extrasHTML = `
        <h3>Egyéb Mozgások (${shiftExtrasData.length} db)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Leírás</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">Típus</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e2e8f0;">Összeg</th>
            </tr>
          </thead>
          <tbody>
            ${shiftExtrasData
              .map(
                (extra) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${extra.description}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">${extra.type === "income" ? "Bevétel" : "Kiadás"}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e2e8f0; font-weight: 600; color: ${extra.type === "income" ? "#059669" : "#dc2626"};">${extra.type === "income" ? "+" : "-"}${fmt(extra.amount)} Ft</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Műszak Jelentés - ${dateStr}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 900px;
              margin: 0 auto;
            }
            h1 { color: #1e293b; margin-bottom: 10px; }
            h2 { color: #475569; margin-top: 20px; margin-bottom: 10px; }
            h3 { color: #64748b; margin-top: 15px; margin-bottom: 10px; }
            .summary {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-weight: 700;
              font-size: 16px;
              margin-top: 8px;
              padding-top: 12px;
              border-top: 2px solid #cbd5e1;
            }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>Műszak Jelentés</h1>
          <p><strong>Dátum:</strong> ${dateStr} ${timeStr}</p>
          <p><strong>Személyzet:</strong> ${shift.staffOnDuty?.join(", ") || "N/A"}</p>

          <div class="summary">
            <h2>Összegzés</h2>
            <div class="summary-row">
              <span class="label">Nyitó egyenleg:</span>
              <span class="value">${fmt(shift.openingBalance)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Készpénzes eladások:</span>
              <span class="value" style="color: #059669;">
                ${shift.cashTotal != null ? fmt(shift.cashTotal) : fmt(shift.salesTotal)} Ft
              </span>
            </div>
            <div class="summary-row">
              <span class="label">Bankkártyás eladások:</span>
              <span class="value" style="color: #2563eb;">
                ${shift.cardTotal != null ? fmt(shift.cardTotal) : "—"} Ft
              </span>
            </div>
            <div class="summary-row">
              <span class="label">Eladások összesen:</span>
              <span class="value">${fmt(shift.salesTotal)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Egyéb bevétel:</span>
              <span class="value" style="color: #059669;">+${fmt(shift.extraIncome)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Egyéb kiadás:</span>
              <span class="value" style="color: #dc2626;">-${fmt(shift.extraExpense)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Várt készpénz egyenleg:</span>
              <span class="value">${fmt(shift.expectedBalance)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Tényleges záró egyenleg:</span>
              <span class="value">${fmt(shift.actualBalance)} Ft</span>
            </div>
            <div class="summary-row">
              <span class="label">Összesen:</span>
              <span class="value" style="color: ${(Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0)) >= 0 ? "#059669" : "#dc2626"};">
                ${Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0) >= 0 ? "+" : ""}${fmt(Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0))} Ft
              </span>
            </div>
          </div>

          ${salesHTML}
          ${extrasHTML}

          <p style="margin-top: 30px; color: #94a3b8; font-size: 12px;">
            Nyomtatva: ${new Date().toLocaleString("hu-HU")}
          </p>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="naplo-panel">
      {/* Header */}
      <div className="panel-header">
        <h2><ClipboardList size={20} style={{verticalAlign: "middle", marginRight: 6}} /> Napló</h2>
      </div>

      {/* Anchor Pills */}
      <div className="naplo-anchors">
        <button
          className={`naplo-anchor-btn ${activeAnchor === "shifts" ? "active" : ""}`}
          onClick={() => setActiveAnchor("shifts")}
        >
          <BookMarked size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Műszak Napló
        </button>
        <button
          className={`naplo-anchor-btn ${activeAnchor === "sales" ? "active" : ""}`}
          onClick={() => setActiveAnchor("sales")}
        >
          <BarChart3 size={16} style={{verticalAlign: "middle", marginRight: 4}} /> Eladási Történet
        </button>
      </div>

      {/* Shift History: Cards on mobile, Table on desktop */}
      {activeAnchor === "shifts" && (
      <div className="naplo-shift-section">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#1e293b" }}>
          <BookMarked size={18} style={{verticalAlign: "middle", marginRight: 4}} /> Műszak Napló
        </h3>
          {closedShifts.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
              Még nincsenek lezárt műszakok.
            </p>
          ) : (
            <>
              {/* Desktop: Table view */}
              <div className="naplo-shift-table">
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
                        <th style={{ padding: "10px 12px", textAlign: "left", borderRadius: "8px 0 0 0" }}>Dátum</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Személyzet</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Nyitó</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Készpénz</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Kártya</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Eladások</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Kiadások</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Várt</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Tényleges</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", borderRadius: "0 8px 0 0" }}>Összesen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedShifts.map((shift) => {
                        const isExpanded = expandedShiftId === shift.id;
                        const shiftSalesData = sales.filter(
                          (s) =>
                            s.timestamp &&
                            new Date(s.timestamp) >= new Date(shift.openedAt) &&
                            new Date(s.timestamp) <= new Date(shift.closedAt),
                        );
                        const shiftExtrasData = extraTransactions.filter(
                          (t) => t.shiftId === shift.id,
                        );

                        return (
                          <React.Fragment key={shift.id}>
                            <tr
                              onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                              style={{
                                borderBottom: "1px solid #e2e8f0",
                                cursor: "pointer",
                                background: isExpanded ? "#f1f5f9" : "transparent",
                                transition: "background 0.2s ease",
                              }}
                              onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "#f8fafc"; }}
                              onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                            >
                              <td style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", transition: "transform 0.2s ease", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}><ChevronRight size={14} style={{transition: "transform 0.2s"}} /></span>
                                {new Date(shift.closedAt).toLocaleDateString("hu-HU")}
                              </td>
                              <td style={{ padding: "10px 12px" }}>{shift.staffOnDuty?.join(", ") || "N/A"}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(shift.openingBalance)} Ft</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#059669", fontWeight: 600 }}>
                                {shift.cashTotal != null ? fmt(shift.cashTotal) : fmt(shift.salesTotal)} Ft
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#2563eb", fontWeight: 600 }}>
                                {shift.cardTotal != null ? fmt(shift.cardTotal) : "—"} Ft
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(shift.salesTotal)} Ft</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#dc2626" }}>{fmt(shift.extraExpense)} Ft</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(shift.expectedBalance)} Ft</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(shift.actualBalance)} Ft</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: (Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0)) >= 0 ? "#059669" : "#dc2626" }}>
                                {Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0) >= 0 ? "+" : ""}{fmt(Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0))} Ft
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="10" style={{ padding: "16px", background: "#ffffff", borderBottom: "2px solid #e2e8f0" }}>
                                  <div style={{ marginBottom: "16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                      <h4 style={{ margin: 0, fontSize: "14px", color: "#1e293b", fontWeight: 600 }}><BarChart3 size={18} style={{verticalAlign: "middle", marginRight: 4}} /> Eladások ({shiftSalesData.length} db)</h4>
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        <button onClick={(e) => { e.stopPropagation(); handlePrintShift(shift, shiftSalesData, shiftExtrasData); }}
                                          style={{ padding: "6px 12px", background: "#3741A8", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                                          <Printer size={14} /> Nyomtatás
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setShiftToDelete(shift); }}
                                          style={{ padding: "6px 12px", background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                                          <Trash2 size={14} /> Törlés
                                        </button>
                                      </div>
                                    </div>
                                    {shiftSalesData.length === 0 ? (
                                      <p style={{ color: "#94a3b8", fontSize: "13px", margin: "8px 0" }}>Nincsenek eladások ebben a műszakban.</p>
                                    ) : (
                                      <>
                                        <div style={{display: "flex", gap: "16px", marginBottom: "10px", fontSize: "13px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px"}}>
                                          <span><Banknote size={14} style={{verticalAlign: "middle", marginRight: 3}} /> Készpénz: <strong>{fmt(shiftSalesData.filter(s => (s.paymentMethod || "cash") === "cash").reduce((sum, s) => sum + Number(s.totalAmount || 0), 0))} Ft</strong></span>
                                          <span><CreditCard size={14} style={{verticalAlign: "middle", marginRight: 3}} /> Kártya: <strong>{fmt(shiftSalesData.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.totalAmount || 0), 0))} Ft</strong></span>
                                          {shiftSalesData.some(s => s.paymentMethod === "transfer") && (
                                            <span><Landmark size={14} style={{verticalAlign: "middle", marginRight: 3}} /> Átutalás: <strong>{fmt(shiftSalesData.filter(s => s.paymentMethod === "transfer").reduce((sum, s) => sum + Number(s.totalAmount || 0), 0))} Ft</strong></span>
                                          )}
                                        </div>
                                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                                          <thead style={{ position: "sticky", top: 0, background: "#f8fafc" }}>
                                            <tr>
                                              <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Időpont</th>
                                              <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Termék</th>
                                              <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>Mennyiség</th>
                                              <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Egységár</th>
                                              <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Összeg</th>
                                              <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>Fizetés</th>
                                              <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Eladó</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {shiftSalesData.map((sale) => (
                                              <tr key={sale.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "8px" }}>{new Date(sale.timestamp).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</td>
                                                <td style={{ padding: "8px" }}>{sale.itemType === "book" ? <BookOpen size={14} style={{verticalAlign: "middle", marginRight: 3}} /> : <Gift size={14} style={{verticalAlign: "middle", marginRight: 3}} />} {sale.itemName}</td>
                                                <td style={{ padding: "8px", textAlign: "center" }}>{sale.quantity}</td>
                                                <td style={{ padding: "8px", textAlign: "right" }}>{fmt(sale.price)} Ft</td>
                                                <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>{fmt(sale.totalAmount)} Ft</td>
                                                <td style={{ padding: "8px", textAlign: "center" }}>{sale.paymentMethod === "cash" ? <Banknote size={14} style={{verticalAlign: "middle", marginRight: 2}} /> : sale.paymentMethod === "card" ? <CreditCard size={14} style={{verticalAlign: "middle", marginRight: 2}} /> : <Landmark size={14} style={{verticalAlign: "middle", marginRight: 2}} />}</td>
                                                <td style={{ padding: "8px" }}>{sale.sellerName || "N/A"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      </>
                                    )}
                                  </div>
                                  {shiftExtrasData.length > 0 && (
                                    <div>
                                      <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "#1e293b", fontWeight: 600 }}><CircleDollarSign size={18} style={{verticalAlign: "middle", marginRight: 4}} /> Egyéb Mozgások ({shiftExtrasData.length} db)</h4>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {shiftExtrasData.map((extra) => (
                                          <div key={extra.id} style={{ padding: "8px 12px", background: extra.type === "income" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${extra.type === "income" ? "#bbf7d0" : "#fecaca"}`, borderRadius: "6px", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span>{extra.description}</span>
                                            <span style={{ fontWeight: 600, color: extra.type === "income" ? "#059669" : "#dc2626" }}>
                                              {extra.type === "income" ? "+" : "-"}{fmt(extra.amount)} Ft
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: Card view */}
              <div className="naplo-shift-cards">
                {closedShifts.map((shift) => {
                  const isExpanded = expandedShiftId === shift.id;
                  const shiftSalesData = sales.filter(
                    (s) =>
                      s.timestamp &&
                      new Date(s.timestamp) >= new Date(shift.openedAt) &&
                      new Date(s.timestamp) <= new Date(shift.closedAt),
                  );
                  const shiftExtrasData = extraTransactions.filter(
                    (t) => t.shiftId === shift.id,
                  );

                  return (
                    <div key={shift.id} className="shift-card">
                      <div
                        className="shift-card-header"
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                      >
                        <div className="shift-card-main">
                          <div className="shift-card-date">
                            <span className={`shift-expand-arrow ${isExpanded ? "open" : ""}`}><ChevronRight size={14} style={{transition: "transform 0.2s"}} /></span>
                            {new Date(shift.closedAt).toLocaleDateString("hu-HU")}
                            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
                              {new Date(shift.openedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                              {" - "}
                              {new Date(shift.closedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="shift-card-staff">
                            <Users size={14} style={{verticalAlign: "middle", marginRight: 4}} /> {shift.staffOnDuty?.join(", ") || "N/A"}
                          </div>
                        </div>
                        <div className="shift-card-balances">
                          <div className="shift-balance-row">
                            <span>Nyitó:</span>
                            <span>{fmt(shift.openingBalance)} Ft</span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Készpénz:</span>
                            <span className="positive">
                              {shift.cashTotal != null ? fmt(shift.cashTotal) : fmt(shift.salesTotal)} Ft
                            </span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Kártya:</span>
                            <span style={{color: "#2563eb", fontWeight: 600}}>
                              {shift.cardTotal != null ? fmt(shift.cardTotal) : "—"} Ft
                            </span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Eladások:</span>
                            <span className="positive">{fmt(shift.salesTotal)} Ft</span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Kiadások:</span>
                            <span className="negative">{fmt(shift.extraExpense)} Ft</span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Várt:</span>
                            <span>{fmt(shift.expectedBalance)} Ft</span>
                          </div>
                          <div className="shift-balance-row">
                            <span>Tényleges:</span>
                            <span>{fmt(shift.actualBalance)} Ft</span>
                          </div>
                          <div className="shift-balance-row summary">
                            <span>Összesen:</span>
                            <span style={{
                              color: (Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0)) >= 0 ? "#059669" : "#dc2626",
                              fontWeight: 700,
                            }}>
                              {Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0) >= 0 ? "+" : ""}{fmt(Number(shift.actualBalance || 0) - Number(shift.openingBalance || 0))} Ft
                            </span>
                          </div>
                        </div>
                        <div className="shift-card-actions">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrintShift(shift, shiftSalesData, shiftExtrasData); }}
                            className="shift-card-btn print"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShiftToDelete(shift); }}
                            className="shift-card-btn delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="shift-card-details">
                          {shiftSalesData.length === 0 ? (
                            <p className="shift-no-sales">Nincsenek eladások ebben a műszakban.</p>
                          ) : (
                            <div className="shift-sales-list">
                              <h4><BarChart3 size={18} style={{verticalAlign: "middle", marginRight: 4}} /> Eladások ({shiftSalesData.length} db)</h4>
                              <div style={{display: "flex", gap: "12px", marginBottom: "8px", fontSize: "12px", flexWrap: "wrap"}}>
                                <span><Banknote size={12} style={{verticalAlign: "middle", marginRight: 2}} /> Készpénz: <strong>{fmt(shiftSalesData.filter(s => (s.paymentMethod || "cash") === "cash").reduce((sum, s) => sum + Number(s.totalAmount || 0), 0))} Ft</strong></span>
                                <span><CreditCard size={12} style={{verticalAlign: "middle", marginRight: 2}} /> Kártya: <strong>{fmt(shiftSalesData.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.totalAmount || 0), 0))} Ft</strong></span>
                              </div>
                              {shiftSalesData.map((sale) => (
                                <div key={sale.id} className="shift-sale-item">
                                  <div className="shift-sale-main">
                                    <span className="shift-sale-icon">{sale.itemType === "book" ? <BookOpen size={14} style={{verticalAlign: "middle", marginRight: 3}} /> : <Gift size={14} style={{verticalAlign: "middle", marginRight: 3}} />}</span>
                                    <span className="shift-sale-name">{sale.itemName}</span>
                                  </div>
                                  <div className="shift-sale-meta">
                                    <span>{new Date(sale.timestamp).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</span>
                                    <span>{sale.quantity} db</span>
                                    <span>{fmt(sale.price)} Ft/db</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(sale.totalAmount)} Ft</span>
                                    <span>{sale.paymentMethod === "cash" ? <Banknote size={14} style={{verticalAlign: "middle", marginRight: 2}} /> : sale.paymentMethod === "card" ? <CreditCard size={14} style={{verticalAlign: "middle", marginRight: 2}} /> : <Landmark size={14} style={{verticalAlign: "middle", marginRight: 2}} />}</span>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>{sale.sellerName || "N/A"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {shiftExtrasData.length > 0 && (
                            <div className="shift-extras-list">
                              <h4><CircleDollarSign size={18} style={{verticalAlign: "middle", marginRight: 4}} /> Egyéb Mozgások ({shiftExtrasData.length} db)</h4>
                              {shiftExtrasData.map((extra) => (
                                <div key={extra.id} className={`shift-extra-item ${extra.type}`}>
                                  <span>{extra.description}</span>
                                  <span>{extra.type === "income" ? "+" : "-"}{fmt(extra.amount)} Ft</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sales History Section */}
      {activeAnchor === "sales" && (
      <div className="kassza-content">
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
                {fmt(totalRevenue)} Ft
              </p>
            </div>
            <div className="summary-card">
              <h4>Eladások Száma</h4>
              <p className="summary-count">{totalSalesCount}</p>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            className="kassza-search"
            placeholder="Keresés termék név vagy eladó alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: "12px" }}
          />

          {/* Sales list (read-only) */}
          <div className="kassza-section sales-list-section" style={{ padding: "0", boxShadow: "none", background: "transparent" }}>
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
                        <div className="sale-meta-line">
                          {new Date(sale.timestamp).toLocaleString("hu-HU", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
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
                      <div className="sale-type-badge" style={{ flexShrink: 0 }}>
                        <span className={`sale-type ${sale.itemType === "book" ? "book" : "gift"}`}>
                          {sale.itemType === "book" ? <BookOpen size={14} style={{verticalAlign: "middle", marginRight: 3}} /> : <Gift size={14} style={{verticalAlign: "middle", marginRight: 3}} />}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Shift Delete Confirmation Modal */}
      {shiftToDelete && (
        <div className="kassza-modal">
          <div className="kassza-modal-content" style={{ maxWidth: "500px" }}>
            <h3 style={{ color: "#dc2626", marginBottom: "16px" }}>
              <AlertTriangle size={16} /> Műszak Törlése
            </h3>
            <div className="kassza-modal-body">
              <p style={{ marginBottom: "16px", lineHeight: "1.6" }}>
                <strong>FIGYELEM!</strong> Ez a művelet véglegesen törli a
                műszakot és az összes hozzá tartozó eladást és tranzakciót.
              </p>
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ margin: "0 0 8px", fontWeight: "600" }}>
                  Törlésre kerül:
                </p>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>
                    Műszak:{" "}
                    {new Date(shiftToDelete.closedAt).toLocaleDateString("hu-HU")}
                  </li>
                  <li>
                    Személyzet: {shiftToDelete.staffOnDuty?.join(", ") || "N/A"}
                  </li>
                  <li>
                    Eladások száma:{" "}
                    {sales.filter(
                      (s) =>
                        s.timestamp &&
                        new Date(s.timestamp) >= new Date(shiftToDelete.openedAt) &&
                        new Date(s.timestamp) <= new Date(shiftToDelete.closedAt),
                    ).length}{" "}
                    db
                  </li>
                </ul>
              </div>
              <p style={{ marginBottom: "12px", fontWeight: "600" }}>
                A törlés megerősítéséhez írja be:{" "}
                <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                  JÓVÁHAGY
                </code>
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Írja be: JÓVÁHAGY"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  marginBottom: "16px",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => {
                    setShiftToDelete(null);
                    setDeleteConfirmText("");
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Mégse
                </button>
                <button
                  onClick={handleDeleteShift}
                  disabled={deleteConfirmText !== "JÓVÁHAGY"}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: deleteConfirmText === "JÓVÁHAGY" ? "#dc2626" : "#cbd5e1",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: deleteConfirmText === "JÓVÁHAGY" ? "pointer" : "not-allowed",
                  }}
                >
                  Törlés
                </button>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default NaploPanel;
