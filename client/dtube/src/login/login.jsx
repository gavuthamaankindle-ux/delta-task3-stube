import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/config.js';
import './Login.css';
import useAuth from '../hook/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { auth, setAuth } = useAuth();

  //  OAuth Catch Mechanics: Capture url parameters on callback landing
  useEffect(() => {
    const token = searchParams.get('token');

    const userId = searchParams.get('user_id') || searchParams.get('id');
    const firstName = searchParams.get('first_name');
    const userRole = searchParams.get('role') || searchParams.get('user_role'); // 🛠️ Handle both common query variants

    if (token) {
      setIsLoading(true);
      setMessage({ type: 'success', text: 'OAuth verification successful! Authenticating...' });

      const oAuthSessionPayload = {
        token: token,
        user_id: userId,
        id: userId,
        first_name: firstName || 'User',
        user_role: userRole || 'user' //  Extracted user role saved safely
      };

      setAuth(oAuthSessionPayload);
      localStorage.setItem('user', JSON.stringify(oAuthSessionPayload));

      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1200);
    }
  }, [searchParams, setAuth, navigate]);

  // Existing Standard Credential Submission Method
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/login', { email, password });


      const backendData = response.data;

      const loginSessionPayload = {
        token: backendData.token,
        user_id: backendData.user_id || backendData.id,
        id: backendData.user_id || backendData.id,
        first_name: backendData.first_name || 'User',
        // Dynamically safeguards the user_role assignment for standard logins
        user_role: backendData.user_role || backendData.role || 'user'
      };

      setAuth(loginSessionPayload);

      // Save standardized object to localStorage to persist user roles correctly
      localStorage.setItem('user', JSON.stringify(loginSessionPayload));

      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });

      setTimeout(() => {
        navigate('/home');
      }, 1200);

    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Invalid email or password.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    window.location.href = "http://localhost:8081/auth/google/login";
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to access your dashboard metrics</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              required
            />
          </div>

          <div className="login-utility-row">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {message.text && (
          <div className={`form-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="oauth-divider">
          <span>OR</span>
        </div>

        <div className="oauth-button-stack">
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="oauth-btn google-provider"
            disabled={isLoading}
          >
            <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/copy_of_googleg_24dp.png" alt="" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
