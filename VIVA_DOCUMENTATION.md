# Automated Video Editor — VIVA Documentation

## 📋 Project Overview

**Project Name:** Automated Video Editor (VIVA)  
**Type:** Full-Stack Web Application  
**Purpose:** AI-powered video editing platform with server-side FFmpeg style transfer, multi-signal analysis pipeline, and an interactive lamp-themed authentication experience  
**Development Date:** December 2025  
**Theme:** Golden-amber dark UI (`#1a1408` base) with OKLCH CSS variables

---

## 🚀 Technology Stack

### **Frontend Framework**

- **Next.js 16.0.3** — React framework with App Router and Server Components
- **React 19.2.0** — UI library for building interactive interfaces
- **TypeScript 5.x** — Type-safe JavaScript for enhanced development experience
- **Turbopack** — Next-generation bundler for faster development builds

### **Styling & UI Components**

- **Tailwind CSS v4** — Utility-first CSS framework with OKLCH colour-space variables
- **Golden Theme** — All pages use `#1a1408` dark golden-brown backgrounds with amber accents (`amber-500/600/700/800` borders, rings, gradients)
- **Radix UI** — Accessible, unstyled component primitives
  - `@radix-ui/react-dialog` — Modal dialogs
  - `@radix-ui/react-select` — Dropdown selects
  - `@radix-ui/react-dropdown-menu` — Dropdown menus
  - `@radix-ui/react-label` — Form labels
  - `@radix-ui/react-slot` — Component composition
- **Lucide React** — Modern icon library with 1000+ icons
- **Sonner** — Toast notifications for user feedback

### **Video Processing (Server-Side)**

- **FFmpeg (Native Binary)** — Server-side video rendering via the Gyan.dev Windows build
- **`-filter_complex_script`** — Filter graphs written to temporary disk files, bypassing Windows 8191-char CLI limit and all shell-quoting issues
- **Master Logic v3** — Quality-first rendering: `curves=preset=strong_contrast`, `eq=saturation=1.3:contrast=1.1`, HALD CLUT colour matching (colour-only, no eq), `unsharp=3:3:0.7`, CRF 18 + `-b:v 5M -maxrate 8M -bufsize 16M` bitrate floor
- **Python (OpenCV + NumPy + scikit-learn)** — Deep reference video analysis in `scripts/analyzer.py`

### **Backend & Database**

- **PostgreSQL (Neon)** — Cloud-hosted relational database with SSL
- **Drizzle ORM** — Type-safe SQL ORM for database operations
- **Drizzle Kit** — Database migration and schema management tool
- **Connection Resilience** — Unified singleton pool (`max: 5`, 10s timeout), `isConnectionError()`, `withDbRetry()` exponential backoff with auto pool reset, `resetPool()` for dead-connection recovery, detached background saves

### **Authentication & Authorization**

- **Better-auth** — Modern authentication library for Next.js
- **Role-based Access Control (RBAC)** — Admin and User roles
- **Session Management** — Secure session handling with dev-guest fallback

### **Payments & Subscriptions**

- **Stripe** — Payment processing with checkout sessions, webhooks, and subscription lifecycle management
- **5 Plans** — Free ($0), Pro Monthly ($19), Pro Yearly ($190), Business Monthly ($49), Business Yearly ($490)
- **Video Quotas** — Per-plan monthly video limits with usage tracking

### **Additional Libraries**

- **clsx** — Utility for constructing className strings
- **tailwind-merge** — Merge Tailwind CSS classes intelligently
- **react-hook-form** — Form state management
- **zod** — Schema validation for forms and API
- **next-themes** — Dark/light mode management

---

## 📁 Project Structure & File Responsibilities

### **Root Configuration Files**

#### `package.json`

- **Purpose:** Project dependencies and scripts
- **Key Dependencies:**
  - `next@16.0.3` — Framework
  - `drizzle-orm` — Database ORM
  - `better-auth` — Authentication
  - `react@19.2.0` — UI library
  - `stripe` — Payment processing

#### `next.config.ts`

- **Purpose:** Next.js configuration
- **Key Settings:**
  - `serverActions.bodySizeLimit: '50mb'` — Increased limit for video uploads
  - `images.domains` — External image optimization
  - Turbopack configuration for dev builds

#### `tsconfig.json`

- **Purpose:** TypeScript compiler configuration
- **Features:** Path aliases (`@/*`), strict type checking

#### `drizzle.config.ts`

- **Purpose:** Database configuration
- **Settings:** PostgreSQL connection, schema location, migration output directory

#### `middleware.ts`

- **Purpose:** Next.js middleware for route protection
- **Function:** Authentication checks before accessing protected routes

#### `biome.jsonc`

- **Purpose:** Code linting and formatting configuration
- **Tools:** Biome linter and formatter settings

---

### **App Directory Structure** (`app/`)

#### `app/layout.tsx`

- **Purpose:** Root layout component
- **Features:**
  - Theme provider (light/dark mode)
  - Font configuration
  - Global metadata
  - Toast notifications container

#### `app/page.tsx`

- **Purpose:** Landing page / Home page
- **Content:** Project introduction and navigation to login/signup

#### `app/globals.css`

- **Purpose:** Global styles and Tailwind CSS imports
- **Includes:** CSS variables for theming, custom utility classes

---

### **Authentication Pages** (`app/`)

#### `app/login/page.tsx`

- **Purpose:** User login interface
- **Features:** Email/password authentication form
- **Redirects:** Dashboard on successful login

#### `app/signup/page.tsx`

- **Purpose:** New user registration
- **Features:** Account creation with email verification
- **Default Role:** User (Admin assigned manually)

#### `app/forgot-password/page.tsx`

- **Purpose:** Password reset request
- **Features:** Email-based password recovery

#### `app/reset-password/page.tsx`

- **Purpose:** Password reset form
- **Features:** Token-based password change

---

### **Dashboard Structure** (`app/dashboard/`)

#### `app/dashboard/layout.tsx`

- **Purpose:** Dashboard layout wrapper
- **Components:**
  - Sidebar navigation
  - Top navbar with user profile
  - Role-based menu items

#### `app/dashboard/page.tsx`

- **Purpose:** Dashboard home/overview
- **Content:** Welcome message and quick access cards

---

### **Dashboard Feature Pages**

#### `app/dashboard/templates/page.tsx`

- **Purpose:** Template browser page wrapper
- **Functionality:** Renders templates client component

#### `app/dashboard/templates/templates-client.tsx` ⭐ **CORE FEATURE**

