import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('adminLoggedIn') === 'true');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,
    ordersInProgress: 0,
    completedOrders: 0,
    avgGenerationTime: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('adminLoggedIn', 'true');
      setPasswordError('');
      loadStats();
    } else {
      setPasswordError('Password incorrect');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
    setPassword('');
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetch from Firebase Firestore to get order stats
      const FIREBASE_DB_URL = 'https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents';

      const response = await fetch(`${FIREBASE_DB_URL}/orders`);
      const data = await response.json();

      if (data.documents) {
        const orders = data.documents.map(doc => ({
          id: doc.name.split('/').pop(),
          orderId: doc.fields.orderId?.stringValue || '',
          fiverr_order: doc.fields.fiverr_order?.stringValue || '',
          package: doc.fields.package?.stringValue || 'standard',
          status: doc.fields.status?.stringValue || 'pending',
          createdAt: doc.fields.createdAt?.stringValue || '',
          products: JSON.parse(doc.fields.products?.stringValue || '[]'),
          results: JSON.parse(doc.fields.results?.stringValue || '[]'),
        }));

        setOrders(orders);
        calculateStats(orders);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersList) => {
    // Calculate revenue (simplified - use package prices)
    const prices = { basic: 15, standard: 30, premium: 55 };
    const thisMonth = new Date();
    thisMonth.setDate(1);

    let revenue = 0;
    let inProgress = 0;
    let completed = 0;
    let totalTime = 0;
    let timeCount = 0;

    ordersList.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= thisMonth) {
        revenue += prices[order.package] || 0;
      }

      if (order.status === 'pending' || order.status === 'pending_review') {
        inProgress++;
      } else if (order.status === 'delivered') {
        completed++;
      }

      // Calculate average generation time (mock)
      totalTime += Math.random() * 60 + 30; // 30-90 min
      timeCount++;
    });

    setStats({
      thisMonthRevenue: revenue,
      ordersInProgress: inProgress,
      completedOrders: completed,
      avgGenerationTime: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h1>Admin Dashboard</h1>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="input-field"
              />
            </div>
            {passwordError && <p className="error-message">{passwordError}</p>}
            <button type="submit" className="login-button">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'pending_review':
        return '#ff9f43';
      case 'delivered':
        return '#c8f564';
      case 'revision':
        return '#4a9eff';
      default:
        return '#ccc';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Processing';
      case 'pending_review':
        return 'Awaiting Review';
      case 'delivered':
        return 'Completed';
      case 'revision':
        return 'Revision';
      default:
        return status;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>This Month Revenue</h3>
            <p className="stat-value">${stats.thisMonthRevenue}</p>
          </div>
        </div>

        <div className="stat-card progress">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <p className="stat-value">{stats.ordersInProgress}</p>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completed Orders</h3>
            <p className="stat-value">{stats.completedOrders}</p>
          </div>
        </div>

        <div className="stat-card time">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Avg Generation Time</h3>
            <p className="stat-value">{stats.avgGenerationTime}m</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-section">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <button className="refresh-button" onClick={loadStats} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="no-orders">No orders yet</p>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Fiverr Order</th>
                  <th>Package</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice().reverse().map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">{order.fiverr_order}</td>
                    <td className="package">
                      <span className={`package-badge ${order.package}`}>
                        {order.package.charAt(0).toUpperCase() + order.package.slice(1)}
                      </span>
                    </td>
                    <td className="products-count">
                      {order.products.length} product{order.products.length !== 1 ? 's' : ''}
                    </td>
                    <td className="status">
                      <span
                        className="status-badge"
                        style={{ borderColor: getStatusColor(order.status) }}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="date">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="revenue">
                      ${order.package === 'basic' ? 19 : order.package === 'standard' ? 49 : 99}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
