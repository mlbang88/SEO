/**
 * WORKFLOW 4 — RÉVISION DIRECTE
 * Webhook: /webhook/direct-revision
 * FIX: updateFirestoreDocument utilise updateMask pour ne pas effacer source/clientEmail
 * FIX: CSV attachments avec bon format Brevo
 * FIX: langue prise depuis d.langue (results) si products[i] absent
 */

const inputJson = $input.first().json;
const body = (inputJson.body !== undefined && typeof inputJson.body === 'object') ? inputJson.body : inputJson;

const orderId        = body.orderId;
const action         = body.action;
const globalComment  = body.globalComment || '';
const productComments = body.productComments || {};

if (!orderId) throw new Error('orderId is required');
if (!['approve', 'revise'].includes(action)) throw new Error('action must be approve or revise');

// Variables Railway : CLAUDE_API_KEY, BREVO_API_KEY
const CLAUDE_API_KEY  = $env.CLAUDE_API_KEY;
const BREVO_API_KEY   = $env.BREVO_API_KEY;
const APP_URL         = 'https://getseobolt.com';
const FIREBASE_DB_URL = 'https://firestore.googleapis.com/v1/projects/seo-description-fiverr/databases/(default)/documents';

const getFirestoreDocument = async (docId) => {
  const response = await this.helpers.httpRequest({ method: 'GET', url: `${FIREBASE_DB_URL}/orders/${docId}`, json: true });
  if (!response.fields) throw new Error('Document not found');
  const f = response.fields;
  return {
    orderId:       f.orderId?.stringValue || '',
    clientEmail:   f.clientEmail?.stringValue || '',
    source:        f.source?.stringValue || 'direct',
    package:       f.package?.stringValue || 'standard',
    platforms:     f.platforms?.arrayValue?.values?.map(v => v.stringValue) || [],
    revisionsLeft: parseInt(f.revisionsLeft?.integerValue || '1'),
    revisionsTotal: parseInt(f.revisionsTotal?.integerValue || '1'),
    status:        f.status?.stringValue || 'pending',
    results:       JSON.parse(f.results?.stringValue || '[]'),
    products:      JSON.parse(f.products?.stringValue || '[]'),
    config:        JSON.parse(f.config?.stringValue || '{}'),
    brand:         f.brand?.stringValue || '',
    globalCategory: f.globalCategory?.stringValue || '',
    altText:       f.altText?.booleanValue === true,
  };
};

