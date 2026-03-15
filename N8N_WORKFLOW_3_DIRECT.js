/**
 * WORKFLOW 3 — GÉNÉRATION DIRECTE
 * Webhook: /webhook/direct-order
 */

const inputJson = $input.first().json;
const body = (inputJson.body !== undefined && typeof inputJson.body === 'object') ? inputJson.body : inputJson;

const clientEmail    = body.email;
const pkg            = body.package || 'standard';
const prods          = body.products || [];
const total          = prods.length;
const platforms      = body.platforms || ['shopify'];
const brand          = body.brand || '';
const globalCategory = body.globalCategory || '';
const altText        = body.altText === true;

const revisionsByPackage = { basic: 1, standard: 2, premium: 3 };
const revisionsTotal = revisionsByPackage[pkg] || 1;

if (!clientEmail) throw new Error('Email client manquant');
if (total === 0) throw new Error('Au moins 1 produit obligatoire');

const pkgConfig = {
  basic:    { words: 100, bullets: false, elements: ["titre_seo", "meta_description", "description_courte"] },
  standard: { words: 150, bullets: true,  elements: ["titre_seo", "meta_description", "description_courte"] },
  premium:  { words: 300, bullets: true,  elements: ["titre_seo", "meta_description", "description_courte", "description_longue"] },
};
const config = pkgConfig[pkg] || pkgConfig.standard;

// Variables Railway : CLAUDE_API_KEY, BREVO_API_KEY, DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
const CLAUDE_API_KEY      = $env.CLAUDE_API_KEY;
const BREVO_API_KEY       = $env.BREVO_API_KEY;
const APP_URL             = 'https://getseobolt.com';
const DATAFORSEO_LOGIN    = $env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = $env.DATAFORSEO_PASSWORD;
const FIREBASE_DB_URL = 'https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents';

// Diagnostic: confirm env vars are loaded
console.log('[ENV CHECK] CLAUDE_API_KEY:', !!CLAUDE_API_KEY, '| DATAFORSEO_LOGIN:', !!DATAFORSEO_LOGIN, '| DATAFORSEO_PASSWORD:', !!DATAFORSEO_PASSWORD);

let _dfsError = null; // capture first DataForSEO error for output visibility

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
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: [{ keyword: seedKeyword, language_name: lang, location_name: loc, limit: 20, order_by: ['keyword_info.search_volume,desc'] }],
      json: true,
    });
    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items.filter(item => (item.keyword_info?.search_volume || 0) > 0).slice(0, 8).map(item => ({ keyword: item.keyword, volume: item.keyword_info?.search_volume || 0 }));
  } catch (err) {
    _dfsError = `${err.message} | login_defined:${!!DATAFORSEO_LOGIN} | pass_defined:${!!DATAFORSEO_PASSWORD}`;
    return [];
  }
};