- **Purpose:** Template-based video editing system
- **Technologies Used:**
  - React hooks (useState, useEffect, useRef)
  - Server-side FFmpeg video processing via API calls
- **Features:**
  - 48 professional templates across 6 categories
  - Categories: Intros & Outros, Transitions, Lower Thirds & Text, Social Media, Effects & Filters, Promo & Ads
  - Template search and filtering
  - Video upload and preview
  - Real-time processing progress
  - Category-specific video effects
- **Template Data:**
  - Unsplash thumbnails for visual representation
  - Demo videos from Google Cloud Storage
  - Metadata: name, category, duration, effects, music
- **Lines of Code:** 920 lines

#### `app/dashboard/upload-edit/page.tsx` ⭐ **CORE FEATURE**

- **Purpose:** Reference-target video style transfer
- **Technologies Used:**
  - Server-side FFmpeg via `/api/editor/transfer` and `/api/analyze-and-transfer`
  - Multi-signal analysis pipeline (shot detection, motion, audio, colour grading)
  - Master Logic v3 filter chain with `-filter_complex_script`
- **Features:**
  - Reference video upload and deep analysis
  - Target video upload
  - Automatic style transfer from reference to target
  - Audio extraction and seamless looping
  - Video quota enforcement per subscription plan
  - Real-time processing progress feedback
- **Server-Side Processing Pipeline:**
  1. Reference video is uploaded to the server
  2. Full analysis runs concurrently (shot detection + motion + audio + colour grading)
  3. Color DNA fingerprint extracted (brightness, contrast, saturation, colour balance, channel mixer)
  4. HALD CLUT generated for deep colour matching
  5. Master Logic v3 builds the FFmpeg filter chain:
     ```
     setpts → scale(1080×1920) → curves(strong_contrast) → eq(cinematic_base) →
     colorbalance/HALD CLUT → Signal Color DNA → unsharp(3:3:0.7) → vignette →
     fps(30) → fades → format(yuv420p)
     ```
  6. Filter graph written to temp file on disk → `-filter_complex_script`
  7. Reference audio extracted, looped if needed (`-stream_loop`), limited (`alimiter=0.9`)
  8. Output rendered as MP4 (CRF 18, preset medium, profile high)
  9. Saved to `public/outputs/` and DB (background, fire-and-forget)

#### `app/dashboard/my-projects/page.tsx` ⭐ **CORE FEATURE**

- **Purpose:** Project management and library
- **Technologies Used:**
  - Server Actions for CRUD operations
  - Video file display from `public/outputs/`
  - Modal preview with Radix Dialog
- **Features:**
  - Grid display of all user projects
  - Project preview modal
  - Video download functionality
  - Project deletion with confirmation
  - Empty state for new users
- **Data Displayed:**
  - Project name
  - Project type (Template / Reference-Target)
  - Creation date
  - Metadata (duration, effects applied, etc.)
- **Key Functions:**
  - `getUserProjects()` — Fetch all user projects on mount
  - `handleDelete()` — Delete project with confirmation
  - `handleDownload()` — Download video file

#### `app/dashboard/profile/page.tsx`

- **Purpose:** View user profile information
- **Display:** Name, email, role, account details

#### `app/dashboard/edit-profile/page.tsx`

- **Purpose:** Update user profile
- **Features:** Name and bio editing

#### `app/dashboard/change-password/page.tsx`

- **Purpose:** Change user password
- **Security:** Current password verification required

#### `app/dashboard/settings/page.tsx`

- **Purpose:** User preferences and settings
- **Features:** Theme toggle, notification settings

#### `app/dashboard/analytics/page.tsx`

- **Purpose:** Usage statistics
- **Metrics:** Projects created, storage used

#### `app/dashboard/billing/page.tsx`

- **Purpose:** Subscription management for the current user
- **Features:** View current plan, manage billing, upgrade/downgrade

#### `app/dashboard/help/page.tsx`

- **Purpose:** Help centre and FAQ
- **Features:** Common questions, support contact

---

### **Admin Dashboard Pages** (`app/dashboard/admin/`) — Admin Only

All admin pages are protected by a server-side role check in `app/dashboard/admin/layout.tsx` that redirects non-admin users to `/dashboard`.

#### `admin/users/page.tsx` ⭐ **LIVE DATA**

- **Purpose:** Full CRUD user management
- **Features:** Real user table from DB, 4 stat cards (Total/Verified/Admins/Unverified), search/filter, per-user role actions, add-user dialog

#### `admin/billing/page.tsx` ⭐ **LIVE DATA**

- **Purpose:** Subscription & revenue monitoring
- **Features:** KPI cards (Active Subscriptions, MRR, ARR, Monthly Revenue), subscription breakdown by plan and status, recent payments table — all from real DB data

#### `admin/analytics/page.tsx`

- **Purpose:** Platform analytics & reports
- **Features:** 4 stat cards (Total Users, Videos Processed, Downloads, Active Users) with change percentages

#### `admin/support/page.tsx`

- **Purpose:** Support ticket management
- **Features:** 3 summary cards (Open/In Progress/Resolved), ticket list with priority and status badges

#### `admin/accounts/page.tsx`

- **Purpose:** Account management actions
- **Features:** Reset Password, Force Logout, Verify Email, Suspend Account action cards

#### `admin/activity/page.tsx`

- **Purpose:** Real-time user activity monitoring
- **Features:** Activity timeline with action descriptions and timestamps

#### `admin/quotas/page.tsx`

- **Purpose:** User quota and limit management
- **Features:** 4 quota types with progress bars (Storage, Video Processing, Upload, Processing Time)

#### `admin/content/page.tsx`

- **Purpose:** Content moderation
- **Features:** Content list with status badges (Pending/Approved/Flagged), view and delete actions

#### `admin/communication/page.tsx`

- **Purpose:** Email and notification system
- **Features:** Message composer, 4 email templates (Welcome, Announcement, Password Reset, Account Alert)

#### `admin/bulk/page.tsx`

- **Purpose:** Bulk user operations
- **Features:** Bulk Delete, Bulk Email, Bulk Role Change, Bulk Suspend, CSV upload

#### `admin/roles/page.tsx`

- **Purpose:** Role & permission management
- **Features:** 3 role cards (Admin/User/Moderator) with permission badges, create/edit role buttons

---

### **API Routes** (`app/api/`)

#### **Authentication**

