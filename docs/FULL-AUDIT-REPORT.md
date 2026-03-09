# SEO Bolt - Full SEO Audit Report
Date: 2026-03-07
Business Type: SaaS / Freelance Service - AI-generated e-commerce product descriptions
Stack: React 19 + Vite, Firebase, React Router v7, Vercel

---

## Overall SEO Health Score: 42 / 100

| Category                 | Weight | Raw Score | Weighted   |
|--------------------------|--------|-----------|------------|
| Technical SEO            | 25%    | 32/100    | 8/25       |
| Content Quality          | 25%    | 55/100    | 14/25      |
| On-Page SEO              | 20%    | 40/100    | 8/20       |
| Schema / Structured Data | 10%    | 0/100     | 0/10       |
| Performance (CWV)        | 10%    | 72/100    | 7/10       |
| Images                   | 5%     | 80/100    | 4/5        |
| AI Search Readiness      | 5%     | 20/100    | 1/5        |
| **TOTAL**                |        |           | **42/100** |

---

## Top 5 Critical Issues
1. Title tag is "seo" -- the unmodified Vite default. Zero branding, zero keywords.
2. No meta description -- Google auto-generates one, usually poorly.
3. No robots.txt or sitemap.xml in public/.
4. Dual h1 tags on homepage: logo (HomePage.jsx:13) AND hero heading (line 35).
5. Zero structured data anywhere in the codebase.

## Top 5 Quick Wins
1. Set title: "SEO Bolt | Product Descriptions for Shopify, Amazon & More"
2. Add meta description to index.html
3. Add public/robots.txt and public/sitemap.xml
4. Change logo h1 to span -- one H1 per page
5. Add JSON-LD Service + FAQ schema to index.html

---

## 1. Technical SEO

### Crawlability

| Check          | Status | Detail                                                   |
|----------------|--------|----------------------------------------------------------|
| robots.txt     | FAIL   | Does not exist in public/                                |
| sitemap.xml    | FAIL   | Does not exist                                           |
| Internal links | FAIL   | All navigation uses button onClick -- not crawlable      |
| SPA routing    | PASS   | vercel.json correctly rewrites all routes to index.html  |

Every navigation button on the homepage uses onClick with navigate(). Googlebot cannot
follow buttons. Routes /start, /form, /revision are effectively invisible to crawlers.

### Indexability

| Check                 | Status | Detail                                                  |
|-----------------------|--------|---------------------------------------------------------|
| title tag             | FAIL   | Value is "seo" -- Vite default, never changed           |
| meta description      | FAIL   | Not present in index.html                               |
| lang attribute        | PASS   | html lang="en"                                          |
| canonical tag         | FAIL   | Missing                                                 |
| client-side rendering | WARN   | Full SPA, no SSR/SSG. Second-wave JS render is slower.  |

### Core Web Vitals (Estimated)

| Metric | Risk | Cause                                                                 |
|--------|------|-----------------------------------------------------------------------|
| LCP    | WARN | Hero text rendered by React JS, not static HTML                       |
| INP    | LOW  | Simple interactions only                                              |
| CLS    | WARN | Google Fonts loaded via @import inside JS string (App.jsx:104)        |
| TTFB   | LOW  | Vercel CDN                                                            |

The font @import at App.jsx:104 is embedded in a JavaScript string and injected as inline
style at runtime. Fonts are requested only after JS executes, causing FOUT (Flash of
Unstyled Text) and CLS. No preconnect exists for fonts.googleapis.com.

### Security Headers
Not configured in vercel.json. Missing: X-Content-Type-Options, X-Frame-Options,
Strict-Transport-Security, Content-Security-Policy.

---

## 2. On-Page SEO

### Title Tag
- Current (index.html:7): seo
- Recommended: SEO Bolt | Professional Product Descriptions for Shopify, Amazon & More

### Meta Description
- Current: Not present
- Recommended: Get AI-powered, SEO-optimized product descriptions for Shopify,
  WooCommerce, Amazon and more. Delivered in 24h. Packages from $15.

### Open Graph / Social
No og: or twitter: meta tags. Sharing the URL produces a blank preview on LinkedIn,
Twitter, Slack etc. Missing: og:title, og:description, og:image, og:url, twitter:card.

### Heading Structure
Two h1 elements on the homepage:
- h1 "SEO Bolt" inside nav (HomePage.jsx:13) -- WRONG, should be span
- h1 "Professional SEO Descriptions for Your Products" -- correct hero H1

