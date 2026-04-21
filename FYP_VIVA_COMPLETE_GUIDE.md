# 🎓 FYP Viva Complete Guide — Automated Video Editor

## AI-Powered Video Style Transfer Platform

> **Project Title:** Automated Video Editor with AI-Powered Style Transfer
> **University Project Type:** Final Year Project (FYP)
> **Repository:** https://github.com/Izza86/automated-video-platform

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Architecture Overview](#3-architecture-overview)
4. [Frontend — Technologies & Justifications](#4-frontend--technologies--justifications)
5. [Backend — Technologies & Justifications](#5-backend--technologies--justifications)
6. [AI/ML Models — What, Why, How](#6-aiml-models--what-why-how)
7. [Database Design](#7-database-design)
8. [Authentication & Security](#8-authentication--security)
9. [Payment System](#9-payment-system)
10. [Video Processing Pipeline — Complete Flow](#10-video-processing-pipeline--complete-flow)
11. [StyleDNA Engine (v12) — Core Innovation](#11-styledna-engine-v12--core-innovation)
12. [File Structure & Code Statistics](#12-file-structure--code-statistics)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Expected Viva Questions & Answers](#14-expected-viva-questions--answers)

---

## 1. Project Overview

Yeh project ek **AI-powered video editing platform** hai jo kisi bhi reference video ki style (color grading, speed ramps, transitions, beat-synced cuts) ko automatically extract kar ke aap ki target video pe apply karta hai — sirf **ek click mein**.

### Key Features:

- 🎬 **Video Style Transfer** — Reference video ka look copy karo target pe
- 🤖 **5 Real ML Models** — Shot detection, beat tracking, optical flow, depth estimation, color analysis
- 🎨 **StyleDNA Engine v12** — 6 perceptual domains mein semantic style fingerprinting
- 👥 **Role-Based Dashboard** — Admin + User dashboards with analytics
- 💳 **Stripe Payments** — Free / Pro / Business subscription tiers
- 🔐 **Full Auth System** — Email/password + Google OAuth + password reset
- 📧 **Email System** — Resend + React Email templates
- 🎵 **Beat-Synced Editing** — Music beats pe synchronized cuts aur effects

---

## 2. Problem Statement

**Problem:** Professional video editing requires years of experience. Ek 30-second Instagram reel ka color grading + transitions + beat sync karna manually 2-4 ghante lagta hai.

**Solution:** Hamara platform reference video se style extract karta hai aur target video pe automatically apply karta hai using ML models + FFmpeg — under 2 minutes mein.

**Novelty:**

- Existing tools (CapCut, Premiere Pro) mein manual editing hoti hai
- Hamara approach **semantic style fingerprinting** use karta hai — sirf color nahi, balke pacing, rhythm, motion, lighting, texture sab transfer hota hai

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  Landing Page → Login/Signup → Dashboard → Upload & Edit     │
│  React 19 + Tailwind CSS 4 + Radix UI + Recharts            │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP API Calls
┌─────────────────────▼───────────────────────────────────────┐
│                 NEXT.JS API ROUTES (Backend)                 │
│  /api/auth/* → Better Auth (sessions, OAuth)                 │
│  /api/checkout → Stripe payment flow                         │
│  /api/pipeline/full → Video processing pipeline              │
│  /api/editor/transfer → Edit style transfer                  │
│  /api/analysis/* → ML model invocation                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ child_process.spawn()
┌─────────────────────▼───────────────────────────────────────┐
│               PYTHON ML SCRIPTS (AI Layer)                   │
│  ml_shot_detection.py → TransNetV2 / PySceneDetect           │
│  ml_beat_detection.py → madmom RNN + librosa                 │
│  ml_motion_analysis.py → RAFT Optical Flow                   │
│  ml_depth_analysis.py → Depth-Anything V2 / MiDaS            │
│  ml_color_transfer.py → Reinhard LAB + K-Means               │
└─────────────────────┬───────────────────────────────────────┘
                      │ JSON stdout
┌─────────────────────▼───────────────────────────────────────┐
│             STYLEDNA ENGINE v12 (TypeScript)                  │
│  style-dna-extractor.ts → Extract style fingerprint          │
│  style-dna-adapter.ts → Adapt to target video                │
│  filter-graph-generator.ts → Generate FFmpeg commands         │
└─────────────────────┬───────────────────────────────────────┘
                      │ FFmpeg filter graph
┌─────────────────────▼───────────────────────────────────────┐
│                 FFMPEG (Video Rendering)                      │
│  Color grading + speed ramps + transitions + overlays        │
│  sendcmd files for temporal beat-synced effects               │
│  HALD CLUT LUT application + zoompan + eq filters            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend — Technologies & Justifications

| Technology          | Version    | Kyun Use Kiya?                                                                                                                              |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js**         | 16.0.3     | Full-stack React framework. Server-side rendering (SSR) + Static Generation (SSG) + API routes sab ek jagah. Turbopack dev server fast hai. |
| **React**           | 19.2.0     | Latest version with Server Components, streaming, Suspense improvements. Component-based UI fast build hota hai.                            |
| **TypeScript**      | 5.9.3      | Type safety — runtime errors kam hotay hain, IDE autocomplete milta hai. 15,000+ lines of typed code.                                       |
| **Tailwind CSS**    | 4.1.17     | Utility-first CSS. Custom design bina CSS files banaye, responsive classes built-in.                                                        |
| **Radix UI**        | Latest     | Accessible, unstyled headless components (Dialog, Dropdown, Select, Label). WCAG compliant.                                                 |
| **Shadcn/UI**       | Components | Radix + Tailwind ka combo. Pre-built Button, Card, Form, Input, Table, Badge components.                                                    |
| **React Hook Form** | 7.66       | Performance-optimized forms with minimal re-renders. Zod schema validation integrated.                                                      |
| **Zod**             | 4.1.12     | Runtime type validation. Forms + API request bodies validate hoti hain server-side bhi.                                                     |
| **Recharts**        | 3.7.0      | Admin dashboard mein analytics charts (bar, line, pie) — SVG-based, responsive.                                                             |
| **Lucide React**    | 0.554      | 1,000+ SVG icons — lightweight, tree-shakeable.                                                                                             |
| **Sonner**          | 2.0.7      | Toast notifications — success/error messages show karta hai.                                                                                |
| **next-themes**     | 0.4.6      | Dark/Light mode toggle with system preference detection.                                                                                    |

### Frontend Pages (Total: 30+ routes):

| Page                  | Route                        | Description                                                |
| --------------------- | ---------------------------- | ---------------------------------------------------------- |
| Landing               | `/`                          | Hero section, video cards, features, demo preview          |
| Login                 | `/login`                     | Purple lamp animation + login form                         |
| Signup                | `/signup`                    | Purple lamp animation + signup form (Google OAuth + email) |
| Forgot Password       | `/forgot-password`           | Password reset email request                               |
| Reset Password        | `/reset-password`            | Token-based password reset form                            |
| Pricing               | `/pricing`                   | Free / Pro / Business plans with Stripe checkout           |
| Checkout              | `/checkout`                  | Stripe payment processing                                  |
| Dashboard             | `/dashboard`                 | User/Admin dashboard with stats                            |
| Upload & Edit         | `/dashboard/upload-edit`     | Video upload + reference/target selection + processing     |
| My Projects           | `/dashboard/my-projects`     | User's saved video projects                                |
| Analytics             | `/dashboard/analytics`       | Usage analytics with charts                                |
| Billing               | `/dashboard/billing`         | Subscription management                                    |
| Profile               | `/dashboard/profile`         | User profile view                                          |
| Settings              | `/dashboard/settings`        | Account settings                                           |
| Admin Users           | `/dashboard/admin/users`     | Admin — manage all users                                   |
| Admin Billing         | `/dashboard/admin/billing`   | Admin — revenue analytics                                  |
| Admin Analytics       | `/dashboard/admin/analytics` | Admin — platform-wide stats                                |
| + 13 more admin pages | `/dashboard/admin/*`         | Roles, quotas, content, support, etc.                      |

### Special UI Components:

| Component           | File                  | Description                                                                                           |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Lamp Animation**  | `lamp-auth-scene.tsx` | SVG-based purple lamp with pull-cord reveal mechanism. Bulb glow + light cone + floor glow animation. |
| **Landing Hero**    | `app/page.tsx`        | Particle effects, floating video cards, gradient backgrounds, marquee text                            |
| **Footer Wave**     | `footer-wave.tsx`     | SVG wave animation at page bottom                                                                     |
| **Dashboard Shell** | `dashboard-shell.tsx` | Sidebar + navbar + content layout                                                                     |

---

## 5. Backend — Technologies & Justifications

| Technology             | Version               | Kyun Use Kiya?                                                                                                          |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Next.js API Routes** | 16.0.3                | Backend aur frontend ek hi codebase mein. `/api/*` routes serverless functions hain.                                    |
| **Better Auth**        | 1.4.1                 | Modern auth library — sessions, OAuth, email/password, password reset, role-based access. Drizzle ORM adapter built-in. |
| **Drizzle ORM**        | 0.44.7                | Type-safe SQL queries. Schema TypeScript mein define hota hai, migrations automatic.                                    |
| **Neon Database**      | Serverless PostgreSQL | Free tier available, serverless connection pooling, auto-scaling.                                                       |
| **PostgreSQL**         | (Neon)                | Relational DB — users, sessions, projects, subscriptions, payments. JSONB support for metadata.                         |
| **Stripe SDK**         | 20.1.0                | Payment processing — subscriptions, webhooks, checkout sessions. PCI compliant.                                         |
| **Resend**             | 6.5.2                 | Email delivery API — password reset emails, welcome emails.                                                             |
| **React Email**        | 1.0.1                 | Email templates React components mein — type-safe, previewable.                                                         |
| **FFmpeg**             | System                | Industry-standard video processing. Filter graphs, color grading, encoding, muxing.                                     |
| **child_process**      | Node.js built-in      | Python ML scripts ko Node.js se spawn karta hai, JSON stdout parse karta hai.                                           |
| **Zod**                | 4.1.12                | API request validation — server-side input sanitization.                                                                |

### Backend Server Files (TypeScript):

| File                                          | Lines       | Purpose                                                         |
| --------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `server/editor/edit-transfer.ts`              | 1,753       | **Main engine** — orchestrates entire style transfer pipeline   |
| `server/style/color-grading.ts`               | 1,171       | Multi-pass FFmpeg color analysis (signalstats, histograms, LUT) |
| `server/analysis/audio-analysis.ts`           | 1,011       | Audio beat detection pipeline (spectral flux, onset, BPM)       |
| `server/style/style-dna-adapter.ts`           | 828         | StyleDNA adaptation — maps reference style to target content    |
| `server/editor/filter-graph-generator.ts`     | 564         | FFmpeg filter graph code generation                             |
| `server/types/style-dna.ts`                   | 559         | TypeScript type definitions for StyleDNA system                 |
| `server/analysis/shot-detection.ts`           | 526         | 3-signal fusion shot boundary detection                         |
| `server/style/style-dna-extractor.ts`         | 488         | StyleDNA extraction from reference analysis                     |
| `server/analysis/motion-micro-cuts.ts`        | 234         | Motion-based micro-cut detection                                |
| `server/analysis/fallback-pacing-detector.ts` | 129         | Fallback pacing when few shots detected                         |
| `server/admin.ts`                             | ~300        | Admin CRUD operations                                           |
| `server/users.ts`                             | ~200        | User management functions                                       |
| `server/subscriptions.ts`                     | ~250        | Subscription management                                         |
| `server/dashboard.ts`                         | ~200        | Dashboard statistics queries                                    |
| **Total Backend TypeScript**                  | **~8,200+** |                                                                 |

### API Routes:

| Route                            | Method | Purpose                                               |
| -------------------------------- | ------ | ----------------------------------------------------- |
| `/api/auth/[...all]`             | ALL    | Better Auth — login, signup, session, OAuth callbacks |
| `/api/pipeline/full`             | POST   | Full video processing pipeline (all 5 ML models)      |
| `/api/editor/transfer`           | POST   | Apply style transfer to target video                  |
| `/api/editor/blueprint-transfer` | POST   | Blueprint-based transfer                              |
| `/api/editor/pattern`            | POST   | Pattern-based editing                                 |
| `/api/analysis/audio`            | POST   | Audio beat analysis only                              |
| `/api/analysis/motion`           | POST   | Motion analysis only                                  |
| `/api/analysis/shot-detection`   | POST   | Shot boundary detection only                          |
| `/api/extract-metadata`          | POST   | Video metadata extraction                             |
| `/api/checkout`                  | POST   | Stripe checkout session creation                      |
| `/api/subscription`              | GET    | Current subscription status                           |
| `/api/cancel-subscription`       | POST   | Cancel subscription                                   |
| `/api/resume-subscription`       | POST   | Resume canceled subscription                          |
| `/api/webhooks/stripe`           | POST   | Stripe webhook handler                                |
| `/api/save-project`              | POST   | Save project to database                              |
| `/api/video/[filename]`          | GET    | Serve processed video files                           |

---

## 6. AI/ML Models — What, Why, How

### Model 1: TransNetV2 — Shot Boundary Detection

|                      |                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Paper**            | Souček & Lokoč, "TransNet V2: An effective deep network architecture for fast shot transition detection" (2020) |
| **Architecture**     | 3D Dilated Deep CNN (3D DDCNN)                                                                                  |
| **Training Data**    | ClipShots + BBC Planet Earth + RAI datasets                                                                     |
| **Kya karta hai?**   | Video mein scene changes detect karta hai — hard cuts, dissolves, fades                                         |
| **Fallback**         | PySceneDetect (ContentDetector + AdaptiveDetector) → Classical HSV/LAB/SSIM fusion                              |
| **Output**           | Shot boundaries with timestamps, transition types, confidence scores                                            |
| **File**             | `scripts/ml_shot_detection.py` (319 lines)                                                                      |
| **Kyun zaruri hai?** | Style transfer ke liye pehle video ko shots mein divide karna zaruri hai                                        |

### Model 2: madmom RNN+DBN — Beat Detection

|                      |                                                                    |
| -------------------- | ------------------------------------------------------------------ |
| **Paper**            | Böck, Krebs & Widmer, "A Multi-Model Approach to Beat Tracking"    |
| **Architecture**     | 3× Bidirectional LSTM (25 neurons each) + Dynamic Bayesian Network |
| **Accuracy**         | ~95% F-measure (vs ~80% for librosa alone)                         |
| **Kya karta hai?**   | Music ke beats detect karta hai — kick, snare, hi-hat, drops       |
| **Fallback**         | Librosa spectral flux + onset strength + DBN                       |
| **Output**           | Beat timestamps, BPM, time signature, spectral band classification |
| **File**             | `scripts/ml_beat_detection.py` (465 lines)                         |
| **Kyun zaruri hai?** | Beat-synced cuts — video transitions music ke rhythm pe ho         |

### Model 3: RAFT — Optical Flow (Motion Analysis)

|                      |                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Paper**            | Teed & Deng, "RAFT: Recurrent All-Pairs Field Transforms for Optical Flow" (ECCV 2020)                |
| **Architecture**     | Correlation Volume + GRU-based iterative refinement                                                   |
| **Kya karta hai?**   | Har pixel ki motion direction + velocity calculate karta hai frame-to-frame                           |
| **Fallback**         | Farneback polynomial expansion (OpenCV classical)                                                     |
| **Output**           | Motion vectors, velocity timeline, camera motion classification (static/pan/tilt/zoom), zoom timeline |
| **File**             | `scripts/ml_motion_analysis.py` (304 lines)                                                           |
| **Kyun zaruri hai?** | Speed ramps aur camera movement transfer ke liye motion understand karna zaruri hai                   |

### Model 4: Depth-Anything V2 / MiDaS — Depth Estimation

|                      |                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **Paper**            | Yang et al., "Depth Anything V2" (2024) / Ranftl et al., "MiDaS v3.1"                       |
| **Architecture**     | Vision Transformer (ViT) + DPT decoder                                                      |
| **Model Size**       | ~350 MB (MiDaS Large)                                                                       |
| **Kya karta hai?**   | Har frame ka depth map banata hai — kya foreground hai, kya background                      |
| **Cascade**          | Depth-Anything V2 → MiDaS v3.1 DPT-Large → MiDaS v2.1 Small → FFmpeg heuristic              |
| **Output**           | Per-frame depth timeline, fg/bg separation, parallax classification (flat/deep/shallow DOF) |
| **File**             | `scripts/ml_depth_analysis.py` (397 lines)                                                  |
| **Kyun zaruri hai?** | Depth-aware zoom effects — foreground pe push-in, background pe parallax pan                |

### Model 5: Reinhard LAB Color Transfer + K-Means

|                      |                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Paper**            | Reinhard et al., "Color Transfer between Images" (2001)                                              |
| **Method**           | Statistical color matching in CIELAB color space (mean + std deviation)                              |
| **Kya karta hai?**   | Reference video ki color palette, warmth, saturation, contrast extract karta hai                     |
| **K-Means**          | Dominant color palette extraction (5-8 colors)                                                       |
| **Output**           | Color DNA profile — brightness, saturation, contrast, dominant palette, warmth, shadow/mid/highlight |
| **File**             | `scripts/ml_color_transfer.py` (546 lines)                                                           |
| **Kyun zaruri hai?** | Color grading transfer — reference ka "look" copy karna                                              |

### ML Models Summary Table:

| Model             | Type                 | Weights | Inference Time | GPU Required? |
| ----------------- | -------------------- | ------- | -------------- | ------------- |
| TransNetV2        | 3D DDCNN             | ~40 MB  | ~5 sec         | Optional      |
| madmom RNN        | Bi-LSTM + DBN        | ~15 MB  | ~3 sec         | No            |
| RAFT-Small        | CNN + GRU            | ~5 MB   | ~10 sec        | Optional      |
| Depth-Anything V2 | ViT + DPT            | ~350 MB | ~15 sec        | Recommended   |
| Reinhard LAB      | Classical Statistics | 0 MB    | <1 sec         | No            |

---

## 7. Database Design

### Database: Neon (Serverless PostgreSQL)

### ORM: Drizzle ORM (TypeScript-first, zero overhead)

### Schema File: `db/schema.ts` (260 lines)

### Tables:

| Table                 | Purpose                   | Key Columns                                                                    |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| **user**              | Registered users          | id, name, email, role (admin/user), stripeCustomerId, profilePhoto             |
| **session**           | Active login sessions     | id, token, expiresAt, userId, ipAddress, userAgent                             |
| **account**           | OAuth providers (Google)  | id, providerId, userId, accessToken, refreshToken                              |
| **verification**      | Email verification tokens | id, identifier, value, expiresAt                                               |
| **project**           | Saved video projects      | id, userId, name, type (template/reference-target), videoUrl, metadata (JSONB) |
| **subscription_plan** | Plan definitions          | id, name, stripePriceId, price, interval, videoLimit, features (JSONB)         |
| **subscription**      | User subscriptions        | id, userId, planId, stripeSubscriptionId, status, currentPeriodEnd             |
| **usage**             | Monthly usage tracking    | id, userId, month, year, videosCreated                                         |
| **payment**           | Payment records           | id, userId, amount, currency, status, stripePaymentIntentId                    |

### Database Indexes (Performance):

- `user_email_idx` — Fast email lookup during login
- `user_role_idx` — Admin queries
- `session_token_idx` — Session validation on every request
- `project_user_id_idx` — User's projects listing
- `subscription_status_idx` — Active subscription checks
- `usage_user_month_year_idx` — Unique constraint per user per month

### Entity Relationship:

```
User ──┬── has many ──→ Sessions
       ├── has many ──→ Accounts (OAuth)
       ├── has many ──→ Projects
       ├── has many ──→ Subscriptions ──→ belongs to Plan
       ├── has many ──→ Usage records
       └── has many ──→ Payments
```

---

## 8. Authentication & Security

### Auth Library: Better Auth v1.4.1

| Feature                | Implementation                                                     |
| ---------------------- | ------------------------------------------------------------------ |
| **Email/Password**     | bcrypt hashed passwords, server-side session cookies               |
| **Google OAuth**       | OAuth 2.0 via Google Cloud Console credentials                     |
| **Session Management** | Secure HTTP-only cookies, automatic expiry                         |
| **Password Reset**     | Email token → Resend API → React Email template                    |
| **Role-Based Access**  | `admin` / `user` roles — middleware checks on `/dashboard/admin/*` |
| **CSRF Protection**    | Built into Better Auth                                             |

### Security Headers (proxy.ts):

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000
X-DNS-Prefetch-Control: on
```

### Route Protection:

- `/dashboard/*` → Redirect to `/login` if not authenticated
- `/dashboard/admin/*` → Server-side admin role check in `layout.tsx`
- API routes → Session validation before processing

---

## 9. Payment System

### Provider: Stripe

| Plan         | Price     | Video Limit     | Features                                  |
| ------------ | --------- | --------------- | ----------------------------------------- |
| **Free**     | $0/month  | 3 videos/month  | Basic style transfer, 720p output         |
| **Pro**      | $19/month | 50 videos/month | All ML models, 1080p, priority processing |
| **Business** | $49/month | Unlimited       | 4K output, team collaboration, API access |

### Payment Flow:

```
User clicks "Subscribe" → /api/checkout → Stripe Checkout Session
  → User pays on Stripe → Stripe Webhook → /api/webhooks/stripe
  → Update subscription in database → User gets access
```

### Stripe Integration Files:

- `lib/stripe.ts` — Stripe SDK initialization + plan definitions
- `app/api/checkout/route.ts` — Create checkout sessions
- `app/api/webhooks/stripe/route.ts` — Handle payment events
- `app/api/subscription/route.ts` — Check subscription status
- `server/subscriptions.ts` — Subscription CRUD operations

---

## 10. Video Processing Pipeline — Complete Flow

Jab user reference + target video upload karta hai:

```
Step 1: UPLOAD
  └─→ Videos saved to /public/videos/

Step 2: PARALLEL ANALYSIS (5 ML models run simultaneously)
  ├─→ ml_shot_detection.py  → Shot boundaries, transition types
  ├─→ ml_beat_detection.py  → Beat timestamps, BPM, spectral bands
  ├─→ ml_motion_analysis.py → Motion vectors, camera classification
  ├─→ ml_depth_analysis.py  → Depth maps, parallax type
  └─→ ml_color_transfer.py  → Color DNA, palette, LUT generation

Step 3: STYLEDNA EXTRACTION (style-dna-extractor.ts)
  └─→ Reference analysis → StyleDNA fingerprint (6 domains)
      ├── PacingDNA: average shot length, rhythm pattern
      ├── MotionDNA: velocity profile, camera movement style
      ├── ColorDNA: palette, warmth, saturation, mood segments
      ├── LightingDNA: exposure curves, contrast, stochastic jitter
      ├── RhythmDNA: classified beats (kick/snare/hihat/drop)
      └── TextureDNA: grain, blur regions, vignette pattern

Step 4: STYLEDNA ADAPTATION (style-dna-adapter.ts)
  └─→ Map reference StyleDNA to target video's content
      ├── Energy-ranked beat matching (not proportional time)
      ├── Depth-aware zoom expressions
      ├── Mood segment grading per temporal region
      └── Beat response events (zoom_punch, micro_shake, light_flicker)

Step 5: FILTER GRAPH GENERATION (filter-graph-generator.ts)
  └─→ AdaptedStyleDNA → FFmpeg filter graph
      ├── Color grading filters (eq, colorbalance, HALD CLUT)
      ├── Speed ramp commands (setpts)
      ├── Beat-synced sendcmd files (brightness/rotation/scale pulses)
      ├── Depth-aware zoompan expressions
      └── Temporal mood segment color commands

Step 6: FFMPEG RENDERING (edit-transfer.ts)
  └─→ Single FFmpeg process with complex filter graph
      └─→ Output: /public/outputs/transfer-{timestamp}.mp4
```

### Processing Time: ~60-120 seconds for a 30-second video

---

## 11. StyleDNA Engine (v12) — Core Innovation

Yeh hamari **core innovation** hai — sirf color nahi, **6 perceptual domains** mein style fingerprint extract aur transfer hota hai.

### 6 Perceptual Domains:

| Domain       | Kya Measure Karta Hai?                      | Example                                 |
| ------------ | ------------------------------------------- | --------------------------------------- |
| **Pacing**   | Shot lengths, cut frequency, rhythm pattern | "Fast montage" vs "slow cinematic"      |
| **Motion**   | Camera movement, velocity, zoom direction   | "Handheld shaky" vs "smooth dolly"      |
| **Color**    | Palette, warmth, saturation, mood segments  | "Warm golden hour" vs "cold blue noir"  |
| **Lighting** | Exposure, contrast, stochastic flicker      | "High key bright" vs "low key dramatic" |
| **Rhythm**   | Beat classification, BPM, audio sync        | "Hard kick drops" vs "gentle ambient"   |
| **Texture**  | Film grain, blur, vignette, noise           | "35mm film" vs "clean digital"          |

### Three-Stage Pipeline:

```
FullVideoMetadata → extractStyleDNA() → StyleDNA
                                          ↓
Target Context + StyleDNA → adaptStyleDNA() → AdaptedStyleDNA
                                                ↓
AdaptedStyleDNA → generateFilterGraph() → FFmpeg Filter Graph
```

### v12 New Features (vs v11):

1. **Beat Classification** — Beats categorize hote hain: `hard_kick`, `snare`, `hi_hat`, `drop_moment`
2. **Stochastic Exposure** — Organic exposure variations with inertia coefficient
3. **Depth-Aware Zoom** — Push-in for foreground, parallax pan for background
4. **Mood Segments** — Temporal color regions (LAB mean per segment)
5. **Content-Aware Beat Response** — 4 response types: zoom_punch, micro_shake, light_flicker, drop_combo
6. **Motion Micro-Cut Fallback** — Synthetic cuts from motion spikes when few shots detected

---

## 12. File Structure & Code Statistics

### Code Lines Summary:

| Category                                     | Files     | Lines (approx)     |
| -------------------------------------------- | --------- | ------------------ |
| **Python ML Scripts**                        | 6 files   | ~2,400 lines       |
| **TypeScript Backend (server/)**             | 15+ files | ~8,200 lines       |
| **TypeScript Frontend (app/ + components/)** | 50+ files | ~6,000 lines       |
| **Database Schema**                          | 1 file    | 260 lines          |
| **Config Files**                             | 5 files   | ~300 lines         |
| **TOTAL**                                    | ~80 files | **~17,000+ lines** |

### Python Scripts:

| Script                  | Lines | Model Used                   |
| ----------------------- | ----- | ---------------------------- |
| `ml_color_transfer.py`  | 546   | Reinhard LAB + K-Means       |
| `ml_beat_detection.py`  | 465   | madmom RNN + librosa         |
| `ml_depth_analysis.py`  | 397   | Depth-Anything V2 / MiDaS    |
| `style_transfer.py`     | 344   | MoviePy + histogram matching |
| `ml_shot_detection.py`  | 319   | TransNetV2 / PySceneDetect   |
| `ml_motion_analysis.py` | 304   | RAFT / Farneback             |

---

## 13. Deployment & DevOps

| Tool            | Purpose                                         |
| --------------- | ----------------------------------------------- |
| **pnpm**        | Fast package manager (hardlinked node_modules)  |
| **Turbopack**   | Next.js dev server — 10× faster than Webpack    |
| **Biome**       | Linter + formatter (replaces ESLint + Prettier) |
| **Husky**       | Git pre-commit hooks                            |
| **Drizzle Kit** | Database migration tooling                      |
| **cross-env**   | Cross-platform environment variables            |

### Commands:

```bash
pnpm dev          # Development server (Turbopack)
pnpm build        # Production build (precompiles all routes)
pnpm fast-server  # Build + Start in one command
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed subscription plans
```

---

## 14. Expected Viva Questions & Answers

### Q1: "Aap ka project kya hai? Briefly describe karein."

**A:** Yeh ek AI-powered video editing platform hai jo reference video ki style — color grading, pacing, beat sync, motion effects — automatically extract kar ke target video pe apply karta hai. 5 real ML models use hote hain aur processing under 2 minutes mein hoti hai.

### Q2: "Konse ML models use kiye hain aur kyun?"

**A:** 5 models hain:

1. **TransNetV2** (3D CNN) — shot detection ke liye, kyunke video ko segments mein divide karna first step hai
2. **madmom RNN** (Bi-LSTM + DBN) — beat detection, ~95% accuracy, music ke rhythm pe cuts sync karne ke liye
3. **RAFT** (Optical Flow) — motion analysis, camera movement aur speed ramps transfer ke liye
4. **Depth-Anything V2** (Vision Transformer) — depth estimation, foreground/background aware zoom ke liye
5. **Reinhard LAB** (Classical) — color transfer, zero model weights chahiye, perceptually accurate hai

### Q3: "Frontend mein Next.js kyun choose kiya? React alone kyun nahi?"

**A:** Next.js advantages:

- **SSR/SSG** — SEO aur initial load speed better hai
- **API Routes** — Backend alag deploy nahi karna padta, sab ek codebase mein
- **File-based routing** — Pages automatically route ban jaate hain
- **Turbopack** — Development mein instant hot reload
- **Image optimization** — Built-in image optimization

### Q4: "Database mein PostgreSQL kyun? MongoDB kyun nahi?"

**A:** Hamare data mein **relationships** hain — users ki subscriptions, projects, payments sab linked hain. PostgreSQL relational queries efficient hain. Neon serverless hai tou free tier pe bhi production-ready hai. JSONB column type se flexible metadata bhi store hoti hai.

### Q5: "StyleDNA kya hai? Yeh kaise kaam karta hai?"

**A:** StyleDNA ek **semantic fingerprint** hai jo reference video ki editing style ko 6 domains mein capture karta hai (pacing, motion, color, lighting, rhythm, texture). Pehle extract hota hai reference se, phir target video ke content pe adapt hota hai — matlab agar target mein koi high-energy moment hai tou wahan reference ke strongest effects lagenge, proportional time pe nahi.

### Q6: "Video processing pipeline ka flow explain karein."

**A:**

1. User reference + target upload karta hai
2. 5 ML models parallel run hotay hain (shot detection, beats, motion, depth, color)
3. StyleDNA extractor reference analysis se fingerprint banata hai
4. StyleDNA adapter target video ke content pe map karta hai
5. Filter graph generator FFmpeg commands generate karta hai
6. FFmpeg single process mein render karta hai
7. Output video user ko milti hai

### Q7: "Stripe integration kaise kaam karti hai?"

**A:** Stripe Checkout Sessions use hoti hain. User plan select karta hai → Stripe checkout page pe redirect hota hai → payment ke baad Stripe webhook hamari API pe event bhejta hai → database mein subscription update hoti hai → user ko access mil jaata hai.

### Q8: "Authentication kaise handle ki hai?"

**A:** Better Auth library use ki hai jo:

- Email/password (bcrypt hashed)
- Google OAuth 2.0
- Session cookies (HTTP-only, secure)
- Password reset via email (Resend API)
- Role-based access (admin/user)

### Q9: "Agar ML model fail ho jaye tou kya hoga?"

**A:** Har model ka **cascading fallback** hai:

- TransNetV2 fail → PySceneDetect → Classical HSV/LAB fusion
- madmom fail → librosa spectral flux
- RAFT fail → Farneback (OpenCV classical)
- Depth-Anything fail → MiDaS Large → MiDaS Small → FFmpeg heuristic
- Sab fail → graceful degradation with basic color transfer only

### Q10: "Project ki limitations kya hain?"

**A:**

1. Long videos (>5 min) processing time zyada lagta hai
2. GPU nahi hai tou depth estimation slow hoti hai
3. Audio style transfer abhi nahi hai (sirf beat sync)
4. Real-time preview nahi — processing batch mein hoti hai
5. Horizontal videos ke liye optimized hai, vertical Instagram reels ke liye aspect ratio adjustment needed

### Q11: "Future improvements kya ho sakti hain?"

**A:**

1. **GPU acceleration** — CUDA ke sath 5× faster processing
2. **Real-time preview** — WebGL-based live preview
3. **Mobile app** — React Native se cross-platform
4. **Audio style transfer** — Voice + music tone matching
5. **Template marketplace** — Users apni styles share kar sakein
6. **Collaborative editing** — Team members sath edit karein

### Q12: "Code kitna lines ka hai? Kitna time laga?"

**A:** ~17,000+ lines total code (TypeScript + Python). Development ~4 months mein hui. 65+ files modified in latest commit. 30+ frontend routes, 15+ API routes, 5 ML models, 9 database tables.

---

## 📊 Quick Stats for Viva Slide

```
├── Total Code Lines:       ~17,000+
├── Frontend Routes:        30+
├── API Endpoints:          15+
├── ML Models:              5 (TransNetV2, madmom, RAFT, Depth-Anything, Reinhard)
├── Database Tables:        9
├── Python Scripts:          6 (~2,400 lines)
├── TypeScript Backend:     ~8,200 lines
├── TypeScript Frontend:    ~6,000 lines
├── Processing Time:        60-120 sec / 30-sec video
├── Auth Methods:           Email/Password + Google OAuth
├── Payment Plans:          3 (Free / Pro / Business)
├── StyleDNA Domains:       6 (Pacing, Motion, Color, Lighting, Rhythm, Texture)
└── Fallback Chains:        Every ML model has 2-3 fallbacks
```

---

> **Tip for Viva:** Confident raho, apna code samjho, aur agar koi cheez nahi aati tou honestly bolo "yeh area future work mein hai" — evaluators honesty appreciate kartay hain. Good luck! 🎓✨