// IMPORTANT: updateMask pour ne PAS écraser source, clientEmail, platforms etc.
const updateFirestoreDocument = async (docId, updates) => {
  const params = 'updateMask.fieldPaths=status&updateMask.fieldPaths=revisionsLeft&updateMask.fieldPaths=results';
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${FIREBASE_DB_URL}/orders/${docId}?${params}`,
    headers: { 'Content-Type': 'application/json' },
    body: { fields: {
      status:        { stringValue: updates.status || 'pending' },
      revisionsLeft: { integerValue: String(updates.revisionsLeft ?? 0) },
      results:       { stringValue: updates.results ? JSON.stringify(updates.results) : '[]' },
    }},
    json: true,
  });
};

const stripHtml = v => String(v || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => '"' + stripHtml(String(v || '')).replace(/"/g, '""') + '"';
const slug = v => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bulletsText = (d, config) => config.bullets && d.bullet_points?.length ? d.bullet_points.join(' | ') : '';

const generateHTMLFile = (results, orderId, pkg) => {
  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[pkg] || '#c8f564';
  const pkgLabel = pkg.charAt(0).toUpperCase() + pkg.slice(1);

  const fmtVol = (v) => v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v);

  const hlText = (text, kwStrings) => {
    if (!text || !kwStrings.length) return text;
    const sorted = [...kwStrings].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'gi');
    return text.replace(re, `<mark style="background:rgba(200,245,100,0.25);border-radius:3px;padding:0 2px">$1</mark>`);
  };

  const productsHtml = results.map((d, i) => {
    const hasDfsData = d.mots_cles_data?.length > 0;
    const kws = hasDfsData
      ? d.mots_cles_data
      : (d.mots_cles_suggeres || []).map(k => ({ keyword: k, volume: null }));
    const kwStrings = kws.map(k => k.keyword);

    const bullets = (d.bullet_points || []).map(b => `<li>${hlText(b, kwStrings)}</li>`).join('');
    const keywords = kws.map(k => `<span class="kw">${k.keyword}${k.volume ? `<span class="kw-vol"> ${fmtVol(k.volume)}/mo</span>` : ''}</span>`).join('');
    const paaList = (d.people_also_ask || []).map(q => `<li>${q}</li>`).join('');
    const competitor = d.analyse_concurrents ? `
      <div class="section">
        <div class="label">🔍 Competitor Analysis</div>
        <div class="value competitor">${d.analyse_concurrents}</div>
      </div>` : '';

    const urlSlug = d.nom_produit.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const titleLen = (d.titre_seo || '').length;
    const metaLen = (d.meta_description || '').length;
    const titleLenColor = titleLen > 60 ? '#d93025' : titleLen > 50 ? '#f5a623' : '#1a0dab';
    const metaLenColor = metaLen > 160 ? '#d93025' : '#545454';
    const serpHtml = `
      <div class="section">
        <div class="label">Google SERP Preview</div>
        <div class="serp-box">
          <div class="serp-url">www.yourstore.com/${urlSlug}</div>
          <div class="serp-title" style="color:${titleLenColor}">${d.titre_seo || ''} <span class="serp-len">${titleLen}/60</span></div>
          <div class="serp-meta" style="color:${metaLenColor}">${d.meta_description || ''} <span class="serp-len">${metaLen}/160</span></div>
        </div>
      </div>`;

    return `
    <div class="product-card">
      <div class="product-header">
        <span class="num">${i + 1}</span>
        <span class="name">${d.nom_produit}</span>
        ${d.langue ? `<span class="lang-badge">${d.langue}</span>` : ''}
      </div>
      ${serpHtml}
      <div class="section"><div class="label">SEO Title</div><div class="value seo-title">${hlText(d.titre_seo || '', kwStrings)}</div></div>
      <div class="section"><div class="label">Meta Description</div><div class="value meta">${hlText(d.meta_description || '', kwStrings)}</div></div>
      <div class="section"><div class="label">Short Description</div><div class="value">${hlText(d.description_courte || '', kwStrings)}</div></div>
      ${d.description_longue ? `<div class="section"><div class="label">Long Description</div><div class="value">${hlText(d.description_longue, kwStrings)}</div></div>` : ''}
      ${bullets ? `<div class="section"><div class="label">Bullet Points</div><ul class="bullets">${bullets}</ul></div>` : ''}
      ${keywords ? `<div class="section"><div class="label">SEO Keywords${hasDfsData ? ' <span style="color:#888;font-size:10px;font-weight:400;text-transform:none;letter-spacing:0">— DataForSEO</span>' : ''}</div><div class="keywords">${keywords}</div></div>` : ''}
      ${paaList ? `<div class="section"><div class="label">&#x1F4AC; People Also Ask</div><ul class="bullets">${paaList}</ul></div>` : ''}
      ${competitor}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SEO Descriptions — ${orderId}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; color: #222; padding: 30px 20px; }
  .header { background: #0e0e0e; color: #fff; padding: 30px 40px; border-radius: 12px; margin-bottom: 30px; border-left: 5px solid ${color}; }
  .header h1 { color: ${color}; font-size: 24px; margin-bottom: 8px; }
  .header p { color: #aaa; font-size: 14px; }
  .badge { display: inline-block; background: ${color}; color: #0e0e0e; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; margin-left: 10px; }
  .product-card { background: #fff; border: 1px solid #e0e0e0; border-left: 4px solid ${color}; border-radius: 10px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .product-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
  .num { background: ${color}; color: #0e0e0e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
  .name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
  .lang-badge { background: #eee; color: #555; padding: 3px 10px; border-radius: 20px; font-size: 11px; margin-left: auto; }
  .section { margin-bottom: 16px; }
  .label { font-size: 11px; color: ${color}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
  .value { color: #444; line-height: 1.7; font-size: 14px; }
  .seo-title { font-weight: 600; color: #1a1a1a; font-size: 16px; }
  .meta { color: #555; font-style: italic; }
  .competitor { background: #f0f4ff; border-left: 3px solid #6b9eff; padding: 12px; border-radius: 6px; font-style: italic; color: #444; }
  .bullets { padding-left: 20px; }
  .bullets li { margin-bottom: 6px; color: #444; font-size: 14px; line-height: 1.6; }
  .keywords { display: flex; flex-wrap: wrap; gap: 8px; }
  .kw { background: #f0f0f0; color: #333; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
  .kw-vol { color: ${color}; font-weight: 700; font-size: 11px; margin-left: 4px; }
  .serp-box { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 16px; font-family: Arial, sans-serif; }
  .serp-url { font-size: 13px; color: #006621; margin-bottom: 3px; }
  .serp-title { font-size: 18px; line-height: 1.3; margin-bottom: 3px; }
  .serp-meta { font-size: 14px; line-height: 1.5; }
  .serp-len { font-size: 10px; color: #999; margin-left: 6px; font-weight: 400; }
  .footer { text-align: center; color: #aaa; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="header">
  <h1>📝 SEO Descriptions <span class="badge">${pkgLabel}</span></h1>
  <p>Order: ${orderId} &nbsp;•&nbsp; ${results.length} product${results.length > 1 ? 's' : ''} &nbsp;•&nbsp; Generated by GetSEOBolt</p>
</div>
${productsHtml}
<div class="footer">GetSEOBolt.com — Your SEO descriptions are ready to use!</div>
</body>
</html>`;

  return {
    name: 'seo-descriptions.html',
    content: Buffer.from(html, 'utf-8').toString('base64'),
    contentType: 'text/html; charset=utf-8',
  };
};

const generateCSVFiles = (results, platforms, config, brand, globalCategory, altText) => {

  const csvFormats = {
    shopify: {
      filename: 'shopify-import.csv',
      header: 'Handle,Title,Body (HTML),Vendor,Tags,SEO Title,SEO Description,Image Src,Image Alt Text,Variant SKU,Variant Price,Variant Compare At Price',
      row: d => {
        const body = [stripHtml(d.description_courte||''),stripHtml(d.description_longue||''),bulletsText(d,config)].filter(Boolean).join('\n\n');
        return [esc(slug(d.nom_produit)),esc(d.nom_produit),esc(body),esc(brand),esc((d.mots_cles_suggeres||[]).join(', ')),esc(d.titre_seo||''),esc(d.meta_description||''),esc(d.image_url||''),esc(d.image_alt||''),esc(d.sku||''),esc(d.prix||''),esc(d.prix_barre||'')].join(',');
      }
    },
    woocommerce: {
      filename: 'woocommerce-import.csv',
      header: 'Name,Description,Short description,Regular price,Sale price,SKU,Tags,Images,Meta: _yoast_wpseo_title,Meta: _yoast_wpseo_metadesc,Categories',
      row: d => {
        const desc=[stripHtml(d.description_longue||''),bulletsText(d,config)].filter(Boolean).join('\n\n');
        const cat = d.categorie_produit || globalCategory;
        return [esc(d.nom_produit),esc(desc),esc(stripHtml(d.description_courte||'')),esc(d.prix||''),esc(d.prix_barre||''),esc(d.sku||''),esc((d.mots_cles_suggeres||[]).join(', ')),esc(d.image_url||''),esc(d.titre_seo||''),esc(d.meta_description||''),esc(cat)].join(',');
      }
    },
    amazon: {
      filename: 'amazon-import.csv',
      header: 'item_sku,item_name,product_description,bullet_point1,bullet_point2,bullet_point3,bullet_point4,bullet_point5,generic_keywords,standard_price,brand_name,main_image_url,main_image_alt',
      row: d => {
        const bp=d.bullet_points||[];
        return [esc(d.sku||slug(d.nom_produit)),esc(d.titre_seo||d.nom_produit),esc(stripHtml(d.description_courte||'')),esc(bp[0]||''),esc(bp[1]||''),esc(bp[2]||''),esc(bp[3]||''),esc(bp[4]||''),esc((d.mots_cles_suggeres||[]).join(', ')),esc(d.prix||''),esc(brand),esc(d.image_url||''),esc(d.image_alt||'')].join(',');
      }
    },
    wix: {
      filename: 'wix-import.csv',
      header: 'Product Name,Description,Price,Compare Price,SKU,Brand,Category,Image URL,SEO Title,SEO Description,Tags',
      row: d => {
        const cat = d.categorie_produit || globalCategory;
        return [esc(d.nom_produit),esc(stripHtml(d.description_courte||'')),esc(d.prix||''),esc(d.prix_barre||''),esc(d.sku||''),esc(brand),esc(cat),esc(d.image_url||''),esc(d.titre_seo||''),esc(d.meta_description||''),esc((d.mots_cles_suggeres||[]).join(', '))].join(',');
      }
    },
    bigcommerce: {
      filename: 'bigcommerce-import.csv',
      header: 'Product Name,Product Description,Price,Sale Price,SKU,Brand Name,Category,Image URL,Image Alt,Page Title,Meta Description',
      row: d => {
        const desc=[stripHtml(d.description_courte||''),stripHtml(d.description_longue||''),bulletsText(d,config)].filter(Boolean).join('\n\n');
        const cat = d.categorie_produit || globalCategory;
        return [esc(d.nom_produit),esc(desc),esc(d.prix||''),esc(d.prix_barre||''),esc(d.sku||''),esc(brand),esc(cat),esc(d.image_url||''),esc(d.image_alt||''),esc(d.titre_seo||''),esc(d.meta_description||'')].join(',');
      }
    },
    prestashop: {
      filename: 'prestashop-import.csv',
      header: 'Name,Description,Short description,Price,Reference,Category,Image URL,Meta title,Meta description,Tags',
      row: d => {
        const cat = d.categorie_produit || globalCategory;
        return [esc(d.nom_produit),esc(stripHtml(d.description_longue||d.description_courte||'')),esc(stripHtml(d.description_courte||'')),esc(d.prix||''),esc(d.sku||''),esc(cat),esc(d.image_url||''),esc(d.titre_seo||''),esc(d.meta_description||''),esc((d.mots_cles_suggeres||[]).join(','))].join(',');
      }
    },
    other: {
      filename: 'descriptions.csv',
      header: 'product_number,product_name,sku,price,compare_price,brand,category,image_url,image_alt,field_type,content',
      row: d => {
        const rows=[];
        const cat = d.categorie_produit || globalCategory;
        const base = [d.product_number,esc(d.nom_produit),esc(d.sku||''),esc(d.prix||''),esc(d.prix_barre||''),esc(brand),esc(cat),esc(d.image_url||''),esc(d.image_alt||'')].join(',');
        const add=(t,v)=>{ if(v) rows.push(`${base},${esc(t)},${esc(stripHtml(v))}`); };
        add('SEO Title',d.titre_seo); add('Meta Description',d.meta_description);
        add('Short Description',d.description_courte); add('Long Description',d.description_longue);
        if(config.bullets&&d.bullet_points?.length) d.bullet_points.forEach((b,i)=>add(`Bullet Point ${i+1}`,b));
        if(d.image_alt) add('Image Alt Text',d.image_alt);
        return rows.join('\n');
      }
    },
  };

  return platforms.map(platform => {
    const fmt = csvFormats[platform] || csvFormats.other;
    const rows = [fmt.header, ...results.map(fmt.row)];
    const csvContent = '\uFEFF' + rows.join('\n');
    return {
      name: fmt.filename,
      content: Buffer.from(csvContent, 'utf-8').toString('base64'),
      contentType: 'text/csv; charset=utf-8',
    };
  });
};

if (action === 'approve') {
  const docData = await getFirestoreDocument(orderId);
  const csvAttachments = generateCSVFiles(docData.results, docData.platforms, docData.config, docData.brand || '', docData.globalCategory || '', docData.altText === true);
  const htmlAttachment = generateHTMLFile(docData.results, orderId, docData.package);
  const attachments = [...csvAttachments, htmlAttachment];
  await updateFirestoreDocument(orderId, { status: 'delivered', revisionsLeft: 0, results: docData.results });

  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[docData.package] || '#c8f564';
  const pkgLabel = docData.package.charAt(0).toUpperCase() + docData.package.slice(1);
  const platformList = docData.platforms.join(', ');

  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: {
      sender: { name: "GetSEOBolt", email: "contact@getseobolt.com" },
      to: [{ email: docData.clientEmail }],
      subject: `✅ Your SEO files are ready — ${orderId}`,
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0e0e0e;color:#f0f0f0;padding:32px;border-radius:12px;border:1px solid ${color};">
          <h2 style="color:${color};margin-top:0;">✅ Your files are attached! 📁</h2>
          <p>Your <strong>${pkgLabel}</strong> SEO descriptions are approved. CSV files for <strong>${platformList}</strong> are attached to this email.</p>
          <p style="color:#888;font-size:13px;">Thank you for using GetSEOBolt. Reply to this email if you need anything.</p>
        </div>`,
      attachment: attachments,
    },
    json: true,
  });

  return [{ json: { success: true, action: 'delivered', orderId } }];
}

if (action === 'revise') {
  const docData = await getFirestoreDocument(orderId);
  if (docData.revisionsLeft <= 0) throw new Error('No more revisions available');

  const newResults = [];
  for (let i = 0; i < docData.results.length; i++) {
    const d = docData.results[i];
    // Langue : on prend d.langue (sauvé dans results) en priorité, sinon products[i]
    let lang = d.langue || docData.products[i]?.langue || 'English';
    const productComment = productComments[i] || '';
    const hasComment = globalComment || productComment;

    if (!hasComment) { newResults.push(d); continue; }

    // Détection de changement de langue dans les commentaires
    const allComments = (globalComment + ' ' + productComment).toLowerCase();
    if (allComments.includes('french') || allComments.includes('français') || allComments.includes('francais')) lang = 'French';
    else if (allComments.includes('english') || allComments.includes('anglais')) lang = 'English';
    else if (allComments.includes('spanish') || allComments.includes('espagnol') || allComments.includes('español')) lang = 'Spanish';
    else if (allComments.includes('german') || allComments.includes('allemand') || allComments.includes('deutsch')) lang = 'German';
    else if (allComments.includes('italian') || allComments.includes('italien') || allComments.includes('italiano')) lang = 'Italian';
    else if (allComments.includes('portuguese') || allComments.includes('portugais')) lang = 'Portuguese';
    else if (allComments.includes('dutch') || allComments.includes('néerlandais') || allComments.includes('neerlandais')) lang = 'Dutch';

    const langInstruction = lang === 'French'
      ? `Tu es un expert SEO. Réécris ces descriptions en FRANÇAIS UNIQUEMENT. Pas un seul mot en anglais ou autre langue.`
      : lang === 'Spanish'
      ? `Eres un experto SEO. Reescribe en ESPAÑOL ÚNICAMENTE. Ni una palabra en inglés u otro idioma.`
      : lang === 'German'
      ? `Du bist ein SEO-Experte. Schreibe alles NUR AUF DEUTSCH. Kein einziges Wort auf Englisch.`
      : lang === 'Italian'
      ? `Sei un esperto SEO. Riscrivi tutto SOLO IN ITALIANO. Nemmeno una parola in inglese.`
      : lang === 'Portuguese'
      ? `Você é um especialista SEO. Reescreva tudo APENAS EM PORTUGUÊS.`
      : lang === 'Dutch'
      ? `Je bent een SEO-expert. Herschrijf alles ALLEEN IN HET NEDERLANDS.`
      : `You are an SEO expert. Rewrite everything in ENGLISH ONLY.`;

    const prompt = `${langInstruction}

Product: ${d.nom_produit}
Current:
- SEO Title: ${d.titre_seo}
- Meta Description: ${d.meta_description}
- Short Description: ${d.description_courte}
- Long Description: ${d.description_longue || ''}
- Bullets: ${(d.bullet_points || []).join(' | ')}

Client feedback:
${globalComment ? `General: ${globalComment}` : ''}
${productComment ? `For this product: ${productComment}` : ''}

Rewrite ALL elements in ${lang}. Respond ONLY with valid JSON:
{
  "titre_seo": "...", "meta_description": "...", "description_courte": "...", "description_longue": "...",
  "bullet_points": ["...","...","...","...","..."],
  "mots_cles_suggeres": ${JSON.stringify(d.mots_cles_suggeres || [])},
  "analyse_concurrents": ${JSON.stringify(d.analyse_concurrents || '')}
}`;

    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: { model: 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] },
      json: true,
    });

    const raw = response.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    const res = JSON.parse(match[0]);
    newResults.push({ 
      ...res, 
      nom_produit: d.nom_produit, 
      product_number: d.product_number, 
      mots_cles_suggeres: d.mots_cles_suggeres || res.mots_cles_suggeres || [],
      mots_cles_data: d.mots_cles_data || [],
      people_also_ask: d.people_also_ask || [],
      concurrents: d.concurrents,
      langue: lang,
      // Conserver données optionnelles client
      prix: d.prix || '', prix_barre: d.prix_barre || '',
      sku: d.sku || '', image_url: d.image_url || '',
      categorie_produit: d.categorie_produit || '',
    });
  }

  const newRevisionsLeft = docData.revisionsLeft - 1;
  await updateFirestoreDocument(orderId, { status: 'pending_review', revisionsLeft: newRevisionsLeft, results: newResults });

  const revisionLink = `${APP_URL}/revision?revision=${orderId}`;
  const colors = { basic: '#4a9eff', standard: '#c8f564', premium: '#ff9f43' };
  const color = colors[docData.package] || '#c8f564';

  await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: {
      sender: { name: "GetSEOBolt", email: "contact@getseobolt.com" },
      to: [{ email: docData.clientEmail }],
      subject: `🔄 Your revised descriptions are ready!`,
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0e0e0e;color:#f0f0f0;padding:32px;border-radius:12px;border:1px solid ${color};">
          <h2 style="color:${color};margin-top:0;">Revised descriptions ready 🔄</h2>
          <p>We've updated your descriptions. You have <strong style="color:${color}">${newRevisionsLeft} revision${newRevisionsLeft !== 1 ? 's' : ''}</strong> remaining.</p>
          <div style="background:#1a1a1a;border-left:3px solid ${color};border-radius:8px;padding:20px;margin:24px 0;">
            <a href="${revisionLink}" style="display:block;background:${color};color:#0e0e0e;text-decoration:none;border-radius:6px;padding:14px 20px;font-weight:700;font-size:14px;text-align:center;">Review new version →</a>
          </div>
        </div>`,
    },
    json: true,
  });

  return [{ json: { success: true, action: 'revised', revisionsLeft: newRevisionsLeft, orderId } }];
}

throw new Error('Invalid action');