| Route                                   | Method | Purpose                                                                      |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `/api/auth/[...all]`                    | ALL    | Better-auth catch-all handler — login, logout, signup, session management    |
| `/api/accept-invitation/[invitationId]` | GET    | Organization invitation acceptance (placeholder — redirects to `/dashboard`) |

#### **Analysis Pipeline**

| Route                          | Method | Purpose                                                                          |
| ------------------------------ | ------ | -------------------------------------------------------------------------------- |
| `/api/analysis/audio`          | POST   | Audio beat detection — spectral-flux BPM, volume analysis via FFmpeg             |
| `/api/analysis/motion`         | POST   | Motion/velocity analysis — RAFT-style optical-flow, jhatka detection             |
| `/api/analysis/shot-detection` | POST   | Shot boundary detection — histogram + ECR + temporal-diff 3-signal fusion        |
| `/api/style/extract`           | POST   | Color grading DNA extraction — brightness, contrast, saturation, channel offsets |
| `/api/pipeline/full`           | POST   | Full analysis pipeline — all 4 modules concurrently on a single video            |

#### **Editor & Style Transfer**

| Route                            | Method | Purpose                                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `/api/editor/pattern`            | POST   | Editing Blueprint generation — cuts, speed ramps, beat-aligned transitions      |
| `/api/editor/blueprint-transfer` | POST   | Blueprint transfer — analyse reference → generate edit instructions for target  |
| `/api/editor/transfer`           | POST   | Style transfer render — reference + target → rendered MP4 (5-min timeout)       |
| `/api/analyze-and-transfer`      | POST   | **Unified pipeline** — Analyse → Blueprint → Transfer → Render (10-min timeout) |
| `/api/extract-metadata`          | POST   | Video metadata extraction (multipart or legacy base64)                          |

#### **Video Processing & Projects**

| Route                | Method | Purpose                                                                            |
| -------------------- | ------ | ---------------------------------------------------------------------------------- |
| `/api/process-video` | POST   | Main processing endpoint with auth & video quota enforcement                       |
| `/api/save-project`  | POST   | Project save with retry logic — detached background DB save, dev-guest FK handling |

#### **Subscriptions & Payments**

| Route                      | Method | Purpose                                                                                                             |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `/api/checkout`            | POST   | Create Stripe checkout session with 14-day trial                                                                    |
| `/api/subscription`        | GET    | Get current user's subscription, plan, and usage details                                                            |
| `/api/cancel-subscription` | POST   | Cancel subscription (sets `cancel_at_period_end`)                                                                   |
| `/api/resume-subscription` | POST   | Resume previously cancelled subscription                                                                            |
| `/api/webhooks/stripe`     | POST   | Stripe webhook — handles `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated` |

---

### **Components Directory** (`components/`)

#### **Layout Components**

##### `components/dashboard-navbar.tsx`

- **Purpose:** Dashboard top navigation bar
- **Styling:** `bg-[#1a1408]/90` with `border-amber-800/30`
- **Features:**
  - User profile dropdown
  - Logout button
  - Mode switcher (light/dark)

##### `components/dashboard-sidebar.tsx`

- **Purpose:** Dashboard side navigation
- **Styling:** `bg-[#1a1408]` with `border-amber-800/30`
- **Features:**
  - Role-based menu items (admin sees admin panel links)
  - Active route highlighting
  - Icons for each section

##### `components/dashboard-shell.tsx`

- **Purpose:** Dashboard page wrapper
- **Styling:** `bg-[#1a1408]` golden base for all dashboard content

#### **Lamp Animation Components** 🪔

##### `components/lamp-animation.tsx` ⭐ **INTERACTIVE AUTH UI** (~270 lines)

- **Purpose:** Full-screen tropical sunset lamp animation for authentication pages
- **Props:** `{ children: ReactNode; label?: string }` — label defaults to `"LOGIN"`
- **Architecture:**
  - **Background:** SVG tropical sunset with vivid warm gradient (`#1a0a14` → `#c44a22` → `#f5ba3c` → `#1a0a06`), sun disc with conditional glow, ocean with shimmer lines
  - **Palm Trees:** 4 SVG palm tree silhouettes (left, right, and two foreground edge palms) with dark stroke outlines and green canopy fills
  - **Lamp:** Ceiling mount → wire → SVG shade with gradient fill → dynamic label text on shade → bulb with conditional golden glow → pull cord with bounce hint
  - **Light Beam:** Two nested CSS triangle cones (`borderTop` trick) with blur filters, plus a radial glow halo
  - **Form Reveal:** Children rendered with opacity/translate/scale transition — visible only when lamp is on
  - **Fireflies:** 6 amber particles with randomised position and staggered animation when lamp is on
  - **Edge Vignette:** Radial gradient overlay for cinematic framing
- **State:** `isOn` (lamp toggle), `isPulling` (pull-cord animation)
- **CSS Classes Used:** `lamp-water-shimmer`, `lamp-firefly`, `lamp-pull-bounce` (from `landing-animations.css`)

##### `components/login/lamp-wrapper.tsx`

- **Purpose:** Dynamic import wrapper for `LampAnimation` (SSR-disabled)
- **Props:** `{ children: ReactNode; label?: string }`
- **Loading State:** Sunset gradient background with amber spinner
- **Usage:** `<LampWrapper label="LOGIN">{children}</LampWrapper>`

#### **Form Components** (`components/forms/`)

##### `components/forms/login-form.tsx`

- **Purpose:** Login form with validation
- **Libraries:** react-hook-form, zod
- **Fields:** Email, password
- **Validation:** Email format, password requirements

##### `components/forms/signup-form.tsx`

- **Purpose:** Registration form
- **Fields:** Name, email, password, confirm password
- **Validation:** Strong password rules, email uniqueness

##### `components/forms/forgot-password-form.tsx`

- **Purpose:** Password recovery request
- **Function:** Send reset email

##### `components/forms/reset-password-form.tsx`

- **Purpose:** New password creation
- **Security:** Token validation

##### `components/forms/create-organization-form.tsx`

- **Purpose:** Organization creation
- **Fields:** Organization name, slug

##### `components/forms/all-users.tsx`

- **Purpose:** Admin user list display
- **Features:** User table with role management

#### **Feature Components**

##### `components/edit-profile-form.tsx`

- **Purpose:** Profile editing interface
- **Fields:** Name, bio, profile picture

##### `components/change-password-form.tsx`

- **Purpose:** Password change form
- **Validation:** Current password check, new password strength

##### `components/members-table.tsx`

- **Purpose:** Organization members display
- **Features:** Member list with roles

