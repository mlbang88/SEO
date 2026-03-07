import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";

// ─── Firebase config ───────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// ─── Components & Pages ───────────────────────────────────────────────────
import HomePage from "./Pages/HomePage";
import AdminDashboard from "./Pages/AdminDashboard";
import OrderForm from "./Pages/OrderForm";
import FiverrForm from "./Pages/FiverrForm";
import DirectForm from "./Pages/DirectForm";
import MerciPage from "./Pages/MerciPage";
import StartOrder from "./Pages/StartOrder";
import { validateToken } from "./Components/TokenValidator";

const firebaseConfig = {
  apiKey: "AIzaSyC9lCKehSbbnmmKAnVhukDYWN86JdMLKFU",
  authDomain: "seo-description-fiverr.firebaseapp.com",
  projectId: "seo-description-fiverr",
  storageBucket: "seo-description-fiverr.firebasestorage.app",
  messagingSenderId: "47623981903",
  appId: "1:47623981903:web:84005b9e2103ab8223d33a",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── Constants ─────────────────────────────────────────────────────────────
const WEBHOOK_URL = "https://primary-production-94f2.up.railway.app/webhook/descriptions-produits";
const REVISION_WEBHOOK_URL = "https://primary-production-94f2.up.railway.app/webhook/revision";
const DIRECT_REVISION_WEBHOOK_URL = "https://primary-production-94f2.up.railway.app/webhook/direct-revision";

const PACKAGES = {
  basic:    { label: "Basic",    price: "$15", maxProducts: 5,  revisions: 1, words: 100, bullets: false, keywordResearch: false, competitorResearch: false, color: "#4a9eff",
              includes: ["SEO title", "Meta description", "Short description", "1 revision"] },
  standard: { label: "Standard", price: "$30", maxProducts: 10, revisions: 2, words: 150, bullets: true,  keywordResearch: false, competitorResearch: false, color: "#c8f564",
              includes: ["SEO title", "Meta description", "Short description", "5 bullet points", "2 revisions"] },
  premium:  { label: "Premium",  price: "$55", maxProducts: 10, revisions: 3, words: 300, bullets: true,  keywordResearch: true,  competitorResearch: true,  color: "#ff9f43",
              includes: ["All descriptions", "5 bullet points", "Competitor analysis", "SEO keywords", "3 revisions"] },
};

const ELEMENTS_BY_PACKAGE = {
  basic:    ["titre_seo", "meta_description", "description_courte"],
  standard: ["titre_seo", "meta_description", "description_courte"],
  premium:  ["titre_seo", "meta_description", "description_courte", "description_longue"],
};

const TONS     = ["Professional", "Luxury", "Fun & Casual", "Technical", "Reassuring"];
const LANGUES  = ["English", "French", "Spanish", "German", "Italian"];
const PLATFORMS = [
  { value: "shopify",      label: "Shopify",      icon: "🛍️" },
  { value: "woocommerce",  label: "WooCommerce",  icon: "🔌" },
  { value: "amazon",       label: "Amazon",       icon: "📦" },
  { value: "wix",          label: "Wix",          icon: "🌐" },
  { value: "bigcommerce",  label: "BigCommerce",  icon: "🏪" },
  { value: "prestashop",   label: "PrestaShop",   icon: "🐾" },
  { value: "other",        label: "Other / CSV",  icon: "📄" },
];

const emptyProduct = () => ({ nom_produit: "", caracteristiques: "", mots_cles: "", concurrents: "", ton: "Professional", langue: "English" });

// ─── CSV Template ───────────────────────────────────────────────────────────
const CSV_TEMPLATE = `product_name,features,keywords,competitors,tone,language\nErgonomic Chair ProBack X3,"Lumbar support, 4D armrests, breathable fabric","ergonomic chair, back pain","hermanmiller.com, steelcase.com",Professional,English\nStanding Desk SmartLift,"Dual motor, 4 memory positions, 160x80cm","standing desk, sit stand desk","flexispot.com, upliftdesk.com",Professional,English`;

// ─── Helper Functions ───────────────────────────────────────────────────────
const downloadTemplate = () => {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "products-template.csv"; a.click();
  URL.revokeObjectURL(url);
};

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || "");
    return {
      nom_produit: obj.product_name || obj.nom_produit || "",
      caracteristiques: obj.features || obj.caracteristiques || "",
      mots_cles: obj.keywords || obj.mots_cles || "",
      concurrents: obj.competitors || obj.concurrents || "",
      ton: obj.tone || obj.ton || "Professional",
      langue: obj.language || obj.langue || "English",
    };
  }).filter(p => p.nom_produit);
};

