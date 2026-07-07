import React, { useState, useEffect } from 'react';
import API from "../api/config.js";
import './video.css';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hook/useAuth';

export default function HomeVideoGrid() {
  console.log("Component has loaded into memory!");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //  Admin Management States
  const [users, setUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [viewMode, setViewMode] = useState('videos');

  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();

  // Aligned with your backend middleware role verification check
  const isAdmin = auth?.user_role?.toUpperCase() === 'ADMIN';
  console.log("Current user role:", auth?.user_role, "Is Admin:", isAdmin);

  const handleLogoutClick = async () => {
    try {
      const userIdToSend = auth?.user_id || auth?.id;
      await API.post('/logout', { user_id: String(userIdToSend) });
    } catch (err) {
      console.error("Backend logout error, forcing client cleanup anyway:", err);
    } finally {
      localStorage.removeItem('user');
      setAuth(null);
      navigate('/login');
    }
  };

  //  Handle Ban Action
  const handleBanUser = async (userId) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    try {
      // Adjusted from API.get to API.post to match Go router changes
      await API.post(`/ban-user/${userId}`);

      // Update UI state locally without triggering full database re-fetches
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.user_id === userId ? { ...u, role: 'BANNED' } : u
        )
      );
    } catch (err) {
      console.error("Failed to ban user:", err);
      alert(err.response?.data?.error || "Error processing ban request.");
    }
  };

  //  Handle Unban Action
  const handleUnbanUser = async (userId) => {
    if (!window.confirm("Are you sure you want to unban this user?")) return;
    try {
      await API.post(`/unban-user/${userId}`);

      // Instantly restore user status token back to regular 'USER' locally
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.user_id === userId ? { ...u, role: 'USER' } : u
        )
      );
    } catch (err) {
      console.error("Failed to unban user:", err);
      alert(err.response?.data?.error || "Error processing unban request.");
    }
  };

  // Fetch Home Videos Feed
  useEffect(() => {
    API.get('/videos')
      .then((response) => {
        if (Array.isArray(response.data)) {
          const sortedVideos = [...response.data].sort((a, b) => (b.views || 0) - (a.views || 0));
          setVideos(sortedVideos);
        } else if (response.data && typeof response.data === 'object') {
          setVideos([response.data]);
        } else {
          setVideos([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error:", err);
        setError("Failed to load home feed content.");
        setLoading(false);
      });
  }, []);

  //  Fetch Users if Current Session belongs to an Admin
  useEffect(() => {
    if (isAdmin) {
      setAdminLoading(true);
      API.get('/users')
        .then((response) => {
          if (Array.isArray(response.data)) {
            setUsers(response.data);
          } else {
            setUsers([]);
          }
          setAdminLoading(false);
        })
        .catch((err) => {
          console.error("API Error fetching users:", err);
          setAdminLoading(false);
        });
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="grid-loading">
        <div className="custom-spinner"></div>
      </div>
    );
  }

  if (error) return <div className="grid-error">{error}</div>;

  //  Block access completely if user has been flagged as BANNED
  if (auth?.role === 'BANNED') {
    return (
      <div className="banned-container">
        <div className="banned-message">
          <h2>Your account has been banned.</h2>
          <p>Please contact support for more information.</p>
          <button className="nav-btn logout-btn" onClick={handleLogoutClick}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="home-container">
      <header className="main-navbar">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <h2>StreamWorkspace</h2>
        </div>
        <nav className="navbar-actions">
          {auth ? (
            <>
              {isAdmin && (
                <button
                  className={`nav-btn admin-toggle-btn ${viewMode === 'users' ? 'active-tab' : ''}`}
                  onClick={() => setViewMode(viewMode === 'videos' ? 'users' : 'videos')}
                >
                  {viewMode === 'videos' ? ' Admin Dashboard' : 'View Videos'}
                </button>
              )}
              <button className="nav-btn mychannel-btn" onClick={() => navigate(`/mychannel/${auth.user_id}`)}>
                My Channel
              </button>
              <button className="nav-btn upload-btn" onClick={() => navigate('/upload')}>
                Upload Video
              </button>
              <button className="nav-btn logout-btn" onClick={handleLogoutClick}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="nav-btn login-btn" onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="nav-btn register-btn" onClick={() => navigate('/register')}>
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      {/* --- CONDITIONAL PANEL RENDER SYSTEM --- */}
      {isAdmin && viewMode === 'users' ? (
        <div className="admin-panel-container" style={{ padding: '20px' }}>
          <div className="home-header">
            <h1>User Management Dashboard</h1>
            <p>Review system accounts, monitor registrations, and enforce platform layout bans.</p>
          </div>

          {adminLoading ? (
            <div className="custom-spinner"></div>
          ) : users.length === 0 ? (
            <p>No platform users found.</p>
          ) : (
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                    <th style={{ padding: '10px' }}>Full Name</th>
                    <th>Email Address</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Unknown User";
                    const userRole = user.role || "USER";

                    return (
                      <tr key={user.user_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{fullName}</td>
                        <td>{user.email || 'N/A'}</td>
                        <td style={{ color: '#666', fontFamily: 'monospace' }}>{user.user_id}</td>
                        <td>
                          <span className={`role-badge ${userRole.toLowerCase()}`}>
                            {userRole}
                          </span>
                        </td>
                        <td>
                          {userRole === 'BANNED' ? (
                            <button
                              className="nav-btn"
                              style={{ backgroundColor: '#2ecc71', color: '#fff', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={() => handleUnbanUser(user.user_id)}
                            >
                              Unban User
                            </button>
                          ) : userRole === 'ADMIN' ? (
                            <span style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>Protected (Admin)</span>
                          ) : (
                            <button
                              className="nav-btn logout-btn"
                              style={{ backgroundColor: '#ff4d4d', color: '#fff', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={() => handleBanUser(user.user_id)}
                            >
                              Ban User
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="home-header">
            <h1>Home Feed</h1>
            {auth && <p className="welcome-tag">Welcome back, {auth.first_name || 'User'}! {isAdmin && "(Admin Account)"}</p>}
            <p>Welcome to your personalized video feed. Enjoy the latest content!</p>
          </div>

          {videos.length === 0 ? (
            <div className="empty-feed-message">
              <h2>No videos available</h2>
              <p>Your database collection is currently empty or your Go backend can't find it.</p>
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => {
                const channelName = video.uploadedby || "Anonymous";
                const avatarInitials = channelName.slice(0, 2).toUpperCase();

                return (
                  <article
                    key={video._id}
                    className="video-tile"
                    onClick={() => navigate(`/video/${video._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="thumbnail-wrapper">
                      {video.url?.thumbnail ? (
                        <img
                          src={video.url.thumbnail}
                          alt={video.descrip}
                          className="grid-thumbnail"
                        />
                      ) : (
                        <div className="thumbnail-placeholder">No Thumbnail</div>
                      )}
                    </div>

                    <div className="video-details-row">
                      <div
                        className="channel-avatar-placeholder"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (video.uploadedbyid) {
                            navigate(`/channel/${video.uploadedbyid}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {avatarInitials}
                      </div>
                      <div className="meta-text-block">
                        <h3 className="tile-title" title={video.descrip}>
                          {video.descrip || "Untitled Video"}
                        </h3>

                        <p
                          className="channel-name text-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (video.uploadedbyid) {
                              navigate(`/channel/${video.uploadedbyid}`);
                            }
                          }}
                          style={{ cursor: 'pointer', display: 'inline-block' }}
                        >
                          {channelName}
                        </p>

                        <p className="tile-stats text-muted">
                          {(video.views || 0).toLocaleString()} views • {video.upload_date ? new Date(video.upload_date).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