##### `components/members-table-action.tsx`

- **Purpose:** Member action dropdown
- **Actions:** Change role, remove member

##### `components/users-table.tsx`

- **Purpose:** Admin user management table
- **Features:** User search, role assignment

#### **UI Components** (`components/ui/`)

All UI components use Radix UI primitives with Tailwind styling:

- `badge.tsx` - Status indicators
- `button.tsx` - Primary UI buttons
- `card.tsx` - Content containers
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Context menus
- `form.tsx` - Form field wrappers
- `input.tsx` - Text inputs
- `label.tsx` - Form labels
- `select.tsx` - Dropdown selects
- `sonner.tsx` - Toast notifications
- `table.tsx` - Data tables

#### **Utility Components**

##### `components/theme-provider.tsx`

- **Purpose:** Dark/light mode management
- **Library:** next-themes
- **Storage:** localStorage persistence

##### `components/mode-switcher.tsx`

- **Purpose:** Theme toggle button
- **Options:** Light, dark, system

##### `components/logout.tsx`

- **Purpose:** Logout functionality
- **Action:** Clear session and redirect

##### `components/performance-monitor.tsx`

- **Purpose:** Dev-mode performance monitoring overlay

##### `components/route-prefetcher.tsx`

- **Purpose:** Intelligent route prefetching for navigation speed

#### **Landing Page Components** (`components/landing/`)

##### `components/landing/landing-navbar.tsx`

- **Purpose:** Landing page top navigation
- **Styling:** `bg-[#1a1408]/90` with `border-amber-700/50`, mobile dropdown `bg-[#1a1408]/90`
- **Features:** Logo, navigation links, Login/Sign Up buttons

##### `components/landing/landing-below-fold.tsx`

- **Purpose:** Below-the-fold sections of the landing page (6 sections + footer)
- **Styling:** All sections use `from-[#1a1408] via-amber-950/xx to-[#1a1408]` gradients with `border-amber-500/30`
- **Sections:** Features, Templates, How It Works, Pricing, Testimonials, CTA

##### `components/animated-flower-logo.tsx`

- **Purpose:** Animated SVG logo used in navbar and landing

##### `components/floating-video-cards.tsx`

- **Purpose:** Animated floating cards for the hero section

##### `components/video-timeline-animation.tsx`

- **Purpose:** Animated video timeline illustration

##### `components/footer-wave.tsx`

- **Purpose:** SVG wave transition for footer section with `bg-[#1a1408]`

#### **Email Templates** (`components/emails/`)

##### `components/emails/verify-email.tsx`

- **Purpose:** Email verification template
- **Content:** Verification link

##### `components/emails/reset-password.tsx`

- **Purpose:** Password reset email
- **Content:** Reset token link

##### `components/emails/organization-invitation.tsx`

- **Purpose:** Organization invite email
- **Content:** Accept invitation link

---

### **Database Layer** (`db/`)

#### `db/schema.ts` ⭐ **DATABASE SCHEMA**

- **Purpose:** Database table definitions using Drizzle ORM
- **Tables:**

##### **1. User Table**

```typescript
users {
  id: string (primary key)
  name: string
  email: string (unique)
  emailVerified: boolean
  image: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
  role: enum ('admin', 'user')
}
```

##### **2. Session Table**

```typescript
sessions {
  id: string (primary key)
  userId: string (foreign key → users.id)
  expiresAt: timestamp
  token: string
  ipAddress: string
  userAgent: string
}
```

##### **3. Account Table**

```typescript
accounts {
  id: string (primary key)
  userId: string (foreign key → users.id)
  accountId: string
  providerId: string
  accessToken: string
  refreshToken: string
  expiresAt: timestamp
}
```

##### **4. Verification Table**

```typescript
verifications {
  id: string (primary key)
  identifier: string
  value: string
  expiresAt: timestamp
}
```

##### **5. Project Table** ⭐ **VIDEO STORAGE**

```typescript
projects {
  id: string (primary key)
  userId: string (foreign key → users.id)
  name: string
  type: enum ('template', 'reference-target')
  videoUrl: text (path to rendered output file)
  thumbnail: string (nullable)
  metadata: jsonb {
    duration: number
    size: number
    effects: string[]
    template?: string
    category?: string
    processedAt: string
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

##### **6. Organization Tables**

```typescript
organizations {
  id: string (primary key)
  name: string
  slug: string (unique)
  logo: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}

members {
  id: string (primary key)
  organizationId: string (foreign key)
  userId: string (foreign key)
  role: string
  createdAt: timestamp
}

