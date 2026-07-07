import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/config.js'; // Adjust this path to match your api file location
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Simple structural validation client-side before sending to Go validators
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Sends payload mapping cleanly to your Go struct json tags
      const response = await api.post('/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        role: "USER"

      });

      setMessage({ type: 'success', text: 'Account created successfully! Redirecting to login...' });

      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      console.error("Full validation structural log:", error.response?.data);
      const errorMsg = error.response?.data?.details || error.response?.data?.error || 'Registration failed. Try again.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Create Account</h2>
          <p>Join the team platform workspace</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="row-group">
            <div className="input-group">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Craig"
                disabled={isLoading}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Denton"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="•••••••• (Min 6 chars)"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="register-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {message.text && (
          <div className={`form-alert ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;