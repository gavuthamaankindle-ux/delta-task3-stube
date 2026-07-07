import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/config.js';
import useAuth from '../hook/useAuth';
import './videocard.css';

export default function VideoPlayerPage() {
  const { id } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const videoPlayerRef = useRef(null);

  // States
  const [videoData, setVideoData] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // 1. Fetch main video data on load
  useEffect(() => {
    setLoading(true);
    API.get(`/video/${id}`)
      .then((res) => {
        console.log("Backend response payload:", res.data); // 🔍 Debug exactly what you get back

        // If your backend mistakenly wraps the single video object inside an array:
        const data = Array.isArray(res.data) ? res.data[0] : res.data;

        if (!data) {
          setVideoData(null);
          setLoading(false);
          return;
        }

        setVideoData(data);
        const mainUrl = data.url?.videourl || data.video_url;
        setCurrentVideoUrl(mainUrl);
        setLikeCount(data.likes || 0);
        setComments(Array.isArray(data.Comments) ? data.Comments : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load video:", err);
        setLoading(false);
      });
  }, [id]);

  // Automatically reload video tag when track source string changes
  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.load();
    }
  }, [currentVideoUrl]);

  // 2. Like Toggle Action (Fixed Double Execution and Balance Layout)
  const handleLikeToggle = async () => {
    if (!auth) return navigate('/login');

    // Optimistic Update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      if (newLikedState) {
        await API.patch(`/video/${id}/like`);
      } else {
        await API.patch(`/video/${id}/removelike`);
      }
    } catch (err) {
      console.error("Error updating engagement metrics:", err);
      // Revert states on server-side error reject response
      setIsLiked(isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  // 3. Comment Submission Handler (Aligned with Go Struct: content)
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!auth) return navigate('/login');

    const commentPayload = {
      comment: newComment
    };

    try {
      const response = await API.patch(`/video/${id}/addcomment`, commentPayload);
      // Safely catch the created response object and push it to feed tracking arrays
      const freshCommentObject = {
        _id: response.data._id || Math.random().toString(36).substring(2), // Fallback key safety
        content: newComment,
        upload_date: new Date().toISOString()
      };
      setComments([freshCommentObject, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  // Helper: Detects regular URLs
  const checkIsUrl = (text) => {
    try {
      const url = new URL(text);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };

  const handleLoadExternalTrack = (url) => {
    setCurrentVideoUrl(url);
  };




  if (loading) return <div className="video-page-loading"><div className="custom-spinner"></div></div>;
  if (!videoData) return <div className="video-page-error">Video context asset metadata not found.</div>;




  return (
    <div className="watch-page-wrapper">
      <div className="media-playback-column">

        <div className="video-frame-container">
          <video
            ref={videoPlayerRef}
            className="html5-video-player"
            controls
            autoPlay
          >
            <source src={currentVideoUrl} type="video/mp4" />
            Your browser does not support the video tag structure layouts.
          </video>
        </div>

        <div className="video-meta-summary-card">
          <h1 className="watch-video-title">{videoData.descrip || "Untitled Stream Presentation"}</h1>
          <div className="engagement-action-row">
            <span className="playback-views-metrics">{(videoData.views || 0).toLocaleString()} views</span>

            <button
              className={`action-btn-layout like-button-node ${isLiked ? 'active-liked-state' : ''}`}
              onClick={handleLikeToggle}
            >
              👍 {isLiked ? 'Liked' : 'Like'} ({likeCount})
            </button>
          </div>
        </div>

        <section className="comments-section-container">
          <h3>{comments.length} Comments</h3>

          {auth ? (
            <form className="comment-input-form-layout" onSubmit={handleCommentSubmit}>
              <input
                type="text"
                placeholder="Add a public comment... "
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="submit-comment-btn" onClick={handleCommentSubmit}>
                Comment
              </button>
            </form>
          ) : (
            <p className="login-prompt-alert" onClick={() => navigate('/login')}>
              Please Sign In to leave a comment feedback loop or load alternative storage streams.
            </p>
          )}

          <div className="comments-feed-list-stack">
            {comments.map((comment, index) => {
              // 🎯 Checked against your model 'content' parameter tracking requirements
              const commentText = comment.content || '';
              const containsUrl = checkIsUrl(commentText);

              return (
                <div key={comment._id || index} className="comment-card-item">
                  <div className="user-avatar-circle">U</div>
                  <div className="comment-content-block">
                    <span className="commenter-username-label">Anonymous User</span>

                    {containsUrl ? (
                      <p className="comment-text-body">
                        Shared a custom cloud track asset stream:{' '}
                        <span
                          className="interactive-stream-link-anchor"
                          onClick={() => handleLoadExternalTrack(commentText)}
                          title="Click to mount track pointer link resource into media player panel viewport frame assembly."
                          style={{ color: '#00d2ff', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {commentText} 🔗 (Click to Play this Cloud Stream)
                        </span>
                      </p>
                    ) : (
                      <p className="comment-text-body">{commentText}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}