invitations {
  id: string (primary key)
  organizationId: string (foreign key)
  email: string
  role: string
  inviterId: string (foreign key)
  expiresAt: timestamp
  status: enum ('pending', 'accepted', 'expired')
}
```

#### `db/drizzle.ts` ⭐ **CONNECTION RESILIENCE**

- **Purpose:** Database connection setup with offline resilience and auto-recovery
- **Configuration:**
  - PostgreSQL connection pool (Neon cloud DB, SSL auto-detected)
  - Singleton pool pattern (`globalForDb`) to prevent connection exhaustion during hot reload
  - `max: 5` connections (conservative for Neon free tier), `connectionTimeoutMillis: 10_000`
  - `idleTimeoutMillis: 30_000`, `allowExitOnIdle: true`
  - Graceful pool error handler — logs and auto-marks pool for replacement on connection errors
  - Startup validation of `DATABASE_URL` (checks for empty, missing hostname, invalid URL)
  - `createPool()` factory function for on-demand pool replacement
  - `getPool()` getter — returns existing pool or creates fresh one
- **Exports:**
  - `db` — Drizzle ORM instance
  - `isConnectionError(err)` — Detects DNS/network/pool-exhaustion errors (`ENOTFOUND`, `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH`, `connection terminated`, `cannot acquire a client`, `too many clients`, `timeout expired`)
  - `resetPool()` — Force-replaces the connection pool (discards stale TCP sockets)
  - `withDbRetry(fn, label, maxRetries)` — Retries DB operations with exponential backoff (2s/4s/6s), auto-resets pool between retries

---

### **Server Layer** (`server/`)

#### **Core Server Actions**

##### `server/users.ts`

- **Purpose:** User management actions
- **Functions:** `getAllUsers()`, `getUserById(id)`, `updateUser(id, data)`, `deleteUser(id)`

##### `server/projects.ts` ⭐ **VIDEO OPERATIONS**

- **Purpose:** Project CRUD operations
- **Functions:** `createProject(data)`, `getUserProjects()`, `deleteProject(projectId)`, `getProject(projectId)`
- **Authorization:** Owner or admin only for read/delete

##### `server/admin.ts`

- **Purpose:** Admin-specific actions — `updateUserRole()`, `getSystemStats()`

##### `server/admin-subscriptions.ts`

- **Purpose:** Admin subscription queries for the billing dashboard
- **Functions:** `getActiveSubscriptions()`, `getMonthlyRevenue()`, `getRecentPayments()`, `getSubscriptionsByPlan()`

##### `server/subscriptions.ts` ⭐ **SUBSCRIPTION ENGINE**

- **Purpose:** Subscription lifecycle management (marked `"use server"`)
- **Functions:**
  - `getUserSubscription()` — Gets user's subscription + plan details (joins subscription × subscriptionPlan)
  - `isSubscribed()` — Boolean check: status is `active` or `trialing` AND not expired
  - `getMonthlyUsage()` — Gets current month's usage record (videosCreated count)
  - `checkVideoQuota()` — Quota gate: checks remaining videos; returns `{ allowed, remaining, limit, used }`
  - `incrementVideoUsage()` — Increments monthly video counter; creates new usage record if needed
  - `getAvailablePlans()` — Returns all active plans ordered by price

##### `server/members.ts`

- **Purpose:** Organization member management

##### `server/password.ts`

- **Purpose:** Password management — `changePassword()`, `requestPasswordReset()`, `resetPassword()`

##### `server/permissions.ts`

- **Purpose:** Permission checking — `checkRole()`, `canAccessProject()`, `canManageOrganization()`

##### `server/organizations.ts`

- **Purpose:** Organization CRUD operations

##### `server/dashboard.ts`

- **Purpose:** Dashboard data aggregation for admin and user views

##### `server/db/index.ts`

- **Purpose:** Barrel re-export of `db/drizzle.ts` — ensures all server modules use the unified singleton pool and resilience helpers (`withDbRetry`, `resetPool`, `isConnectionError`)

---

#### **Analysis Pipeline** (`server/analysis/`) ⭐ **MULTI-SIGNAL VIDEO ANALYSIS**

Three concurrent analysis modules that extract comprehensive metadata from video files using FFmpeg:

##### `server/analysis/shot-detection.ts` (~420 lines)

- **Purpose:** Shot boundary detection via 3-signal fusion
- **Signals:**
  1. HSV Histogram χ² distance (weight: 0.40)
  2. Edge Change Ratio / ECR (weight: 0.35)
  3. Temporal frame difference (weight: 0.25)
- **Techniques:** Spike detection for hard cuts, sustained-window for gradual transitions, non-maximum suppression deduplication
- **Adaptive Sampling:** Caps at ~900 frames for performance
- **Output:** `ShotDetectionResult` — cuts timeline with confidence scores, shot count, editing pace

##### `server/analysis/motion.ts` (~579 lines)

- **Purpose:** RAFT-style optical-flow velocity analysis
- **FFmpeg Passes (concurrent):**
  1. `mestimate` + `codecview` → macroblock motion vectors
  2. `tblend=difference128` → per-frame pixel-difference magnitude
- **Processing:** Results fused, EMA-smoothed, robust baseline, velocity segmentation
- **Velocity Categories:** freeze / slow-mo / normal / fast / hyper
- **Output:** `MotionResult` — velocity segments, jhatka events (abrupt speed changes), motion intensity

##### `server/analysis/audio.ts` (~779 lines)

- **Purpose:** Spectral-flux beat detection + BPM estimation
- **FFmpeg Passes (concurrent):**
  1. `astats` per-frame RMS/crest → energy timeline
  2. Band-split spectral flux → 4-band analysis (sub-bass / bass / mid / high)
  3. `volumedetect` → peak dB + mean volume
- **Processing:** Adaptive threshold onset detection, BPM via autocorrelation, rhythm region segmentation, time-signature guessing
- **Output:** `AudioResult` — beats, BPM with confidence, volume profile, rhythm regions

##### `server/analysis/index.ts`

- **Purpose:** Barrel export — re-exports all three modules

---

#### **Style Extraction** (`server/style/`) ⭐ **COLOR DNA FINGERPRINTING**

##### `server/style/color-grading.ts` (~479 lines)

- **Purpose:** Extracts a comprehensive colour "DNA" fingerprint from video
- **5 Concurrent FFmpeg Passes:**
  1. `signalstats` → Luma (Y), Saturation (S), dynamic range, grain density (TOUT proxy)
  2. `blurdetect` → Sharpness / lens blur quantification
  3. Centre-vs-edge crop comparison → Vignette detection strength
  4. Histogram percentile analysis → Shadows / Midtones / Highlights RGB
  5. Midtone-specific RGB analysis
- **Pre-computed FFmpeg Parameters:** `eqParams`, `colorbalanceParams`, `colorchannelmixerParams`, `unsharpParams`
- **Classifications:** Color temperature label, contrast level, grain/blur/vignette intensity
- **Output:** `ColorGradingResult` — full colour fingerprint ready for transfer

---

#### **Pipeline Orchestrator** (`server/pipeline/`) ⭐ **COORDINATION ENGINE**

##### `server/pipeline/orchestrator.ts` (~378 lines)

- **Purpose:** Central coordinator for all analysis modules
- **Pipeline Levels:**
  - `analyzeVideo()` — Full analysis (shot + motion + audio + colour) on ONE video, all 4 modules concurrent via `Promise.allSettled`
  - `analyzeAndTransfer()` — Analyse reference → apply style to target via FFmpeg render
  - `analyzeAndBlueprint()` — Full analysis → generate Editing Blueprint
  - `blueprintAndTransfer()` — Analyse → Blueprint → Transfer instructions JSON
  - `fullPipeline()` — **Highest-level**: Analyse → Blueprint → Instructions → FFmpeg Render
  - `analyzePartial()` — Cherry-pick individual modules via option flags

---

#### **Edit Transfer Engine** (`server/editor/`) ⭐ **FFMPEG RENDER ENGINE**

##### `server/editor/edit-transfer.ts` (~740 lines) — Master Logic v3

- **Purpose:** Applies a reference video's `FullVideoMetadata` style to a target video via a single FFmpeg filter graph
- **Master Logic Rules (permanent):**
  1. **Quality First** — No hqdn3d / noise / tblend. CRF 18, preset medium, explicit bitrate floor (`-b:v 5M -maxrate 8M -bufsize 16M`)
  2. **Contrast-First Color DNA** — `curves=preset=strong_contrast` always, then `eq=saturation=1.3:contrast=1.1`, signal-driven refinement (brightness clamped to ±0.02), HALD CLUT (colour-only, no eq) after black-floor protect
  3. **Simple Motion Sync** — Passthrough `setpts=PTS-STARTPTS` when reference ≤2× shorter; complex looped setpts otherwise. Audio looped via `-stream_loop`
  4. **Full HD Default** — 1080×1920, `unsharp=3:3:0.7:3:3:0.0`, `alimiter=limit=0.9`
  5. **Vignette Clamping** — Input clamped to `[0, 0.5]`, angle clamped to `[0.40, π/2]` to prevent over-darkening

- **Filter Chain Order:**

  ```
  setpts → scale(1080×1920) → curves(strong_contrast) → eq(cinematic_base)
  → colorbalance/HALD CLUT → Signal Color DNA → unsharp(pro)
  → vignette(clamped) → fps(30) → fades → format(yuv420p)
  ```

- **`-filter_complex_script` Strategy:**
  - The entire filter graph is written to a plain text file on disk
  - FFmpeg reads it via `-filter_complex_script "path/to/filter_complex.txt"`
  - Bypasses: Windows 8191-char CLI limit, cmd.exe/PowerShell quote stripping, nested single/double quote conflicts
  - Single quotes inside the script file protect `setpts` and `curves` expressions from FFmpeg's own comma-based option parser

- **HALD CLUT Handling:**
  - Generated from reference colour grading data via `generateHaldClut()` — encodes **only** `colorchannelmixer` + `colorbalance` (no `eq`, which would double-apply brightness/contrast)
  - CLUT size validated after generation (≥ 1KB) — suspiciously small CLUTs are skipped
  - Applied after a black-floor protect (`curves=master='0/0.06 1/1'`) so CLUT cannot wash out shadows
  - Three-input graph: `[0:ref_audio] [1:target_video] [2:hald_clut]`

- **Audio Handling:**
  - Reference audio is primary track when available
  - `atrim` + `asetpts` + `alimiter=limit=0.9` to prevent clipping
  - Audio looped via `-stream_loop N` when needed

- **Output Validation:**
  - File existence check after render
  - Size check: outputs < 50KB are flagged as likely bitrate collapse

- **Encoder:** `libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 18 -b:v 5M -maxrate 8M -bufsize 16M -threads 0 -movflags +faststart`

##### `server/utils/ffmpeg.ts`

- **Purpose:** FFmpeg utility functions
- **Functions:** `resolveFfmpeg()`, `safeExe()`, `execAsync()`, `probeVideo()`, `makeTempDir()`, `cleanTempDir()`, `writeTempFile()`

##### `server/types/index.ts`

- **Purpose:** TypeScript type definitions for the entire pipeline
- **Key Types:** `FullVideoMetadata`, `EditTransferResult`, `VelocitySegment`, `ColorGradingResult`, `ShotDetectionResult`, `ShotBoundary`, `AudioResult`, `MotionResult`

---

### **Library Utilities** (`lib/`)

#### `lib/auth.ts`

- **Purpose:** Better-auth server configuration
- **Settings:** Email/password auth, session management, email verification, dev-guest fallback

#### `lib/auth-client.ts`

- **Purpose:** Client-side auth utilities
- **Functions:** `useSession()`, `signIn()`, `signOut()`, `useUser()`

#### `lib/auth/permissions.ts`

- **Purpose:** Permission constants and checks
- **Exports:** `ROLES`, `PERMISSIONS`, `hasPermission()`

#### `lib/stripe.ts` ⭐ **PAYMENT CONFIGURATION**

- **Purpose:** Stripe client initialisation and subscription plan definitions
- **API Version:** `2025-12-15.clover`
- **Subscription Plans:**

| Plan             | Price | Interval | Video Limit | Key Features                                                      |
| ---------------- | ----- | -------- | ----------- | ----------------------------------------------------------------- |
| Free             | $0    | month    | 5           | Basic templates, 720p, Email support                              |
| Pro Monthly      | $19   | month    | 100         | All templates, 1080p HD, Advanced editing, Priority support       |
| Pro Yearly       | $190  | year     | 100         | Same as Pro Monthly (17% savings)                                 |
| Business Monthly | $49   | month    | Unlimited   | Premium content, 4K, Team collaboration, API access, 24/7 support |
| Business Yearly  | $490  | year     | Unlimited   | Same as Business Monthly (17% savings)                            |

#### `lib/utils.ts`

- **Purpose:** General utility functions
- **Functions:** `cn()`, `formatDate()`, `formatFileSize()`, `generateId()`

#### `lib/env.ts`

- **Purpose:** Environment variable validation and typed access

#### `lib/constants.ts`

- **Purpose:** Application-wide constants

---

### **Scripts** (`scripts/`)

#### `scripts/analyzer.py` ⭐ **PYTHON AI ANALYSER** (~666 lines)

- **Purpose:** Comprehensive video analyser using OpenCV + NumPy + scikit-learn
- **Analysis Categories (9):** Color DNA, Grain & Texture, Vignette & Blur, Velocity Map, Motion Analysis, Audio Beats, Classic Metrics, Shot Boundaries (histogram χ² + ECR + temporal-diff fusion), Aspect/Orientation
- **Usage:** `python scripts/analyzer.py <video_path>` → outputs JSON to stdout

#### `scripts/style_transfer.py` (~344 lines)

- **Purpose:** Python-based style transfer pipeline using MoviePy v2.x, Librosa, scikit-image
- **Features:** Colour histogram matching, beat detection, audio looping, cinematic overlays

#### `scripts/create-first-admin.js`

- **Purpose:** Promote a registered user to admin by email
- **Usage:** `node scripts/create-first-admin.js <email>`

#### `scripts/seed-subscription-plans.js`

- **Purpose:** Insert/update 5 subscription plans into DB
- **Idempotent:** Uses `onConflictDoUpdate` for safe re-runs

#### `scripts/check_ffmpeg.js`

- **Purpose:** Diagnostic — tests FFmpeg availability across candidate paths

#### `scripts/health_check.js`

- **Purpose:** Verifies Python availability and that `analyzer.py` can run and return valid JSON

#### `check-user-role.js`

- **Purpose:** Development utility to verify user roles in DB

---

### **Public Assets** (`public/`)

- **Purpose:** Static files served directly
- **Contents:**
  - `public/outputs/` — Rendered video files from FFmpeg processing
  - `public/videos/` — Source/demo video files
  - Images (logos, icons)

---

## 🎯 Key Features Implemented

### 1. **Server-Side Video Style Transfer** ⭐

- Multi-signal reference video analysis (shot detection, motion, audio, colour grading)
- Contrast-First Color DNA — `curves=preset=strong_contrast` + `eq` cinematic baseline
- HALD CLUT deep colour matching with black-floor protect
- Signal Color DNA refinement from shot detection signals
- Audio extraction, looping (`-stream_loop`), and limiting (`alimiter=0.9`)
- `-filter_complex_script` approach — filter graphs written to temp files on disk
- Master Logic v3: CRF 18, preset medium, profile high, Full HD 1080×1920

### 2. **Template-Based Video Editing**

- 48 professional templates across 6 categories
- Categories: Intros & Outros, Transitions, Lower Thirds & Text, Social Media, Effects & Filters, Promo & Ads
- Template search and filtering
- Video preview before and after processing

### 3. **Multi-Signal Analysis Pipeline**

- **Shot Detection:** 3-signal fusion (histogram χ², ECR, temporal diff) with NMS
- **Motion Analysis:** RAFT-style optical-flow, velocity segmentation, jhatka detection
- **Audio Analysis:** Spectral-flux beat detection, BPM via autocorrelation, rhythm regions
- **Color Grading:** 5-pass FFmpeg extraction → colour DNA fingerprint
- All modules run concurrently via `Promise.allSettled`

### 4. **Tropical Sunset Lamp Authentication** 🪔

- Shared lamp animation across all 4 auth pages (Login, Signup, Forgot Password, Reset Password)
- SVG tropical sunset background with palm tree silhouettes and ocean shimmer
- Interactive pull-cord lamp that reveals the form in a sunlight beam
- Dynamic labels on lamp shade ("LOGIN", "SIGN UP", "RECOVER", "RESET")
- Firefly particles, edge vignette, pull-cord bounce hint animation

### 5. **Golden Theme UI**

- All pages use `#1a1408` dark golden-brown base
- OKLCH CSS variables for consistent colour management
- Amber accents for borders (`amber-800/30`), rings (`oklch(0.65 0.12 75)`), gradients
- Landing page: amber marquee, golden radial gradients, amber floating blobs

