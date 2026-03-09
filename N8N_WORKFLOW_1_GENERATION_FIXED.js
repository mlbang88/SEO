/**
 * ============================================================
 * WORKFLOW 1 — GÉNÉRATION INITIALE (VERSION CORRIGÉE)
 * ============================================================
 * 
 * Authenticating Firebase without 'crypto' module - using HTTP calls
 */

const inputJson = $input.first().json;
const body = (inputJson.body !== undefined && typeof inputJson.body === 'object')
  ? inputJson.body 
  : inputJson;

// Debug: log what we received
console.log('Raw input:', JSON.stringify(inputJson).substring(0, 200));
console.log('Body extracted:', JSON.stringify(body).substring(0, 200));

const token         = body.token || null;
const pkg           = body.package || body.pkg;
const prods         = body.products || [];
const total         = prods.length;
const platforms     = body.platforms || ['shopify'];
const fiverrOrder   = body.fiverr_order || body.fiverr_order || 'unknown';
const brand          = body.brand || '';
const globalCategory = body.globalCategory || '';
const altText        = body.altText === true;

const revisionsByPackage = { basic: 1, standard: 2, premium: 3 };
const revisionsTotal = revisionsByPackage[pkg] || 1;

// Better error handling
if (!pkg) throw new Error(`Champs obligatoires manquants - package reçu: ${pkg}`);
if (total === 0) throw new Error('Au moins 1 produit est obligatoire');

const pkgConfig = {
  basic:    { words: 100, bullets: false, keyword_research: false, competitor_research: false, elements: ["titre_seo", "description_courte"] },
  standard: { words: 150, bullets: true,  keyword_research: false, competitor_research: false, elements: ["titre_seo", "meta_description", "description_courte"] },
  premium:  { words: 300, bullets: true,  keyword_research: true,  competitor_research: true,  elements: ["titre_seo", "meta_description", "description_courte", "description_longue"] },
};
const config = pkgConfig[pkg] || pkgConfig.standard;

// ===== CONSTANTES — variables Railway (service N8N › Variables) =====
// Créer dans Railway : CLAUDE_API_KEY, BREVO_API_KEY, DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
const CLAUDE_API_KEY      = $env.CLAUDE_API_KEY;
const BREVO_API_KEY       = $env.BREVO_API_KEY;
const APP_URL             = 'https://getseobolt.com';
const DATAFORSEO_LOGIN    = $env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = $env.DATAFORSEO_PASSWORD;

// ===== CONSTANTES FIREBASE - VERSION SIMPLIFIÉE =====
const FIREBASE_PROJECT = 'seo-description-fiverr';
const FIREBASE_DB_URL = 'https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents';
// On va utiliser simplement avec une URL Firestore REST - pas besoin de JWT complexe

// ===== FONCTION : GÉNÉRER LES DESCRIPTIONS AVEC CLAUDE =====
// ===== FONCTION : DATAFORSEO KEYWORD RESEARCH =====
const fetchDataForSEOKeywords = async (seedKeyword, language) => {
  try {
    const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
    const langMap = { French: 'French', Spanish: 'Spanish', German: 'German', Italian: 'Italian', Portuguese: 'Portuguese' };
    const locMap  = { French: 'France', Spanish: 'Spain',   German: 'Germany', Italian: 'Italy',  Portuguese: 'Portugal'  };
    const lang    = langMap[language] || 'English';
    const loc     = locMap[language]  || 'United States';

    const response = await this.helpers.httpRequest({
      method:  'POST',
      url:     'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: [{
        keyword:       seedKeyword,
        language_name: lang,
        location_name: loc,
        limit:         20,
        order_by:      ['keyword_info.search_volume,desc'],
      }],
      json: true,
    });

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items
      .filter(item => (item.keyword_info?.search_volume || 0) > 0)
      .slice(0, 8)
      .map(item => ({ keyword: item.keyword, volume: item.keyword_info?.search_volume || 0 }));
  } catch (err) {
    console.log('DataForSEO error (non-blocking):', err.message);
    return [];
  }
};

