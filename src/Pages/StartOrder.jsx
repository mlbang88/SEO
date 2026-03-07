import React, { useState, useEffect } from 'react';
import '../styles/StartOrder.css';

export default function StartOrder() {
  const [isGenerating, setIsGenerating] = useState(true);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    const token = generateUUID();
    
    // Redirect to form with token immediately (no Firebase save)
    setTimeout(() => {
      window.location.href = `/form?token=${token}`;
    }, 800);
  }, []);

  return (
    <div className="start-order-container">
      <div className="start-order-card">
        <div className="spinner"></div>
        <h2>🚀 Generating your unique order...</h2>
        <p>Redirecting to form...</p>
      </div>
    </div>
  );
}