### 6. **Project Management**

- Save processed videos to `public/outputs/` and DB (background fire-and-forget)
- View project library with metadata
- Download and delete projects
- Project metadata tracking (effects, duration, filter chain)

### 7. **Authentication & Authorization**

- Email/password authentication via Better-auth
- Role-based access control (Admin/User)
- Protected routes with middleware
- Dev-guest fallback user auto-creation for FK constraints
- Password reset functionality

### 8. **Subscription & Payment System**

- Stripe checkout with 14-day trial
- 5 plans (Free / Pro / Business × Monthly / Yearly)
- Per-plan video quotas with monthly usage tracking
- Subscription lifecycle: create, cancel, resume, webhook sync
- Admin billing dashboard with MRR, ARR, recent payments

### 9. **Admin Dashboard** (11 pages)

- User Management (live data), Billing (live data)
- Analytics, Support, Accounts, Activity, Quotas, Content Moderation, Communication, Bulk Operations, Roles & Permissions

### 10. **Database Resilience**

- `isConnectionError()` detects DNS/network failures
- `withRetry()` exponential backoff (3 retries, 1.5s/3s/4.5s)
- Detached background saves — immediate HTTP 200, async DB write
- Singleton pool with 5s connection timeout, graceful error handler

---

## 🔧 Technical Implementation Details

