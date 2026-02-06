# Admin Role Setup Guide

## Method 1: Firebase Console (Recommended)

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (omega-konyvtar)
3. Go to "Realtime Database" on the left menu

### Step 2: Update User Role
1. Find the user with email: `takacsmatyas77@gmail.com`
2. Click on the user entry to expand it
3. Add or update the `role` field: `"admin"`
4. Click "Save" or "Update"

The structure should look like:
```json
{
  "users": {
    "USER_ID": {
      "email": "takacsmatyas77@gmail.com",
      "name": "User Name",
      "role": "admin",
      "phone": "phone_number",
      "address": "address",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

## Method 2: Add Admin Panel to App

### Create Admin User Management Component

You could add an admin panel to the app to manage user roles:

```jsx
// Add to App.jsx
const [showAdminPanel, setShowAdminPanel] = useState(false);

// Add admin panel component
const AdminPanel = ({ users, onUpdateUserRole }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const handleRoleUpdate = (userId, newRole) => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, { role: newRole, updatedAt: new Date().toISOString() });
    setSelectedUser(null);
    setNewRole("");
  };

  return (
    <div className="admin-panel">
      <h3>Admin Panel - User Role Management</h3>
      <div className="user-list">
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
              <span className={`user-role ${user.role}`}>
                {user.role || "user"}
              </span>
            </div>
            <select
              value={selectedUser?.id === user.id ? newRole : user.role || "user"}
              onChange={(e) => {
                if (selectedUser?.id === user.id) {
                  setNewRole(e.target.value);
                }
              }}
              onClick={() => setSelectedUser(user.id)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
            </select>
            {selectedUser?.id === user.id && (
              <button
                onClick={() => handleRoleUpdate(user.id, newRole)}
                className="update-role-btn"
              >
                Update Role
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Add Admin Panel Access Control

```jsx
// Add to App.jsx - show admin panel only for admins
{user?.email === "takacsmatyas77@gmail.com" && (
  <button
    onClick={() => setShowAdminPanel(!showAdminPanel)}
    className="admin-toggle-btn"
  >
    {showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
  </button>
)}

{showAdminPanel && user?.email === "takacsmatyas77@gmail.com" && (
  <AdminPanel users={users} onUpdateUserRole={handleRoleUpdate} />
)}
```

## Method 3: Quick Firebase Update Script

Create a simple script to update the role:

```javascript
// Run this in browser console on Firebase Console page
const adminEmail = "takacsmatyas77@gmail.com";

// Find all users and identify the target
const users = /* Get from your database */;
const targetUser = users.find(u => u.email === adminEmail);

if (targetUser) {
  const userRef = firebase.database().ref(`users/${targetUser.id}`);
  userRef.update({
    role: "admin",
    updatedAt: new Date().toISOString()
  }).then(() => {
    console.log("Admin role assigned successfully");
  }).catch(error => {
    console.error("Error assigning admin role:", error);
  });
}
```

## Security Considerations

1. **Email Verification**: Ensure only verified emails can get admin roles
2. **Role-Based Access**: Implement role checks throughout the app
3. **Audit Trail**: Log all role changes with timestamps
4. **Admin Dashboard**: Consider creating a dedicated admin interface

## Current User Status

The user `takacsmatyas77@gmail.com` is mentioned in IDEAS.md as having admin privileges, but needs the `role` field updated in the Firebase database to actually have admin access in the application.

**Recommended Action**: Use Method 1 (Firebase Console) for immediate admin access.
