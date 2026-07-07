import React from 'react';
import VideoPlayerPage from './videocard/videocrad';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './register/register.jsx';
import Login from './login/login.jsx';
import VideoUpload from './videoupload/videoUpload.jsx';
import HomeVideoGrid from './video/video.jsx';
import ChannelPage from './channel/channelPage.jsx';
import ForgotPassword from './forgetpassword/Forgetpassword.jsx';
import ResetPassword from './resetpassword/resetPassword.jsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Automatically redirect the base URL '/' straight to your login page */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/channel/:channelid" element={<ChannelPage />} />
        <Route path="/mychannel/:channelid" element={<ChannelPage />} />
        <Route path="/video/:id" element={<VideoPlayerPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<HomeVideoGrid />} />
        <Route path="/upload" element={<VideoUpload />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Fallback layout for typos */}
        <Route path="*" element={<div style={{ color: '#fff', padding: '20px' }}>404: Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;