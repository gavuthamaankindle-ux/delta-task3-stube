import React, { useState } from 'react';
import './VideoUpload.css';
import useAuth from '../hook/useAuth';

const VideoUpload = () => {
  const [descrip, setDescrip] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { auth } = useAuth();
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!auth || !auth.user_id || !auth.first_name) {
      setMessage({ type: 'error', text: 'User session missing. Please log in again.' });
      return;
    }

    if (!descrip || !videoFile || !thumbnailFile) {
      setMessage({ type: 'error', text: 'Please fulfill description, video file, and thumbnail card tracks.' });
      return;
    }

    // Add a temporary console.log here to inspect what is actually being sent
    console.log("Payload data: ", { userId: auth.user_id, userName: auth.first_name });



    if (!descrip || !videoFile || !thumbnailFile) {
      setMessage({ type: 'error', text: 'Please fulfill description, video file, and thumbnail card tracks.' });
      return;
    }

    setIsUploading(true);
    setMessage({ type: 'info', text: 'Requesting cloud-lease signatures from Go backend...' });

    try {
      // STEP 1: Request signed paths from your Go port 8081 backend
      const response = await fetch('http://localhost:8081/video/request-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Includes HTTP-only session cookies automatically
        body: JSON.stringify({
          filename: videoFile.name,
          thumbnail_filename: thumbnailFile.name,
          descrip: descrip,
          user_id: auth.user_id,
          user_name: auth.first_name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to grab signature leases. Verify login session.');
      }

      // Read exact targets configured from backend controllers
      const { uploadUrl, thumbnailUrl, videoId } = await response.json();

      setMessage({ type: 'info', text: 'Uploading binary payloads concurrently directly to Supabase...' });

      // STEP 2: Concurrently push binaries to Supabase using PUT requests 🎯
      const videoUplink = fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoFile.type || 'video/mp4' // Pass content type explicitly
        },
        body: videoFile
      });

      const thumbnailUplink = fetch(thumbnailUrl, {
        method: 'PUT', 
        headers: {
          'Content-Type': thumbnailFile.type || 'image/png' // Pass content type explicitly
        },
        body: thumbnailFile
      });

      // Execute both uploads side-by-side to boost throughput speed
      const [videoRes, thumbRes] = await Promise.all([videoUplink, thumbnailUplink]);

      if (videoRes.ok && thumbRes.ok) {
        setMessage({ type: 'success', text: `Success! Media completely deployed. Reference ID: ${videoId}` });
        setDescrip('');
        setVideoFile(null);
        setThumbnailFile(null);
        document.getElementById('video-file-input').value = '';
        document.getElementById('thumb-file-input').value = '';
      } else {
        throw new Error('Cloud storage provider rejected payload binary bounds.');
      }

    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'An unexpected runtime error occurred.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-wrapper">
      <div className="glass-upload-card">
        <div className="card-header">
          <h2>Upload Team Media</h2>
          <p className="subtitle">Upload track validation clips, analysis runs, or FEA simulation outputs.</p>
        </div>

        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="descrip">Video Description</label>
            <textarea
              id="descrip"
              value={descrip}
              onChange={(e) => setDescrip(e.target.value)}
              placeholder="e.g., Torsional Rigidity Frame FEA Simulation Run"
              disabled={isUploading}
            />
          </div>

          <div className="file-grid">
            <div className="form-group">
              <label htmlFor="video-file-input">Select Video File</label>
              <div className="custom-file-input">
                <input
                  id="video-file-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="thumb-file-input">Select Thumbnail Preview Image</label>
              <div className="custom-file-input">
                <input
                  id="thumb-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files[0])}
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={`submit-btn ${isUploading ? 'loading' : ''}`}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading Assets...' : 'Upload Media Bundle'}
          </button>
        </form>

        {message.text && (
          <div className={`alert-box ${message.type}`}>
            <span className="alert-icon">
              {message.type === 'error' ? '❌' : message.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <p className="alert-text">{message.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
