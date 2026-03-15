import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/FormPage.css';
import { TONS, LANGUES, PLATFORMS, emptyProduct, CSV_TEMPLATE, parseCSV } from '../constants';

const WEBHOOK_URL = "https://primary-production-94f2.up.railway.app/webhook/direct-order";
const PAYMENT_INTENT_URL = "https://primary-production-94f2.up.railway.app/webhook/create-payment-intent";
const STRIPE_PK = "pk_test_51T2DBDGmKOmvIKZ9g9KNHj0tFyUPu5SKDDsD5EjFFFN9N7O1G43oSJAUSKz8OMPsFr3YBjojhJHgc5O3a0ocu85t00BL5c9wru";
const ALT_TEXT_PRICE = 500; // $5 en cents

const PACKAGES = {
  basic: {
    label: "Basic", baseAmount: 1500, price: "$15", maxProducts: 5, revisions: 1, color: "#4a9eff",
    includes: ["SEO title", "Meta description", "Short description", "1 revision"]
  },
  standard: {
    label: "Standard", baseAmount: 3000, price: "$30", maxProducts: 10, revisions: 2, color: "#c8f564",
    includes: ["SEO title", "Meta description", "Short description", "5 bullet points", "2 revisions"]
  },
  premium: {
    label: "Premium", baseAmount: 5500, price: "$55", maxProducts: 10, revisions: 3, color: "#ff9f43",
    includes: ["All descriptions", "Bullet points", "Competitor analysis", "SEO keywords", "3 revisions"]
  },
};


