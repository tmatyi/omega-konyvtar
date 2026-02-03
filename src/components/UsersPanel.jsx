import { useState, useEffect } from "react";
import { database, ref, onValue, off, remove, update } from "../firebase.js";

const UsersPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    const usersRef = ref(database, "users");

    const handleUsersData = (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const usersList = Object.keys(usersData).map((userId) => ({
          id: userId,
          ...usersData[userId],
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    };

    onValue(usersRef, handleUsersData);

    return () => {
      off(usersRef, "value", handleUsersData);
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

  // Debug information (remove in production)
  console.log("Users Panel Debug:", {
    totalUsers: users.length,
    filteredUsers: filteredUsers.length,
    searchTerm,
    filterRole,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      hasEmail: !!u.email,
      hasDisplayName: !!u.displayName,
    })),
  });

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
      return "Csak admin törölhet tulajdonost";
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
      bio: selectedUser.bio || "",
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
      owner: "Tulajdonos",
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
        <div className="users-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Összes felhasználó</div>
          </div>
        </div>
      </div>

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
          Tulajdonos
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
            {users.length > 0 && (
              <p className="debug-info">
                Debug: {users.length} felhasználó található összesen, de a
                szűrés miatt egyik sem jelenik meg. Keresési szó: "{searchTerm}"
                | Szerepkör szűrés: {filterRole}
              </p>
            )}
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
                      {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <h3>{user.displayName || "Ismeretlen felhasználó"}</h3>
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

        {/* Debug section - show discrepancy */}
        {users.length !== filteredUsers.length && (
          <div
            className="debug-section"
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            <strong>Debug Információ:</strong>
            <br />• Összes felhasználó: {users.length}
            <br />• Szűrt felhasználók: {filteredUsers.length}
            <br />• Keresési szó: "{searchTerm || "(üres)"}"<br />• Szerepkör
            szűrés: {filterRole}
            <br />• Hiányzó felhasználók: {users.length - filteredUsers.length}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal">
          <div className="modal-content user-details-modal">
            <div className="modal-header">
              <h2>Felhasználó Részletei</h2>
              <button
                className="close-btn"
                onClick={() => setShowUserDetails(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-inner-content">
              <div className="user-details-content">
                <div className="user-detail-avatar">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedUser.displayName?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </div>
                  )}
                </div>

                <div className="user-detail-info">
                  {!isEditingUser ? (
                    <>
                      <div className="user-detail-name">
                        {selectedUser.displayName || "Ismeretlen felhasználó"}
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
                        <label>Bemutatkozás:</label>
                        <span>{selectedUser.bio || "Nincs megadva"}</span>
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
                          <option value="owner">Tulajdonos</option>
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

                      <div className="form-group">
                        <label>Bemutatkozás:</label>
                        <textarea
                          name="bio"
                          value={editFormData.bio}
                          onChange={handleEditInputChange}
                          className="edit-input"
                          rows={3}
                          placeholder="Meséljen a felhasználóról..."
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
        </div>
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
                    {selectedUser.displayName || "Ismeretlen felhasználó"}
                  </strong>
                  <span>{selectedUser.email}</span>
                </div>
                <p className="delete-warning">
                  Ez a művelet <strong>visszavonhatatlan</strong> és véglegesen
                  törli a felhasználó összes adatát a rendszerből.
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
  );
};

export default UsersPanel;
