import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MerciPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: '#131313', border: '1px solid #252525', borderRadius: 22,
        padding: 52, maxWidth: 500, width: '100%', textAlign: 'center',
        animation: 'fadeUp .45s ease both',
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: '2rem',
          color: '#f0f0f0', marginBottom: 12,
        }}>Payment confirmed!</h1>
        <p style={{ color: '#777', lineHeight: 1.7, marginBottom: 32, fontSize: 15 }}>
          We're generating your SEO descriptions right now.<br />
          You'll receive an email with your revision link in a few minutes.
        </p>
        <div style={{
          background: 'rgba(200,245,100,0.06)', border: '1px solid rgba(200,245,100,0.2)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 32, fontSize: 13, color: '#c8f564',
        }}>
          📧 Check your inbox — the email might take 2–5 minutes to arrive.
        </div>
        <button onClick={() => navigate('/')} style={{
          background: 'transparent', border: '1px solid #333', borderRadius: 10,
          color: '#888', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          padding: '10px 24px', cursor: 'pointer',
        }}>
          ← Back to homepage
        </button>
      </div>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
