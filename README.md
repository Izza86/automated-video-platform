# Automated Video Editor — AI-Powered Video Style Transfer Platform

> **AI-powered video editing platform** that clones any reference video's style — color grade, speed ramps, transitions, beat-synced cuts — onto your target footage in one click.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5.9
- **Auth:** Better Auth + Google OAuth
- **Database:** Neon (PostgreSQL) + Drizzle ORM
- **Styling:** Tailwind CSS 4
- **Payments:** Stripe
- **AI/ML:** Python scripts (FFmpeg, shot detection, beat detection, depth analysis, color transfer)
- **Email:** Resend + React Email

---

## 🚀 Getting Started (For Fellow Developers)

### Prerequisites

| Tool        | Version | Install                                                        |
| ----------- | ------- | -------------------------------------------------------------- |
| **Node.js** | 20+     | [nodejs.org](https://nodejs.org)                               |
| **pnpm**    | 9+      | `npm install -g pnpm`                                          |
| **Python**  | 3.10+   | [python.org](https://python.org)                               |
| **FFmpeg**  | 6+      | `choco install ffmpeg` (Windows) / `brew install ffmpeg` (Mac) |
| **Git**     | Latest  | [git-scm.com](https://git-scm.com)                             |

### 1. Clone the Repository

```bash
git clone https://github.com/Izza86/automated-video-platform.git
cd automated-video-platform
```

### 2. Install Dependencies

```bash
# Install Node.js packages
pnpm install

# Install Python dependencies (for AI/ML scripts)
pip install -r requirements.txt
```

### 3. Environment Variables

Copy the example env file and fill in your keys:

```bash
cp env.example .env
```

Required variables in `.env`:

```bash
# Auth
BETTER_AUTH_SECRET="generate-a-random-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Google OAuth (optional, for Google Sign-In)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe (optional, for payments)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (optional, for password reset emails)
RESEND_API_KEY="re_..."
```

### 4. Database Setup

```bash
# Push database schema to Neon
pnpm db:push

# (Optional) Seed subscription plans
pnpm db:seed

# (Optional) Open Drizzle Studio to inspect database
pnpm db:studio
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Production Build (Full Precompile Mode)

For maximum speed, use the one-command precompile + serve:

```bash
pnpm fast-server
```

This runs `pnpm build` (precompiles all routes) then `pnpm start` (serves instantly).

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (auth, video processing, Stripe)
│   ├── dashboard/          # Protected dashboard pages
│   ├── login/              # Login page with lamp animation
│   ├── signup/             # Signup page
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── forms/              # Auth forms (login, signup, reset)
│   ├── landing/            # Landing page sections
│   ├── login/              # Lamp animation + auth wrapper
│   └── ui/                 # Shadcn UI components
├── db/                     # Database schema + connection
├── lib/                    # Utilities (auth, stripe, utils)
├── scripts/                # Python ML scripts
│   ├── ml_beat_detection.py
│   ├── ml_color_transfer.py
│   ├── ml_depth_analysis.py
│   ├── ml_motion_analysis.py
│   └── ml_shot_detection.py
├── server/                 # Server-side logic
│   ├── analysis/           # Video analysis modules
│   ├── editor/             # Filter graph + video processing
│   ├── style/              # StyleDNA extraction + adaptation
│   └── types/              # TypeScript type definitions
└── proxy.ts                # Next.js 16 proxy (auth + security headers)
```

---

## 🛠️ Available Scripts

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Start dev server with Turbopack           |
| `pnpm build`       | Production build (precompiles all routes) |
| `pnpm start`       | Start production server                   |
| `pnpm fast-server` | Build + start in one command              |
| `pnpm lint`        | Run Biome linter                          |
| `pnpm lint:fix`    | Auto-fix lint issues                      |
| `pnpm format`      | Format code with Biome                    |
| `pnpm db:push`     | Push Drizzle schema to database           |
| `pnpm db:studio`   | Open Drizzle Studio GUI                   |
| `pnpm db:seed`     | Seed subscription plans                   |

---

## 🔑 First Admin Account

After setting up the database, create the first admin user:

```bash
node scripts/create-first-admin.js
```

Or sign up via the UI and then promote yourself using:

```bash
node check-user-role.js
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add your feature"`
3. Push to GitHub: `git push origin feature/your-feature`
4. Open a Pull Request

---

## 📝 License

This project is part of an academic Final Year Project (FYP).