Full structure:
  h1 SEO Bolt (nav logo -- WRONG)
  h1 Professional SEO Descriptions... (hero)
  h2 Why Choose SEO Bolt?
    h3 SEO Optimized / Fast Turnaround / Platform Ready / Unlimited Revisions
  h2 Transparent Pricing
    h3 Basic / Standard / Premium
  h2 How It Works
    h3 Upload / AI Generation / Review / Export
  h2 Ready to Get Started?
  h4 SEO Bolt / Contact / Links (footer)

### Internal Links
No anchor tags (a href) used for internal navigation anywhere on the homepage.
All navigation is JavaScript button clicks. This prevents:
- PageRank flowing between pages
- Crawl budget efficiency
- Meaningful anchor text signals

### External Links
Both hero and footer CTA buttons link to https://fiverr.com (root domain), not a specific
gig. Should link to the actual Fiverr gig URL.

---

## 3. Content Quality

### E-E-A-T Assessment

| Signal            | Status | Notes                                                         |
|-------------------|--------|---------------------------------------------------------------|
| Experience        | FAIL   | No portfolio, no real output examples                         |
| Expertise         | FAIL   | No author bio, team info, or credentials                      |
| Authoritativeness | FAIL   | No press mentions, no external recognition                    |
| Trustworthiness   | WARN   | Email shown but no About page, address, or trust badges       |

The claim "Join hundreds of sellers using SEO Bolt" has zero supporting proof --
no testimonials, reviews, ratings, or customer logos.

### Content Gaps (Missing Pages)
- /about -- expertise and credentials
- /examples -- real before/after product descriptions
- /blog -- keyword-targeted content marketing
- /faq -- long-tail query capture
- /privacy + /terms -- trust and legal compliance

### Keyword Targeting
Homepage is too generic. High-value queries not targeted:
- "product description writing service shopify"
- "AI product descriptions woocommerce"
- "fiverr product description writer"
- "shopify product description SEO service"

---

## 4. Schema / Structured Data

Current: None. Zero JSON-LD, Microdata, or RDFa in any file.

### Recommended: Service Schema (highest priority)
Add to index.html as a script type="application/ld+json":

  "@context": "https://schema.org",
  "@type": "Service",
  "name": "SEO Product Description Writing",
  "provider": { "@type": "Organization", "name": "SEO Bolt", "email": "hello@seobolt.com" },
  "offers": [
    { "@type": "Offer", "name": "Basic",    "price": "15", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Standard", "price": "30", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Premium",  "price": "55", "priceCurrency": "USD" }
  ]

### Recommended: FAQPage Schema
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How does SEO Bolt work?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Upload your product CSV, we generate optimized descriptions with AI, you review and request revisions, then download formatted CSVs for your platform."
    }
  }]

---

## 5. Performance

### Google Fonts (CLS Risk)
Font @import at App.jsx:104 is a JavaScript string injected as inline style at runtime.
Fonts load after the JS bundle executes, causing FOUT and CLS.
Fix: Move to index.html with link rel="preconnect" href="https://fonts.googleapis.com"
and a proper link href for the font stylesheet.

### Code Splitting
All pages imported directly in App.jsx with no lazy loading. AdminDashboard, DirectForm,
FiverrForm etc. load in the initial bundle for every homepage visitor.
Recommend: const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'))

---

## 6. Images

No img tags on the homepage. All visuals are emoji and CSS backgrounds.
- Favicon is default vite.svg -- not brand-appropriate
- No og:image for social card previews (1200x630px recommended)
- No product screenshots, service illustrations, or platform logos

---

## 7. AI Search Readiness (GEO)

Citation score: Very Low

AI search engines (ChatGPT, Perplexity, Google AI Overviews) need:
- Question-answering structured content
- Author credentials and expertise signals
- FAQ and definitional content
- Structured data (Service, FAQPage)
- External citations

None of these are present. Pricing is not in structured data so AI tools cannot
reliably extract it.

---

## 8. Security Notes (Code Review)

- Firebase config hardcoded in App.jsx:18-25 -- ensure Firebase Security Rules are strict
- Webhook URLs hardcoded in App.jsx:31-33 -- move to import.meta.env.VITE_WEBHOOK_URL
- Admin route /admin at a known public URL -- review auth gating in AdminDashboard.jsx
