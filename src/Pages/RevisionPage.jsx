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
      <style>{`
        .revision-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'DM Sans', sans-serif; }
        .revision-header { background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .revision-header h1 { margin: 0 0 10px; font-size: 28px; }
        .revision-header p { margin: 5px 0; opacity: 0.9; }
        .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .info-item { background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; }
        .info-label { font-size: 12px; opacity: 0.8; text-transform: uppercase; margin-bottom: 4px; }
        .info-value { font-weight: 600; }
        .error { color: #ff6b6b; padding: 15px; background: #ffe0e0; border-radius: 8px; }
        .revision-content { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 40px; }
        .descriptions-list { }
        .product-card { background: #f8f9fa; border: 1px solid #e0e0e0; border-left: 4px solid ${color}; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .product-number { display: inline-block; background: ${color}; color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 10px; font-size: 14px; }
        .product-name { font-size: 18px; font-weight: 600; margin: 10px 0; color: #1a1a1a; }
        .description-item { margin-bottom: 15px; }
        .desc-label { font-size: 11px; color: ${color}; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .desc-value { color: #555; line-height: 1.6; font-size: 14px; }
        .keywords-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .keyword-tag { background: #ddd; color: #333; padding: 4px 10px; border-radius: 20px; font-size: 12px; }
        .bullet-list { margin-left: 20px; margin-top: 8px; }
        .bullet-list li { margin-bottom: 6px; color: #555; }
        .revision-form { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .form-section { margin-bottom: 30px; }
        .form-section h3 { margin: 0 0 15px; color: #1a1a1a; font-size: 16px; }
        .action-buttons { display: flex; gap: 15px; margin-bottom: 20px; }
        .action-btn { flex: 1; padding: 12px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .action-btn.active { background: ${color}; color: white; border-color: ${color}; }
        .comment-field { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; resize: vertical; min-height: 80px; }
        .product-comment { margin-bottom: 20px; }
        .product-comment label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #333; }
        .product-comment textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; min-height: 70px; resize: vertical; }
        .submit-button { width: 100%; padding: 14px; background: ${color}; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: opacity 0.2s; }
        .submit-button:hover { opacity: 0.9; }
        .submit-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .revisions-left { font-size: 12px; color: #999; margin-top: 10px; }
      `}</style>

      <div className="revision-header">
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
            <div key={idx} className="product-card">
              <div>
                <span className="product-number">{product.product_number || idx + 1}</span>
                <span className="product-name">{product.nom_produit}</span>
              </div>

              {product.titre_seo && (
                <div className="description-item">
                  <div className="desc-label">SEO Title</div>
                  <div className="desc-value">{product.titre_seo}</div>
                </div>
              )}

              {product.meta_description && (
                <div className="description-item">
                  <div className="desc-label">Meta Description</div>
                  <div className="desc-value">{product.meta_description}</div>
                </div>
              )}

              {product.description_courte && (
                <div className="description-item">
                  <div className="desc-label">Short Description</div>
                  <div className="desc-value">{product.description_courte}</div>
                </div>
              )}

              {product.description_longue && (
                <div className="description-item">
                  <div className="desc-label">Long Description</div>
                  <div className="desc-value">{product.description_longue}</div>
                </div>
              )}

              {product.bullet_points && product.bullet_points.length > 0 && (
                <div className="description-item">
                  <div className="desc-label">Bullet Points</div>
                  <ul className="bullet-list">
                    {product.bullet_points.map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {product.mots_cles_suggeres && product.mots_cles_suggeres.length > 0 && (
                <div className="description-item">
                  <div className="desc-label">Keywords</div>
                  <div className="keywords-list">
                    {product.mots_cles_suggeres.map((kw, i) => (
                      <span key={i} className="keyword-tag">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {product.analyse_concurrents && (
                <div className="description-item">
                  <div className="desc-label">🔍 Competitor Analysis</div>
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
                  onClick={() => setAction('approve')}
                >
                  ✅ Approve
                </button>
                <button
                  type="button"
                  className={`action-btn ${action === 'revise' ? 'active' : ''}`}
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

            <button type="submit" className="submit-button" disabled={submitting}>
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