### **Video Processing Architecture**

#### **Server-Side Processing (Current)**

- Videos uploaded as multipart FormData to Next.js API routes
- FFmpeg native binary executed server-side via `child_process.exec`
- Filter graphs written to disk files → `-filter_complex_script` (no shell quoting issues)
- Rendered output saved to `public/outputs/` directory
- Background DB save with retry logic — user gets video immediately

#### **`-filter_complex_script` Strategy**

The entire filter graph is written to a plain text file and FFmpeg reads it via `-filter_complex_script`. This bypasses:

- Windows 8191-character CLI length limit
- cmd.exe / PowerShell quote stripping
- Nested single/double quote conflicts

Inside the script file there is **no shell** — commas, colons, and special chars are read literally by FFmpeg's parser. Single quotes are still required for `setpts` and `curves` expressions because FFmpeg's own filter-graph parser uses commas as option separators.

#### **FFmpeg Filter Chain Example (Master Logic v3)**

```
# Written to filter_complex.txt:
[1:v]setpts='if(between(T,0.00,5.50),PTS*1.2,PTS)'
,scale=1080:1920:force_original_aspect_ratio=increase
,crop=1080:1920
,curves=preset=strong_contrast
,eq=saturation=1.3:contrast=1.1
,colorbalance=rs=0.08:gs=-0.04:bs=0.12:rm=0.05:gm=-0.02:bm=0.08
,unsharp=3:3:0.7:3:3:0.0
,vignette=angle=0.9500
,fps=30
,fade=t=in:st=0:d=0.5
,fade=t=out:st=9.50:d=0.5
,format=yuv420p[graded];
[graded][2:v]haldclut[clutted];
[clutted]curves=master='0/0.06 1/1',format=yuv420p[vout]
```

```bash
# FFmpeg command:
ffmpeg -y -analyzeduration 100M -probesize 100M \
  -stream_loop 3 -i "reference.mp4" \
  -i "target.mp4" \
  -i "hald_clut.png" \
  -filter_complex_script "filter_complex.txt" \
  -map "[vout]" -map 0:a:0 \
  -af "atrim=0:10.00,asetpts=PTS-STARTPTS,alimiter=limit=0.9" \
  -c:a aac -b:a 192k \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 18 \
  -b:v 5M -maxrate 8M -bufsize 16M -threads 0 \
  -movflags +faststart \
  "output.mp4"
```

#### **Storage Strategy**

- Rendered videos saved as MP4 files in `public/outputs/`
- Project metadata stored in PostgreSQL (jsonb)
- Video URL stored as relative path to the output file
- Maximum upload size: 50MB (configurable via `serverActions.bodySizeLimit`)

### **Database Resilience Architecture**

#### **Connection Pool**

