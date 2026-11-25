# LaunchPulse — Global Directory Distribution, Buyer Radar & Verifiable Revenue Attribution

**Live Platform**: [https://pulse.statementflow.win](https://pulse.statementflow.win) · **Interactive Sandbox**: [https://pulse.statementflow.win/dashboard?sample=1](https://pulse.statementflow.win/dashboard?sample=1)

LaunchPulse helps SaaS founders and indie hackers turn post-launch distribution into measurable, dollar-reconciled growth without spammy link blasts:

1. **100+ Curated High-DR Directory Pacing**: Staggered 3-wave cadence (Wave 1 Flagship DR 80+ → Wave 2 Vertical SaaS → Wave 3 Niche & Community) with automated HTTP 200 & `dofollow` backlink verification.
2. **24/7 Multi-Source Buyer Intent Radar**: Monitors Reddit, Hacker News, GitHub, and DEV.to for high-intent alternative & buying threads, paired with a Zero-Link Safe Reply Studio powered by Cloudflare Workers AI.
3. **Edge Shortlinks & Verifiable Revenue Attribution**: Sub-10ms `/r/<code>` edge redirects + a 1-line attribution pixel (`window.lpConvert`) reconciling clicks, signups, and paid orders into shareable public growth reports (`/report`).
4. **Free Pre-Launch Growth Tools**:
   - [12-Point AEO & AI Crawler Checker](https://pulse.statementflow.win/tools/aeo-checker)
   - [`/llms.txt` Manifest Studio](https://pulse.statementflow.win/tools/llms-txt-generator)
   - [100+ SaaS Directory Finder](https://pulse.statementflow.win/tools/directory-finder)

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Static Edge Export), React 19, Tailwind CSS v4, `motion/react` spring physics, TanStack Table v8, Recharts 3
- **Design System**: V8 5-Layer Optical Frosted Vibrancy (`Pearl Frost` & `Obsidian Vibrancy`) + Dual-Script Typography (`Plus Jakarta Sans` + `MiSans` + `JetBrains Mono`)
- **Edge Runtime & Storage**: Cloudflare Workers (`worker.ts` + `worker-v4.ts`), Cloudflare D1 SQLite, Cloudflare Workers AI, Creem Checkout & HMAC Webhook Verification

## Local Development & Deployment

```bash
npm install
npm run dev      # Local Next.js dev server
npm run build    # Static export verification
npm run deploy   # Build + deploy to Cloudflare Workers (pulse.statementflow.win)
```
