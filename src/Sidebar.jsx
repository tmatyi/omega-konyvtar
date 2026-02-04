import React, { useState, useEffect } from "react";
import "./Sidebar.css";

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
  let hoverTimeout;

  // Update main content margin when sidebar state changes
  useEffect(() => {
    const mainContent = document.querySelector(".main-content-with-sidebar");
    if (mainContent) {
      mainContent.style.marginLeft = isCollapsed ? "80px" : "280px";
    }
  }, [isCollapsed]);

  const tabs = [
    { id: "books", label: "Bolt", icon: "📚", mode: "bolt" },
    { id: "library", label: "Könyvtár", icon: "🏛️", mode: "könyvtár" },
    { id: "lending", label: "Kölcsönzés", icon: "📖", mode: "könyvtár" },
    { id: "users", label: "Felhasználók", icon: "👥", mode: null }, // Always visible
    { id: "logout", label: "Kijelentkezés", icon: "🚪", mode: null }, // Always visible
  ];

  const handleTabClick = (tabId) => {
    console.log("Sidebar handleTabClick called with:", tabId);
    if (tabId === "logout") {
      setShowLogoutConfirm(true);
    } else {
      // Just navigate to the tab (hover handles expanding)
      console.log("Calling onTabChange with:", tabId);
      onTabChange(tabId);
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
      // Current tab is not visible in this mode, find first available tab
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

  return (
    <>
      <div
        className={`sidebar ${isCollapsed ? "collapsed" : ""}`}
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
                e.stopPropagation(); // Prevent triggering profile navigation
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
          {tabs
            .filter((tab) => tab.mode === null || tab.mode === activeMode)
            .map((tab) => (
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
      </div>

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
