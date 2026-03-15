import React from 'react';
import '../styles/HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon">⚡</span> SEO Bolt
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-actions">
            <a href="/start" className="btn-primary">
              Start Your Order
            </a>
            <a href="/admin" className="btn-admin">
              Admin
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">E-Commerce SEO Copywriting</div>
          <h1 className="hero-heading">
            Product descriptions<br />
            <em>that sell more.</em>
          </h1>
          <p className="hero-subtitle">
            AI-powered SEO copy for Shopify, Amazon & WooCommerce — optimized, formatted, and ready to import in under 24 hours.
          </p>
          <div className="hero-ctas">
            <a href="/start" className="btn-primary btn-large">
              Get Started — $15
            </a>
            <a href="#how-it-works" className="btn-outline btn-large">
              See How It Works
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">2,400+</span>
              <span className="stat-label">Products optimized</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">&lt;24h</span>
              <span className="stat-label">Turnaround time</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">98%</span>
              <span className="stat-label">Satisfaction rate</span>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="browser-mock">
            <div className="browser-bar">
              <span className="browser-dot red" />
              <span className="browser-dot yellow" />
              <span className="browser-dot green" />
              <span className="browser-url">seobolt.com/preview</span>
            </div>
            <div className="browser-content">
              <div className="preview-label">SEO OUTPUT PREVIEW</div>
              <div className="preview-block">
                <div className="preview-tag">TITLE</div>
                <p className="preview-text">Premium Wireless Noise-Cancelling Headphones — 30h Battery</p>
              </div>
              <div className="preview-block">
                <div className="preview-tag">META DESCRIPTION</div>
                <p className="preview-text">Experience crystal-clear audio with our premium over-ear headphones. 30-hour battery, active noise cancellation, and foldable design for on-the-go professionals.</p>
              </div>
              <div className="preview-block">
                <div className="preview-tag">BULLET POINTS</div>
                <ul className="preview-bullets">
                  <li>✓ 30-hour battery with fast charge (10min = 3h)</li>
                  <li>✓ Hybrid active noise cancellation</li>
                  <li>✓ Foldable design with carry case</li>
                </ul>
              </div>
              <div className="preview-block export-block">
                <div className="preview-tag">EXPORT READY FOR</div>
                <div className="platform-tags">
                  <span className="platform-tag">Shopify</span>
                  <span className="platform-tag">Amazon</span>
                  <span className="platform-tag">WooCommerce</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-container">
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
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
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
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing" id="pricing">
        <div className="section-container">
          <h2>Transparent Pricing</h2>
          <div className="pricing-grid">
            <div className="pricing-card">
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
              <a href="/start" className="btn-outline order-btn">Order Now</a>
            </div>

            <div className="pricing-card featured">
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
              <a href="/start" className="btn-primary order-btn">Order Now</a>
            </div>

            <div className="pricing-card">
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
              <a href="/start" className="btn-outline order-btn">Order Now</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="section-container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>How do I submit my products?</h4>
              <p>Upload a CSV file with your product names, specs, and any keywords you want to target. We handle the rest.</p>
            </div>
            <div className="faq-item">
              <h4>What platforms are supported?</h4>
              <p>We export ready-to-import CSVs for Shopify, WooCommerce, Amazon, Wix, and BigCommerce.</p>
            </div>
            <div className="faq-item">
              <h4>How many revisions are included?</h4>
              <p>Basic includes 1 round, Standard includes 2, and Premium includes 3 revision rounds.</p>
            </div>
            <div className="faq-item">
              <h4>How fast will I get my descriptions?</h4>
              <p>Most orders are delivered within 24 hours. Premium orders may take up to 48 hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="section-container">
          <h2>Ready to Get Started?</h2>
          <p>Join hundreds of sellers using SEO Bolt to drive more traffic and sales.</p>
          <a href="/start" className="btn-primary btn-large">
            Start Your Order — $15
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>⚡ SEO Bolt</h4>
            <p>Professional product descriptions for e-commerce sellers</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p><a href="mailto:hello@seobolt.com">hello@seobolt.com</a></p>
          </div>
          <div className="footer-section">
            <h4>Links</h4>
            <p><a href="https://fiverr.com" target="_blank" rel="noopener noreferrer">Fiverr Gig</a></p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 SEO Bolt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
