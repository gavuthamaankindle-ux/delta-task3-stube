import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/config.js';
import useAuth from '../hook/useAuth';
import './MyChannel.css';

export default function MyChannel() {
  const { id } = useParams(); // Grabs the channel/user ID from the URL route
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [channelUser, setChannelUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if this channel profile belongs to the logged-in user
  const isOwnChannel = auth?.user_id === id || auth?.id === id;

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch channel owner details (Optional endpoint depending on your Go backend setup)
        // If you don't have a specific user route, fallback to metadata or auth values
        try {
          const userRes = await API.get(`/users/${id}`);
          setChannelUser(userRes.data);
        } catch (userErr) {
          console.warn("Could not fetch user details endpoint, using defaults:", userErr);
          setChannelUser({
            first_name: isOwnChannel ? auth?.first_name : 'Creator',
            uploadedby: 'Anonymous Creator'
          });
        }

        // 2. Fetch videos matching this channel creator's ID
        // Adjust endpoint '/videos/user/' to match your exact Go router route setup
        const videosRes = await API.get(`/videos/user/${id}`);

        if (Array.isArray(videosRes.data)) {
          setVideos(videosRes.data);
        } else if (videosRes.data && typeof videosRes.data === 'object') {
          setVideos([videosRes.data]);
        } else {
          setVideos([]);
        }

      } catch (err) {
        console.error("Error loading channel data:", err);
        setError("Failed to load channel contents.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchChannelData();
    }
  }, [id, auth, isOwnChannel]);

  if (loading) {
    return (
      <div className="channel-loading">
        <div className="custom-spinner"></div>
      </div>
    );
  }

  if (error) return <div className="channel-error">{error}</div>;

  const displayName = channelUser?.first_name || channelUser?.uploadedby || "Creator";
  const avatarInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="channel-container">
      {/* Navbar Header */}
      <header className="main-navbar">
        <div className="navbar-logo" onClick={() => navigate('/home')}>
          <h2>StreamWorkspace</h2>
        </div>
        <button className="nav-btn home-btn" onClick={() => navigate('/home')}>
          Back to Home
        </button>
      </header>

      {/* Channel Header Bio Banner */}
      <section className="channel-profile-banner">
        <div className="channel-avatar-large">
          {avatarInitials}
        </div>
        <div className="channel-meta-info">
          <h1>{displayName}'s Channel</h1>
          <p className="video-count-tag">{videos.length} {videos.length === 1 ? 'video' : 'videos'} uploaded</p>
          {isOwnChannel && <span className="owner-badge">Your Workspace Dashboard</span>}
        </div>
        {isOwnChannel && (
          <button className="channel-upload-shortcut" onClick={() => navigate('/upload')}>
            Upload New Video
          </button>
        )}
      </section>

      <hr className="channel-divider" />

      {/* Videos Section */}
      <section className="channel-videos-section">
        <h2>Uploaded Videos</h2>

        {videos.length === 0 ? (
          <div className="empty-channel-message">
            <h3>No videos found</h3>
            <p>{isOwnChannel ? "You haven't uploaded any content yet!" : "This creator hasn't uploaded any videos yet."}</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <article
                key={video._id}
                className="video-tile"
                onClick={() => navigate(`/video/${video._id}`)}
              >
                <div className="thumbnail-wrapper">
                  {video.url?.thumbnail ? (
                    <img src={video.url.thumbnail} alt={video.descrip} className="grid-thumbnail" />
                  ) : (
                    <div className="thumbnail-placeholder">No Thumbnail</div>
                  )}
                </div>
                <div className="video-details-row">
                  <div className="meta-text-block">
                    <h3 className="tile-title" title={video.descrip}>
                      {video.descrip || "Untitled Video"}
                    </h3>
                    <p className="tile-stats text-muted">
                      {(video.views || 0).toLocaleString()} views • {video.upload_date ? new Date(video.upload_date).toLocaleDateString() : "Unknown date"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
