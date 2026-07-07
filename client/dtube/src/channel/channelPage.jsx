import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from "../api/config.js";
import useAuth from '../hook/useAuth';
import './channel.css';

export default function ChannelPage() {
  const { channelid } = useParams();
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();

  const [videos, setVideos] = useState([]);
  const [channelMeta, setChannelMeta] = useState(null); //  Tracks channel owner details if video list is empty
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const loggedInUserId = auth?.user_id || auth?.id;

  useEffect(() => {
    if (!channelid) return;

    setLoading(true);
    // Fetch target channel details and their uploads
    API.get(`/channel/${channelid}`)
      .then((response) => {
        const videoData = response.data?.videos || response.data;
        if (Array.isArray(videoData)) {
          setVideos(videoData);
        } else {
          setVideos([]);
        }

        // Save fallback channel metadata context if backend forwards user structures
        if (response.data?.channelUser) {
          setChannelMeta(response.data.channelUser);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching channel data:", err);
        setError("Failed to load channel content. Please try again later.");
        setLoading(false);
      });

  }, [channelid]);

  // Sync state cleanly whenever auth context records modify across frames
  useEffect(() => {
    if (auth?.subscribed && Array.isArray(auth.subscribed)) {
      setIsSubscribed(auth.subscribed.includes(channelid));
    } else {
      setIsSubscribed(false);
    }
  }, [channelid, auth]);

  // 🎯 Handles subscribe/unsubscribe toggle action calling your updated Go Backend endpoints
  const handleSubscribeToggle = async () => {
    if (!loggedInUserId) {
      alert("Please login to subscribe to channels!");
      navigate('/login');
      return;
    }

    setSubLoading(true);
    const endpoint = isSubscribed ? '/unsubscribe' : '/subscribe';
    const payload = {
      user_id: String(loggedInUserId),
      subscribed_to: String(channelid)
    };

    try {
      await API.patch(endpoint, payload);

      // Handle structural mutations on local client profile safely
      const currentSubscriptions = Array.isArray(auth?.subscribed) ? auth.subscribed : [];
      const updatedSubscriptions = isSubscribed
        ? currentSubscriptions.filter(id => id !== channelid)
        : [...currentSubscriptions, channelid];

      const updatedAuth = { ...auth, subscribed: updatedSubscriptions };

      // Commit updates globally across app contexts
      setAuth(updatedAuth);
      localStorage.setItem('user', JSON.stringify(updatedAuth));
      setIsSubscribed(!isSubscribed);
    } catch (err) {
      console.error("Subscription request processing failed:", err);
      alert(err.response?.data?.error || "Failed to update subscription status.");
    } finally {
      setSubLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="channel-loading-container">
        <div className="custom-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="channel-error-container">
        <p>{error}</p>
        <button className="back-home-btn" onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  const hasVideos = videos.length > 0;
  // Deduce name context dynamically
  const channelName = hasVideos
    ? (videos[0].uploadedby || "Anonymous Creator")
    : (channelMeta?.user_name || "Unknown Channel");

  const avatarInitials = channelName.slice(0, 2).toUpperCase();
  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const isOwnChannel = loggedInUserId === channelid;

  return (
    <div className="channel-page-layout">
      <div className="channel-banner-hero" />

      <main className="channel-core-container">
        <section className="channel-profile-header">
          <div className="channel-large-avatar">
            {avatarInitials}
          </div>

          <div className="channel-meta-details-row">
            <div className="channel-meta-text">
              <h1 className="channel-big-title">{channelName}</h1>
              <div className="channel-stats-row">
                <span className="stat-pill">@{channelName.toLowerCase().replace(/\s+/g, '')}</span>
                <span className="stat-dot">•</span>
                <strong>{videos.length}</strong> {videos.length === 1 ? 'video' : 'videos'}
                <span className="stat-dot">•</span>
                <strong>{totalViews.toLocaleString()}</strong> combined views
              </div>
            </div>

            {/* 🎯 Interactive Subscribe/Unsubscribe Button Element */}
            {!isOwnChannel && (
              <div className="channel-action-area">
                <button
                  className={`subscribe-action-btn ${isSubscribed ? 'subscribed-active' : 'subscribe-callout'}`}
                  onClick={handleSubscribeToggle}
                  disabled={subLoading}
                >
                  {subLoading ? 'Processing...' : isSubscribed ? '✓ Subscribed' : 'Subscribe'}
                </button>
              </div>
            )}
          </div>
        </section>

        <hr className="channel-divider" />

        <section className="channel-content-section">
          <h2 className="section-tab-title">Uploads</h2>

          {!hasVideos ? (
            <div className="empty-channel-box">
              <h3>This channel hasn't posted anything yet</h3>
              <p>When they upload content, their video library will display right here.</p>
            </div>
          ) : (
            <div className="channel-video-grid">
              {videos.map((video) => (
                <article
                  key={video._id}
                  className="channel-video-tile"
                  onClick={() => navigate(`/video/${video._id}`)}
                >
                  <div className="channel-thumb-wrapper">
                    {video.url?.thumbnail ? (
                      <img
                        src={video.url.thumbnail}
                        alt={video.descrip}
                        className="channel-tile-img"
                      />
                    ) : (
                      <div className="channel-thumb-placeholder">No Thumbnail</div>
                    )}
                  </div>
                  <div className="channel-tile-info">
                    <h3 className="channel-tile-title" title={video.descrip}>
                      {video.descrip || "Untitled Video"}
                    </h3>
                    <p className="channel-tile-stats">
                      {(video.views || 0).toLocaleString()} views • {video.upload_date ? new Date(video.upload_date).toLocaleDateString() : "Recent"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
