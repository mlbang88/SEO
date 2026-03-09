# 📊 GetSEOBolt - État du Projet (Mars 2026)

---

## 🏗️ **ARCHITECTURE GLOBALE**

### **Stack Technologique**
- **Frontend**: React + Vite (SPA) deployed on Vercel
- **Backend**: N8N workflows on Railway
- **Database**: Firebase Firestore (REST API, no auth)
- **Payment**: Stripe (test mode)
- **Email**: Brevo SMTP API v3
- **AI**: Claude Sonnet 4.6 (Anthropic API)

### **Production URL**
https://getseobolt.com

### **Environment Keys**
```
Claude API: [voir Railway → Primary → CLAUDE_API_KEY]
Brevo API: [voir Railway → Primary → BREVO_API_KEY]
Stripe PK: [voir Railway → Primary → STRIPE_PUBLISHABLE_KEY]
Stripe SK: [voir Railway → Primary → STRIPE_SECRET_KEY]
Firebase Project: seo-description-fiverr
```

---

## 🛣️ **ROUTES FRONTEND**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | HomePage | Landing page |
| `/start` | StartOrder | Generate UUID token for Fiverr flow |
| `/form` | DirectForm | Direct customer flow (email + Stripe payment) |
| `/fiverr` | FiverForm | Fiverr form with order ID |
| `/revision` | RevisionPage | Review/approve/revise descriptions (unified for both flows) |
| `/admin` | AdminDashboard | Admin dashboard (password: admin) |

---

## 🔄 **N8N WORKFLOWS**

### **Workflow 1: Fiverr Order Generation**
- **Webhook**: `/webhook/descriptions-produits`
- **Input**: `{ token, package, products[], platforms[], fiverr_order }`
- **Process**:
  1. Generate descriptions with Claude (respects language per product)
  2. Save to Firebase with `source: 'fiverr'`
  3. Send email to admin with revision link: `?orderId=`
- **Output**: Fiverr order ready for review
- **⚠️ Note**: Uses `?orderId=` in revision links

### **Workflow 2: Fiverr Revision**
- **Webhook**: `/webhook/revision`
- **Input**: `{ orderId, action ('approve'|'revise'), globalComment, productComments }`
- **Process**:
  1. If approve: Generate CSVs for all platforms, send to admin email
  2. If revise: Regenerate with Claude using feedback, decrement revisions counter, send to admin
- **Output**: CSV files or revised descriptions
- **Status**: ✅ Working

### **Workflow 3: Direct Order Generation**
- **Webhook**: `/webhook/direct-order`
- **Input**: `{ email, package, products[], platforms[] }`
- **Process**:
  1. Generate descriptions with Claude (respects language per product)
  2. Save to Firebase with `source: 'direct'` + `clientEmail`
  3. Send email to CLIENT with revision link: `?revision=`
- **Output**: Customer receives revision link
- **Generated OrderId**: `DIRECT-${timestamp}`
- **⚠️ Current Issues**:
  - 🔴 **Language not respected** - selecting French returns English descriptions
  - ✅ Saves `source: 'direct'` correctly (verified)

### **Workflow 4: Direct Revision**
- **Webhook**: `/webhook/direct-revision`
- **Input**: `{ orderId, action ('approve'|'revise'), globalComment, productComments }`
- **Process**:
  1. If approve: Generate CSVs, send to client email
  2. If revise: Regenerate with Claude, send to client
- **Output**: CSV files or revised descriptions to client
- **Status**: ✅ Working (emails send correctly despite N8N error message)
- **⚠️ Note**: Has N8N error message but functionality works

### **Workflow 5: Create Payment Intent**
- **Webhook**: `/webhook/create-payment-intent`
- **Input**: `{ amount, email }`
- **Process**: Create Stripe payment intent for frontend
- **Output**: `{ clientSecret }`
- **Status**: ✅ Working

---

## 📦 **PACKAGES & PRICING**

```javascript
{
  basic:    { price: "$15",  amount: 1500,  maxProducts: 5,  revisions: 1 },
  standard: { price: "$30",  amount: 3000,  maxProducts: 10, revisions: 2 },
  premium:  { price: "$55",  amount: 5500,  maxProducts: 10, revisions: 3 }
}
```

---

## 🔐 **FIREBASE DOCUMENT STRUCTURE**

Collection: `orders`
Document ID: `${orderId}` (e.g., `fiverr-123456` or `DIRECT-1709289000000`)

Fields:
```json
{
  orderId: string,
  clientEmail: string (direct orders only),
  fiverr_order: string (fiverr orders only),
  source: string ("direct" | "fiverr"),
  package: string ("basic" | "standard" | "premium"),
  platforms: array[string],
  revisionsLeft: number,
  revisionsTotal: number,
  status: string ("pending_review" | "delivered"),
  createdAt: ISO timestamp,
  results: JSON string (generated descriptions),
  products: JSON string (input products),
  config: JSON string (package config),
  sessionToken: string (fiverr flow only),
  tokenExpiration: ISO timestamp (fiverr flow only)
}
```

---

## 📝 **FORM FIELDS**

### **DirectForm** (Direct Customer)
- Email (required)
- Package (basic/standard/premium)
- Tone (Professional, Luxury, Fun & Casual, Technical, Reassuring)
- **Language** (🔴 **NOT WORKING** - always generates English)
- Platforms (multi-select)
- Products (manual add or CSV upload)

### **FiverForm** (Fiverr)
- Fiverr Order ID (required)
- Package
- Tone
- Language
- Platforms
- Products

### **StartOrder** (Fiverr Token Generator)
- Generates UUID token
- Token valid for 7 days
- Redirects to `/fiverr?token=...`

---

## ✅ **WORKING FEATURES**