// ===== FONCTION : DATAFORSEO PEOPLE ALSO ASK (via keyword_ideas questions) =====
const fetchPAA = async (seedKeyword, language) => {
  try {
    const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
    const langMap = { French: 'French', Spanish: 'Spanish', German: 'German', Italian: 'Italian', Portuguese: 'Portuguese' };
    const locMap  = { French: 'France', Spanish: 'Spain',   German: 'Germany', Italian: 'Italy',  Portuguese: 'Portugal'  };
    const lang = langMap[language] || 'English';
    const loc  = locMap[language]  || 'United States';
    const response = await this.helpers.httpRequest({
      method:  'POST',
      url:     'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: [{ keywords: [seedKeyword], language_name: lang, location_name: loc, limit: 30 }],
      json: true,
    });
    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    // Filtrer les keywords qui ont la forme d'une question
    const questions = items
      .map(i => i.keyword || '')
      .filter(k => /^(what|how|why|when|where|which|who|is|are|can|do|does|will|should|best|top)/i.test(k))
      .slice(0, 5);
    return questions;
  } catch (err) {
    console.log('DataForSEO PAA error (non-blocking):', err.message);
    return [];
  }
};

const generateDescriptions = async () => {
  const results = [];
  
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    const lang = p.langue || 'English';

    // ===== DATAFORSEO KEYWORD RESEARCH + PAA =====
    // Seed DataForSEO : globalCategory > nom sans marque > nom produit
    const nomSansMarque = brand ? p.nom_produit.replace(new RegExp(brand, 'gi'), '').trim() : p.nom_produit;
    const dfseSeed = globalCategory || nomSansMarque || p.nom_produit;
    const [dfsKeywordsData, dfsPAA] = await Promise.all([
      fetchDataForSEOKeywords(dfseSeed, lang),
      fetchPAA(dfseSeed, lang),
    ]);
    const dfsKeywords = dfsKeywordsData.map(k => k.keyword);
    console.log(`DataForSEO keywords for "${p.nom_produit}" (seed: "${dfseSeed}"):`, dfsKeywordsData);
    console.log(`DataForSEO PAA for "${p.nom_produit}":`, dfsPAA);

    const langInstruction = lang === 'French'
      ? `Tu es un expert en rédaction SEO. Génère des descriptions produit en FRANÇAIS UNIQUEMENT. N'écris pas un seul mot en anglais.`
      : lang === 'Spanish'
      ? `Eres un experto en redacción SEO. Genera descripciones de producto ÚNICAMENTE EN ESPAÑOL.`
      : lang === 'German'
      ? `Du bist ein SEO-Texter-Experte. Erstelle Produktbeschreibungen NUR AUF DEUTSCH.`
      : lang === 'Italian'
      ? `Sei un esperto di copywriting SEO. Genera descrizioni di prodotto SOLO IN ITALIANO.`
      : `You are an expert SEO copywriter. Generate product descriptions in ENGLISH ONLY.`;

    const prompt = `${langInstruction}

ABSOLUTE RULE: Every single word of your response must be in ${lang}. This is mandatory.

Package: ${pkg}
Product: ${p.nom_produit}
Features: ${p.caracteristiques}
Tone: ${p.ton || 'Professional'}
Word count target: ${config.words}
Elements required: ${config.elements.join(', ')}
${config.bullets ? `Include exactly 5 bullet points in ${lang}.` : ''}
${brand ? `Brand: ${brand}` : ''}
${pkg === 'premium' && p.concurrents ? `
COMPETITOR ANALYSIS (MANDATORY):
Competitors: ${p.concurrents}
Write a dedicated 3-5 sentence analysis in ${lang} in the "analyse_concurrents" field covering:
1. What these competitors offer and their strengths
2. Their weaknesses or gaps
3. How this product stands out vs them
IMPORTANT: Do NOT mention competitors inside titre_seo, meta_description, description_courte or description_longue. All competitive content goes ONLY in analyse_concurrents.` : ''}
${altText && p.image_url ? `
ALT TEXT (MANDATORY): Generate an SEO-optimized image alt text in ${lang} for the product image. Put it in the "image_alt" field. Max 125 characters, descriptive and keyword-rich.` : ''}
${dfsKeywords.length > 0
  ? `\nThese keywords have real search volume data — use them as semantic inspiration. Never repeat any keyword more than once. Prioritize natural readability over keyword density:\n${dfsKeywordsData.map((k, idx) => `${idx + 1}. ${k.keyword} (${k.volume.toLocaleString()}/mo)`).join('\n')}`
  : ''}
${dfsPAA.length > 0
  ? `\nPEOPLE ALSO ASK – Real Google questions buyers ask. Use them to inspire your descriptions and bullet points:\n${dfsPAA.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`
  : ''}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "titre_seo": "...",
  "meta_description": "...",
  "description_courte": "...",
  "description_longue": "...",
  "bullet_points": ["...","...","...","...","..."],
  "mots_cles_suggeres": ["...","...","...","...","...","...","...","..."],
  "analyse_concurrents": "...",
  "image_alt": "${altText && p.image_url ? '...' : ''}"
}`;

    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      json: true,
    });

    const raw = response.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    const res = JSON.parse(match[0]);
    
    results.push({
      ...res,
      mots_cles_suggeres: dfsKeywords.length > 0 ? dfsKeywords : (res.mots_cles_suggeres || []),
      mots_cles_data: dfsKeywordsData.length > 0 ? dfsKeywordsData : [],
      people_also_ask: dfsPAA,
      nom_produit: p.nom_produit,
      product_number: i + 1,
      concurrents: p.concurrents || '',
      langue: lang,
      image_url:         p.image_url || '',
      image_alt:         res.image_alt || '',
      prix:              p.prix || '',
      prix_barre:        p.prix_barre || '',
      sku:               p.sku || '',
      categorie_produit: p.categorie_produit || '',
    });
  }
  
  return results;
};

