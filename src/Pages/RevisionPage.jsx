import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/RevisionPage.css';

const REVISION_WEBHOOK_URL_FIVERR = "https://primary-production-94f2.up.railway.app/webhook/revision";
const REVISION_WEBHOOK_URL_DIRECT = "https://primary-production-94f2.up.railway.app/webhook/direct-revision";

const RevisionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('orderId') || searchParams.get('revision');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('approve');
  const [globalComment, setGlobalComment] = useState('');
  const [productComments, setProductComments] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch order from Firebase
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const firebaseUrl = `https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents/orders/${orderId}`;
        const response = await fetch(firebaseUrl);
        
        if (!response.ok) {
          throw new Error(`Order not found (${response.status})`);
        }

        const data = await response.json();
        const fields = data.fields;

        const orderData = {
          orderId: fields.orderId?.stringValue || '',
          fiverr_order: fields.fiverr_order?.stringValue || '',
          source: fields.source?.stringValue || 'fiverr',
          package: fields.package?.stringValue || 'standard',
          platforms: fields.platforms?.arrayValue?.values?.map(v => v.stringValue) || [],
          revisionsLeft: parseInt(fields.revisionsLeft?.integerValue || '0'),
          results: JSON.parse(fields.results?.stringValue || '[]'),
          status: fields.status?.stringValue || 'pending',
        };

        setOrder(orderData);
        setProductComments({});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleProductCommentChange = (index, comment) => {
    setProductComments(prev => ({
      ...prev,
      [index]: comment
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Choose webhook based on source
      const webhookUrl = order?.source === 'direct' 
        ? REVISION_WEBHOOK_URL_DIRECT 
        : REVISION_WEBHOOK_URL_FIVERR;

      const payload = {
        orderId,
        action,
        globalComment,
        productComments,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Workflow failed (${response.status})`);
      }

      alert(action === 'approve' ? '✅ Files sent to your email!' : '✅ Revision request sent!');
      navigate('/');
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="revision-container"><p>Loading order...</p></div>;
  if (error) return <div className="revision-container"><p className="error">❌ {error}</p></div>;
  if (!order) return <div className="revision-container"><p className="error">Order not found</p></div>;

  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[order.package] || '#c8f564';

  return (
    <div className="revision-container">
      <div className="revision-header" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
        <h1>👁️ Review Order #{order.fiverr_order || orderId.slice(0, 8)}</h1>
        <div className="order-info">
          <div className="info-item">
            <div className="info-label">Package</div>
            <div className="info-value" style={{ textTransform: 'capitalize' }}>{order.package}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Revisions Left</div>
            <div className="info-value">{order.revisionsLeft}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Platforms</div>
            <div className="info-value">{order.platforms.join(', ')}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Status</div>
            <div className="info-value" style={{ textTransform: 'capitalize' }}>{order.status}</div>
          </div>
        </div>
      </div>

      <div className="revision-content">
        <div className="descriptions-list">
          <h2 style={{ marginTop: 0, marginBottom: 20 }}>Generated Descriptions</h2>
          {order.results.map((product, idx) => (
            <div key={idx} className="product-card" style={{ borderLeftColor: color }}>
              <div>
                <span className="product-number" style={{ backgroundColor: color }}>{product.product_number || idx + 1}</span>
                <span className="product-name">{product.nom_produit}</span>
              </div>

              {product.titre_seo && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>SEO Title</div>
                  <div className="desc-value">{product.titre_seo}</div>
                </div>
              )}

              {product.meta_description && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>Meta Description</div>
                  <div className="desc-value">{product.meta_description}</div>
                </div>
              )}

              {product.description_courte && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>Short Description</div>
                  <div className="desc-value">{product.description_courte}</div>
                </div>
              )}

              {product.description_longue && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>Long Description</div>
                  <div className="desc-value">{product.description_longue}</div>
                </div>
              )}

              {product.bullet_points && product.bullet_points.length > 0 && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>Bullet Points</div>
                  <ul className="bullet-list">
                    {product.bullet_points.map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(() => {
                const hasDfsData = product.mots_cles_data?.length > 0;
                const kws = hasDfsData
                  ? product.mots_cles_data
                  : (product.mots_cles_suggeres || []).map(k => ({ keyword: k, volume: null }));
                if (!kws.length) return null;
                const fmtVol = v => v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(v);
                return (
                  <div className="description-item">
                    <div className="desc-label" style={{ color: color }}>Keywords</div>
                    <div className="keywords-list">
                      {kws.map((kw, i) => (
                        <span key={i} className="keyword-tag">
                          {kw.keyword}
                          {kw.volume != null && (
                            <span className="kw-vol"> {fmtVol(kw.volume)}/mo</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {product.analyse_concurrents && (
                <div className="description-item">
                  <div className="desc-label" style={{ color: color }}>🔍 Competitor Analysis</div>
                  <div className="desc-value" style={{ fontStyle: 'italic', color: '#777', background: '#f0f4ff', padding: '10px', borderRadius: '6px' }}>{product.analyse_concurrents}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="revision-form">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Your Decision</h3>
              <div className="action-buttons">
                <button
                  type="button"
                  className={`action-btn ${action === 'approve' ? 'active' : ''}`}
                  style={action === 'approve' ? { backgroundColor: color, borderColor: color } : {}}
                  onClick={() => setAction('approve')}
                >
                  ✅ Approve
                </button>
                <button
                  type="button"
                  className={`action-btn ${action === 'revise' ? 'active' : ''}`}
                  style={action === 'revise' ? { backgroundColor: color, borderColor: color } : {}}
                  onClick={() => setAction('revise')}
                  disabled={order.revisionsLeft <= 0}
                >
                  🔄 Revise
                </button>
              </div>
            </div>

            {action === 'revise' && (
              <>
                <div className="form-section">
                  <h3>General Feedback (Optional)</h3>
                  <textarea
                    className="comment-field"
                    placeholder="Share your general feedback for all products..."
                    value={globalComment}
                    onChange={(e) => setGlobalComment(e.target.value)}
                  />
                </div>

                <div className="form-section">
                  <h3>Product-Specific Feedback</h3>
                  {order.results.map((product, idx) => (
                    <div key={idx} className="product-comment">
                      <label>{product.nom_produit}</label>
                      <textarea
                        placeholder={`Feedback for "${product.nom_produit}"...`}
                        value={productComments[idx] || ''}
                        onChange={(e) => handleProductCommentChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <button type="submit" className="submit-button" disabled={submitting} style={{ backgroundColor: color }}>
              {submitting ? '⏳ Processing...' : (action === 'approve' ? '✅ Approve & Get Files' : '🔄 Request Revision')}
            </button>

            {order.revisionsLeft <= 0 && (
              <div className="revisions-left">
                ⚠️ No revisions left for this order
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RevisionPage;
