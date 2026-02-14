import React, { useState, useEffect } from "react";
import "./Sidebar.css";

// Build timestamp injected at build time by Vite
const BUILD_TIMESTAMP =
  typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : null;

const formatBuildDate = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

function Sidebar({
  user,
  onLogout,
  activeTab,
  onTabChange,
  activeMode,
  onModeChange,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  let hoverTimeout;

  // Update main content margin when sidebar state changes (desktop only)
  useEffect(() => {
    const mainContent = document.querySelector(".main-content-with-sidebar");
    if (mainContent && window.innerWidth > 768) {
      mainContent.style.marginLeft = isCollapsed ? "80px" : "280px";
    }
  }, [isCollapsed]);

  // Reset margin on resize
  useEffect(() => {
    const handleResize = () => {
      const mainContent = document.querySelector(".main-content-with-sidebar");
      if (mainContent) {
        if (window.innerWidth <= 768) {
          mainContent.style.marginLeft = "0px";
        } else {
          mainContent.style.marginLeft = isCollapsed ? "80px" : "280px";
        }
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed]);

  const tabs = [
    {
      id: "books",
      label: "Könyvesbolt",
      icon: "📚",
      mode: "bolt",
      requiresRole: null,
    },
    {
      id: "gifts",
      label: "Ajándékok",
      icon: "🎁",
      mode: "bolt",
      requiresRole: null,
    },
    {
      id: "kassza",
      label: "Kassza",
      icon: "💰",
      mode: "bolt",
      requiresRole: null,
    },
    {
      id: "library",
      label: "Könyvtár",
      icon: "🏛️",
      mode: "könyvtár",
      requiresRole: null,
    },
    {
      id: "lending",
      label: "Kölcsönzés",
      icon: "📖",
      mode: "könyvtár",
      requiresRole: "admin",
    },
    {
      id: "users",
      label: "Felhasználók",
      icon: "👥",
      mode: null,
      requiresRole: "admin",
    },
    {
      id: "logout",
      label: "Kilépés",
      icon: "🚪",
      mode: null,
      requiresRole: null,
    },
  ];

  // Get visible tabs based on mode and role
  const visibleTabs = tabs.filter((tab) => {
    const modeMatch = tab.mode === null || tab.mode === activeMode;
    const roleMatch =
      tab.requiresRole === null || user?.role === tab.requiresRole;
    return modeMatch && roleMatch;
  });

  const handleTabClick = (tabId) => {
    if (tabId === "logout") {
      setShowLogoutConfirm(true);
    } else {
      onTabChange(tabId);
      setShowMobileMenu(false);
    }
  };

  // Check if current tab is visible in current mode, if not, switch to first available tab
  useEffect(() => {
    const currentTab = tabs.find((tab) => tab.id === activeTab);
    if (
      currentTab &&
      currentTab.mode !== null &&
      currentTab.mode !== activeMode
    ) {
      const availableTab = tabs.find(
        (tab) => tab.mode === null || tab.mode === activeMode,
      );
      if (availableTab && availableTab.id !== "logout") {
        onTabChange(availableTab.id);
      }
    }
  }, [activeMode, activeTab]);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout);
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    if (!isSticky) {
      hoverTimeout = setTimeout(() => {
        setIsCollapsed(true);
      }, 300);
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const toggleSticky = () => {
    setIsSticky(!isSticky);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Mobile bottom bar tabs (exclude logout, profile handled separately)
  const mobileMainTabs = visibleTabs.filter(
    (tab) => tab.id !== "logout" && tab.id !== "users",
  );

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <div
        className={`sidebar desktop-sidebar ${isCollapsed ? "collapsed" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-user" onClick={() => handleTabClick("profile")}>
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="user-avatar-img" />
            ) : (
              getInitials(user?.displayName || user?.name || user?.email)
            )}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <div className="user-name">
                {user?.displayName || user?.name || "Felhasználó"}
              </div>
              <div className="user-email">{user?.email}</div>
            </div>
          )}
          {!isCollapsed && (
            <button
              className={`collapse-btn ${isSticky ? "sticky" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSticky();
              }}
              title={
                isSticky
                  ? "Unpin sidebar (auto-collapse)"
                  : "Pin sidebar (stay open)"
              }
            >
              {isSticky ? "📌" : "📍"}
            </button>
          )}
        </div>

        {/* Mode Switcher Section */}
        <div className="mode-switcher">
          <div className="mode-buttons">
            <button
              className={`mode-btn ${activeMode === "könyvtár" ? "active" : ""}`}
              onClick={() => onModeChange("könyvtár")}
              title={isCollapsed ? "Könyvtár mód" : ""}
            >
              <span className="mode-icon">🏛️</span>
              {!isCollapsed && <span className="mode-name">Könyvtár</span>}
            </button>
            <button
              className={`mode-btn ${activeMode === "bolt" ? "active" : ""}`}
              onClick={() => onModeChange("bolt")}
              title={isCollapsed ? "Bolt mód" : ""}
            >
              <span className="mode-icon">🛒</span>
              {!isCollapsed && <span className="mode-name">Bolt</span>}
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""} ${
                tab.id === "logout" ? "logout-tab" : ""
              }`}
              onClick={() => handleTabClick(tab.id)}
              title={isCollapsed ? tab.label : ""}
            >
              <span className="tab-icon">{tab.icon}</span>
              {!isCollapsed && <span className="tab-label">{tab.label}</span>}
            </button>
          ))}
        </nav>
        {!isCollapsed && BUILD_TIMESTAMP && (
          <div
            style={{
              padding: "8px 20px 12px",
              fontSize: "11px",
              color: "#8899a6",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            Frissítve: {formatBuildDate(BUILD_TIMESTAMP)}
          </div>
        )}
      </div>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <div className="mobile-bottom-bar">
        <div className="mobile-tabs">
          {mobileMainTabs.map((tab) => (
            <button
              key={tab.id}
              className={`mobile-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <svg
                className="mobile-tab-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {tab.id === "books" && (
                  <>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </>
                )}
                {tab.id === "gifts" && (
                  <>
                    <path d="M20 12v10H4V12" />
                    <path d="M2 7h20v5H2z" />
                    <path d="M12 22V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </>
                )}
                {tab.id === "kassza" && (
                  <>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </>
                )}
                {tab.id === "library" && (
                  <>
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </>
                )}
                {tab.id === "lending" && (
                  <>
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </>
                )}
              </svg>
              <span className="mobile-tab-label">{tab.label}</span>
            </button>
          ))}

          <button
            className={`mobile-tab ${showMobileMenu || activeTab === "profile" || activeTab === "users" ? "active" : ""}`}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg
              className="mobile-tab-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
            <span className="mobile-tab-label">Több</span>
          </button>
        </div>
      </div>

      {/* ===== MOBILE "MORE" MENU ===== */}
      {showMobileMenu && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="mobile-menu-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-menu-handle" />

            {/* User info */}
            <div
              className="mobile-menu-user"
              onClick={() => {
                handleTabClick("profile");
                setShowMobileMenu(false);
              }}
            >
              <div className="mobile-menu-avatar">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="mobile-menu-avatar-img"
                  />
                ) : (
                  getInitials(user?.displayName || user?.name || user?.email)
                )}
              </div>
              <div className="mobile-menu-user-info">
                <div className="mobile-menu-user-name">
                  {user?.displayName || user?.name || "Felhasználó"}
                </div>
                <div className="mobile-menu-user-email">{user?.email}</div>
              </div>
              <span className="mobile-menu-chevron">›</span>
            </div>

            <div className="mobile-menu-divider" />

            {/* Mode Switcher */}
            <div className="mobile-menu-section-label">Mód</div>
            <div className="mobile-menu-mode-switcher">
              <button
                className={`mobile-menu-mode-btn ${activeMode === "könyvtár" ? "active" : ""}`}
                onClick={() => onModeChange("könyvtár")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Könyvtár
              </button>
              <button
                className={`mobile-menu-mode-btn ${activeMode === "bolt" ? "active" : ""}`}
                onClick={() => onModeChange("bolt")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Bolt
              </button>
            </div>

            <div className="mobile-menu-divider" />

            {/* Admin-only items */}
            {user?.role === "admin" && (
              <button
                className={`mobile-menu-item ${activeTab === "users" ? "active" : ""}`}
                onClick={() => {
                  handleTabClick("users");
                  setShowMobileMenu(false);
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="mobile-menu-item-label">Felhasználók</span>
              </button>
            )}

            {/* Logout */}
            <button
              className="mobile-menu-item mobile-menu-item-danger"
              onClick={() => {
                setShowMobileMenu(false);
                setShowLogoutConfirm(true);
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="mobile-menu-item-label">Kijelentkezés</span>
            </button>

            {BUILD_TIMESTAMP && (
              <div
                style={{
                  padding: "12px 16px 8px",
                  fontSize: "11px",
                  color: "#9ca3af",
                  textAlign: "center",
                }}
              >
                Frissítve: {formatBuildDate(BUILD_TIMESTAMP)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <div className="logout-confirm-header">
              <h3>Kijelentkezés Megerősítése</h3>
            </div>
            <div className="logout-confirm-body">
              <p>Biztosan ki szeretne jelentkezni?</p>
              <p className="logout-confirm-subtext">
                Újra be kell jelentkeznie a fiókjához való hozzáféréshez.
              </p>
            </div>
            <div className="logout-confirm-actions">
              <button
                className="logout-confirm-cancel"
                onClick={handleLogoutCancel}
              >
                Mégse
              </button>
              <button
                className="logout-confirm-logout"
                onClick={handleLogoutConfirm}
              >
                Kijelentkezés
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
