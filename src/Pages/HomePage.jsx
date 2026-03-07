import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="logo">SEO Bolt</h1>
          <div className="nav-buttons">
            <button 
              className="test-form-btn"
              onClick={() => navigate('/start')}
              title="Start your order with a unique token"
            >
              📝 Start Order
            </button>
            <button 
              className="admin-btn"
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Professional SEO Descriptions for Your Products</h1>
          <p>Generate high-converting product descriptions optimized for Shopify, WooCommerce, Amazon, and more</p>
          <button className="cta-button" onClick={() => window.open('https://fiverr.com', '_blank')}>
            Order on Fiverr →
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Why Choose SEO Bolt?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>SEO Optimized</h3>
            <p>Descriptions crafted with keyword strategy and SEO best practices</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">⚡</span>
            <h3>Fast Turnaround</h3>
            <p>Get your descriptions within 24 hours</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Platform Ready</h3>
            <p>CSV exports for Shopify, WooCommerce, Amazon, Wix, BigCommerce</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔄</span>
            <h3>Unlimited Revisions</h3>
            <p>Multiple revision rounds included in all packages</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing">
        <h2>Transparent Pricing</h2>
        <div className="pricing-grid">
          <div className="pricing-card basic">
            <h3>Basic</h3>
            <p className="price">$15</p>
            <p className="description">Perfect for testing</p>
            <ul className="features-list">
              <li>✓ 5 product descriptions</li>
              <li>✓ SEO titles & meta descriptions</li>
              <li>✓ Short descriptions</li>
              <li>✓ 1 revision round</li>
              <li>✓ 1 platform export</li>
            </ul>
            <button className="order-btn">Order Now</button>
          </div>

          <div className="pricing-card standard featured">
            <div className="badge">Most Popular</div>
            <h3>Standard</h3>
            <p className="price">$30</p>
            <p className="description">Best for growing stores</p>
            <ul className="features-list">
              <li>✓ 10 product descriptions</li>
              <li>✓ All descriptions (short + long)</li>
              <li>✓ 5 bullet points / product</li>
              <li>✓ 2 revision rounds</li>
              <li>✓ Multi-platform exports</li>
            </ul>
            <button className="order-btn featured-btn">Order Now</button>
          </div>

          <div className="pricing-card premium">
            <h3>Premium</h3>
            <p className="price">$55</p>
            <p className="description">Full catalog solution</p>
            <ul className="features-list">
              <li>✓ 10 product descriptions</li>
              <li>✓ Complete descriptions</li>
              <li>✓ 5 bullet points / product</li>
              <li>✓ Competitor analysis</li>
              <li>✓ SEO keyword research</li>
              <li>✓ 3 revision rounds</li>
            </ul>
            <button className="order-btn">Order Now</button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload Products</h3>
            <p>Submit your product CSV with specs and details</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Generation</h3>
            <p>We generate optimized descriptions using Claude AI</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Review & Revise</h3>
            <p>Review descriptions and request changes if needed</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Export Ready</h3>
            <p>Download formatted CSVs for your platform</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="final-cta">
        <h2>Ready to Get Started?</h2>
        <p>Join hundreds of sellers using SEO Bolt</p>
        <button className="cta-button large" onClick={() => window.open('https://fiverr.com', '_blank')}>
          Order on Fiverr
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>SEO Bolt</h4>
            <p>Professional product descriptions for e-commerce sellers</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>
              <a href="mailto:hello@seobolt.com">hello@seobolt.com</a>
            </p>
          </div>
          <div className="footer-section">
            <h4>Links</h4>
            <p>
              <a href="https://fiverr.com" target="_blank" rel="noopener noreferrer">Fiverr Gig</a>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 SEO Bolt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
