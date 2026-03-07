# 🎓 VIVA PREPARATION GUIDE - Automated Video Editor Platform

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack & Justification](#technology-stack--justification)
3. [Project Architecture](#project-architecture)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [Subscription & Payment System](#subscription--payment-system)
7. [File Structure Explained](#file-structure-explained)
8. [Page-by-Page Breakdown](#page-by-page-breakdown)
9. [API Routes Explained](#api-routes-explained)
10. [Key Components](#key-components)
11. [Performance Optimizations](#performance-optimizations)
12. [Security Features](#security-features)
13. [Common Viva Questions & Answers](#common-viva-questions--answers)

---

## 🎯 Project Overview

**Project Name:** Automated Video Editor Platform  
**Purpose:** An AI-powered web platform that democratizes video editing with automated VFX and style transfer capabilities.

**Core Features:**

- ✅ User Authentication (Login, Signup, Password Reset)
- ✅ Organization Management (Teams, Roles, Invitations)
- ✅ Subscription Plans (Free, Pro, Business)
- ✅ Stripe Payment Integration
- ✅ Admin Dashboard (Analytics, Revenue Tracking)
- ✅ Video Project Management
- ✅ Responsive Design (Mobile, Tablet, Desktop)
- ✅ Real-time Performance Monitoring

---

## 🛠️ Technology Stack & Justification

### **Frontend Technologies**

#### 1. **Next.js 16.0.3** (React Framework)

**Why?**

- **Server-Side Rendering (SSR):** Faster page loads, better SEO
- **App Router:** Modern file-based routing system
- **Turbopack:** 700x faster than Webpack for development
- **Built-in optimization:** Image, Font, Script optimization
- **API Routes:** Backend functionality within the same codebase

#### 2. **React 19** (UI Library)

**Why?**
- **Component-Based Architecture:** Reusable, maintainable code
- **Virtual DOM:** Efficient UI updates
- **Hooks:** Clean state management
- **Large Ecosystem:** Tons of libraries and community support

#### 3. **TypeScript** (Programming Language)

**Why?**

- **Type Safety:** Catch errors at compile time, not runtime
- **Better IDE Support:** Autocomplete, IntelliSense
- **Code Documentation:** Types serve as documentation
- **Easier Refactoring:** Compiler catches breaking changes

#### 4. **Tailwind CSS** (Styling)

**Why?**

- **Utility-First:** Rapid UI development
- **No CSS File Overhead:** Write styles directly in JSX
- **Responsive Design:** Mobile-first breakpoints
- **Dark Mode Support:** Built-in dark mode utilities
- **Consistent Design System:** Pre-defined spacing, colors

#### 5. **Shadcn/UI** (Component Library)

**Why?**

- **Copy-Paste Components:** No npm bloat, full control
- **Built on Radix UI:** Accessible, keyboard-navigable
- **Customizable:** Tailwind-based styling
- **Modern Design:** Beautiful, professional components

### **Backend Technologies**

#### 6. **Better Auth v1.4.1** (Authentication)

**Why?**

- **Full-Stack Auth:** Works seamlessly with Next.js
- **Multiple Providers:** Email, OAuth (Google, GitHub)
- **Session Management:** Secure cookie-based sessions
- **Email Verification:** Built-in email verification flow
- **Password Reset:** Secure token-based reset
- **Type-Safe:** Full TypeScript support

#### 7. **PostgreSQL** (Database)

**Why?**

- **Relational Database:** Complex queries, joins, transactions
- **ACID Compliance:** Data integrity and consistency
- **JSON Support:** Flexible data storage when needed
- **Scalability:** Handles millions of records
- **Open Source:** Free, large community

#### 8. **Drizzle ORM** (Database ORM)

**Why?**

- **Type-Safe Queries:** SQL queries with TypeScript types
- **Lightweight:** Minimal overhead, fast performance
- **Migration System:** Easy database schema updates
- **SQL-Like Syntax:** Easy for developers familiar with SQL
- **No Magic:** Predictable, explicit queries

#### 9. **Stripe** (Payment Processing)

**Why?**

- **Industry Standard:** Trusted by millions of businesses
- **Developer-Friendly:** Excellent API, documentation
- **Subscription Support:** Built-in recurring billing
- **Webhooks:** Real-time payment event handling
- **Security:** PCI-compliant, secure payment processing

### **Additional Technologies**

#### 10. **Lucide React** (Icons)

**Why?**

- **Modern Icons:** Clean, consistent design
- **Tree-Shakeable:** Only imports icons you use
- **Customizable:** Size, color, stroke width
- **React Components:** Easy integration

#### 11. **Resend** (Email Service)

**Why?**

- **Developer-First:** Simple API, React email templates
- **Reliable:** High deliverability rates
- **React Email:** Build emails with React components
- **Analytics:** Track email opens, clicks

#### 12. **Biome** (Linter/Formatter)

**Why?**

- **Fast:** 97x faster than ESLint
- **All-in-One:** Linting + Formatting in one tool
- **Zero Config:** Works out of the box
- **Consistent Code:** Enforces code style

---

## 🏗️ Project Architecture

### **Folder Structure Explained**

```
automated-video-editor/
│
├── app/                          # Next.js App Router (All Pages)
│   ├── page.tsx                  # Landing Page (/)
│   ├── layout.tsx                # Root Layout (Providers, Metadata)
│   ├── globals.css               # Global Styles
│   │
│   ├── api/                      # Backend API Routes
│   │   ├── auth/                 # Better Auth endpoints
│   │   ├── checkout/             # Stripe checkout session
│   │   ├── subscription/         # Get user subscription
│   │   ├── cancel-subscription/  # Cancel subscription
│   │   ├── resume-subscription/  # Resume subscription
│   │   └── webhooks/             # Stripe webhook handler
│   │
│   ├── login/                    # Login Page
│   ├── signup/                   # Signup Page
│   ├── forgot-password/          # Forgot Password Page
│   ├── reset-password/           # Reset Password Page
│   ├── pricing/                  # Pricing Plans Page
│   ├── checkout/                 # Stripe Checkout Page
│   │
│   └── dashboard/                # Protected Dashboard Area
│       ├── layout.tsx            # Dashboard Layout (Sidebar, Navbar)
│       ├── page.tsx              # Dashboard Home
│       ├── profile/              # User Profile
│       ├── edit-profile/         # Edit Profile
│       ├── change-password/      # Change Password
│       ├── billing/              # User Billing & Subscription
│       ├── my-projects/          # User Projects
│       ├── organization/         # Organization Management
│       ├── settings/             # User Settings
│       ├── templates/            # Video Templates
│       ├── upload-edit/          # Video Upload & Edit
│       ├── analytics/            # User Analytics
│       ├── help/                 # Help & Support
│       └── admin/                # Admin Area (Protected)
│           ├── page.tsx          # Admin Dashboard
│           └── billing/          # Admin Billing Analytics
│
├── components/                   # React Components
│   ├── ui/                       # Shadcn/UI Base Components
│   │   ├── button.tsx            # Button Component
│   │   ├── card.tsx              # Card Component
│   │   ├── dialog.tsx            # Modal Dialog
│   │   ├── form.tsx              # Form Components
│   │   ├── input.tsx             # Input Field
│   │   └── ...                   # Other UI Components
│   │
│   ├── forms/                    # Form Components
│   │   ├── login-form.tsx        # Login Form
│   │   ├── signup-form.tsx       # Signup Form
│   │   ├── forgot-password-form.tsx
│   │   └── ...
│   │
│   ├── emails/                   # Email Templates
│   │   ├── verify-email.tsx      # Email Verification
│   │   ├── reset-password.tsx    # Password Reset Email
│   │   └── organization-invitation.tsx
│   │
│   ├── dashboard-sidebar.tsx     # Dashboard Sidebar Navigation
│   ├── dashboard-navbar.tsx      # Dashboard Top Navbar
│   ├── header.tsx                # Landing Page Header
│   ├── footer-wave.tsx           # Animated Footer Wave
│   ├── animated-flower-logo.tsx  # Animated Logo
│   ├── route-prefetcher.tsx      # Performance: Prefetch Routes
│   ├── performance-monitor.tsx   # Performance Monitoring
│   └── ...
│
├── server/                       # Server-Side Functions
│   ├── users.ts                  # User CRUD Operations
│   ├── auth.ts                   # Auth Helper Functions
│   ├── password.ts               # Password Management
│   ├── permissions.ts            # Role-Based Access Control
│   ├── members.ts                # Organization Member Management
│   ├── projects.ts               # Video Project Management
│   ├── subscriptions.ts          # User Subscription Functions
│   ├── admin.ts                  # Admin Functions
│   └── admin-subscriptions.ts    # Admin Billing Analytics
│
├── db/                           # Database Configuration
│   ├── schema.ts                 # Database Schema (Tables)
│   └── drizzle.ts                # Drizzle ORM Config
│
├── lib/                          # Utility Functions & Configs
│   ├── auth.ts                   # Better Auth Configuration
│   ├── auth-client.ts            # Client-Side Auth Helper
│   ├── stripe.ts                 # Stripe Configuration
│   └── utils.ts                  # Utility Functions
│
├── scripts/                      # Database Seeding Scripts
│   ├── create-first-admin.js     # Create Admin User
│   └── seed-subscription-plans.js # Seed Subscription Plans
│
├── public/                       # Static Assets
│   ├── logoimage.png             # Logo Image
│   └── videos/                   # Demo Videos
│
├── .env                          # Environment Variables
├── .env.example                  # Example Environment Variables
├── drizzle.config.ts             # Drizzle Configuration
├── next.config.ts                # Next.js Configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript Configuration
├── biome.jsonc                   # Biome Configuration
└── README.md                     # Project Documentation
```

---

## 🗄️ Database Schema

### **Tables Overview**

#### 1. **user** (Users Table)

```typescript
{
  id: string (Primary Key)
  name: string
  email: string (Unique)
  emailVerified: boolean
  image: string (optional)
  createdAt: timestamp
  updatedAt: timestamp
  role: enum ['user', 'admin']
}
```

**Purpose:** Store all user accounts

#### 2. **session** (User Sessions)

```typescript
{
  id: string (Primary Key)
  userId: string (Foreign Key → user)
  expiresAt: timestamp
  token: string
}
```

**Purpose:** Manage user login sessions

#### 3. **account** (OAuth Accounts)

```typescript
{
  id: string (Primary Key)
  userId: string (Foreign Key → user)
  provider: string
  providerAccountId: string
  accessToken: string
  refreshToken: string
}
```

**Purpose:** Store OAuth provider data (Google, GitHub)

#### 4. **verification** (Email Verification)

```typescript
{
  id: string (Primary Key)
  identifier: string (Email)
  value: string (Token)
  expiresAt: timestamp
}
```

**Purpose:** Handle email verification tokens

#### 5. **organization** (Organizations)

```typescript
{
  id: string (Primary Key)
  name: string
  slug: string (Unique)
  logo: string (optional)
  createdAt: timestamp
  metadata: json (optional)
}
```

**Purpose:** Store organization/team information

#### 6. **member** (Organization Members)

```typescript
{
  id: string (Primary Key)
  organizationId: string (Foreign Key → organization)
  userId: string (Foreign Key → user)
  role: enum ['owner', 'admin', 'member']
  createdAt: timestamp
}
```

**Purpose:** Link users to organizations with roles

#### 7. **invitation** (Organization Invitations)

```typescript
{
  id: string (Primary Key)
  organizationId: string (Foreign Key → organization)
  email: string
  role: enum ['owner', 'admin', 'member']
  status: enum ['pending', 'accepted', 'rejected']
  expiresAt: timestamp
  inviterId: string (Foreign Key → user)
}
```

**Purpose:** Manage organization invitations

#### 8. **subscriptionPlan** (Subscription Plans)

```typescript
{
  id: string (Primary Key)
  name: string
  description: string
  price: decimal
  interval: enum ['month', 'year']
  stripePriceId: string
  videoLimit: integer (null for unlimited)
  features: json
  isActive: boolean
}
```

**Purpose:** Define available subscription plans

#### 9. **subscription** (User Subscriptions)

```typescript
{
  id: string (Primary Key)
  userId: string (Foreign Key → user)
  planId: string (Foreign Key → subscriptionPlan)
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: enum ['active', 'trialing', 'canceled', 'past_due', 'paused']
  currentPeriodStart: timestamp
  currentPeriodEnd: timestamp
  cancelAtPeriodEnd: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Purpose:** Track user subscriptions

#### 10. **usage** (Usage Tracking)

```typescript
{
  id: string (Primary Key)
  userId: string (Foreign Key → user)
  subscriptionId: string (Foreign Key → subscription)
  videosCreated: integer
  periodStart: timestamp
  periodEnd: timestamp
}
```

**Purpose:** Track usage limits per billing period

#### 11. **payment** (Payment History)

```typescript
{
  id: string (Primary Key)
  userId: string (Foreign Key → user)
  subscriptionId: string (Foreign Key → subscription)
  stripePaymentIntentId: string
  amount: decimal
  currency: string
  status: enum ['succeeded', 'failed', 'pending']
  createdAt: timestamp
}
```

**Purpose:** Store payment transaction history

---

## 🔐 Authentication System

### **How Authentication Works**

#### **1. User Registration Flow**

```
User fills signup form (app/signup/page.tsx)
    ↓
Form submits to Better Auth API (/api/auth/signup)
    ↓
Better Auth creates user in database
    ↓
Sends verification email (components/emails/verify-email.tsx)
    ↓
User clicks verification link
    ↓
Email verified, user can login
```

#### **2. Login Flow**

```
User fills login form (app/login/page.tsx)
    ↓
Form submits to Better Auth API (/api/auth/login)
    ↓
Better Auth validates credentials
    ↓
Creates session in database
    ↓
Sets secure HTTP-only cookie
    ↓
Redirects to dashboard
```

#### **3. Password Reset Flow**

```
User requests password reset (app/forgot-password/page.tsx)
    ↓
Better Auth generates secure token
    ↓
Sends reset email (components/emails/reset-password.tsx)
    ↓
User clicks reset link (app/reset-password/page.tsx)
    ↓
User enters new password
    ↓
Password updated in database
```

#### **4. Session Management**

- **Cookie-Based:** Secure, HTTP-only cookies
- **Server-Side Validation:** Every request validates session
- **Auto-Expiry:** Sessions expire after period of inactivity
- **Middleware Protection:** Protected routes check authentication

### **File: middleware.ts**

**Purpose:** Protect routes, redirect unauthenticated users

```typescript
// Checks if user is logged in before accessing dashboard
// Redirects to /login if not authenticated
// Redirects to /dashboard if already logged in (for login/signup pages)
```

---

## 💳 Subscription & Payment System

### **How Subscriptions Work**

#### **1. Subscription Plans** (5 Plans)

```javascript
Free Plan:
- Price: $0
- Video Limit: 5 videos/month
- Features: Basic editing, watermark

Pro Monthly:
- Price: $29/month
- Video Limit: 50 videos/month
- Features: Advanced AI, no watermark, priority support

Pro Yearly:
- Price: $290/year ($24/month)
- Video Limit: 50 videos/month
- Features: Same as Pro Monthly + 2 months free

Business Monthly:
- Price: $99/month
- Video Limit: Unlimited
- Features: Team collaboration, API access, white-label

Business Yearly:
- Price: $990/year ($82.50/month)
- Video Limit: Unlimited
- Features: Same as Business Monthly + 2 months free
```

#### **2. Checkout Flow**

```
User clicks "Upgrade" button (app/pricing/page.tsx)
    ↓
Redirects to checkout page with planId (app/checkout/page.tsx)
    ↓
Checkout page calls /api/checkout
    ↓
API creates Stripe Checkout Session
    ↓
User redirects to Stripe payment page
    ↓
User enters payment details on Stripe
    ↓
Stripe processes payment
    ↓
Stripe sends webhook to /api/webhooks/stripe
    ↓
Webhook creates subscription in database
    ↓
User redirects back to success page
```

#### **3. Webhook Events** (Critical!)

**File:** `app/api/webhooks/stripe/route.ts`

**Events Handled:**

- `checkout.session.completed` → Create subscription
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Cancel subscription
- `invoice.payment_succeeded` → Record payment
- `invoice.payment_failed` → Mark as past_due

**Why Webhooks?**

- Stripe events happen on their servers
- Webhooks notify our app of events
- Keeps database in sync with Stripe

#### **4. Subscription Management**

**File:** `app/dashboard/billing/page.tsx`

**Features:**

- View current plan details
- See billing cycle dates
- Track video usage (5/50)
- Upgrade/downgrade plan
- Cancel subscription
- Resume canceled subscription
- Manage payment method (Stripe portal)

---

## 📄 Page-by-Page Breakdown

### **Public Pages (No Authentication Required)**

#### **1. Landing Page** (`app/page.tsx`)

**What's Happening:**


- Hero section with animated background
- Features showcase with icons
- Pricing comparison table
- Video demo section with mute/play controls
- Testimonials/social proof
- Footer with social links

**Key Features:**

- Performance optimized (Next.js Image, Link)
- Responsive design (mobile, tablet, desktop)
- Animated components (flower logo, wave footer)
- Route prefetching for fast navigation

#### **2. Login Page** (`app/login/page.tsx`)

**What's Happening:**

- Login form with email/password
- "Forgot Password" link
- "Sign Up" link
- Loading state during submission

**Form Component:** `components/forms/login-form.tsx`

- Client-side validation
- Error handling
- Redirects to dashboard on success

#### **3. Signup Page** (`app/signup/page.tsx`)

**What's Happening:**

- Signup form with name, email, password
- Password confirmation field
- "Login" link for existing users
- Loading state during submission

**Form Component:** `components/forms/signup-form.tsx`

- Email format validation
- Password strength requirements
- Password match validation

#### **4. Forgot Password** (`app/forgot-password/page.tsx`)

**What's Happening:**

- Email input field
- Sends reset link to email
- Shows success message

**Form Component:** `components/forms/forgot-password-form.tsx`

#### **5. Reset Password** (`app/reset-password/page.tsx`)

**What's Happening:**

- Validates reset token from URL
- New password input
- Confirm password input
- Updates password in database

**Form Component:** `components/forms/reset-password-form.tsx`

#### **6. Pricing Page** (`app/pricing/page.tsx`)

**What's Happening:**

- Displays all subscription plans
- Monthly/Yearly toggle
- Feature comparison
- "Get Started" buttons
- Redirects to checkout with selected plan

**Key Elements:**

- Stripe Price IDs for each plan
- Highlighted "Popular" plan
- Responsive grid layout

#### **7. Checkout Page** (`app/checkout/page.tsx`)

**What's Happening:**

- Receives planId from URL query
- Calls `/api/checkout` to create Stripe session
- Redirects to Stripe payment page

**Flow:**

1. User clicks "Get Started" on pricing page
2. Redirects to `/checkout?planId=pro-monthly`
3. Checkout page creates Stripe session
4. Redirects to Stripe hosted checkout
5. After payment, returns to success URL

---

### **Protected Pages (Authentication Required)**

#### **8. Dashboard Home** (`app/dashboard/page.tsx`)

**What's Happening:**

- Welcome message with user name
- Quick stats (projects, videos, usage)
- Recent projects list
- Quick action buttons (Upload, Templates)

**Layout:** `app/dashboard/layout.tsx`

- Sidebar navigation
- Top navbar with user menu
- Protected by middleware

#### **9. Profile Page** (`app/dashboard/profile/page.tsx`)

**What's Happening:**

- Displays user information
- Avatar/profile picture
- Email (non-editable)
- Name, bio, etc.
- "Edit Profile" button

#### **10. Edit Profile** (`app/dashboard/edit-profile/page.tsx`)

**What's Happening:**

- Form to update user details
- Name, image, bio fields
- Save changes button
- Updates user table in database

**Component:** `components/edit-profile-form.tsx`

#### **11. Change Password** (`app/dashboard/change-password/page.tsx`)

**What's Happening:**

- Current password field
- New password field
- Confirm new password field
- Validates current password before update

**Component:** `components/change-password-form.tsx`

#### **12. Billing Page** (`app/dashboard/billing/page.tsx`)

**What's Happening:**

- Fetches user subscription from `/api/subscription`
- Displays current plan details
- Shows usage (videos created / limit)
- Billing cycle dates
- "Change Plan" button → redirects to pricing
- "Cancel Subscription" button → calls `/api/cancel-subscription`
- "Resume Subscription" button (if canceled)
- "Manage Payment Method" → opens Stripe portal

**Key Functions:**

```typescript
handleCancelSubscription() {
  // Calls /api/cancel-subscription
  // Sets cancelAtPeriodEnd to true
  // Subscription remains active until period end
}

handleResumeSubscription() {
  // Calls /api/resume-subscription
  // Sets cancelAtPeriodEnd to false
  // Subscription will renew normally
}
```

#### **13. My Projects** (`app/dashboard/my-projects/page.tsx`)

**What's Happening:**

- Lists all user's video projects
- Project cards with thumbnail, title, date
- "Create New Project" button
- Edit/delete project actions

**Server Function:** `server/projects.ts`

- getUserProjects(userId)
- createProject(userId, data)
- deleteProject(projectId, userId)

#### **14. Organization Page** (`app/dashboard/organization/page.tsx`)

**What's Happening:**

- Lists user's organizations
- Create new organization
- Manage members (if owner/admin)
- Send invitations
- Accept/reject invitations

**Components:**

- `components/forms/create-organization-form.tsx`
- `components/members-table.tsx`
- `components/add-user-dialog.tsx`

**Server Functions:** `server/members.ts`

- getOrganizationMembers()
- inviteMember()
- removeMember()
- updateMemberRole()

#### **15. Settings Page** (`app/dashboard/settings/page.tsx`)

**What's Happening:**

- App preferences
- Notification settings
- Privacy settings
- Account deletion option

#### **16. Templates Page** (`app/dashboard/templates/page.tsx`)

**What's Happening:**

- Pre-made video templates gallery
- Filter by category
- Preview template
- "Use Template" button → creates project

#### **17. Upload & Edit** (`app/dashboard/upload-edit/page.tsx`)

**What's Happening:**

- Video upload interface
- Drag & drop or file select
- Video editor interface
- Apply AI style transfer
- Export/download video

**Key Features:**

- Check video limit before upload
- Increment usage counter after creation
- Show upgrade prompt if limit reached

#### **18. Analytics Page** (`app/dashboard/analytics/page.tsx`)

**What's Happening:**

- User-level analytics
- Video view counts
- Engagement metrics
- Charts and graphs

#### **19. Help Page** (`app/dashboard/help/page.tsx`)

**What's Happening:**

- FAQ section
- Documentation links
- Contact support form
- Tutorial videos

---

### **Admin Pages (Admin Role Required)**

#### **20. Admin Dashboard** (`app/dashboard/admin/page.tsx`)

**What's Happening:**

- Total users count
- Active subscriptions
- Revenue metrics
- Recent user signups
- User management table

**Protection:**

```typescript
const isAdmin = await checkIsAdmin();
if (!isAdmin) redirect("/dashboard");
```

**Server Function:** `server/admin.ts`

- getAllUsers()
- getUserStats()
- deleteUser()
- updateUserRole()

#### **21. Admin Billing** (`app/dashboard/admin/billing/page.tsx`)

**What's Happening:**

- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Active subscriptions count
- Subscriptions by plan (chart)
- Subscriptions by status (chart)
- Recent payments table
- All subscriptions table

**Server Function:** `server/admin-subscriptions.ts`

```typescript
getSubscriptionStats() {
  // Calculates MRR, ARR
  // Groups subscriptions by plan
  // Groups subscriptions by status
}

getRecentPayments(limit) {
  // Fetches recent payment records
  // Joins with user and subscription tables
}

getAllSubscriptions() {
  // Lists all user subscriptions
  // Includes user, plan details
}
```

**Calculations:**

```typescript
MRR = SUM(monthly_subscriptions) + SUM(yearly_subscriptions / 12)
ARR = MRR × 12
```

---

## 🔌 API Routes Explained

### **Authentication APIs** (`app/api/auth/[...all]/route.ts`)

**Handled by Better Auth:**

- POST `/api/auth/signup` → Register user
- POST `/api/auth/login` → Login user
- POST `/api/auth/logout` → Logout user
- POST `/api/auth/verify-email` → Verify email token
- POST `/api/auth/forgot-password` → Send reset email
- POST `/api/auth/reset-password` → Reset password

### **Checkout API** (`app/api/checkout/route.ts`)

```typescript
POST /api/checkout
Body: { priceId: string }
Response: { url: string } // Stripe checkout URL

Flow:
1. Validate user is authenticated
2. Get or create Stripe customer
3. Create Stripe checkout session
4. Return checkout URL
```

### **Subscription API** (`app/api/subscription/route.ts`)

```typescript
GET /api/subscription
Response: {
  subscription: { ... },
  plan: { ... },
  usage: { ... }
}

Flow:
1. Get current user from session
2. Query subscription table
3. Join with plan and usage tables
4. Return combined data
```

### **Cancel Subscription API** (`app/api/cancel-subscription/route.ts`)

```typescript
POST /api/cancel-subscription
Body: { subscriptionId: string }
Response: { success: boolean }

Flow:
1. Validate user owns subscription
2. Call Stripe API to cancel at period end
3. Update database: cancelAtPeriodEnd = true
4. Subscription remains active until end date
```

### **Resume Subscription API** (`app/api/resume-subscription/route.ts`)

```typescript
POST /api/resume-subscription
Body: { subscriptionId: string }
Response: { success: boolean }

Flow:
1. Validate user owns subscription
2. Call Stripe API to resume subscription
3. Update database: cancelAtPeriodEnd = false
4. Subscription will renew normally
```

### **Stripe Webhook API** (`app/api/webhooks/stripe/route.ts`)

```typescript
POST /api/webhooks/stripe
Headers: { stripe-signature: string }
Body: Stripe Event Object

Events:
- checkout.session.completed → Create subscription in DB
- customer.subscription.updated → Update subscription status
- customer.subscription.deleted → Cancel subscription
- invoice.payment_succeeded → Record payment, reset usage
- invoice.payment_failed → Mark subscription as past_due
```

**Critical Security:**

- Verifies webhook signature using Stripe secret
- Prevents unauthorized webhook calls
- Ensures events are genuine from Stripe

---

## 🧩 Key Components

### **UI Components** (`components/ui/`)

Built with Shadcn/UI (Radix UI + Tailwind):

- `button.tsx` → Button with variants (default, outline, destructive)
- `card.tsx` → Card with header, content, footer
- `dialog.tsx` → Modal dialogs
- `form.tsx` → Form with validation (React Hook Form + Zod)
- `input.tsx` → Styled input fields
- `badge.tsx` → Status badges (active, canceled, etc.)
- `table.tsx` → Data tables
- `dropdown-menu.tsx` → Dropdowns with actions

### **Layout Components**

#### **Dashboard Sidebar** (`components/dashboard-sidebar.tsx`)

**What it does:**

- Navigation menu for dashboard
- Icons + labels for each section
- Active route highlighting
- Collapsible on mobile
- Admin-only menu items (conditional)

#### **Dashboard Navbar** (`components/dashboard-navbar.tsx`)

**What it does:**

- User avatar and name
- Dropdown menu (Profile, Settings, Logout)
- Mobile menu toggle button
- Theme switcher (light/dark mode)

#### **Header** (`components/header.tsx`)

**What it does:**

- Landing page navigation
- Logo and menu links
- Login/Signup buttons
- Sticky on scroll

### **Animation Components**

#### **Footer Wave** (`components/footer-wave.tsx`)

**What it does:**

- Animated SVG wave background
- Purple gradient colors
- Smooth continuous animation

#### **Animated Flower Logo** (`components/animated-flower-logo.tsx`)

**What it does:**

- Rotating flower animation
- Used in landing page
- CSS keyframe animations

### **Performance Components**

#### **Route Prefetcher** (`components/route-prefetcher.tsx`)

**What it does:**

- Prefetches important routes in background
- Uses Next.js router.prefetch()
- Loads routes before user clicks
- Instant navigation experience

**Routes Prefetched:**

- /dashboard
- /pricing
- /login
- /signup

#### **Performance Monitor** (`components/performance-monitor.tsx`)

**What it does:**

- Tracks page load performance
- Measures Time to Interactive (TTI)
- Logs metrics to console (dev mode)
- Can send to analytics service

---

## ⚡ Performance Optimizations

### **1. Next.js Optimizations**

#### **Image Optimization**

```typescript
<Image
  src="/logoimage.png"
  width={80}
  height={80}
  priority // Loads immediately
  alt="Logo"
/>
```

**Benefits:**

- Automatic WebP/AVIF format
- Lazy loading (except priority images)
- Responsive image sizes
- Blur placeholder

#### **Font Optimization**

```typescript
font: {
  display: "swap"; // Shows fallback font first
}
```

**Benefits:**

- Prevents layout shift
- Text visible during font load

#### **Link Prefetching**

```typescript
<Link href="/dashboard" prefetch={true}>
  Dashboard
</Link>
```

**Benefits:**

- Prefetches page in background
- Instant navigation on click

### **2. Caching Strategy**

#### **Static Page Caching**

```typescript
export const revalidate = 3600; // Revalidate every hour
```

**Benefits:**

- Serves cached HTML
- Reduces database queries
- Faster page loads

#### **API Route Caching**

```typescript
export const dynamic = "force-cache";
```

**Benefits:**

- Caches API responses
- Reduces processing time

### **3. Code Splitting**

- Automatic code splitting by route
- Each page loads only required JS
- Shared chunks for common code

### **4. Turbopack** (Development)

- 700x faster than Webpack
- Incremental compilation
- Faster hot module reload (HMR)

---

## 🔒 Security Features

### **1. Authentication Security**

- **Password Hashing:** Bcrypt with salt rounds
- **Session Tokens:** Cryptographically secure random tokens
- **HTTP-Only Cookies:** JavaScript cannot access cookies
- **Secure Flag:** Cookies only sent over HTTPS
- **CSRF Protection:** Token validation on form submissions

### **2. Database Security**

- **SQL Injection Prevention:** Drizzle ORM parameterized queries
- **Input Validation:** Zod schema validation
- **Foreign Key Constraints:** Referential integrity

### **3. API Security**

- **Authentication Middleware:** Validates session on every request
- **Rate Limiting:** Prevents brute force attacks (configurable)
- **Webhook Signature Verification:** Validates Stripe events
- **Role-Based Access Control (RBAC):** Admin-only routes

### **4. Environment Variables**

- **Never committed to Git:** .env in .gitignore
- **Server-side only:** Database URLs, API keys not exposed to client
- **NEXT*PUBLIC* prefix:** Only these are sent to browser

---

## 🎤 Common Viva Questions & Answers

### **General Questions**

**Q1: What is your project about?**
**A:** My project is an Automated Video Editor Platform that uses AI to democratize video editing. It allows users to upload videos and apply AI-powered style transfer effects without needing professional editing skills. The platform includes user authentication, subscription-based pricing, organization management, and an admin dashboard for analytics.

**Q2: Why did you choose Next.js over React?**
**A:** I chose Next.js because:

1. **Server-Side Rendering** improves SEO and initial page load speed
2. **App Router** provides modern file-based routing
3. **API Routes** allow backend functionality in the same codebase
4. **Built-in optimizations** for images, fonts, and scripts
5. **Turbopack** for faster development experience
6. **Production-ready** with automatic code splitting and caching

**Q3: Why PostgreSQL instead of MongoDB?**
**A:** PostgreSQL is better for this project because:

1. **Relational data:** Users, subscriptions, payments have clear relationships
2. **ACID compliance:** Payment transactions require data integrity
3. **Complex queries:** Need joins between users, subscriptions, and plans
4. **Data consistency:** Foreign keys prevent orphaned records
5. **Mature ecosystem:** Well-tested, reliable, scalable

**Q4: Why did you use Stripe for payments?**
**A:** Stripe is the industry standard because:

1. **PCI compliant:** Handles secure payment processing
2. **Subscription support:** Built-in recurring billing system
3. **Webhooks:** Real-time event notifications
4. **Developer-friendly:** Excellent documentation and testing tools
5. **Global support:** Multiple currencies and payment methods

**Q5: What is the difference between SSR and CSR?**
**A:**

- **SSR (Server-Side Rendering):**
  - HTML generated on server
  - Sent to browser as complete page
  - Better SEO, faster initial load
  - Used for landing page, dashboard pages

- **CSR (Client-Side Rendering):**
  - HTML skeleton sent to browser
  - JavaScript renders content
  - Interactive after JS loads
  - Used for forms, dynamic components

Next.js combines both for optimal performance.

### **Technical Questions**

**Q6: Explain the authentication flow in your project.**
**A:**

1. User fills signup form with email and password
2. Form data sent to Better Auth API (`/api/auth/signup`)
3. Better Auth hashes password with Bcrypt
4. User record created in database
5. Verification email sent with secure token
6. User clicks link, email verified
7. On login, credentials validated
8. Session created in database
9. Secure HTTP-only cookie set
10. Middleware validates cookie on protected routes

**Q7: How do webhooks work in your project?**
**A:**
Webhooks are HTTP callbacks from Stripe to our server:

1. User completes payment on Stripe
2. Stripe sends event to `/api/webhooks/stripe`
3. We verify the signature to ensure it's from Stripe
4. Parse the event type (e.g., `checkout.session.completed`)
5. Create/update subscription in our database
6. Return 200 OK to Stripe
7. If we don't respond, Stripe retries automatically

**Q8: What is middleware in Next.js?**
**A:** Middleware runs before a request is completed. It can:

- Redirect users (e.g., unauthenticated → login)
- Modify request/response headers
- Validate authentication tokens
- Implement rate limiting

In my project (`middleware.ts`):

- Checks if user is logged in
- Redirects to `/login` if accessing `/dashboard` without auth
- Redirects to `/dashboard` if logged-in user tries to access `/login`

**Q9: How do you handle user roles (admin vs regular user)?**
**A:**
Role-Based Access Control (RBAC):

1. User table has `role` field (enum: 'user', 'admin')
2. Server function `checkIsAdmin()` validates role
3. Admin pages check role before rendering
4. If not admin, redirect to dashboard
5. Admin-only menu items conditionally rendered in sidebar

```typescript
const isAdmin = await checkIsAdmin();
if (!isAdmin) redirect("/dashboard");
```

**Q10: What is ORM? Why Drizzle?**
**A:**
ORM (Object-Relational Mapping) maps database tables to code objects.

**Benefits:**

- Write queries in TypeScript, not raw SQL
- Type safety prevents errors
- Easier to maintain and refactor

**Why Drizzle:**

1. **Lightweight:** Minimal overhead
2. **Type-safe:** Full TypeScript support
3. **SQL-like syntax:** Easy to learn
4. **Migration system:** Easy schema updates
5. **No magic:** Predictable, explicit queries

**Q11: Explain your database schema.**
**A:**
**Core tables:**

- `user` → All user accounts
- `session` → Active login sessions
- `organization` → Teams/organizations
- `member` → Links users to organizations
- `subscriptionPlan` → Available plans
- `subscription` → User subscriptions
- `usage` → Track video creation limits
- `payment` → Payment history

**Relationships:**

- User has many sessions (one-to-many)
- User has many subscriptions (one-to-many)
- Subscription belongs to one user (many-to-one)
- Subscription has one plan (many-to-one)
- Organization has many members (one-to-many)

**Q12: How do you calculate MRR and ARR?**
**A:**
**MRR (Monthly Recurring Revenue):**

```
MRR = Sum of all monthly subscriptions
    + Sum of (yearly subscriptions / 12)
```

**ARR (Annual Recurring Revenue):**

```
ARR = MRR × 12
```

**Example:**

- 10 users × $29/month = $290
- 5 users × $290/year ÷ 12 = $120.83
- MRR = $290 + $120.83 = $410.83
- ARR = $410.83 × 12 = $4,930

**Q13: What is the difference between client and server components?**
**A:**
**Server Components (default in Next.js App Router):**

- Render on server
- Can access database directly
- Smaller JS bundle sent to client
- Cannot use React hooks (useState, useEffect)
- Cannot handle browser events

**Client Components (`'use client'` directive):**

- Render in browser
- Can use React hooks
- Handle user interactions
- Access browser APIs (localStorage, etc.)
- Larger JS bundle

**Best Practice:** Use server components by default, client components only when needed.

**Q14: How do you prevent SQL injection?**
**A:**
Drizzle ORM uses parameterized queries:

**Unsafe (vulnerable):**

```typescript
db.execute(`SELECT * FROM users WHERE email = '${email}'`);
// Attacker could input: ' OR '1'='1
```

**Safe (Drizzle):**

```typescript
db.select().from(user).where(eq(user.email, email));
// Drizzle escapes input automatically
```

**Q15: What is the purpose of loading.tsx and error.tsx?**
**A:**
**loading.tsx:**

- Shows loading UI while page data fetches
- Automatic by Next.js
- Better UX than blank page

**error.tsx:**

- Catches errors in page/component
- Shows error UI instead of crash
- Prevents entire app from breaking
- Can reset and retry

### **Conceptual Questions**

**Q16: What are the benefits of TypeScript?**
**A:**

1. **Type Safety:** Catch errors at compile time
2. **Better IDE Support:** Autocomplete, IntelliSense
3. **Code Documentation:** Types serve as documentation
4. **Easier Refactoring:** Compiler finds all usage
5. **Prevents Bugs:** Null/undefined checks

**Q17: What is the difference between authentication and authorization?**
**A:**
**Authentication:** Verifying WHO you are

- Login with email/password
- Proves your identity
- "Are you really John Doe?"

**Authorization:** Verifying WHAT you can do

- Checking user role/permissions
- Controls access to resources
- "Can John Doe access admin panel?"

**Q18: Why do we need environment variables?**
**A:**

1. **Security:** Keep secrets out of code
2. **Flexibility:** Different values for dev/prod
3. **No hardcoding:** Easy to change without code changes
4. **Team collaboration:** Each developer has own credentials

**Example:**

```
DATABASE_URL=postgresql://... (different per environment)
STRIPE_SECRET_KEY=sk_... (never commit to Git)
```

**Q19: What is the difference between session-based and token-based auth?**
**A:**
**Session-Based (used in this project):**

- Session data stored on server
- Cookie contains session ID
- Server validates ID on each request
- More secure, can revoke instantly

**Token-Based (JWT):**

- Token contains all user data
- Stored in localStorage/cookie
- Self-contained, no server lookup
- Cannot revoke until expiry

**Q20: What is a webhook vs API call?**
**A:**
**API Call:**

- We call external service
- Request → Response
- We initiate
- Example: We call Stripe to create checkout

**Webhook:**

- External service calls us
- Event notification
- They initiate
- Example: Stripe notifies us of payment success

**Q21: How does subscription cancellation work?**
**A:**
**Immediate cancellation vs End of period:**

In this project, cancellation is at **end of billing period**:

1. User clicks "Cancel Subscription"
2. We call Stripe API to cancel at period end
3. Update database: `cancelAtPeriodEnd = true`
4. User keeps access until current period ends
5. After period end, status changes to "canceled"
6. No renewal, no further charges

**Why?** User paid for the full period, should get full access.

**Q22: What are the advantages of component-based architecture?**
**A:**

1. **Reusability:** Use same component in multiple places
2. **Maintainability:** Update in one place, reflects everywhere
3. **Testability:** Test components in isolation
4. **Collaboration:** Different developers work on different components
5. **Code Organization:** Logical separation of concerns

**Q23: Explain the subscription lifecycle.**
**A:**

1. **No subscription** → User on free plan
2. **Trial** → User starts trial (if offered)
3. **Active** → User paying, full access
4. **Past Due** → Payment failed, retry in progress
5. **Paused** → Temporarily suspended
6. **Canceled** → User canceled, marked for end of period
7. **Deleted** → Subscription ended, back to free plan

### **Project-Specific Questions**

**Q24: Walk me through creating a video project in your app.**
**A:**

1. User logs into dashboard
2. Checks current plan allows more videos
3. Clicks "Upload Video" or "Use Template"
4. Uploads video file
5. Selects AI style transfer effect
6. Processes video (AI backend)
7. Previews result
8. Downloads or publishes
9. Usage counter increments
10. If limit reached, prompts to upgrade

**Q25: How does organization management work?**
**A:**

1. User creates organization
2. Gets owner role automatically
3. Invites members by email
4. Invitation email sent
5. Recipient accepts/rejects
6. Owner assigns roles (member, admin)
7. Members collaborate on projects
8. Owner can remove members

**Roles:**

- **Owner:** Full control, cannot be removed
- **Admin:** Manage members, projects
- **Member:** View/edit projects only

**Q26: What happens if payment fails?**
**A:**

1. Stripe attempts payment
2. Payment fails (insufficient funds, expired card, etc.)
3. Stripe sends webhook: `invoice.payment_failed`
4. We update subscription status to "past_due"
5. User receives email notification
6. Stripe retries payment (3 attempts over 2 weeks)
7. If all fail, subscription canceled
8. User downgraded to free plan

**Q27: How do you ensure data security for payments?**
**A:**

1. **Never store card details:** Stripe handles all payment info
2. **Webhook signature verification:** Prevents fake events
3. **HTTPS only:** Encrypted communication
4. **Environment variables:** API keys not in code
5. **PCI compliance:** Stripe is PCI-certified
6. **Customer IDs:** Only store Stripe customer/subscription IDs

**Q28: What optimizations did you implement?**
**A:**

1. **Image optimization:** WebP format, lazy loading
2. **Route prefetching:** Load pages before click
3. **Code splitting:** Load only needed JS per page
4. **Font optimization:** Display swap prevents layout shift
5. **Caching:** Static pages cached for 1 hour
6. **Turbopack:** 700x faster dev builds
7. **Loading states:** Show skeleton while fetching data
8. **Error boundaries:** Graceful error handling

**Q29: How do you track video usage limits?**
**A:**

1. Each subscription has a plan with `videoLimit`
2. `usage` table tracks `videosCreated` per billing period
3. Before creating video, check current count
4. If at limit, show upgrade prompt
5. After creating video, increment counter
6. On period reset (monthly/yearly), counter resets to 0

**Code:**

```typescript
canCreateVideo(userId) {
  const usage = getUserUsage(userId);
  const plan = getUserPlan(userId);

  if (plan.videoLimit === null) return true; // Unlimited
  return usage.videosCreated < plan.videoLimit;
}
```

**Q30: What would you improve in future versions?**
**A:**

1. **Real-time collaboration:** Multiple users edit same video
2. **AI improvements:** More style transfer options
3. **Mobile app:** React Native version
4. **API access:** Allow developers to integrate
5. **Analytics:** Advanced usage analytics
6. **CDN integration:** Faster video delivery
7. **Multi-language support:** Internationalization
8. **Social sharing:** Direct share to YouTube, TikTok
9. **Video templates marketplace:** Users sell templates
10. **Team workspaces:** Better collaboration features

---

## 📝 Quick Reference: Important Code Snippets

### **1. Checking if User is Authenticated**

```typescript
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```

### **2. Checking if User is Admin**

```typescript
import { checkIsAdmin } from "@/server/permissions";

const isAdmin = await checkIsAdmin();
if (!isAdmin) redirect("/dashboard");
```

### **3. Getting User Subscription**

```typescript
import { getUserSubscription } from "@/server/subscriptions";

const subscription = await getUserSubscription(userId);
```

### **4. Creating Stripe Checkout Session**

```typescript
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
});
```

### **5. Handling Stripe Webhook**

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

if (event.type === "checkout.session.completed") {
  // Create subscription in database
}
```

---

## 🎯 Key Takeaways for Viva

1. **Know your stack:** Explain why each technology was chosen
2. **Understand the flow:** Be able to explain end-to-end flows (signup, checkout, etc.)
3. **Database relationships:** Know how tables connect
4. **Security first:** Explain security measures implemented
5. **Performance matters:** Discuss optimizations made
6. **Real-world scenarios:** Be prepared for "what if" questions
7. **Trade-offs:** Understand pros/cons of your choices
8. **Future improvements:** Show you're thinking ahead
9. **Code ownership:** Be able to explain any line of code
10. **Confidence:** You built this, you know it!

---

## 🚀 Final Tips

✅ **Practice explaining without looking at code**  
✅ **Draw diagrams for complex flows**  
✅ **Use real-world analogies**  
✅ **Be honest if you don't know something**  
✅ **Show enthusiasm for your project**  
✅ **Relate to industry standards**  
✅ **Prepare for live demo**  
✅ **Test everything before viva**

**Good luck! You've got this! 🎉**