- ✅ Fiverr flow: token generation → order form → payment → descriptions → revision links
- ✅ Direct flow: email + Stripe payment → descriptions → revision links
- ✅ Dual revision system detects `source` field and routes to correct webhook
- ✅ CSV import for products
- ✅ Stripe payment integration
- ✅ Email notifications (Brevo)
- ✅ Admin dashboard
- ✅ SPA routing (vercel.json redirects all routes to index.html)
- ✅ Multiple platform exports (Shopify, WooCommerce, Amazon, Wix, BigCommerce, PrestaShop, Other)

---

## 🔴 **BUGS & ISSUES**

### **Issue #1: Language Not Respected (CRITICAL)**
**Symptom**: User selects "French" in DirectForm, receives English descriptions
**Status**: 🔴 **UNRESOLVED**
**Last Tested**: Feb 28, 2026
**Root Cause Analysis**:
- DirectForm correctly sets `formData.language` ✅
- handleAddProduct() adds `langue` to products ✅
- handleCSVUpload() adds `langue` to CSV products ✅
- Frontend deploys language in payload ✅
- Workflow 3 receives `p.langue` in products ✅
- Workflow 3 includes language in Claude prompt ✅
- **Possible cause**: Claude ignoring language instruction despite "CRITICAL" emphasis

**To Debug**:
1. Check N8N Workflow 3 logs when direct order executes
2. Look at exact prompt sent to Claude API
3. Test with hardcoded language in prompt

---

### **Issue #2: Workflow 4 Error Message**
**Symptom**: N8N shows "Code doesn't return items properly" error
**Status**: ⚠️ **WORKS BUT HAS ERROR**
**Impact**: Minimal - emails still send correctly despite error
**Root Cause**: Last line might not return proper N8N format
**Fix Required**: Low priority, functionality works

---

## 🔧 **RECENT FIXES (March 1, 2026)**

### **Fixed: Wrong Webhook Called for Direct Revisions**
- **Before**: RevisionPage always called Workflow 2 (Fiverr)
- **After**: RevisionPage detects `source` field and calls correct webhook
- **Changes**:
  - RevisionPage now fetches `source` from Firebase
  - Calls `/webhook/direct-revision` if source === 'direct'
  - Calls `/webhook/revision` if source === 'fiverr'

### **Fixed: QueryString Parameter Mismatch**
- **Before**: Workflow 3 sends `?revision=` but RevisionPage looked for `?orderId=`
- **After**: RevisionPage accepts both `?orderId=` and `?revision=`

### **Fixed: Frontend Deployment**
- Updated RevisionPage.jsx with webhook routing logic
- Deployed via `vercel --prod`
- Changes live on https://getseobolt.com

---

## 🧪 **TEST SCENARIOS**

### **Test #1: Direct Order with French (FAILING)**
```
1. Go to https://getseobolt.com/form
2. Select Language: "French"
3. Package: "Standard"
4. Add product with test data
5. Complete Stripe payment (4242 4242 4242 4242 / 12/99 / 123)
6. Expected: Email with FRENCH descriptions
7. Actual: Email with ENGLISH descriptions ❌
```

### **Test #2: Direct Revision Routing (FIXED)**
```
1. From Test #1 step 5, click revision link in email
2. RevisionPage loads
3. Select "Approve"
4. Expected: Webhook calls /webhook/direct-revision
5. Actual: ✅ NOW WORKS
```

### **Test #3: Fiverr Flow (WORKING)**
```
1. Go to https://getseobolt.com/start
2. Generate token
3. Share token link with Fiverr client
4. Client fills form and generates descriptions
5. Descriptions are correct
6. Revision link works
```

---

## 📋 **TODO / PRIORITY LIST**

### **P0 - BLOCKING**
- 🔴 Fix language parameter in DirectForm → Workflow 3

### **P1 - HIGH**
- Test Workflow 4 error message fix
- Verify all language combinations work

### **P2 - MEDIUM**
- Improve Claude prompt to be more strict on language
- Add logging to debug language issues

### **P3 - LOW**
- Fix Workflow 4 N8N error message
- Add language fallback handling

---

## 📁 **FILE STRUCTURE**

```
src/
├── Pages/
│   ├── HomePage.jsx
│   ├── StartOrder.jsx (Fiverr token generator)
│   ├── DirectForm.jsx (Direct customer - email + Stripe)
│   ├── FiverForm.jsx (Fiverr order form)
│   ├── RevisionPage.jsx (Unified revision page)
│   └── AdminDashboard.jsx
├── styles/
│   └── *.css
└── assets/
    └── ...

N8N/
├── N8N_WORKFLOW_1_GENERATION_FIXED.js (Fiverr generation)
├── N8N_WORKFLOW_2_REVISION.js (Fiverr revision)
├── N8N_WORKFLOW_3_DIRECT.js (Direct generation)
├── N8N_WORKFLOW_4_DIRECT_REVISION.js (Direct revision)
└── N8N_WORKFLOW_5_PAYMENT_INTENT.js (Stripe payment intent)
```

---

## 🔗 **KEY LINKS**

- Frontend: https://getseobolt.com
- N8N Platform: https://n8n.io/
- Railway N8N: https://primary-production-94f2.up.railway.app
- Firebase Console: https://console.firebase.google.com/
- Stripe Dashboard: https://dashboard.stripe.com/

---

## 📞 **NEXT ACTIONS**

1. **Debug language issue** - Check N8N Workflow 3 logs
2. **Test with hardcoded French** - Rule out form/payload issues
3. **Consider prompt improvement** - Use French-language prompt for French descriptions
4. **Deploy fixes** when language issue is resolved

---

**Last Updated**: March 1, 2026  
**Last Deploy**: March 1, 2026 (RevisionPage routing fix)  
**Next Review**: After language fix testing
