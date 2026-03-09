# SEO Bolt - Action Plan
Date: 2026-03-07 | Current Score: 42/100 | Target Score: 80/100

---

## CRITICAL (Fix immediately -- blocks indexing / kills CTR)

### C-1: Fix the page title
File: index.html:7
Change: <title>seo</title>
To:     <title>SEO Bolt | Professional Product Descriptions for Shopify, Amazon & More</title>
Impact: Title shows in Google SERPs -- current value destroys CTR.

### C-2: Add meta description
File: index.html (add inside head)
Add:
  <meta name="description" content="Get AI-powered, SEO-optimized product descriptions
  for Shopify, WooCommerce, Amazon and more. Delivered in 24h. Packages from $15." />
Impact: Controls SERP snippet text.

### C-3: Add robots.txt
File: public/robots.txt (new file)
Content:
  User-agent: *
  Allow: /
  Disallow: /admin
  Sitemap: https://your-domain.com/sitemap.xml
Impact: Gives crawlers clear instructions and blocks admin from indexing.

### C-4: Add sitemap.xml
File: public/sitemap.xml (new file)
Include URLs: /, /start, /form
Exclude: /admin, /revision (dynamic, query-string based)
Impact: Ensures Google discovers all public pages.

### C-5: Fix duplicate H1 -- logo
File: src/Pages/HomePage.jsx:13
Change: <h1 className="logo">SEO Bolt</h1>
To:     <span className="logo">SEO Bolt</span>
Impact: Only one H1 per page is best practice. Two H1s confuse crawlers.

---

## HIGH (Fix within 1 week -- significant ranking impact)

### H-1: Add Open Graph and Twitter Card meta tags
File: index.html (add inside head)
Tags needed:
  og:title, og:description, og:type, og:url, og:image (1200x630px)
  twitter:card, twitter:title, twitter:description, twitter:image
Impact: Controls how the site looks when shared on social media / messaging apps.

### H-2: Add JSON-LD structured data
File: index.html (add before closing head)
Add two script blocks with type="application/ld+json":
1. Service schema with Organization provider and three Offer objects (Basic $15, Standard $30, Premium $55)
2. FAQPage schema with "How does SEO Bolt work?" from the How It Works section
Impact: Enables rich results in Google; allows AI tools to extract structured pricing and service info.

### H-3: Replace button-only navigation with anchor links
File: src/Pages/HomePage.jsx
Change all internal navigation buttons to anchor tags:
  - "Start Order" button -> <a href="/start" className="test-form-btn">Start Order</a>
  - "Order Now" pricing buttons -> link to /start with package query param
Keep the onClick handlers for analytics if needed, but the href must exist for crawlability.
Impact: Critical for GoogleBot to discover and crawl inner pages.

### H-4: Fix Google Fonts loading
File: index.html (replace App.jsx runtime injection)
Remove: @import inside App.jsx:104 JS string
Add to index.html head:
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700
    &family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
Impact: Eliminates FOUT/CLS, improves LCP, better Core Web Vitals score.

### H-5: Move secrets to environment variables
File: src/App.jsx:31-33
Change hardcoded webhook URLs to:
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;
  const REVISION_WEBHOOK_URL = import.meta.env.VITE_REVISION_WEBHOOK_URL;
  const DIRECT_REVISION_WEBHOOK_URL = import.meta.env.VITE_DIRECT_REVISION_WEBHOOK_URL;
Create: .env.local with the actual values (never commit to git)
Impact: Security hygiene -- URLs are visible in source but env vars are the right pattern.

### H-6: Add vercel.json security headers
File: vercel.json
Add headers array with:
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000
Impact: Improves security score, minor positive trust signal for SEO.

---

## MEDIUM (Fix within 1 month -- optimization opportunities)

### M-1: Add lazy loading for routes
File: src/App.jsx
Wrap non-homepage routes in React.lazy() + Suspense:
  const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'))
  const DirectForm = lazy(() => import('./Pages/DirectForm'))
  etc.