- Singleton pool via `globalForDb` with `createPool()` factory (survives hot reload)
- `max: 5` (conservative for Neon free tier), `connectionTimeoutMillis: 10_000`
- SSL auto-detected for Neon/Supabase/Railway
- Graceful `pool.on('error')` handler — logs and auto-marks pool for replacement on connection errors
- `server/db/index.ts` re-exports from `db/drizzle.ts` — unified pool across all server modules (eliminated duplicate pool that previously caused connection exhaustion)

#### **Detached Save Pattern** (`/api/save-project`)

```
1. HTTP POST arrives with video data
2. Generate project ID immediately
3. Return HTTP 200 with projectId (user unblocked)
4. saveToDbInBackground() fires async:
   a. Check/create dev-guest user if needed (withDbRetry + pool reset)
   b. Insert project row (withDbRetry + pool reset)
   c. Log success or failure (never crashes server)
```

#### **`withDbRetry()` Helper** (centralised in `db/drizzle.ts`)

- 3 attempts with exponential backoff (2s → 4s → 6s)
- Only retries on `isConnectionError()` matches
- **Auto-resets pool between retries** via `resetPool()` — discards stale TCP sockets so the next attempt gets a fresh connection
- Throws on non-connection errors immediately

### **Database Optimization**

- Primary keys on all tables
- Foreign key indexes for relationships
- User email unique index
- Project userId index for fast queries
- Drizzle ORM prepared statements
- Connection pooling with idle timeout

### **Security Measures**

#### **Authentication**

- Password hashing with bcrypt
- Secure session tokens
- HTTP-only cookies
- CSRF protection

#### **Authorization**

- Middleware route protection
- Role-based access control
- Server-side permission checks
- User can only access own projects
- Admin layout guard (server-side role redirect)

#### **Data Validation**

- Zod schema validation
- Input sanitization
- File type validation (MP4, WebM, AVI, MOV)
- File size limits
- Video quota enforcement per subscription plan

---

## 📊 Project Statistics

- **Total Files:** ~80+ files
- **Total Lines of Code:** ~15,000+ lines
- **Key Components:** 40+ React components
- **Database Tables:** 10+ tables (users, sessions, accounts, verifications, projects, organizations, members, invitations, subscriptions, subscription plans, usage)
- **API Routes:** 19 endpoints
- **Server Actions:** 25+ functions
- **Server Analysis Modules:** 4 (shot detection, motion, audio, colour grading)
- **Pipeline Functions:** 6 orchestration levels
- **Templates Available:** 48 templates across 6 categories
- **Admin Pages:** 11 dedicated admin dashboard pages
- **Auth Pages:** 4 pages with shared lamp animation
- **Maximum Video Size:** 50MB
- **Supported Formats:** MP4, WebM, AVI, MOV
- **Subscription Plans:** 5 (Free, Pro Monthly/Yearly, Business Monthly/Yearly)

---

## 🚀 Setup & Deployment

### **Environment Variables Required**

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe    # optional, auto-detected
```

### **Prerequisites**

- Node.js 18+
- pnpm
- PostgreSQL (Neon recommended)
- FFmpeg native binary (Gyan.dev Windows build or system install)
- Python 3.x with OpenCV, NumPy, scikit-learn (for `analyzer.py`)

### **Installation Steps**

```bash
# 1. Install dependencies
pnpm install

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Setup database
npx drizzle-kit push

# 4. Seed subscription plans
node scripts/seed-subscription-plans.js

# 5. Create first admin
node scripts/create-first-admin.js <admin-email>

# 6. Run development server
pnpm dev
```

### **Production Build**

```bash
pnpm build
pnpm start
```

---

## 🎓 Academic Contributions

### **Technical Innovations**

1. **Multi-signal video analysis pipeline** — 4 concurrent FFmpeg-based analysis modules (shot detection, motion, audio, colour) with signal fusion
2. **Contrast-First Color DNA** — Novel colour grading transfer approach using `curves=preset=strong_contrast` baseline + HALD CLUT with black-floor protect
3. **`-filter_complex_script` architecture** — Eliminates all Windows shell quoting issues by writing filter graphs to disk files
4. **Detached background saves** — Immediate HTTP response with async database persistence and exponential retry
5. **Interactive lamp UI pattern** — SVG tropical sunset with pull-cord interaction revealing auth forms in a light beam
6. **Signal Color DNA** — Shot detection signals drive per-segment colour grading refinement

### **Full-Stack Capabilities Demonstrated**

- **Frontend:** React 19, Next.js 16 (App Router, Server Components), TypeScript
- **Backend:** Server Actions, API Routes, FFmpeg native binary, Python ML scripts
- **Database:** PostgreSQL (Neon), Drizzle ORM, connection resilience
- **Authentication:** Better-auth, RBAC, dev-guest fallback
- **Video Processing:** FFmpeg server-side, `-filter_complex_script`, HALD CLUT, Master Logic v3
- **Payments:** Stripe checkout, subscriptions, webhooks, video quotas
- **UI/UX:** Golden OKLCH theme, SVG animations, responsive design, interactive lamp

### **Software Engineering Practices**

- Type-safe development with TypeScript
- Component-based architecture with dynamic imports
- Separation of concerns (analysis / pipeline / style / editor / server actions)
- Comprehensive error handling with retry logic and graceful degradation
- Connection resilience for cloud databases
- Code modularity and reusability
- Security best practices (RBAC, middleware guards, input validation)

---

## 🔮 Future Enhancements

1. **Cloud Storage Integration** — AWS S3 or Cloudinary for video storage, CDN delivery
2. **Advanced AI Features** — AI scene detection, automatic captions, smart crop
3. **Collaboration Features** — Real-time team editing, comments, version control
4. **Export Options** — Multiple resolutions, custom formats, batch processing
5. **Template Marketplace** — User-created templates, sharing, monetisation

---

## 📝 Conclusion

This project demonstrates a complete full-stack web application with advanced server-side video processing capabilities. It combines modern web technologies (Next.js 16, React 19, TypeScript) with a sophisticated multi-signal analysis pipeline and FFmpeg-based style transfer engine. The platform features a golden OKLCH theme, interactive SVG lamp authentication, Stripe subscription management, and database resilience patterns. The architecture is scalable, secure, and follows industry best practices for production web development.

---

**Developed By:** [Your Name]  
**Date:** December 2025  
**Framework:** Next.js 16 with React 19  
**Language:** TypeScript  
**Database:** PostgreSQL (Neon) with Drizzle ORM  
**Video Processing:** FFmpeg (Native Binary, `-filter_complex_script`)  
**Payments:** Stripe  
**Theme:** Golden OKLCH (`#1a1408`)
