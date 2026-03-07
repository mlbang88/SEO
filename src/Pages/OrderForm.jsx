import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/FormPage.css';

const WEBHOOK_URL = "https://primary-production-94f2.up.railway.app/webhook/descriptions-produits";

const PACKAGES = {
  basic:    { label: "Basic",    price: "$15", maxProducts: 5,  revisions: 1, color: "#4a9eff" },
  standard: { label: "Standard", price: "$30", maxProducts: 10, revisions: 2, color: "#c8f564" },
  premium:  { label: "Premium",  price: "$55", maxProducts: 10, revisions: 3, color: "#ff9f43" },
};

const TONS = ["Professional", "Luxury", "Fun & Casual", "Technical", "Reassuring"];
const LANGUES = ["English", "French", "Spanish", "German", "Italian"];
const PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "amazon", label: "Amazon" },
  { value: "wix", label: "Wix" },
  { value: "bigcommerce", label: "BigCommerce" },
  { value: "prestashop", label: "PrestaShop" },
  { value: "other", label: "Other" },
];

const CSV_TEMPLATE = `product_name,features,keywords,competitors,tone,language
Ergonomic Chair ProBack X3,"Lumbar support, 4D armrests, breathable fabric","ergonomic chair, back pain","hermanmiller.com, steelcase.com",Professional,English
Standing Desk SmartLift,"Dual motor, 4 memory positions, 160x80cm","standing desk, sit stand desk","flexispot.com, upliftdesk.com",Professional,English`;

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

export default function FormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({
    fiverr_order: "TEST-001",
    package: "standard",
    tone: "Professional",
    language: "English",
    platforms: ["shopify"],
    products: [],
  });
  const [submitStatus, setSubmitStatus] = useState("");
  const fileInput = useRef(null);

  const handleProductChange = (idx, field, val) => {
    const updated = [...formData.products];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormData({ ...formData, products: updated });
  };

  const handleRemoveProduct = (idx) => {
    setFormData({ ...formData, products: formData.products.filter((_, i) => i !== idx) });
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { nom_produit: "", caracteristiques: "", mots_cles: "", concurrents: "" }]
    });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const products = parseCSV(ev.target.result);
      setFormData({ ...formData, products });
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.products.length) {
      alert("Please add at least one product");
      return;
    }

    setSubmitStatus("Submitting...");
    try {
      const payload = {
        token: token || null,
        fiverr_order: formData.fiverr_order,
        package: formData.package,
        platforms: formData.platforms,
        products: formData.products.map(p => ({
          ...p,
          ton: p.ton || formData.tone,
          langue: p.langue || formData.language,
        })),
        config: {
          bullets: ["standard", "premium"].includes(formData.package),
        }
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus("✅ Order submitted successfully! Check your Fiverr messages for follow-up.");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setSubmitStatus("❌ Submission failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setSubmitStatus("❌ Error: " + error.message);
    }
  };

  const pkg = PACKAGES[formData.package];
  const color = pkg.color;

  return (
    <div className="form-page">
      <nav className="form-navbar">
        <button className="back-btn" onClick={() => navigate("/")}>← Back</button>
        <h1>Order Form</h1>
        <span></span>
      </nav>

      <div className="form-container">
        {/* Step 1: Package & Platforms */}
        {step === 1 && (
          <div className="form-step">
            <h2>Select Package</h2>
            <div className="packages-grid">
              {Object.entries(PACKAGES).map(([key, pkg]) => (
                <div
                  key={key}
                  className={`package-option ${formData.package === key ? 'active' : ''}`}
                  style={{ borderColor: formData.package === key ? pkg.color : '#333' }}
                  onClick={() => setFormData({ ...formData, package: key })}
                >
                  <h3 style={{ color: pkg.color }}>{pkg.label}</h3>
                  <p className="price">{pkg.price}</p>
                  <p>{pkg.maxProducts} products</p>
                  <p>{pkg.revisions} revision{pkg.revisions > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: "40px" }}>Select Platforms</h2>
            <div className="platforms-grid">
              {PLATFORMS.map(p => (
                <label key={p.value} className="platform-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(p.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, platforms: [...formData.platforms, p.value] });
                      } else {
                        setFormData({ ...formData, platforms: formData.platforms.filter(x => x !== p.value) });
                      }
                    }}
                  />
                  {p.label}
                </label>
              ))}
            </div>

            <h2 style={{ marginTop: "40px" }}>Tone & Language</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Tone</label>
                <select value={formData.tone} onChange={(e) => setFormData({ ...formData, tone: e.target.value })}>
                  {TONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}>
                  {LANGUES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <button className="continue-btn" style={{ backgroundColor: color }} onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Products */}
        {step === 2 && (
          <div className="form-step">
            <h2>Add Products ({formData.products.length}/{pkg.maxProducts})</h2>

            <div className="upload-section">
              <button className="upload-btn" onClick={() => fileInput.current?.click()}>
                📤 Upload CSV
              </button>
              <input ref={fileInput} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
              <button className="template-btn" onClick={() => {
                const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "template.csv";
                a.click();
              }}>
                📥 Download Template
              </button>
            </div>

            <div className="products-list">
              {formData.products.map((prod, idx) => (
                <div key={idx} className="product-card">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={prod.nom_produit}
                    onChange={(e) => handleProductChange(idx, "nom_produit", e.target.value)}
                  />
                  <textarea
                    placeholder="Features & characteristics"
                    value={prod.caracteristiques}
                    onChange={(e) => handleProductChange(idx, "caracteristiques", e.target.value)}
                  />
                  <textarea
                    placeholder="Keywords (comma separated)"
                    value={prod.mots_cles}
                    onChange={(e) => handleProductChange(idx, "mots_cles", e.target.value)}
                  />
                  <textarea
                    placeholder="Competitors"
                    value={prod.concurrents}
                    onChange={(e) => handleProductChange(idx, "concurrents", e.target.value)}
                  />
                  <button className="remove-btn" onClick={() => handleRemoveProduct(idx)}>Remove</button>
                </div>
              ))}
            </div>

            {formData.products.length < pkg.maxProducts && (
              <button className="add-product-btn" onClick={handleAddProduct}>+ Add Product</button>
            )}

            {submitStatus && <div className="status-message">{submitStatus}</div>}

            <div className="form-buttons">
              <button className="back-step-btn" onClick={() => setStep(1)}>← Back</button>
              <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                <button type="submit" className="submit-btn" style={{ backgroundColor: color }}>
                  Submit Order →
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
