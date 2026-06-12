import {
  ShoppingCart,
  Building2,
  Gift,
  CircleDollarSign,
  ClipboardList,
  BookMarked,
  Users,
} from "lucide-react";

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-card-thumb" />
    <div className="skeleton skeleton-card-line" />
    <div className="skeleton skeleton-card-line short" />
  </div>
);

const SkeletonTableRow = ({ withThumb }) => (
  <div className="skeleton-table-row">
    {withThumb && <div className="skeleton skeleton-cell thumb" />}
    <div className="skeleton skeleton-cell wide" />
    <div className="skeleton skeleton-cell" />
    <div className="skeleton skeleton-cell" />
    <div className="skeleton skeleton-cell" />
  </div>
);

const SkeletonStat = () => (
  <div className="skeleton-stat">
    <div className="skeleton skeleton-num" />
    <div className="skeleton skeleton-label" />
  </div>
);

const SkeletonUserCard = () => (
  <div className="skeleton-card" style={{ alignItems: "center" }}>
    <div className="skeleton skeleton-avatar" />
    <div className="skeleton skeleton-card-line" style={{ width: "70%", marginTop: 8 }} />
    <div className="skeleton skeleton-card-line short" />
  </div>
);

const PanelWrapper = ({ wrapperClass, icon: Icon, title, children }) => (
  <div className={wrapperClass}>
    <div className="panel-header">
      <h2><Icon size={20} style={{ verticalAlign: "middle", marginRight: 6 }} /> {title}</h2>
    </div>
    {children}
  </div>
);

const SkeletonUI = ({ activeTab, activeMode, cardDensity }) => {
  switch (activeTab) {
    case "books":
    case null: // default tab
      // Könyvesbolt (bolt mode)
      return (
        <PanelWrapper wrapperClass="books-panel" icon={ShoppingCart} title="Könyvesbolt">
          <div className="panel-controls">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonTableRow key={i} withThumb />
            ))}
          </div>
        </PanelWrapper>
      );

    case "library":
      // Könyvtár (library mode) — card grid
      return (
        <PanelWrapper wrapperClass="library-panel" icon={Building2} title="Omega Könyvtár">
          <div className="panel-controls">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
          <div
            className="skeleton-grid"
            style={{ "--card-density": cardDensity || 5 }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </PanelWrapper>
      );

    case "gifts":
      // Ajándéktárgyak
      return (
        <PanelWrapper wrapperClass="gifts-panel" icon={Gift} title="Ajándéktárgyak">
          <div className="panel-controls">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} withThumb />
            ))}
          </div>
        </PanelWrapper>
      );

    case "kassza":
      // Kassza (POS)
      return (
        <PanelWrapper wrapperClass="kassza-panel" icon={CircleDollarSign} title="Kassza">
          <div className="skeleton-stats-row">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </div>
        </PanelWrapper>
      );

    case "naplo":
      // Napló (shift + sales history)
      return (
        <PanelWrapper wrapperClass="naplo-panel" icon={ClipboardList} title="Napló">
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-pill" />
          </div>
          <div className="skeleton-stats-row">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </div>
        </PanelWrapper>
      );

    case "lending":
      // Kölcsönzés
      return (
        <PanelWrapper wrapperClass="lending-panel" icon={BookMarked} title="Könyvtári Kölcsönzés">
          <div className="skeleton-stats-row">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                <div className="skeleton" style={{ width: 48, height: 64, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton skeleton-card-line" />
                  <div className="skeleton skeleton-card-line short" />
                </div>
              </div>
            ))}
          </div>
        </PanelWrapper>
      );

    case "users":
      // Felhasználók
      return (
        <PanelWrapper wrapperClass="users-panel" icon={Users} title="Felhasználók Kezelése">
          <div className="skeleton-controls">
            <div className="skeleton skeleton-btn" style={{ width: "100%", maxWidth: 300 }} />
          </div>
          <div className="skeleton-controls">
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-pill" />
          </div>
          <div className="skeleton-grid" style={{ "--card-density": 4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonUserCard key={i} />
            ))}
          </div>
        </PanelWrapper>
      );

    case "profile":
    default:
      // Profile — auth data already loaded, no skeleton needed
      return (
        <PanelWrapper wrapperClass="profile-panel" icon={Users} title="Profilom">
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
            Betöltés...
          </div>
        </PanelWrapper>
      );
  }
};

export default SkeletonUI;