export default function DirectForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=infos générales, 2=produits, 3=récap+paiement
  const [formData, setFormData] = useState({
    email: "", package: "standard", tone: "Professional", language: "English",
    platforms: ["shopify"], brand: "", globalCategory: "", altText: false,
    products: [],
  });
  const [openIdx, setOpenIdx] = useState(0);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [submitStatus, setSubmitStatus] = useState("");
  const fileInput = useRef(null);
  const cardRef = useRef(null);
  const cardElementRef = useRef(null);

  const pkg = PACKAGES[formData.package];
  const color = pkg.color;
  const totalAmount = pkg.baseAmount + (formData.altText ? ALT_TEXT_PRICE : 0);
  const totalDisplay = `$${(totalAmount / 100).toFixed(2)}`;

  // Charger Stripe.js
  useEffect(() => {
    if (window.Stripe) { setStripe(window.Stripe(STRIPE_PK)); return; }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => setStripe(window.Stripe(STRIPE_PK));
    document.head.appendChild(script);
  }, []);

  // Créer PaymentIntent quand on arrive step 3
  useEffect(() => {
    if (step === 3 && !clientSecret) createPaymentIntent();
  }, [step]);

  // Monter carte Stripe
  useEffect(() => {
    if (!clientSecret || !cardRef.current || cardElementRef.current) return;
    const mountCard = (s) => {
      const els = s.elements({ clientSecret });
      const card = els.create('payment');
      card.mount(cardRef.current);
      setElements(els);
      cardElementRef.current = card;
    };
    if (stripe) { mountCard(stripe); return; }
    const interval = setInterval(() => {
      if (window.Stripe) {
        const s = window.Stripe(STRIPE_PK);
        setStripe(s); mountCard(s); clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [clientSecret, stripe]);

  const createPaymentIntent = async () => {
    try {
      const res = await fetch(PAYMENT_INTENT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount, currency: 'usd', email: formData.email, package: formData.package }),
      });
      const data = await res.json();
      const secret = data.clientSecret || data.client_secret
        || data?.json?.clientSecret || data?.json?.client_secret
        || (Array.isArray(data) && (data[0]?.clientSecret || data[0]?.client_secret));
      if (!secret) throw new Error('No clientSecret');
      setClientSecret(secret);
    } catch { setPaymentStatus("error"); }
  };

  const handlePayment = async () => {
    if (!stripe || !elements) return;
    setPaymentStatus("loading");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { receipt_email: formData.email },
      redirect: 'if_required',
    });
    if (error) { setPaymentStatus("error"); return; }
    // Paiement OK → appeler WF3 puis rediriger
    await submitOrder();
  };

  const submitOrder = async () => {
    setSubmitStatus("generating");
    try {
      const payload = {
        email: formData.email,
        package: formData.package,
        platforms: formData.platforms,
        brand: formData.brand,
        globalCategory: formData.globalCategory,
        altText: formData.altText,
        language: formData.language,
        tone: formData.tone,
        products: formData.products.map(p => ({
          ...p, ton: p.ton || formData.tone, langue: p.langue || formData.language,
        })),
      };
      await fetch(WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      navigate('/merci');
    } catch {
      setSubmitStatus("error");
      setPaymentStatus("idle");
    }
  };

  const updateProduct = (idx, field, val) => {
    const updated = [...formData.products];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormData({ ...formData, products: updated });
  };

  const addProduct = () => {
    if (formData.products.length >= pkg.maxProducts) return;
    const newProd = emptyProduct(formData.tone, formData.language);
    setFormData({ ...formData, products: [...formData.products, newProd] });
    setOpenIdx(formData.products.length);
  };

  const removeProduct = (idx) => {
    setFormData({ ...formData, products: formData.products.filter((_, i) => i !== idx) });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result).slice(0, pkg.maxProducts).map(p => ({
        ...p, ton: p.ton || formData.tone, langue: p.langue || formData.language,
      }));
      setFormData({ ...formData, products: parsed });
      setOpenIdx(0);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "getseobolt-template.csv"; a.click();
  };

  const validateStep1 = () => {
    if (!formData.email) { alert("Please enter your email"); return false; }
    if (formData.platforms.length === 0) { alert("Please select at least one platform"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (formData.products.length === 0) { alert("Please add at least one product"); return false; }
    for (let i = 0; i < formData.products.length; i++) {
      const p = formData.products[i];
      if (!p.nom_produit) { alert(`Product #${i + 1}: name is required`); return false; }
      if (!p.caracteristiques) { alert(`Product #${i + 1}: features are required`); return false; }
      if (formData.altText && !p.image_url) { alert(`Product #${i + 1}: image URL is required when alt text option is selected`); return false; }
    }
    return true;
  };

  // ── RENDER ──
  return (
    <div className="form-page">
      <nav className="form-navbar">
        <button className="back-btn" onClick={() => step > 1 ? setStep(step - 1) : navigate("/")}>← Back</button>
        <h1>Order Now</h1>
        <span style={{ fontSize: 13, color: '#888' }}>
          {step === 1 ? '① General Info' : step === 2 ? '② Products' : '③ Summary & Payment'}
        </span>
      </nav>

      <div className="form-container">

        {/* ── STEP 1 : Infos générales ── */}
        {step === 1 && (
          <div className="form-step">
            <h2>Your Email</h2>
            <div className="form-group">
              <label>Email address *</label>
              <input type="email" required placeholder="you@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <h2>Select Package</h2>
            <div className="packages-grid">
              {Object.entries(PACKAGES).map(([key, p]) => (
                <div key={key}
                  className={`package-option ${formData.package === key ? 'active' : ''}`}
                  style={{ borderColor: formData.package === key ? p.color : '#333' }}
                  onClick={() => setFormData({ ...formData, package: key })}>
                  <h3 style={{ color: p.color }}>{p.label}</h3>
                  <p className="price">{p.price}</p>
                  <ul style={{ fontSize: 12, color: '#888', paddingLeft: 16, marginTop: 8 }}>
                    {p.includes.map(inc => <li key={inc}>{inc}</li>)}
                  </ul>
                  <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Max {p.maxProducts} products</p>
                </div>
              ))}
            </div>

            <h2>Platforms</h2>
            <div className="platforms-grid">
              {PLATFORMS.map(p => (
                <label key={p.value} className="platform-checkbox">
                  <input type="checkbox"
                    checked={formData.platforms.includes(p.value)}
                    onChange={e => {
                      const pl = e.target.checked
                        ? [...formData.platforms, p.value]
                        : formData.platforms.filter(x => x !== p.value);
                      setFormData({ ...formData, platforms: pl });
                    }} />
                  {p.label}
                </label>
              ))}
            </div>

            <h2>Tone & Language</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Tone</label>
                <select value={formData.tone} onChange={e => setFormData({ ...formData, tone: e.target.value })}>
                  {TONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}>
                  {LANGUES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <h2>Global Options <span style={{ fontSize: 12, color: '#666', fontWeight: 400 }}>(optional)</span></h2>
            <div className="form-row">
              <div className="form-group">
                <label>Brand / Manufacturer</label>
                <input placeholder="e.g. Samsung, Nike..." value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Global Category</label>
                <input placeholder="e.g. Electronics, Clothing..." value={formData.globalCategory}
                  onChange={e => setFormData({ ...formData, globalCategory: e.target.value })} />
              </div>
            </div>

            <h2>Add-ons</h2>
            <div className="addon-card" style={{ borderColor: formData.altText ? color : '#333' }}
              onClick={() => setFormData({ ...formData, altText: !formData.altText })}>
              <div className="addon-check" style={{ background: formData.altText ? color : 'transparent', borderColor: formData.altText ? color : '#555' }}>
                {formData.altText && <span style={{ color: '#000', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>SEO Alt Text for images <span style={{ color, marginLeft: 8 }}>+$5</span></div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Claude generates optimized alt text for each product image (image URL required per product)
                </div>
              </div>
            </div>

            <button className="continue-btn" style={{ backgroundColor: color, marginTop: 24 }}
              onClick={() => { if (!validateStep1()) return; if (formData.products.length === 0) addProduct(); setStep(2); }}>
              Continue to Products →
            </button>
          </div>
        )}

        {/* ── STEP 2 : Produits ── */}
        {step === 2 && (
          <div className="form-step">
            <div className="upload-section">
              <button className="upload-btn" onClick={() => fileInput.current?.click()}>📤 Upload CSV</button>
              <input ref={fileInput} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
              <button className="template-btn" onClick={downloadTemplate}>📥 Download Template</button>
            </div>

            <h2>Products ({formData.products.length}/{pkg.maxProducts})</h2>
            {formData.altText && (
              <div style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid #ff9f43', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff9f43' }}>
                ⚠️ Alt text option selected — <strong>Image URL is required</strong> for each product
              </div>
            )}

            <div className="products-list">
              {formData.products.map((prod, idx) => (
                <div key={idx} className="product-card">
                  <div className="product-card-header" onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}>
                    <span style={{ fontWeight: 600 }}>{prod.nom_produit || `Product #${idx + 1}`}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#666', fontSize: 12 }}>{openIdx === idx ? '▲' : '▼'}</span>
                      {formData.products.length > 1 && (
                        <button className="remove-btn" onClick={e => { e.stopPropagation(); removeProduct(idx); }}>✕</button>
                      )}
                    </div>
                  </div>

                  {openIdx === idx && (
                    <div className="product-card-body">
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input placeholder="e.g. ProBack X3 Ergonomic Chair" value={prod.nom_produit}
                          onChange={e => updateProduct(idx, 'nom_produit', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Features & Characteristics *</label>
                        <textarea placeholder="Main features, materials, dimensions..." value={prod.caracteristiques}
                          onChange={e => updateProduct(idx, 'caracteristiques', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>SEO Keywords <span style={{ color: '#666', fontWeight: 400 }}>(optional)</span></label>
                        <input placeholder="ergonomic chair, back pain..." value={prod.mots_cles}
                          onChange={e => updateProduct(idx, 'mots_cles', e.target.value)} />
                      </div>
                      {formData.package === 'premium' && (
                        <div className="form-group">
                          <label>Competitors <span style={{ color: '#666', fontWeight: 400 }}>(optional)</span></label>
                          <input placeholder="hermanmiller.com, steelcase.com" value={prod.concurrents}
                            onChange={e => updateProduct(idx, 'concurrents', e.target.value)} />
                        </div>
                      )}
                      <div className="form-row">
                        <div className="form-group">
                          <label>Tone</label>
                          <select value={prod.ton} onChange={e => updateProduct(idx, 'ton', e.target.value)}>
                            {TONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Language</label>
                          <select value={prod.langue} onChange={e => updateProduct(idx, 'langue', e.target.value)}>
                            {LANGUES.map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #222', paddingTop: 16, marginTop: 8 }}>
                        <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                          Optional fields — will appear in your CSV
                        </p>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Price</label>
                            <input placeholder="e.g. 29.99" value={prod.prix}
                              onChange={e => updateProduct(idx, 'prix', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Compare-at Price</label>
                            <input placeholder="e.g. 49.99" value={prod.prix_barre}
                              onChange={e => updateProduct(idx, 'prix_barre', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>SKU</label>
                            <input placeholder="e.g. CHAIR-X3-001" value={prod.sku}
                              onChange={e => updateProduct(idx, 'sku', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Product Category</label>
                            <input placeholder="e.g. Office Chairs" value={prod.categorie_produit}
                              onChange={e => updateProduct(idx, 'categorie_produit', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>
                            Image URL {formData.altText
                              ? <span style={{ color: '#ff9f43' }}>* (required — alt text enabled)</span>
                              : <span style={{ color: '#666', fontWeight: 400 }}>(optional)</span>}
                          </label>
                          <input placeholder="https://yourstore.com/image.jpg"
                            value={prod.image_url}
                            onChange={e => updateProduct(idx, 'image_url', e.target.value)}
                            style={{ borderColor: formData.altText && !prod.image_url ? '#ff6b6b' : undefined }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {formData.products.length < pkg.maxProducts && (
              <button className="add-product-btn" onClick={addProduct}>+ Add Product</button>
            )}

            <button className="continue-btn" style={{ backgroundColor: color, marginTop: 16 }}
              onClick={() => { if (!validateStep2()) return; setStep(3); }}>
              Review & Pay →
            </button>
          </div>
        )}

        {/* ── STEP 3 : Récapitulatif + Paiement ── */}
        {step === 3 && (
          <div className="form-step">
            <h2>Order Summary</h2>

            <div className="summary-box">
              <div className="summary-row">
                <span>{pkg.label} Package</span>
                <span>{pkg.price}</span>
              </div>
              {formData.altText && (
                <div className="summary-row">
                  <span>SEO Alt Text</span>
                  <span>+$5.00</span>
                </div>
              )}
              <div className="summary-row" style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 4, fontWeight: 700, fontSize: 16 }}>
                <span>Total</span>
                <span style={{ color }}>{totalDisplay}</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
                {formData.products.length} product{formData.products.length > 1 ? 's' : ''} ·{' '}
                {formData.platforms.join(', ')} ·{' '}
                {formData.package} · {pkg.revisions} revision{pkg.revisions > 1 ? 's' : ''}
              </div>
            </div>

            <h2 style={{ marginTop: 24 }}>Products</h2>
            {formData.products.map((p, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '12px 16px', marginBottom: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{i + 1}. {p.nom_produit}</div>
                <div style={{ color: '#666', fontSize: 12 }}>
                  {[p.prix && `$${p.prix}`, p.sku && `SKU: ${p.sku}`, p.langue].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}

            <h2 style={{ marginTop: 24 }}>Payment</h2>
            {!clientSecret && (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading payment form…</div>
            )}
            {clientSecret && (
              <>
                <div ref={cardRef} style={{ background: '#0e0e0e', border: '1px solid #333', borderRadius: 8, padding: '16px', marginBottom: 24 }} />
                {paymentStatus === "error" && (
                  <p style={{ color: '#ff6b6b', marginBottom: 16 }}>Payment failed. Please try again.</p>
                )}
                {submitStatus === "error" && (
                  <p style={{ color: '#ff6b6b', marginBottom: 16 }}>Submission error. Please contact support.</p>
                )}
                <button className="continue-btn" style={{ backgroundColor: color }}
                  onClick={handlePayment}
                  disabled={paymentStatus === "loading" || submitStatus === "generating"}>
                  {paymentStatus === "loading" || submitStatus === "generating"
                    ? "Processing…"
                    : `Pay ${totalDisplay} & Generate →`}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
