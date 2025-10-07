import React, { useState, useEffect } from 'react';
import './UserManager.css';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    plan: 'free',
    status: 'active'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // Load from localStorage or mock data
    const savedUsers = JSON.parse(localStorage.getItem('nebula_users') || '[]');
    
    if (savedUsers.length === 0) {
      // Generate mock users if none exist
      const mockUsers = generateMockUsers();
      localStorage.setItem('nebula_users', JSON.stringify(mockUsers));
      setUsers(mockUsers);
    } else {
      setUsers(savedUsers);
    }
  };

  const generateMockUsers = () => {
    const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson', 'Diana Lee', 'Frank Miller', 'Grace Davis', 'Henry Taylor', 'Ivy Chen'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'business.org'];
    const plans = ['free', 'pro', 'business'];
    const statuses = ['active', 'inactive', 'suspended'];

    return names.map((name, index) => ({
      id: `user_${Date.now()}_${index}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@${domains[index % domains.length]}`,
      plan: plans[Math.floor(Math.random() * plans.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created: Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
      lastActive: Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
      conversions: Math.floor(Math.random() * 100),
      storageUsed: Math.floor(Math.random() * 5000), // MB
      country: ['US', 'CA', 'UK', 'DE', 'FR', 'AU'][Math.floor(Math.random() * 6)]
    }));
  };

  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
      return matchesSearch && matchesPlan;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'email': return a.email.localeCompare(b.email);
        case 'plan': return a.plan.localeCompare(b.plan);
        case 'created': return b.created - a.created;
        case 'lastActive': return b.lastActive - a.lastActive;
        default: return 0;
      }
    });

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email) {
      alert('Please fill in all required fields');
      return;
    }

    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newUser,
      created: Date.now(),
      lastActive: Date.now(),
      conversions: 0,
      storageUsed: 0,
      country: 'US'
    };

    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));
    
    setNewUser({ name: '', email: '', plan: 'free', status: 'active' });
    setShowCreateModal(false);
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdateUser = () => {
    const updatedUsers = users.map(user => 
      user.id === editingUser.id ? editingUser : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (window.confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) {
      const updatedUsers = users.map(user => {
        if (selectedUsers.includes(user.id)) {
          switch (action) {
            case 'activate':
              return { ...user, status: 'active' };
            case 'deactivate':
              return { ...user, status: 'inactive' };
            case 'suspend':
              return { ...user, status: 'suspended' };
            default:
              return user;
          }
        }
        return user;
      });

      if (action === 'delete') {
        const filteredUsers = users.filter(user => !selectedUsers.includes(user.id));
        setUsers(filteredUsers);
        localStorage.setItem('nebula_users', JSON.stringify(filteredUsers));
      } else {
        setUsers(updatedUsers);
        localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));
      }

      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'free': return '#9e9e9e';
      case 'pro': return '#2196f3';
      case 'business': return '#9c27b0';
      default: return '#607d8b';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'inactive': return '#ff9800';
      case 'suspended': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <div className="user-manager">
      <div className="user-header">
        <h2>👥 User Management</h2>
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{users.filter(u => u.status === 'active').length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{users.filter(u => u.plan !== 'free').length}</span>
            <span className="stat-label">Premium</span>
          </div>
        </div>
      </div>

      <div className="user-controls">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="created">Created Date</option>
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="plan">Plan</option>
            <option value="lastActive">Last Active</option>
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            + Create User
          </button>
          {selectedUsers.length > 0 && (
            <div className="bulk-actions">
              <button onClick={() => handleBulkAction('activate')} className="bulk-btn">
                Activate
              </button>
              <button onClick={() => handleBulkAction('deactivate')} className="bulk-btn">
                Deactivate
              </button>
              <button onClick={() => handleBulkAction('suspend')} className="bulk-btn danger">
                Suspend
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(filteredUsers.map(u => u.id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </th>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Active</th>
              <th>Conversions</th>
              <th>Storage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                </td>
                <td>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </td>
                <td>
                  <span 
                    className="plan-badge"
                    style={{ backgroundColor: getPlanColor(user.plan) }}
                  >
                    {user.plan}
                  </span>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  >
                    {user.status}
                  </span>
                </td>
                <td>{formatDate(user.created)}</td>
                <td>{formatDate(user.lastActive)}</td>
                <td>{user.conversions}</td>
                <td>{(user.storageUsed / 1024).toFixed(1)}GB</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleEditUser(user)} className="edit-btn">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="delete-btn">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New User</h3>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label>Plan:</label>
              <select
                value={newUser.plan}
                onChange={(e) => setNewUser({...newUser, plan: e.target.value})}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({...newUser, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleCreateUser} className="create-btn">
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit User</h3>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Plan:</label>
              <select
                value={editingUser.plan}
                onChange={(e) => setEditingUser({...editingUser, plan: e.target.value})}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select
                value={editingUser.status}
                onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleUpdateUser} className="update-btn">
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;