// ===== FONCTION : TRADUCTION DES SEEDS VIA CLAUDE (si langue ≠ anglais) =====
const translateSeeds = async (seeds, targetLanguage) => {
  try {
    const resp = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: {
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Translate each of the following search keywords/phrases to ${targetLanguage}. Keep them short and natural as search queries (not full sentences). Respond ONLY with a JSON array of strings in the same order, no explanation.\n\nKeywords: ${JSON.stringify(seeds)}`,
        }],
      },
      json: true,
    });
    const raw = resp.content[0].text;
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : seeds;
  } catch (err) {
    console.log('translateSeeds error (non-blocking):', err.message);
    return seeds;
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

// ===== FALLBACK : VOLUMES ESTIMÉS PAR CLAUDE (si DataForSEO indisponible) =====
const fetchClaudeKeywordFallback = async (productName, features, language) => {
  try {
    const resp = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: {
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `You are an SEO expert. Generate 8 relevant search keywords in ${language} for the product below, with realistic estimated monthly Google search volumes.\n\nProduct: ${productName}\nFeatures: ${features}\n\nRules:\n- Keywords must be in ${language}\n- Volumes must be realistic integers (between 100 and 50000)\n- Sort by volume descending\n- Mix head terms and long-tail queries\n- Respond ONLY with a valid JSON array, no explanation:\n[{"keyword": "...", "volume": 1200}, ...]`,
        }],
      },
      json: true,
    });
    const raw = resp.content[0].text;
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (err) {
    return [];
  }
};

const generateDescriptions = async () => {
  const results = await Promise.all(prods.map(async (p, i) => {
    const lang = p.langue || 'English';
    // Seed DataForSEO : globalCategory > nom sans marque > nom produit
    const nomSansMarque = brand ? p.nom_produit.replace(new RegExp(brand, 'gi'), '').trim() : p.nom_produit;
    const dfseSeed = globalCategory || nomSansMarque || p.nom_produit;

    // Extract up to 2 feature seeds from caracteristiques for richer keyword coverage
    const featureSeeds = (p.caracteristiques || '')
      .split(/[,\n;]/)
      .map(f => f.trim())
      .filter(f => f.length > 3 && f.length < 80)
      .slice(0, 2);

    // Translate seeds to target language so DataForSEO returns local-market keywords
    const allSeedsRaw = [dfseSeed, ...featureSeeds];
    const allSeedsTranslated = await translateSeeds(allSeedsRaw, lang);
    const [mainSeedTranslated, ...featureSeedsTranslated] = allSeedsTranslated;

    // Run all keyword queries in parallel: main seed + feature seeds + PAA
    const [allKwResults, dfsPAA] = await Promise.all([
      Promise.all([
        fetchDataForSEOKeywords(mainSeedTranslated, lang),
        ...featureSeedsTranslated.map(seed => fetchDataForSEOKeywords(seed, lang)),
      ]),
      fetchPAA(mainSeedTranslated, lang),
    ]);

    // Merge results, deduplicate by keyword (keep highest volume), sort descending
    const kwMap = new Map();
    for (const kwArray of allKwResults) {
      for (const kw of kwArray) {
        if (!kwMap.has(kw.keyword) || kwMap.get(kw.keyword).volume < kw.volume) {
          kwMap.set(kw.keyword, kw);
        }
      }
    }
    let dfsKeywordsData = [...kwMap.values()]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
    let dfsKeywords = dfsKeywordsData.map(k => k.keyword);
    // Fallback : si DataForSEO indisponible, estimer les volumes via Claude
    if (dfsKeywordsData.length === 0) {
      const fallback = await fetchClaudeKeywordFallback(p.nom_produit, p.caracteristiques || '', lang);
      if (fallback.length > 0) {
        dfsKeywordsData = fallback;
        dfsKeywords = dfsKeywordsData.map(k => k.keyword);
      }
    }
    const seedsUsed = allSeedsTranslated.join('", "');
    console.log(`DataForSEO seeds (translated to ${lang}): "${seedsUsed}"`);
    console.log(`DataForSEO keywords for "${p.nom_produit}":`, dfsKeywordsData);
    console.log(`DataForSEO PAA for "${p.nom_produit}":`, dfsPAA);

    // Build a language-specific instruction
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
  ? `\nSEO KEYWORDS (real search volume in ${lang} market):\n${dfsKeywordsData.map((k, idx) => `${idx + 1}. ${k.keyword} (${k.volume.toLocaleString()}/mo)`).join('\n')}\n\nKEYWORD INTEGRATION RULES (mandatory):\n- Use at least 6 of these 10 keywords across the content\n- Vary their form naturally: plurals, synonyms, inverted word order — never paste them verbatim if it sounds forced\n- Spread them across different fields: titre_seo, description_courte, description_longue, bullet_points\n- Never use the same keyword twice\n- Integration must feel like a real copywriter wrote it, not keyword stuffing`
  : ''}
${dfsPAA.length > 0
  ? `\nPEOPLE ALSO ASK – Real Google questions buyers ask in ${lang}. Let them shape your angle and bullet points:\n${dfsPAA.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`
  : ''}

WRITING STYLE – MANDATORY:
${lang === 'French' ? `Écris comme un vrai rédacteur web, pas comme une IA. Règles strictes :
- MOTS INTERDITS : mettant en valeur, soulignant, favorisant, cultivant, vibrant, témoignage vivant, incontournable, révolutionnaire, niché, se targue de, fluide, rehausser, décupler, tirer parti de, plonger dans, subtilités, souligne, reflète les tendances, haut de gamme (comme remplissage vide), innovant (sans détail), performant (sans détail), sur mesure (comme filler), à la pointe de la technologie, votre partenaire idéal, bien-être (utilisé vaguement)
- Utilise "est / a / possède" — pas "se positionne comme / se veut / s'inscrit dans / dispose de / bénéficie de / jouit de"
- Pas de participes tacked-on en fin de phrase : jamais "...offrant ainsi un confort optimal", "...permettant de...", "...contribuant à votre bien-être", "...garantissant une expérience unique", "...assurant un résultat optimal"
- Pas de remplissage en trois parties : "alliant innovation, performance et excellence" ne dit rien — sois précis
- Varie la longueur des phrases : alterne phrases courtes et longues
- Bénéfices concrets, pas des affirmations vagues : "chauffe en 3 minutes" vaut mieux que "offre une chaleur thérapeutique optimale"
- Pas de formules d'ouverture IA : "Dans un monde où...", "Au cœur de...", "Dans un contexte où..."
- Pas de closing générique : "le choix idéal pour...", "pour une expérience optimale", "pour répondre à tous vos besoins", "le tout dans un design élégant"` 
: lang === 'Spanish' ? `Escribe como un redactor real, no como una IA. Reglas estrictas:
- PALABRAS PROHIBIDAS: destacando, mejorando, fomentando, vibrante, testimonio, fundamental, revolucionario, anidado, presume de, fluido, elevar, aprovechar, explorar en profundidad, intrincado, subraya, refleja tendencias más amplias
- Usa "es / tiene / hace" en lugar de "se posiciona como / se erige como / cuenta con / goza de"
- Sin frases participiales al final: nunca "...garantizando una experiencia única", "...contribuyendo a tu bienestar"
- Sin relleno en grupos de tres: "innovación, rendimiento y excelencia" no dice nada — sé específico
- Varía la longitud de las frases: mezcla frases cortas y largas
- Beneficios concretos: "calienta en 3 minutos" es mejor que "ofrece un calor terapéutico óptimo"
- Sin cierres genéricos: "la elección perfecta para...", "para una experiencia óptima"`
: `Write like a real copywriter, not an AI. Specifically:
- BANNED words: showcasing, highlighting, enhancing, fostering, vibrant, testament, pivotal, groundbreaking, nestled, boasts, seamless, elevate, unlock, leverage, delve, tapestry, interplay, intricate, crucial, underscores, reflects broader
- Use "is/are/has" not "serves as / stands as / features / boasts"
- No tacked-on -ing phrases: never end a sentence with "...ensuring comfort", "...reflecting quality", "...contributing to well-being"
- No rule-of-three padding: "innovation, performance, and excellence" adds nothing — be specific
- Vary sentence length: mix short punchy sentences with longer ones
- Write concrete benefits, not vague claims: "heats up in 3 minutes" beats "offers therapeutic warmth"
- No generic closing sentences like "the perfect choice for..." or "take your experience to the next level"`}
- No bullet point headers with bold + colon pattern

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

    if (!CLAUDE_API_KEY || CLAUDE_API_KEY.includes('{{')) {
      throw new Error(`CLAUDE_API_KEY is not resolved: "${CLAUDE_API_KEY}"`);
    }
    console.log('CLAUDE_API_KEY prefix:', CLAUDE_API_KEY.substring(0, 10) + '...');

    let response;
    try {
      response = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: { model: 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] },
        json: true,
      });
    } catch (claudeErr) {
      const errBody = claudeErr.response?.data
        ?? claudeErr.cause?.response?.data
        ?? claudeErr.body
        ?? claudeErr.message;
      throw new Error(`CLAUDE_ERR: ${typeof errBody === 'object' ? JSON.stringify(errBody) : errBody}`);
    }

    const raw = response.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    const res = JSON.parse(match[0]);
    return {
      ...res,
      mots_cles_suggeres: dfsKeywords.length > 0 ? dfsKeywords : (res.mots_cles_suggeres || []),
      mots_cles_data: dfsKeywordsData.length > 0 ? dfsKeywordsData : [],
      people_also_ask:  dfsPAA,
      nom_produit:      p.nom_produit,
      product_number:   i + 1,
      concurrents:      p.concurrents || '',
      langue:           lang,
      // Données optionnelles client — conservées dans les résultats pour les CSV
      image_url:        p.image_url || '',
      image_alt:        res.image_alt || '',
      prix:             p.prix || '',
      prix_barre:       p.prix_barre || '',
      sku:              p.sku || '',
      categorie_produit: p.categorie_produit || '',
    };
  }));
  return results;
};

const saveToFirebase = async (results) => {
  const orderId = `DIRECT-${Date.now()}`;
  const firestoreDoc = {
    fields: {
      orderId:        { stringValue: orderId },
      clientEmail:    { stringValue: clientEmail },
      source:         { stringValue: 'direct' },
      package:        { stringValue: pkg },
      platforms:      { arrayValue: { values: platforms.map(p => ({ stringValue: p })) } },
      revisionsLeft:  { integerValue: String(revisionsTotal) },
      revisionsTotal: { integerValue: String(revisionsTotal) },
      status:         { stringValue: 'pending_review' },
      createdAt:      { stringValue: new Date().toISOString() },
      results:        { stringValue: JSON.stringify(results) },
      products:       { stringValue: JSON.stringify(prods) },
      config:         { stringValue: JSON.stringify(config) },
      brand:          { stringValue: brand },
      globalCategory: { stringValue: globalCategory },
      altText:        { booleanValue: altText },
    }
  };

  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${FIREBASE_DB_URL}/orders/${orderId}`,
    headers: { 'Content-Type': 'application/json' },
    body: firestoreDoc,
    json: true,
  });

  return { orderId };
};

const sendRevisionEmailToClient = async (orderId) => {
  const revisionLink = `${APP_URL}/revision?revision=${orderId}`;
  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[pkg] || '#c8f564';
  const pkgLabel = pkg.charAt(0).toUpperCase() + pkg.slice(1);

  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: {
      sender: { name: "GetSEOBolt", email: "contact@getseobolt.com" },
      to: [{ email: clientEmail }],
      subject: `✨ Your SEO descriptions are ready for review!`,
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0e0e0e;color:#f0f0f0;padding:32px;border-radius:12px;border:1px solid ${color};">
          <h2 style="color:${color};margin-top:0;">Your descriptions are ready! 🎉</h2>
          <p>Your <strong>${pkgLabel}</strong> order has been processed.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #333;"><td style="color:#888;padding:10px 0;">Package</td><td style="font-weight:600;padding:10px 0;">${pkgLabel}</td></tr>
            <tr style="border-bottom:1px solid #333;"><td style="color:#888;padding:10px 0;">Products</td><td style="font-weight:600;padding:10px 0;">${total}</td></tr>
            <tr><td style="color:#888;padding:10px 0;">Revisions included</td><td style="font-weight:600;color:${color};padding:10px 0;">${revisionsTotal}</td></tr>
          </table>
          <div style="background:#1a1a1a;border-left:3px solid ${color};border-radius:8px;padding:20px;margin-bottom:24px;">
            <a href="${revisionLink}" style="display:block;background:${color};color:#0e0e0e;text-decoration:none;border-radius:6px;padding:14px 20px;font-weight:700;font-size:14px;text-align:center;">Review & Approve →</a>
          </div>
          <p style="color:#555;font-size:11px;text-align:center;">Questions? Reply to this email.</p>
        </div>`,
    },
    json: true,
  });
};

const results = await generateDescriptions();
const { orderId } = await saveToFirebase(results);
await sendRevisionEmailToClient(orderId);
return [{ json: { success: true, orderId, clientEmail, total_products: total, _dfs_error: _dfsError } }];