// ─── STYLES ─────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0a; --surface: #131313; --surface2: #1a1a1a; --border: #252525;
    --accent: #c8f564; --accent-dim: rgba(200,245,100,0.08);
    --text: #f0f0f0; --muted: #777; --radius: 14px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px 80px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; width: 100%; max-width: 700px; padding: 52px; animation: fadeUp .45s ease both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  .badge { display:inline-block; background:var(--accent-dim); color:var(--accent); border:1px solid var(--accent); border-radius:100px; font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; padding:4px 14px; margin-bottom:20px; }
  h1 { font-family:'Playfair Display',serif; font-size:2rem; line-height:1.2; margin-bottom:8px; }
  .subtitle { color:var(--muted); font-size:.92rem; margin-bottom:32px; line-height:1.6; }
  .divider { height:1px; background:var(--border); margin:28px 0; }
  .section-title { font-size:.72rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
  .step-indicator { display:flex; align-items:center; gap:8px; margin-bottom:28px; }
  .step-dot { width:26px; height:26px; border-radius:50%; border:1.5px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:600; color:var(--muted); flex-shrink:0; transition:all .2s; }
  .step-dot.active { border-color:var(--accent); color:var(--accent); background:var(--accent-dim); }
  .step-dot.done { border-color:var(--accent); background:var(--accent); color:#0a0a0a; }
  .step-line { flex:1; height:1px; background:var(--border); }
  .pkg-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
  .pkg-card { border:1.5px solid var(--border); border-radius:var(--radius); padding:20px 16px; cursor:pointer; transition:all .18s; user-select:none; }
  .pkg-card:hover { border-color:#444; }
  .pkg-card.selected { border-color:var(--pkg-color,var(--accent)); background:color-mix(in srgb,var(--pkg-color,var(--accent)) 6%,transparent); }
  .pkg-price { font-family:'Playfair Display',serif; font-size:1.7rem; font-weight:700; margin-bottom:2px; }
  .pkg-name { font-size:.72rem; font-weight:600; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin-bottom:14px; }
  .pkg-includes { list-style:none; font-size:.75rem; color:var(--muted); line-height:2.1; }
  .pkg-includes li::before { content:"✓  "; color:var(--pkg-color,var(--accent)); }
  .pkg-limit { font-size:.72rem; color:var(--muted); margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }
  .btn-main { width:100%; border:none; border-radius:var(--radius); padding:16px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:700; cursor:pointer; transition:all .2s; }
  .btn-main:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .btn-main:disabled { opacity:.35; cursor:not-allowed; }
  .back-btn { background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:.85rem; padding:8px 16px; cursor:pointer; margin-bottom:24px; transition:all .15s; }
  .back-btn:hover { border-color:var(--accent); color:var(--accent); }
  .order-field { margin-bottom:24px; }
  label { display:block; font-size:.72rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:7px; }
  input, textarea, select { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:10px; color:var(--text); font-family:'DM Sans',sans-serif; font-size:.92rem; padding:11px 14px; outline:none; transition:border-color .2s; margin-bottom:16px; }
  input:focus, textarea:focus, select:focus { border-color:var(--accent); }
  textarea { resize:vertical; min-height:88px; }
  select option { background:#1a1a1a; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  input:disabled { opacity:.35; cursor:not-allowed; }
  .platforms-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:28px; }
  .platform-chip { border:1.5px solid var(--border); border-radius:10px; padding:10px 12px; cursor:pointer; text-align:center; font-size:.76rem; color:var(--muted); font-weight:400; transition:all .15s; user-select:none; position:relative; }
  .platform-chip.selected { border-color:var(--accent); background:var(--accent-dim); color:var(--accent); font-weight:600; }
  .platform-chip .check { position:absolute; top:5px; right:7px; font-size:.6rem; color:var(--accent); }
  .csv-import { border:1.5px dashed var(--border); border-radius:var(--radius); padding:20px; text-align:center; margin-bottom:20px; cursor:pointer; transition:all .18s; }
  .csv-import:hover { border-color:var(--accent); background:var(--accent-dim); }
  .csv-import p { font-size:.85rem; color:var(--muted); margin-top:6px; }
  .csv-actions { display:flex; gap:10px; justify-content:center; margin-top:10px; }
  .btn-sm { background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--muted); font-family:'DM Sans',sans-serif; font-size:.8rem; padding:6px 14px; cursor:pointer; transition:all .15s; }
  .btn-sm:hover { border-color:var(--accent); color:var(--accent); }
  .product-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .product-item { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
  .product-header { padding:16px 20px; background:var(--surface2); cursor:pointer; display:flex; align-items:center; gap:12px; user-select:none; transition:background .1s; }
  .product-header:hover { background:color-mix(in srgb,var(--surface2) 70%,white); }
  .product-number { font-size:.72rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
  .product-name-preview { font-family:'Playfair Display',serif; font-size:1rem; font-weight:700; color:inherit; }
  .product-name-preview.empty { color:var(--muted); font-style:italic; }
  .chevron { color:var(--muted); font-size:.72rem; transition:transform .2s; flex-shrink:0; }
  .chevron.open { transform:rotate(90deg); }
  .btn-remove { background:transparent; border:none; color:#ff6b6b; cursor:pointer; font-size:.95rem; padding:2px 6px; border-radius:6px; opacity:.5; transition:opacity .15s; }
  .btn-remove:hover { opacity:1; }
  .product-body { padding:20px 20px 4px; border-top:1px solid var(--border); display:none; }
  .product-body.open { display:block; }
  .add-product-btn { width:100%; background:transparent; border:1.5px dashed var(--border); border-radius:var(--radius); color:var(--muted); font-family:'DM Sans',sans-serif; font-size:.88rem; padding:13px; cursor:pointer; transition:all .18s; margin-bottom:8px; }
  .add-product-btn:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
  .add-product-btn:disabled { opacity:.35; cursor:not-allowed; }
  .counter { text-align:center; font-size:.72rem; color:var(--muted); margin-bottom:20px; }
  .counter span { color:var(--accent); font-weight:700; }
  .error-msg { color:#ff6b6b; font-size:.75rem; margin:12px 0 0; }
  .loading-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,10,10,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; gap:20px; }
  .spinner { border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .success { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,10,10,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; gap:16px; text-align:center; padding:40px 20px; }
  .success-icon { font-size:3rem; }
  .success h2 { font-family:'Playfair Display',serif; font-size:1.8rem; margin-bottom:12px; }
  .success p { color:var(--muted); }
  .rev-product { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); padding:24px; margin-bottom:16px; }
  .rev-product h3 { font-family:'Playfair Display',serif; font-size:1.2rem; margin-bottom:16px; display:flex; align-items:center; gap:12px; }
  .rev-field { margin-bottom:16px; }
  .field-label { font-size:.72rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
  .field-value { color:inherit; font-size:.92rem; line-height:1.6; }
  .field-value ul { padding-left:20px; }
  .field-value li { margin-bottom:4px; }
  .rev-buttons { display:flex; gap:12px; margin-top:20px; }
  .btn-approve, .btn-revise { flex:1; padding:14px; border:none; border-radius:var(--radius); font-family:'DM Sans',sans-serif; font-weight:700; font-size:.9rem; cursor:pointer; transition:all .2s; }
  .btn-approve { background:var(--accent); color:#0a0a0a; }
  .btn-approve:hover:not(:disabled) { opacity:.88; }
  .btn-revise { border:1.5px solid var(--border); color:var(--muted); background:transparent; }
  .btn-revise:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
  .btn-approve:disabled, .btn-revise:disabled { opacity:.35; cursor:not-allowed; }
  .rev-textarea { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:10px; color:var(--text); font-family:'DM Sans',sans-serif; font-size:.85rem; padding:10px 12px; outline:none; resize:vertical; min-height:60px; }
  .rev-textarea:focus { border-color:var(--accent); }
  .comments-section { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; margin-bottom:16px; }
  .comments-section h4 { font-size:.72rem; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
  @media (max-width: 700px) {
    .card { padding: 32px 24px; max-width: 100%; }
    .pkg-grid { grid-template-columns: repeat(1, 1fr); }
    .platforms-grid { grid-template-columns: repeat(2, 1fr); }
    .row { grid-template-columns: 1fr; }
    h1 { font-size: 1.5rem; }
    .rev-buttons { flex-direction: column; }
  }
`;

// ─── Form Page Component ──────────────────────────────────────────────────
function FormPage({ orderId: initialOrderId }) {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [platforms, setPlatforms] = useState(["shopify"]);
  const [products, setProducts] = useState([emptyProduct()]);
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState("idle");
  const [openIdx, setOpenIdx] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const PACKAGES_DATA = PACKAGES;
  const pkgData = PACKAGES_DATA[selectedPackage];

  const addProduct = () => {
    if (products.length < pkgData.maxProducts) setProducts([...products, emptyProduct()]);
  };

  const removeProduct = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const update = (idx, field, value) => {
    const newProducts = [...products];
    newProducts[idx] = { ...newProducts[idx], [field]: value };
    setProducts(newProducts);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      file.text().then(text => {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setProducts(parsed.slice(0, pkgData.maxProducts));
          setOpenIdx(0);
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim() || products.length === 0) return;

    setStatus("loading");
    try {
      const payload = {
        fiverr_order: orderNumber.trim(),
        package: selectedPackage,
        products,
        platforms,
        config: { bullets: pkgData.bullets },
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus("success");
        setStep(1);
        setOrderNumber("");
        setProducts([emptyProduct()]);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (status === "success") {
    return (
      <div className="success">
        <div className="success-icon">✅</div>
        <h2>Order received!</h2>
        <p>Your descriptions are being generated.<br />You'll receive a preview link via email shortly.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="badge">Setup</span>
      <h1>Generate Your Descriptions</h1>
      <p className="subtitle">Follow these steps to get optimized product descriptions</p>

      {step === 1 && (
        <>
          <div className="step-indicator">
            <div className="step-dot done">1</div>
            <div className="step-line" />
            <div className="step-dot active">2</div>
            <div className="step-line" />
            <div className="step-dot">3</div>
          </div>

          <p className="section-title">Select your package</p>
          <div className="pkg-grid">
            {Object.entries(PACKAGES_DATA).map(([key, pkg]) => (
              <div
                key={key}
                className={`pkg-card ${selectedPackage === key ? "selected" : ""}`}
                onClick={() => setSelectedPackage(key)}
                style={{ "--pkg-color": pkg.color }}
              >
                <div className="pkg-name">{pkg.label}</div>
                <div className="pkg-price">{pkg.price}</div>
                <ul className="pkg-includes">
                  {pkg.includes.map(inc => <li key={inc}>{inc}</li>)}
                </ul>
                <div className="pkg-limit">Max {pkg.maxProducts} products</div>
              </div>
            ))}
          </div>

          <p className="section-title">Select platforms</p>
          <div className="platforms-grid">
            {PLATFORMS.map(p => (
              <div
                key={p.value}
                className={`platform-chip ${platforms.includes(p.value) ? "selected" : ""}`}
                onClick={() => setPlatforms(p => p.includes(p.value) ? p.filter(x => x !== p.value) : [...p, p.value])}
              >
                {p.icon} {p.label}
                {platforms.includes(p.value) && <span className="check">✓</span>}
              </div>
            ))}
          </div>

          <button type="button" className="btn-main" onClick={() => setStep(2)} style={{ background: pkgData.color, marginBottom: 12 }}>
            Next →
          </button>
          <button type="button" className="back-btn" onClick={() => navigate("/")}> ← Back to homepage</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="step-indicator">
            <div className="step-dot done">1</div>
            <div className="step-line" />
            <div className="step-dot done">2</div>
            <div className="step-line" />
            <div className="step-dot active">3</div>
          </div>

          <p className="section-title">Upload your products</p>

          <div className="csv-import" onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: "2rem" }}>📥</div>
            <p><strong>Click to upload</strong> your CSV file</p>
            <p>Or use the template below</p>
            <div className="csv-actions">
              <button type="button" className="btn-sm" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                ⬇ Download template
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="order-field">
              <label>Fiverr Order ID *</label>
              <input required placeholder="e.g. 12345678" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} disabled={status === "loading"} />
            </div>

            <p className="section-title">Your products</p>
            <div className="product-list">
              {products.map((p, idx) => (
                <div key={idx} className="product-item">
                  <div className="product-header" onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}>
                    <span className="product-number">#{idx + 1}</span>
                    <span className="product-name-preview" style={{ flex: 1 }}>{p.nom_produit || <span style={{ opacity: 0.5 }}>Unnamed product</span>}</span>
                    <span className={`chevron${openIdx === idx ? " open" : ""}`}>▶</span>
                    {products.length > 1 && (
                      <button type="button" className="btn-remove" onClick={e => { e.stopPropagation(); removeProduct(idx); }}>✕</button>
                    )}
                  </div>
                  <div className={`product-body${openIdx === idx ? " open" : ""}`}>
                    <label>Product name *</label>
                    <input required placeholder="e.g. ProBack X3 Ergonomic Chair" value={p.nom_produit} onChange={e => update(idx, "nom_produit", e.target.value)} disabled={status === "loading"} />
                    <label>Key features *</label>
                    <textarea required placeholder="List main features, materials, dimensions…" value={p.caracteristiques} onChange={e => update(idx, "caracteristiques", e.target.value)} disabled={status === "loading"} />
                    {pkgData.keywordResearch ? (
                      <><label>SEO keywords — handled automatically ✓</label>
                      <input disabled placeholder="Keyword research included" /></>
                    ) : (
                      <><label>SEO keywords (optional)</label>
                      <input placeholder="e.g. ergonomic chair, back pain relief" value={p.mots_cles} onChange={e => update(idx, "mots_cles", e.target.value)} disabled={status === "loading"} /></>
                    )}
                    {pkgData.competitorResearch && (
                      <><label>Competitors (optional)</label>
                      <input placeholder="e.g. hermanmiller.com, steelcase.com" value={p.concurrents} onChange={e => update(idx, "concurrents", e.target.value)} disabled={status === "loading"} /></>
                    )}
                    <div className="row">
                      <div>
                        <label>Tone</label>
                        <select value={p.ton} onChange={e => update(idx, "ton", e.target.value)} disabled={status === "loading"}>
                          {TONS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Language</label>
                        <select value={p.langue} onChange={e => update(idx, "langue", e.target.value)} disabled={status === "loading"}>
                          {LANGUES.map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="add-product-btn" onClick={addProduct} disabled={products.length >= pkgData.maxProducts || status === "loading"}>
              + Add another product
            </button>
            <div className="counter"><span>{products.length}</span> / {pkgData.maxProducts} products</div>

            <button type="submit" className="btn-main" disabled={status === "loading" || !orderNumber.trim()} style={{ background: pkgData.color, color: "#0a0a0a" }}>
              {status === "loading"
                ? <><span className="spinner" style={{ width: 16, height: 16, borderTopColor: "#0a0a0a", borderColor: "rgba(0,0,0,0.3)" }} />Processing…</>
                : `Submit ${products.length} product${products.length > 1 ? "s" : ""} →`}
            </button>
            {status === "error" && <p className="error-msg">Something went wrong. Please try again.</p>}
          </form>
        </>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

// ─── Revision Page Component ──────────────────────────────────────────────
function RevisionPage() {
  const [searchParams] = useSearchParams();
  const revisionId = searchParams.get("revision");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [globalComment, setGlobalComment] = useState("");
  const [comments, setComments] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const FIREBASE_URL = `https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents/orders/${revisionId}`;

  useEffect(() => {
    if (!revisionId) { setError("Invalid link."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(FIREBASE_URL);
        if (!res.ok) { setError("Order not found."); setLoading(false); return; }
        const doc = await res.json();
        if (!doc.fields) { setError("Order not found."); setLoading(false); return; }
        const f = doc.fields;
        const parsed = {
          orderId:       f.orderId?.stringValue || revisionId,
          source:        f.source?.stringValue || 'fiverr',
          clientEmail:   f.clientEmail?.stringValue || '',
          fiverr_order:  f.fiverr_order?.stringValue || '',
          package:       f.package?.stringValue || 'standard',
          revisionsLeft: parseInt(f.revisionsLeft?.integerValue || '0'),
          results:       JSON.parse(f.results?.stringValue || '[]'),
        };
        setData(parsed);
      } catch (e) { setError("Unable to load order."); }
      setLoading(false);
    })();
  }, [revisionId]);

  const getWebhookUrl = () => {
    return data?.source === 'direct' ? DIRECT_REVISION_WEBHOOK_URL : REVISION_WEBHOOK_URL;
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await fetch(getWebhookUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: revisionId, action: "approve" }),
      });
      setDone("approved");
    } catch { setDone("approved"); }
    setSubmitting(false);
  };

  const handleRevise = async () => {
    setSubmitting(true);
    try {
      await fetch(getWebhookUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: revisionId, action: "revise", globalComment, productComments: comments }),
      });
      setDone("revised");
    } catch { setDone("revised"); }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" style={{ width: 32, height: 32, borderTopColor: "#c8f564", borderColor: "#252525" }} />
      <p>Loading your descriptions…</p>
      <style>{STYLES}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: "center", color: "#ff6b6b" }}>
      <p>{error}</p>
      <style>{STYLES}</style>
    </div>
  );

  if (done === "approved") return (
    <div className="success">
      <div className="success-icon">✅</div>
      <h2>Descriptions approved!</h2>
      <p>{data?.source === 'direct' ? "Your CSV files are being generated and will be sent to your email shortly." : "Your files are being generated and will be sent via Fiverr shortly."}</p>
      <style>{STYLES}</style>
    </div>
  );

  if (done === "revised") return (
    <div className="success">
      <div className="success-icon">🔄</div>
      <h2>Revision submitted!</h2>
      <p>We're updating your descriptions.<br />You'll receive a new preview link shortly.</p>
      <style>{STYLES}</style>
    </div>
  );

  if (!data) return null;

  let results = data.results || [];
  if (typeof results === 'string') {
    try { results = JSON.parse(results); } catch { results = []; }
  }

  const { package: pkg, revisionsLeft = 0, fiverr_order, source } = data;
  const pkgData = PACKAGES[pkg] || PACKAGES.standard;
  const color = pkgData.color;

  return (
    <div className="card">
      <span className="badge">Preview & Revision</span>
      <h1>Your descriptions</h1>
      <p className="subtitle">
        {source === 'direct'
          ? <>{pkg} package · <span style={{ color }}>{revisionsLeft} revision{revisionsLeft !== 1 ? "s" : ""} remaining</span></>
          : <>Order <strong style={{ color: "var(--accent)" }}>{fiverr_order}</strong> · {pkg} package · <span style={{ color }}>{revisionsLeft} revision{revisionsLeft !== 1 ? "s" : ""} remaining</span></>
        }
      </p>

      {results.map((d, i) => (
        <div className="rev-product" key={i}>
          <h3>
            <span style={{ background: color, color: "#0a0a0a", borderRadius: "50%", width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            {d.nom_produit}
          </h3>
          {d.titre_seo && <div className="rev-field"><div className="field-label">SEO Title</div><div className="field-value">{d.titre_seo}</div></div>}
          {d.meta_description && <div className="rev-field"><div className="field-label">Meta Description</div><div className="field-value">{d.meta_description}</div></div>}
          {d.description_courte && <div className="rev-field"><div className="field-label">Short Description</div><div className="field-value">{d.description_courte}</div></div>}
          {d.description_longue && <div className="rev-field"><div className="field-label">Long Description</div><div className="field-value" style={{ maxHeight: 160, overflowY: "auto" }}>{d.description_longue}</div></div>}
          {d.bullet_points?.length > 0 && (
            <div className="rev-field">
              <div className="field-label">Bullet Points</div>
              <div className="field-value"><ul style={{ paddingLeft: 18, margin: 0 }}>{d.bullet_points.map((b, j) => <li key={j} style={{ marginBottom: 4 }}>{b}</li>)}</ul></div>
            </div>
          )}
          {revisionsLeft > 0 && (
            <div className="comments-section">
              <h4>Change request for this product (optional)</h4>
              <textarea className="rev-textarea" placeholder="Describe any changes you'd like…" value={comments[i] || ""} onChange={e => setComments({ ...comments, [i]: e.target.value })} disabled={submitting} />
            </div>
          )}
        </div>
      ))}

      {revisionsLeft > 0 && (
        <div className="comments-section">
          <h4>General feedback (optional)</h4>
          <textarea className="rev-textarea" placeholder="Any general comments for all products?" value={globalComment} onChange={e => setGlobalComment(e.target.value)} disabled={submitting} />
        </div>
      )}

      <div className="rev-buttons">
        <button className="btn-approve" onClick={handleApprove} disabled={submitting}>
          {submitting ? "Processing…" : "✓ Approve"}
        </button>
        {revisionsLeft > 0 && (
          <button className="btn-revise" onClick={handleRevise} disabled={submitting}>
            {submitting ? "Processing…" : "🔄 Request revision"}
          </button>
        )}
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

// ─── Token Validation Page ────────────────────────────────────────────────
function TokenGatedForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [validation, setValidation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const validate = async () => {
      const result = await validateToken(token);
      setValidation(result);
      if (!result.valid) {
        setTimeout(() => navigate("/"), 3000);
      }
    };

    validate();
  }, [token, navigate]);

  if (!validation) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: 32, height: 32, borderTopColor: "#c8f564", borderColor: "#252525" }} />
        <p>Validating your token…</p>
      </div>
    );
  }

  if (!validation.valid) {
    return (
      <div className="error-msg" style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ marginBottom: 12 }}>Invalid or Expired Token</h2>
        <p>{validation.error}</p>
        <p style={{ marginTop: 20, fontSize: ".85rem", color: "#888" }}>Redirecting to homepage…</p>
      </div>
    );
  }

  return <FormPage orderId={validation.orderId} />;
}

// ─── Main App Component ───────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<StartOrder />} />
        <Route path="/form" element={<DirectForm />} />
        <Route path="/merci" element={<MerciPage />} />
        <Route path="/fiverr" element={<FiverrForm />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