// ===== FONCTION : GÉNÉRER UN TOKEN UUID =====
const generateToken = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ===== FONCTION : CALCULER L'EXPIRATION DU TOKEN (7 JOURS) =====
const getTokenExpiration = () => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  return expirationDate.toISOString();
};

// ===== FONCTION : SAUVEGARDER DANS FIREBASE (AVEC TOKEN) =====
const saveToFirebase = async (results) => {
  const orderId = `${fiverrOrder}-${Date.now()}`;
  const tokenExpiration = getTokenExpiration();
  
  // Structure du document Firestore au format REST API
  const firestoreDoc = {
    fields: {
      orderId:         { stringValue: orderId },
      fiverr_order:    { stringValue: fiverrOrder },
      source:          { stringValue: 'fiverr' },
      package:         { stringValue: pkg },
      platforms:       { arrayValue: { values: platforms.map(p => ({ stringValue: p })) } },
      revisionsLeft:   { integerValue: String(revisionsTotal) },
      revisionsTotal:  { integerValue: String(revisionsTotal) },
      status:          { stringValue: 'pending_review' },
      createdAt:       { stringValue: new Date().toISOString() },
      results:         { stringValue: JSON.stringify(results) },
      products:        { stringValue: JSON.stringify(prods) },
      config:          { stringValue: JSON.stringify(config) },
      brand:           { stringValue: brand },
      globalCategory:  { stringValue: globalCategory },
      altText:         { booleanValue: altText },
      sessionToken:    token ? { stringValue: token } : { stringValue: '' },
      tokenExpiration: { stringValue: tokenExpiration },
    }
  };

  try {
    // Correct URL format for Firestore REST API - POST to create with custom ID
    const createUrl = `${FIREBASE_DB_URL}/orders/${orderId}`;
    console.log('Saving to Firestore:', createUrl);
    console.log('Session token:', token || 'none');
    
    const firebaseResponse = await this.helpers.httpRequest({
      method: 'PATCH',
      url: createUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      body: firestoreDoc,
      json: true,
    });
    
    console.log('Firebase response:', firebaseResponse);
  } catch (error) {
    console.log('Firebase save error:', error.message);
    throw new Error(`Firebase save failed: ${error.message}`);
  }
  
  return { orderId };
};

