import React, { useState } from 'react';
import API from '../api/config.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await API.post('/forgot-password', { email: email.trim() });
      setMessage({ type: 'success', text: "Reset link sent! Check your inbox." });

      if (res.data.debug_token_link) {
        console.log("Local Dev Link:", res.data.debug_token_link);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', background: '#1e1e1e', color: '#fff', borderRadius: '8px' }}>
      <h2>Forgot Password</h2>
      <p style={{ color: '#aaa', fontSize: '14px' }}>Enter your email address and we'll send you a link to reset your password.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#111', color: '#fff' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#f1f1f1', color: '#0f0f0f', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message.text && <p style={{ color: message.type === 'success' ? '#4caf50' : '#f44336', marginTop: '10px' }}>{message.text}</p>}
    </div>
  );
}