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

const UsersPanel = ({ user, users = [] }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [pendingGuests, setPendingGuests] = useState([]);
  const [approvePassword, setApprovePassword] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  useEffect(() => {
    // Load pending guests
    const guestsRef = ref(database, "pendingGuests");
    const handleGuestsData = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map((id) => ({ id, ...data[id] }))
          .filter((g) => g.status === "pending");
        setPendingGuests(list);
      } else {
        setPendingGuests([]);
      }
    };
    onValue(guestsRef, handleGuestsData);

    return () => {
      off(guestsRef, "value", handleGuestsData);
    };
  }, []);

  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    // Safe search filtering - handle null/undefined values
    const userEmail = (user.email || "").toLowerCase();
    const userDisplayName = (user.displayName || "").toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch =
      userEmail.includes(searchTermLower) ||
      userDisplayName.includes(searchTermLower);

    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  // Get user statistics
  const getUserStats = () => {
    const totalUsers = users.length;
    const adminUsers = users.filter((u) => u.role === "admin").length;
    const ownerUsers = users.filter((u) => u.role === "owner").length;
    const memberUsers = users.filter((u) => u.role === "member").length;

    return { totalUsers, adminUsers, ownerUsers, memberUsers };
  };

  const stats = getUserStats();

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?.id) return;

    setDeleteLoading(true);
    try {
      const userRef = ref(database, `users/${selectedUser.id}`);
      await remove(userRef);

      // Close modals and reset state
      setShowDeleteConfirm(false);
      setShowUserDetails(false);
      setSelectedUser(null);

      console.log("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const canDeleteUser = () => {
    // Cannot delete self
    if (selectedUser?.id === user?.uid) return false;

    // Only admins can delete admins
    if (selectedUser?.role === "admin" && user?.role !== "admin") return false;

    // Only admins can delete owners
    if (selectedUser?.role === "owner" && user?.role !== "admin") return false;

    return true;
  };

  const getDeleteButtonTooltip = () => {
    if (selectedUser?.id === user?.uid) {
      return "Nem törölheti a saját fiókját";
    }
    if (selectedUser?.role === "admin" && user?.role !== "admin") {
      return "Csak admin törölhet admint";
    }
    if (selectedUser?.role === "owner" && user?.role !== "admin") {
      return "Csak admin törölhet szolgálot";
    }
    return "Felhasználó törlése";
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleEditUser = () => {
    setEditFormData({
      displayName: selectedUser.displayName || "",
      email: selectedUser.email || "",
      phone: selectedUser.phone || "",
      address: selectedUser.address || "",
      role: selectedUser.role || "member",
    });
    setIsEditingUser(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveUser = async () => {
    if (!selectedUser?.id) return;

    try {
      const userRef = ref(database, `users/${selectedUser.id}`);
      await update(userRef, {
        ...editFormData,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setSelectedUser((prev) => ({
        ...prev,
        ...editFormData,
        updatedAt: new Date().toISOString(),
      }));

      setIsEditingUser(false);
      console.log("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingUser(false);
    setEditFormData({});
  };

  // Approve a pending guest: create Firebase Auth user, save to users, remove from pending
  const handleApproveGuest = async (guest) => {
    if (!approvePassword || approvePassword.length < 6) {
      alert("A jelszónak legalább 6 karakter hosszúnak kell lennie!");
      return;
    }
    setApproveLoading(true);
    try {
      // We can't create users from client without signing them in,
      // so we save the approved user to a special node for manual setup
      const approvedRef = ref(database, `pendingGuests/${guest.id}`);
      await update(approvedRef, {
        status: "approved",
        approvedBy: user?.email || "admin",
        approvedAt: new Date().toISOString(),
        tempPassword: approvePassword,
      });

      // Also create a pre-registered user entry
      const preRegRef = ref(database, "preRegisteredUsers");
      const newRef = push(preRegRef);
      await set(newRef, {
        name: guest.name,
        email: guest.email,
        tempPassword: approvePassword,
        role: "member",
        approvedBy: user?.email || "admin",
        approvedAt: new Date().toISOString(),
        status: "ready",
      });

      setApprovingId(null);
      setApprovePassword("");
    } catch (error) {
      console.error("Error approving guest:", error);
      alert("Hiba történt a jóváhagyás során!");
    }
    setApproveLoading(false);
  };

  const handleRejectGuest = async (guest) => {
    try {
      const guestRef = ref(database, `pendingGuests/${guest.id}`);
      await update(guestRef, {
        status: "rejected",
        rejectedBy: user?.email || "admin",
        rejectedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error rejecting guest:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadge = (role) => {
    const roleStyles = {
      admin: "role-badge admin",
      owner: "role-badge owner",
      member: "role-badge member",
    };

    const roleLabels = {
      admin: "Admin",
      owner: "Szolgáló",
      member: "Tag",
    };

    return (
      <span className={roleStyles[role] || "role-badge member"}>
        {roleLabels[role] || "Tag"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="users-panel">
        <div className="loading-container">
          <div className="modern-loader">
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <p>Felhasználók betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-panel">
      <div className="users-header">
        <h2>Felhasználók Kezelése</h2>
        <div className="user-count">Összes felhasználó: {stats.totalUsers}</div>
      </div>

      {/* Pending Guest Approvals */}
      {pendingGuests.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fbbf24",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 14px",
              color: "#92400e",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            ⏳ Jóváhagyásra váró vendégek ({pendingGuests.length})
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {pendingGuests.map((guest) => (
              <div
                key={guest.id}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#1f2937",
                        fontSize: "15px",
                      }}
                    >
                      {guest.name}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                      {guest.email}
                    </div>
                    <div
                      style={{
                        color: "#9ca3af",
                        fontSize: "12px",
                        marginTop: "2px",
                      }}
                    >
                      Regisztrált: {formatDate(guest.registeredAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {approvingId !== guest.id ? (
                      <>
                        <button
                          onClick={() => {
                            setApprovingId(guest.id);
                            setApprovePassword("");
                          }}
                          style={{
                            background: "#059669",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ✅ Jóváhagyás
                        </button>
                        <button
                          onClick={() => handleRejectGuest(guest)}
                          style={{
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ❌ Elutasítás
                        </button>
                      </>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Jelszó beállítása..."
                          value={approvePassword}
                          onChange={(e) => setApprovePassword(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            border: "2px solid #e9ecef",
                            borderRadius: "8px",
                            fontSize: "14px",
                            minWidth: "160px",
                          }}
                        />
                        <button
                          onClick={() => handleApproveGuest(guest)}
                          disabled={
                            approveLoading || approvePassword.length < 6
                          }
                          style={{
                            background:
                              approvePassword.length >= 6
                                ? "#059669"
                                : "#94a3b8",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor:
                              approvePassword.length >= 6
                                ? "pointer"
                                : "not-allowed",
                          }}
                        >
                          {approveLoading ? "..." : "Mentés"}
                        </button>
                        <button
                          onClick={() => {
                            setApprovingId(null);
                            setApprovePassword("");
                          }}
                          style={{
                            background: "#6b7280",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Mégse
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="users-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Keresés név vagy email alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="role-filters">
        <button
          className={`role-filter-btn ${filterRole === "all" ? "active" : ""}`}
          onClick={() => setFilterRole("all")}
        >
          Összes
        </button>
        <button
          className={`role-filter-btn ${filterRole === "admin" ? "active" : ""}`}
          onClick={() => setFilterRole("admin")}
        >
          Admin
        </button>
        <button
          className={`role-filter-btn ${filterRole === "owner" ? "active" : ""}`}
          onClick={() => setFilterRole("owner")}
        >
          Szolgáló
        </button>
        <button
          className={`role-filter-btn ${filterRole === "member" ? "active" : ""}`}
          onClick={() => setFilterRole("member")}
        >
          Tag
        </button>
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>Nem található felhasználó a megadott feltételekkel.</p>
          </div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="user-card"
                onClick={() => handleUserClick(user)}
              >
                <div className="user-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(user.displayName || user.name)
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <h3>
                    {user.displayName || user.name || "Ismeretlen felhasználó"}
                  </h3>
                  <p className="user-email">{user.email}</p>
                  <div className="user-meta">{getRoleBadge(user.role)}</div>
                  <div className="user-dates">
                    <small>Regisztráció: {formatDate(user.createdAt)}</small>
                    {user.lastLogin && (
                      <small>
                        Utoljára bejelentkezve: {formatDate(user.lastLogin)}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(5px)",
                zIndex: 9999,
              }}
              onClick={() => setShowUserDetails(false)}
            ></div>

            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "white",
                borderRadius: "16px",
                padding: "40px",
                maxWidth: "500px",
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
                zIndex: 10000,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "30px",
                  paddingBottom: "15px",
                  borderBottom: "2px solid #f1f5f9",
                }}
              >
                <h2
                  style={{
                    margin: "0",
                    color: "#1e293b",
                    fontSize: "24px",
                    fontWeight: "700",
                  }}
                >
                  Felhasználó Részletei
                </h2>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: "0",
                    width: "30px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setShowUserDetails(false)}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#f1f5f9";
                    e.target.style.color = "#475569";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "none";
                    e.target.style.color = "#64748b";
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  paddingRight: "10px",
                }}
              >
                <div className="user-details-content">
                  <div className="user-detail-avatar">
                    {selectedUser.photoURL ? (
                      <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {(selectedUser.displayName || selectedUser.name)
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  <div className="user-detail-info">
                    {!isEditingUser ? (
                      <>
                        <div className="user-detail-name">
                          {selectedUser.displayName ||
                            selectedUser.name ||
                            "Ismeretlen felhasználó"}
                        </div>
                        <div className="user-detail-email">
                          {selectedUser.email}
                        </div>

                        <div className="detail-row">
                          <label>Szerepkör:</label>
                          <span>{getRoleBadge(selectedUser.role)}</span>
                        </div>
                        <div className="detail-row">
                          <label>Telefonszám:</label>
                          <span>{selectedUser.phone || "Nincs megadva"}</span>
                        </div>
                        <div className="detail-row">
                          <label>Lakcím:</label>
                          <span>{selectedUser.address || "Nincs megadva"}</span>
                        </div>
                        <div className="detail-row">
                          <label>Regisztráció dátuma:</label>
                          <span>{formatDate(selectedUser.createdAt)}</span>
                        </div>
                        <div className="detail-row">
                          <label>Utoljára bejelentkezve:</label>
                          <span>{formatDate(selectedUser.lastLogin)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="user-edit-form">
                        <div className="form-group">
                          <label>Név:</label>
                          <input
                            type="text"
                            name="displayName"
                            value={editFormData.displayName}
                            onChange={handleEditInputChange}
                            className="edit-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Email:</label>
                          <input
                            type="email"
                            name="email"
                            value={editFormData.email}
                            onChange={handleEditInputChange}
                            className="edit-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Szerepkör:</label>
                          <select
                            name="role"
                            value={editFormData.role}
                            onChange={handleEditInputChange}
                            className="edit-input"
                          >
                            <option value="member">Tag</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Szolgáló</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Telefonszám:</label>
                          <input
                            type="tel"
                            name="phone"
                            value={editFormData.phone}
                            onChange={handleEditInputChange}
                            className="edit-input"
                            placeholder="+36 20 123 4567"
                          />
                        </div>

                        <div className="form-group">
                          <label>Lakcím:</label>
                          <input
                            type="text"
                            name="address"
                            value={editFormData.address}
                            onChange={handleEditInputChange}
                            className="edit-input"
                            placeholder="1234 Budapest, Utca utca 1."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-buttons">
                  {!isEditingUser ? (
                    <>
                      <button
                        className="edit-btn"
                        onClick={handleEditUser}
                        disabled={selectedUser?.id === user?.uid}
                        title={
                          selectedUser?.id === user?.uid
                            ? "Nem szerkesztheti a saját fiókját"
                            : "Felhasználó szerkesztése"
                        }
                      >
                        ✏️ Szerkesztés
                      </button>
                      <button
                        className="delete-btn"
                        onClick={handleDeleteClick}
                        disabled={!canDeleteUser()}
                        title={getDeleteButtonTooltip()}
                      >
                        🗑️ Törlés
                      </button>
                      <button onClick={() => setShowUserDetails(false)}>
                        Bezárás
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        ❌ Mégse
                      </button>
                      <button className="save-btn" onClick={handleSaveUser}>
                        💾 Mentés
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedUser && (
          <div className="modal">
            <div className="modal-content delete-confirm-modal">
              <div className="modal-header">
                <h2>Felhasználó Törlésének Megerősítése</h2>
                <button className="close-btn" onClick={handleDeleteCancel}>
                  ×
                </button>
              </div>

              <div className="delete-confirm-content">
                <div className="delete-confirm-icon">⚠️</div>
                <div className="delete-confirm-text">
                  <h3>Biztosan törölni szeretné ezt a felhasználót?</h3>
                  <div className="delete-user-info">
                    <strong>
                      {selectedUser.displayName ||
                        selectedUser.name ||
                        "Ismeretlen felhasználó"}
                    </strong>
                    <span>{selectedUser.email}</span>
                  </div>
                  <p className="delete-warning">
                    Ez a művelet <strong>visszavonhatatlan</strong> és
                    véglegesen törli a felhasználó összes adatát a rendszerből.
                  </p>
                </div>
              </div>

              <div className="modal-buttons delete-confirm-buttons">
                <button
                  className="cancel-btn"
                  onClick={handleDeleteCancel}
                  disabled={deleteLoading}
                >
                  Mégse
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Törlés..." : "🗑️ Igen, Törlés"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPanel;
