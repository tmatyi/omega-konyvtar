import { useState, useEffect } from "react";
import { Trash2, Pencil, X, Save, AlertTriangle, Users } from "lucide-react";
import {
  database,
  dbRef,
  ref,
  onValue,
  off,
  remove,
  update,
  push,
  set,
  deleteUserCallable,
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteMessageError, setInviteMessageError] = useState(false);
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    // Load sent invites
    const invitesRef = dbRef(database, "invites");
    const handleData = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map((id) => ({ id, ...data[id] }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setInvites(list);
      } else {
        setInvites([]);
      }
    };
    onValue(invitesRef, handleData);

    return () => {
      off(invitesRef, "value", handleData);
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

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?.id) return;

    setDeleteLoading(true);
    try {
      // Call the Cloud Function that deletes both the Auth account and RTDB record
      await deleteUserCallable(selectedUser.id);

      // Close modals and reset state
      setShowDeleteConfirm(false);
      setShowUserDetails(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      const message =
        error?.details?.message || error?.message || "Ismeretlen hiba történt.";
      alert(`Sikertelen törlés: ${message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowUserDetails(false);
    setShowDeleteConfirm(true);
  };

  const canDeleteUser = () => {
    // Cannot delete self — only admins see this panel
    if (selectedUser?.id === user?.uid) return false;
    return true;
  };

  const getDeleteButtonTooltip = () => {
    if (selectedUser?.id === user?.uid) {
      return "Nem törölheti a saját fiókját";
    }
    return "Felhasználó törlése";
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setShowUserDetails(true);
  };

  const handleEditUser = () => {
    setEditFormData({
      displayName: selectedUser.displayName || "",
      email: selectedUser.email || "",
      role: selectedUser.role || "owner",
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
      const userRef = dbRef(database, `users/${selectedUser.id}`);
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
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingUser(false);
    setEditFormData({});
  };

  // Send invite to a new szolgáló
  const handleInviteSend = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const emailLower = inviteEmail.trim().toLowerCase();
    setInviteLoading(true);
    setInviteMessage("");
    setInviteMessageError(false);

    // Check if the email is already a registered user
    const alreadyRegistered = users.some(
      (u) => (u.email || "").toLowerCase() === emailLower
    );
    if (alreadyRegistered) {
      setInviteMessage("Ez az email cím már regisztrálva van a rendszerben.");
      setInviteMessageError(true);
      setInviteLoading(false);
      return;
    }

    // Check if there's already a pending invite for this email
    const alreadyInvited = invites.some(
      (inv) =>
        inv.email.toLowerCase() === emailLower &&
        (inv.status === "pending" || inv.status === "sent")
    );
    if (alreadyInvited) {
      setInviteMessage("Erre az email címre már van függőben lévő meghívó.");
      setInviteMessageError(true);
      setInviteLoading(false);
      return;
    }

    try {
      const token = crypto.randomUUID();
      const invitesRef = dbRef(database, "invites");
      const newRef = push(invitesRef);
      await set(newRef, {
        email: emailLower,
        token,
        invitedBy: user?.uid,
        invitedByName: user?.displayName || user?.email,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      setInviteEmail("");
      setInviteMessage("Meghívó sikeresen létrehozva!");
      setInviteMessageError(false);
    } catch (err) {
      console.error("Invite error:", err);
      setInviteMessage("Hiba történt a meghívó küldése során.");
      setInviteMessageError(true);
    }
    setInviteLoading(false);
  };

  // Revoke/delete an invite
  const handleRevokeInvite = async (inviteId, inviteEmail) => {
    if (!window.confirm(`Biztosan törlöd a(z) ${inviteEmail} címre küldött meghívót?`)) return;
    try {
      const inviteRef = dbRef(database, `invites/${inviteId}`);
      await remove(inviteRef);
    } catch (err) {
      console.error("Revoke invite error:", err);
      alert("Hiba történt a meghívó törlése során.");
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
    };

    const roleLabels = {
      admin: "Adminisztrátor",
      owner: "Szolgáló",
    };

    return (
      <span className={roleStyles[role] || "role-badge owner"}>
        {roleLabels[role] || "Szolgáló"}
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
      <div className="panel-header">
        <h2><Users size={20} style={{verticalAlign: "middle", marginRight: 6}} /> Felhasználók Kezelése</h2>
      </div>

      {/* Invite Section */}
      <div className="invite-section">
        <h3>Új Szolgáló Meghívása</h3>
        <form onSubmit={handleInviteSend} className="invite-form">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email cím..."
            required
            className="invite-email-input"
          />
          <button
            type="submit"
            disabled={inviteLoading || !inviteEmail.trim()}
            className="invite-send-btn"
          >
            {inviteLoading ? "Küldés..." : "Meghívás Küldés"}
          </button>
        </form>
        {inviteMessage && (
          <div className={`invite-message${inviteMessageError ? " error" : ""}`}>{inviteMessage}</div>
        )}
        {invites.length > 0 && (
          <div className="invite-list">
            <h4>Küldött meghívók</h4>
            {invites.map((inv) => (
              <div key={inv.id} className="invite-item">
                <span className="invite-email">{inv.email}</span>
                <span className={`invite-status invite-status-${inv.status}`}>
                  {inv.status === "pending"
                    ? "Függő"
                    : inv.status === "sent"
                      ? "Elküldve"
                      : inv.status === "accepted"
                        ? "Elfogadva"
                        : inv.status === "email_failed"
                          ? "Hiba"
                          : inv.status}
                </span>
                <span className="invite-date">{formatDate(inv.createdAt)}</span>
                <button
                  className="invite-revoke-btn"
                  title="Meghívó törlése"
                  onClick={() => handleRevokeInvite(inv.id, inv.email)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
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
          Szolgáló
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
                  textAlign: "center",
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
              </div>

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
                    {/* Name */}
                    {!isEditingUser ? (
                      <div className="user-detail-name">
                        {selectedUser.displayName ||
                          selectedUser.name ||
                          "Ismeretlen felhasználó"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        name="displayName"
                        value={editFormData.displayName}
                        onChange={handleEditInputChange}
                        className="inline-edit-input inline-edit-name"
                        placeholder="Teljes név"
                      />
                    )}

                    {/* Email */}
                    {!isEditingUser ? (
                      <div className="user-detail-email">
                        {selectedUser.email}
                      </div>
                    ) : (
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        className="inline-edit-input inline-edit-email"
                        placeholder="Email cím"
                      />
                    )}

                    {/* Szerepkör */}
                    <div className="detail-row">
                      <label>Szerepkör:</label>
                      {!isEditingUser ? (
                        <span>{getRoleBadge(selectedUser.role)}</span>
                      ) : (
                        <select
                          name="role"
                          value={editFormData.role}
                          onChange={handleEditInputChange}
                          className="inline-edit-select"
                        >
                          <option value="owner">Szolgáló</option>
                          <option value="admin">Adminisztrátor</option>
                        </select>
                      )}
                    </div>

                    <div className="detail-row">
                      <label>Regisztráció dátuma:</label>
                      <span>{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <label>Utoljára bejelentkezve:</label>
                      <span>{formatDate(selectedUser.lastLogin)}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-buttons">
                  {!isEditingUser ? (
                    <>
                      <button
                        className="edit-btn"
                        onClick={handleEditUser}
                      >
                        <Pencil size={14} style={{verticalAlign: "middle", marginRight: 4}} /> Szerkesztés
                      </button>
                      <button
                        className="delete-btn"
                        onClick={handleDeleteClick}
                        disabled={!canDeleteUser()}
                        title={getDeleteButtonTooltip()}
                      >
                        <Trash2 size={14} style={{verticalAlign: "middle", marginRight: 4}} /> Törlés
                      </button>
                      <button onClick={() => setShowUserDetails(false)}>
                        Bezárás
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        <X size={14} style={{verticalAlign: "middle", marginRight: 4}} /> Mégse
                      </button>
                      <button className="save-btn" onClick={handleSaveUser}>
                        <Save size={14} style={{verticalAlign: "middle", marginRight: 4}} /> Mentés
                      </button>
                    </>
                  )}
                </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedUser && (
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
              onClick={handleDeleteCancel}
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
                maxWidth: "450px",
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
                  textAlign: "center",
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
                  Felhasználó Törlésének Megerősítése
                </h2>
              </div>

              <div className="delete-confirm-content">
                <div className="delete-confirm-icon"><AlertTriangle size={32} /></div>
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
                  {deleteLoading ? "Törlés..." : <><Trash2 size={14} style={{verticalAlign: "middle", marginRight: 4}} /> Igen, Törlés</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersPanel;
