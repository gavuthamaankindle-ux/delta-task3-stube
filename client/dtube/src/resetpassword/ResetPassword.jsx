import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/config.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await API.post('/reset-password', { token, new_password: newPassword });
      setMessage({ type: 'success', text: "Password reset successful! Routing to login..." });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || "Link invalid or expired." });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>Invalid or missing token parameter.</div>;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', background: '#1e1e1e', color: '#fff', borderRadius: '8px' }}>
      <h2>Set New Password</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
        <input
          type="password"
          placeholder="New Password (min 6 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#f1f1f1', color: '#0f0f0f', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
      {message.text && <p style={{ color: message.type === 'success' ? '#4caf50' : '#f44336', marginTop: '10px' }}>{message.text}</p>}
    </div>
  );
}