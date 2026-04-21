# 🚀 Automated Video Editor - Friend Setup Guide (VS Code)

## 📁 **Repo Link**
```
https://github.com/Izza86/automated-video-platform.git
```

## ✅ **Prerequisites (5 min)**
| Tool | Version | Windows Install |
|------|---------|-----------------|
| **Node.js** | 20+ | [Download LTS](https://nodejs.org) |
| **Git** | Latest | `winget install Git.Git` |
| **Python** | 3.10+ | [Download](https://python.org) |
| **FFmpeg** | 6+ | `winget install ffmpeg` OR [Gyan.dev build](https://www.gyan.dev/ffmpeg/builds/) |
| **VS Code** | Latest | [Download](https://code.visualstudio.com) |

**Verify:**
```bash
node --version   # v20.x.x
git --version    # git version 2.x
python --version # Python 3.10+
ffmpeg -version  # ffmpeg version 6.x
```

## 🧹 **Step 1: Clone (1 min)**
```bash
git clone https://github.com/Izza86/automated-video-platform.git
cd automated-video-platform
code .  # Opens in VS Code
```

## 📦 **Step 2: Install Dependencies (3 min)**
```bash
# Node.js packages
pnpm install

# Python ML packages  
pip install -r requirements.txt
```

## 🔑 **Step 3: Environment (.env) (2 min)**
```bash
cp env.example .env
```
**Edit `.env` (VS Code):**
```
# Database (Free Neon account needed)
DATABASE_URL=postgresql://...

# Auth (Generate secret)
BETTER_AUTH_SECRET=your-32-char-secret

# Stripe (Test keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Google OAuth
GOOGLE_CLIENT_ID=...
```

**Free DB:** [Neon.tech](https://neon.tech) → New project → Copy connection string.

## 🗄️ **Step 4: Database Setup (1 min)**
```bash
pnpm db:push     # Create tables
pnpm db:studio   # Verify schema (optional)
node scripts/create-first-admin.js  # Admin user
```

## ▶️ **Step 5: Run Project (30 sec)**
```bash
pnpm dev
```
**Open:** http://localhost:3000

## 🧪 **Test Flow**
1. **Signup** → Verify email (console log)
2. **Dashboard** → Admin panel (users table)
3. **Upload/Edit** → Test AI pipeline
4. **Billing** → Stripe test mode

## 🔧 **Troubleshooting**
| Issue | Fix |
|-------|-----|
| `FFmpeg not found` | `winget install ffmpeg` |
| `pnpm not found` | `npm i -g pnpm` |
| `DB connection` | Check `DATABASE_URL` format |
| `Python ML fails` | `pip install opencv-python numpy scikit-image` |
| `Port 3000 busy` | `pnpm dev --port 3001` |

## 🎉 **Success Indicators**
```
✅ Dev server: http://localhost:3000
✅ DB connected: Tables in Drizzle Studio
✅ Admin user created
✅ /api/healthcheck → 200 OK
✅ Login/Signup works
```

**Total Time:** ~10 minutes  
**Share this guide with your friend!** 📱
