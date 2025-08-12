// components/LaunchCountdown.js
import React, { useState, useEffect } from 'react';

export default function LaunchCountdown({ launchDate, onLaunch }) {
  const [isClient, setIsClient] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getRemainingTime());
  
  // Zet isClient pas op true na mount om SSR mismatch te voorkomen
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Interval voor countdown
  useEffect(() => {
    if (!isClient) return;
    
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(interval);
        onLaunch?.();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isClient, onLaunch]);

  // Helper: bereken resterende tijd
  function getRemainingTime() {
    const total = Date.parse(launchDate) - Date.now();
    const seconds = Math.max(0, Math.floor((total / 1000) % 60));
    const minutes = Math.max(0, Math.floor((total / 1000 / 60) % 60));
    const hours   = Math.max(0, Math.floor((total / (1000 * 60 * 60)) % 24));
    const days    = Math.max(0, Math.floor(total / (1000 * 60 * 60 * 24)));
    return { total, days, hours, minutes, seconds };
  }

  // Voorkom rendering tijdens SSR
  if (!isClient) return null;

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        fontFamily: 'Press Start 2P, monospace',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
        Canvas Loading...
      </h2>
    </div>
  );
}