// ===== FONCTION : ENVOYER EMAIL DE RÉVISION =====
const sendRevisionEmailToFiverr = async (orderId, results) => {
  const revisionLink = `${APP_URL}/revision?revision=${orderId}`; // ✅ correct
  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[pkg] || '#c8f564';
  const pkgLabel = pkg.charAt(0).toUpperCase() + pkg.slice(1);

  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0e0e0e;color:#f0f0f0;padding:32px;border-radius:12px;border:1px solid ${color};">
      <h2 style="color:${color};margin-top:0;margin-bottom:24px;">📦 New order ready for review</h2>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #333;">
          <td style="color:#888;padding:10px 0;padding-right:16px;">Fiverr Order</td>
          <td style="font-weight:600;padding:10px 0;">${fiverrOrder}</td>
        </tr>
        <tr style="border-bottom:1px solid #333;">
          <td style="color:#888;padding:10px 0;padding-right:16px;">Package</td>
          <td style="font-weight:600;padding:10px 0;">${pkgLabel}</td>
        </tr>
        <tr style="border-bottom:1px solid #333;">
          <td style="color:#888;padding:10px 0;padding-right:16px;">Products</td>
          <td style="font-weight:600;padding:10px 0;">${total}</td>
        </tr>
        <tr style="border-bottom:1px solid #333;">
          <td style="color:#888;padding:10px 0;padding-right:16px;">Platforms</td>
          <td style="font-weight:600;padding:10px 0;">${platforms.join(', ')}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:10px 0;padding-right:16px;">Revisions Included</td>
          <td style="font-weight:600;color:${color};padding:10px 0;">${revisionsTotal}</td>
        </tr>
      </table>

      <div style="background:#1a1a1a;border-left:3px solid ${color};border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#888;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">👇 Send this link to your client on Fiverr:</p>
        <a href="${revisionLink}" style="display:block;background:${color};color:#0e0e0e;text-decoration:none;border-radius:6px;padding:14px 20px;font-weight:700;font-size:14px;text-align:center;word-break:break-all;">${revisionLink}</a>
        <p style="color:#666;font-size:11px;margin:12px 0 0;text-align:center;">⏰ Link expires in 7 days</p>
      </div>

      <p style="color:#555;font-size:11px;text-align:center;margin:0;">Order ID: ${orderId}</p>
    </div>
  `;

  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: {
      sender: { name: "ProductDescriptions", email: "maximelab888@gmail.com" },
      to: [{ email: "maximelab888@gmail.com" }],
      subject: `📦 New order — ${fiverrOrder} | ${pkgLabel} | ${total} products | ${revisionsTotal} revisions`,
      htmlContent: htmlContent,
      replyTo: { email: "maximelab888@gmail.com" },
    },
    json: true,
  });
};

// ===== EXÉCUTION PRINCIPALE =====
try {
  // Étape 1 : Générer descriptions avec Claude
  const results = await generateDescriptions();
  
  // Étape 2 : Sauvegarder dans Firestore
  const { orderId } = await saveToFirebase(results);
  
  // Étape 3 : Envoyer email avec lien de révision
  await sendRevisionEmailToFiverr(orderId, results);
  
  return [{ json: { success: true, orderId, fiverr_order: fiverrOrder, total_products: total } }];
  
} catch (error) {
  throw new Error(`Workflow failed: ${error.message}`);
}