Impact: Reduces initial bundle size, improves LCP for homepage visitors.

### M-2: Create an About page
Route: /about
Content: Story behind SEO Bolt, expertise, number of orders completed,
         why Claude AI was chosen, guarantees.
Impact: Critical for E-E-A-T trust signals.

### M-3: Create an Examples/Portfolio page
Route: /examples
Content: Before/after product descriptions across different categories (electronics,
         fashion, furniture etc.), showing SEO title, meta, short/long descriptions.
Impact: Demonstrates expertise, builds trust, targets "product description examples" queries.

### M-4: Add social proof to homepage
File: src/Pages/HomePage.jsx
Add a Testimonials section between How It Works and final CTA.
Include 3-5 quotes from real customers with their store/platform.
Replace "hundreds of sellers" claim with a specific number.
Impact: E-E-A-T Trustworthiness signal; improves conversion rate.

### M-5: Create Privacy Policy and Terms pages
Routes: /privacy, /terms
Impact: Legal compliance, trust signal, Google expects these for service sites.

### M-6: Add canonical tag
File: index.html
Add: <link rel="canonical" href="https://your-domain.com/" />
Impact: Prevents duplicate content issues if site is accessible via multiple URLs.

### M-7: Replace default favicon
File: public/ (add favicon.ico and/or favicon.svg with SEO Bolt branding)
Update index.html: <link rel="icon" href="/favicon.ico" />
Also add: <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
Impact: Brand recognition in browser tabs and bookmarks.

---

## LOW (Backlog -- nice to have)

### L-1: Create a blog / content section
Route: /blog
Initial articles:
  - "How to write SEO product descriptions for Shopify in 2026"
  - "Shopify vs WooCommerce: Which platform has better SEO for product pages?"
  - "What makes a great Amazon product description?"
Impact: Long-term organic traffic via content marketing.

### L-2: Add FAQ page
Route: /faq
Extract and expand the How It Works section into full Q&A format.
Apply FAQPage schema.
Impact: Long-tail query capture, potential FAQ rich results in SERPs.

### L-3: Add a blog/content RSS feed
Impact: AI tools and aggregators can discover and cite content.

### L-4: Consider SSR or SSG
Tools: Vite SSR, Astro, or Next.js migration
Impact: Eliminates the second-wave JS rendering problem for all routes.
Note: This is a significant architectural change -- evaluate ROI carefully.

### L-5: Add hreflang if targeting multiple languages
Current: Service supports English, French, Spanish, German, Italian
If separate URLs exist per language, add hreflang tags.
Impact: International SEO accuracy.

---

## Score Projections

| After completing...         | Estimated Score |
|-----------------------------|-----------------|
| Critical fixes only (C1-C5) | ~55/100         |
| + High priority (H1-H6)     | ~68/100         |
| + Medium priority (M1-M7)   | ~78/100         |
| + Low priority (L1-L5)      | ~85/100         |

---

## Implementation Order (Recommended)

Week 1 (1-2 hours):
  1. C-1: Fix title tag
  2. C-2: Add meta description
  3. C-5: Fix duplicate H1 (logo)
  4. H-4: Fix Google Fonts loading
  5. H-6: Add security headers to vercel.json
  6. H-1: Add Open Graph tags

Week 1-2 (2-4 hours):
  7. C-3: Add robots.txt
  8. C-4: Add sitemap.xml
  9. H-2: Add JSON-LD structured data
  10. H-3: Convert nav buttons to anchor links

Week 3-4 (4-8 hours):
  11. H-5: Move webhooks to env vars
  12. M-1: Add lazy loading
  13. M-4: Add social proof / testimonials
  14. M-5: Privacy and Terms pages
  15. M-6: Canonical tag + favicon (M-7)

Month 2+:
  16. M-2: About page
  17. M-3: Examples/Portfolio page
  18. L-1: Blog setup and first 2 articles
