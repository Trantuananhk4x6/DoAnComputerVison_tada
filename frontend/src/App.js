import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import VideoProcessing from './pages/VideoProcessing';
import LiveDetection from './pages/LiveDetection';
import DetectionHistory from './pages/DetectionHistory';

function App({ socket }) {
  return (
    <Routes>
      <Route path="/" element={<Layout socket={socket} />}>
        <Route index element={<Dashboard />} />
        <Route path="video-processing" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <VideoProcessing socket={socket} />
          </React.Suspense>
        } />
        <Route path="live-detection" element={<LiveDetection socket={socket} />} />
        <Route path="detection-history" element={<DetectionHistory />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;