export const TONS = ["Professional", "Luxury", "Fun & Casual", "Technical", "Reassuring"];
export const LANGUES = ["English", "French", "Spanish", "German", "Italian", "Portuguese", "Dutch"];
export const PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "amazon", label: "Amazon" },
  { value: "wix", label: "Wix" },
  { value: "bigcommerce", label: "BigCommerce" },
  { value: "prestashop", label: "PrestaShop" },
  { value: "other", label: "Other" },
];

export const emptyProduct = (tone, language) => ({
  nom_produit: "", caracteristiques: "", mots_cles: "", concurrents: "",
  ton: tone || "Professional", langue: language || "English",
  prix: "", prix_barre: "", sku: "", image_url: "", categorie_produit: "",
});

export const CSV_TEMPLATE = `product_name,features,keywords,competitors,tone,language,price,compare_price,sku,image_url,product_category
Ergonomic Chair ProBack X3,"Lumbar support, 4D armrests, breathable fabric","ergonomic chair, back pain","hermanmiller.com",Professional,English,299.99,399.99,CHAIR-PRB-X3,https://example.com/image.jpg,Office Chairs
Standing Desk SmartLift,"Dual motor, 4 memory positions, 160x80cm","standing desk, sit stand","flexispot.com",Professional,English,599.99,,DESK-SML-01,,Desks`;

export const parseCSV = (text) => {
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
    headers.forEach((h, i) => obj[h] = (vals[i] || "").replace(/^"|"$/g, ""));
    return {
      nom_produit: obj.product_name || obj.nom_produit || "",
      caracteristiques: obj.features || obj.caracteristiques || "",
      mots_cles: obj.keywords || obj.mots_cles || "",
      concurrents: obj.competitors || obj.concurrents || "",
      ton: obj.tone || obj.ton || "Professional",
      langue: obj.language || obj.langue || "English",
      prix: obj.price || obj.prix || "",
      prix_barre: obj.compare_price || obj.prix_barre || "",
      sku: obj.sku || "",
      image_url: obj.image_url || "",
      categorie_produit: obj.product_category || obj.categorie_produit || "",
    };
  }).filter(p => p.nom_produit);
};
