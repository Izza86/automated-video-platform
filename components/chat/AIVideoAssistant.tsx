"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Loader2,
  Home,
  Users,
  FolderOpen,
  BarChart3,
  CreditCard,
  Settings,
  MessageSquare,
  HelpCircle,
  Video,
  Upload,
  Wand2,
  Activity,
  Shield,
  FileText,
  Bell,
  Lock,
  Plus,
  FolderHeart,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname } from "next/navigation";

// Types for messages
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "success" | "error" | "info";
}

// Props
interface AIVideoAssistantProps {
  mode?: "floating" | "sidebar";
}

// All Dashboard Routes with descriptions
interface RouteInfo {
  path: string;
  name: string;
  icon: React.ElementType;
  keywords: string[];
  description: string;
  features: string[];
  requiresAuth: boolean;
}

const routes: RouteInfo[] = [
  { 
    path: "/dashboard", 
    name: "Dashboard", 
    icon: Home,
    keywords: ["dashboard", "home", "main", "overview"],
    description: "Aapka personal dashboard jahan aapki sab projects, stats aur recent activity dikhayi deti hai.",
    features: [
      "📊 Apki video editing stats dekho",
      "🎬 Recent projects ka quick access",
      "⚡ Quick actions: Upload, Templates, Create New",
      "📈 Weekly/Monthly activity summary",
      "🔔 Latest notifications"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/templates", 
    name: "Templates", 
    icon: FolderOpen,
    keywords: ["template", "templates", "preset", "effect", "filter", "style", "video style"],
    description: "Pre-made AI video effects aur templates jinhe aap apni videos par apply kar sakte hain.",
    features: [
      "🎨 50+ Ready-made AI templates",
      "🔥 Trending aur New templates",
      "🎵 Music ke saath synced effects",
      "👁️ Preview before applying",
      "⚡ One-click apply to your video",
      "🎯 Categories: Cinematic, Vlog, Music, Social"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/upload-edit", 
    name: "Upload & Edit", 
    icon: Upload,
    keywords: ["upload", "edit", "video edit", "create", "new video", "editor"],
    description: "Apni videos upload karo aur AI-powered editor se professional editing karo.",
    features: [
      "📤 Drag & drop video upload (500MB max)",
      "✂️ AI Smart Cut & Trim",
      "🎨 Auto color correction",
      "🎵 Background music add karo",
      "📝 Subtitles aur text overlays",
      "💾 Multiple formats mein export"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/my-projects", 
    name: "My Projects", 
    icon: FolderHeart,
    keywords: ["project", "projects", "my videos", "saved", "work"],
    description: "Aapke saare saved projects aur edited videos ka collection.",
    features: [
      "📁 Saare projects organized view",
      "🔍 Search aur filter projects",
      "✏️ Projects re-edit karo",
      "💾 Export history dekho",
      "🗑️ Delete aur restore projects",
      "📊 Project status: Draft, Processing, Done"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/activity", 
    name: "Activity Log", 
    icon: Activity,
    keywords: ["activity", "log", "history", "actions", "recent"],
    description: "Aapke account ki poori activity history - kya kiya, kab kiya.",
    features: [
      "📋 Detailed activity timeline",
      "🔍 Filter by date aur type",
      "📊 Activity stats: Today, Week, Month",
      "🎬 Video uploads history",
      "⚡ Processing activities",
      "👤 User actions tracking"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/billing", 
    name: "Billing", 
    icon: CreditCard,
    keywords: ["billing", "payment", "subscription", "plan", "price", "invoice"],
    description: "Aapki subscription details, payments aur billing history manage karo.",
    features: [
      "💳 Current plan details",
      "📜 Payment history aur invoices",
      "⬆️ Upgrade/Downgrade plans",
      "🎁 Available offers aur discounts",
      "💰 Usage based charges",
      "🔔 Billing notifications"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/settings", 
    name: "Settings", 
    icon: Settings,
    keywords: ["setting", "settings", "preferences", "config", "options"],
    description: "Account settings, notifications aur app preferences customize karo.",
    features: [
      "👤 Profile information edit",
      "🔐 Password change",
      "📧 Email preferences",
      "🔔 Notification settings",
      "🌙 Theme: Dark/Light mode",
      "🗑️ Account deletion"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/help", 
    name: "Help & Support", 
    icon: HelpCircle,
    keywords: ["help", "support", "faq", "question", "problem", "issue"],
    description: "Help center, FAQs aur support tickets ka access.",
    features: [
      "📚 Detailed documentation",
      "❓ Frequently Asked Questions",
      "🎓 Video tutorials",
      "🎫 Support ticket create karo",
      "💬 Live chat support",
      "📧 Email support access"
    ],
    requiresAuth: true
  },
  // Admin Routes
  { 
    path: "/dashboard/admin/users", 
    name: "User Management", 
    icon: Users,
    keywords: ["user", "users", "member", "members", "admin users"],
    description: "Admin: Saare users manage karo - view, edit, delete, roles assign karo.",
    features: [
      "👥 All users list with details",
      "🔍 Search users by name/email",
      "⚡ Role assign: Admin/User",
      "✏️ User details edit",
      "🚫 Suspend/Activate accounts",
      "📊 User statistics"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/analytics", 
    name: "Analytics", 
    icon: BarChart3,
    keywords: ["analytics", "report", "stats", "statistics", "insights"],
    description: "Admin: Platform ki complete analytics - users, videos, revenue sab kuch.",
    features: [
      "📈 User growth charts",
      "🎬 Videos processed stats",
      "💰 Revenue reports",
      "📊 Engagement metrics",
      "⏰ Real-time dashboard",
      "📅 Date range filtering"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/support", 
    name: "Support Tickets", 
    icon: MessageSquare,
    keywords: ["support", "ticket", "tickets", "complaint", "issue"],
    description: "Admin: User ki support tickets manage karo aur resolve karo.",
    features: [
      "🎫 All tickets dashboard",
      "📊 Ticket stats: Open, Pending, Resolved",
      "🏷️ Priority levels: Low, Medium, High, Urgent",
      "💬 Ticket conversations",
      "✅ Mark as resolved",
      "⏰ Response time tracking"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/content", 
    name: "Content Moderation", 
    icon: Shield,
    keywords: ["content", "moderation", "review", "approve", "content mod"],
    description: "Admin: User generated content review aur moderate karo.",
    features: [
      "👀 Review pending content",
      "✅ Approve/Reject content",
      "🚫 Flag inappropriate content",
      "📊 Content statistics",
      "🔍 Search content",
      "⚡ Bulk actions"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/quotas", 
    name: "Quotas Management", 
    icon: Zap,
    keywords: ["quota", "quotas", "limits", "storage", "usage"],
    description: "Admin: User storage limits aur processing quotas manage karo.",
    features: [
      "💾 Storage usage overview",
      "⚡ Processing limits",
      "📊 Usage by user",
      "⬆️ Upgrade quotas",
      "🔄 Reset monthly quotas",
      "📈 Usage trends"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/roles", 
    name: "Roles & Permissions", 
    icon: Lock,
    keywords: ["role", "roles", "permission", "permissions", "access"],
    description: "Admin: User roles aur permissions configure karo.",
    features: [
      "👤 Role management",
      "🔐 Permission settings",
      "📝 Custom roles create",
      "📊 Role assignments",
      "⚡ Bulk role updates",
      "🔍 Role audit log"
    ],
    requiresAuth: true
  },
  { 
    path: "/dashboard/admin/billing", 
    name: "Admin Billing", 
    icon: CreditCard,
    keywords: ["admin billing", "revenue", "payments", "transactions"],
    description: "Admin: Platform ki billing aur revenue management.",
    features: [
      "💰 Revenue dashboard",
      "💳 All transactions",
      "📊 Subscription stats",
      "🎁 Promo codes management",
      "💸 Refunds processing",
      "📈 Financial reports"
    ],
    requiresAuth: true
  },
];

export default function AIVideoAssistant({ 
  mode = "floating"
}: AIVideoAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is on landing page
  const isLandingPage = pathname === "/" || pathname === "/landing" || pathname === "/home" || !pathname?.includes("/dashboard");

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message based on current page
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      if (isLandingPage) {
        setMessages([{
          id: "welcome",
          text: `👋 **Welcome to AI Video Editor!**

Main aapki **madad** kar sakta hoon. 

⚠️ **Note:** Aap abhi **Landing Page** par hain. Dashboard features use karne ke liye pehle **Login** ya **Signup** karna hoga.

🔐 **Account Options:**
• "Login karo" - Existing user
• "Signup karo" - New account banayein
• "Pricing dekhao" - Plans aur pricing

❓ **Help:**
• "Features kya hain?" - App features
• "Kaam kaise karta?" - How it works

**Kya karna chahate hain?**`,
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        }]);
      } else {
        setMessages([{
          id: "welcome",
          text: `👋 **Welcome to AI Assistant!**

Main aapki **navigation** aur **help** kar sakta hoon:

🧭 **Page Navigation:**
• "Templates par le jao" - AI video templates
• "Upload & Edit kholo" - Video editor
• "My Projects dikhao" - Saved videos
• "Activity log dekho" - Your history
• "Billing page" - Subscription & payments

🎬 **Video Editing:**
• "Video kaise edit karun?" - Step-by-step guide
• "Templates kaise use karun?" - Template guide
• "Upload kaise karun?" - Upload guide

**Kahan jaana hai ya kya karna hai?**`,
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        }]);
      }
    }
  }, [isOpen, messages.length, isLandingPage]);

  // Landing page restriction check
  const checkLandingPageRestriction = (targetPath: string): { blocked: boolean; response?: Message } => {
    if (isLandingPage && targetPath.includes("/dashboard")) {
      return {
        blocked: true,
        response: {
          id: Date.now().toString(),
          text: `🔒 **Login Required!**

Aap **${targetPath}** par jana chahte hain, lekin pehle aapko **Login** ya **Signup** karna hoga.

🔐 **Options:**
• **Login** - Agar aapka account already hai
• **Signup** - Naya account banayein

🎁 **Signup par free trial milta hai!**

Kya karna chahate hain?`,
          sender: "bot",
          timestamp: new Date(),
          type: "error"
        }
      };
    }
    return { blocked: false };
  };

  // Get detailed page guide
  const getPageGuide = (route: RouteInfo): string => {
    return `📍 **${route.name}** - Complete Guide

${route.description}

✨ **Yahan aap kya kar sakte hain:**
${route.features.map(f => `• ${f}`).join('\n')}

🚀 **Kaise jayein:**
Main aapko abhi ${route.name} par le ja sakta hoon. "Chalo ${route.name}" likhein.`;
  };

  // Video editing guide
  const getVideoEditingGuide = (): string => {
    return `🎬 **Video Editing Complete Guide**

**Step 1: Video Upload Karna**
1. "Upload & Edit" page par jayein
2. Apni video drag & drop karein ya select karein
3. Supported formats: MP4, MOV, AVI, WebM
4. Max size: 500MB

**Step 2: Templates Use Karna (Easy Way)**
1. "Templates" page par jayein
2. Pasand ka template choose karein (Cinematic, Vlog, Music, etc.)
3. Preview dekhein - video aur music ka
4. "Apply Template" button click karein
5. Apni video upload karein
6. AI automatically edit kar dega!

**Step 3: Manual Editing (Advanced)**
1. Upload & Edit page par jayein
2. Video upload karein
3. AI tools use karein:
   - ✂️ Smart Cut & Trim
   - 🎨 Auto Color Correction
   - 🎵 Add Background Music
   - 📝 Add Text & Subtitles
   - 🎬 Add Transitions
4. Export karein multiple formats mein

**Step 4: Projects Save Karna**
1. "My Projects" mein sab saved hai
2. Re-edit anytime
3. Download different qualities mein

❓ **Konsa tarika chahiye?**
• "Templates guide" - Ready-made effects
• "Manual edit guide" - Full control
• "Upload guide" - Sirf upload karna`;
  };

  // Navigation handler with detailed guides
  const handleNavigation = (message: string): { matched: boolean; response?: Message } => {
    const lowerMsg = message.toLowerCase();
    
    // Check for video editing guide requests
    if (lowerMsg.includes("video edit") || lowerMsg.includes("kaise edit") || lowerMsg.includes("editing guide") || 
        (lowerMsg.includes("step") && lowerMsg.includes("edit"))) {
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: getVideoEditingGuide(),
          sender: "bot",
          timestamp: new Date(),
          type: "info"
        }
      };
    }

    // Check for template guide
    if (lowerMsg.includes("template guide") || (lowerMsg.includes("template") && lowerMsg.includes("kaise use"))) {
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: `🎨 **Templates Use Karna - Step by Step**

**Step 1: Browse Templates**
1. "Templates" page par jayein
2. Categories dekhein: Trending, New, Cinematic, Vlog, Music, Social
3. 3D carousel mein templates swipe karein

**Step 2: Preview Karna**
1. Kisi template par click karein
2. Video preview automatically play hoga
3. Music bhi sun sakte hain (play button)
4. Effect details padhein

**Step 3: Template Apply Karna**
1. "Apply Template" button click karein
2. Modal open hoga with 2 steps:
   - Step 1: Apni video upload karein
   - Step 2: "Apply with AI" button click
3. AI processing hoga (thodi der wait karein)
4. Processed video download karein!

**💡 Pro Tips:**
• Trending templates popular hain
• Music synced effects best results dete hain
• Pehle preview zaroor dekhein
• 50+ templates available hain

**Try karna chahate hain?** "Templates page le jao" likhein.`,
          sender: "bot",
          timestamp: new Date(),
          type: "info"
        }
      };
    }

    // Check for upload guide
    if (lowerMsg.includes("upload guide") || (lowerMsg.includes("upload") && lowerMsg.includes("kaise"))) {
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: `📤 **Video Upload Guide**

**Method 1: Upload & Edit Page**
1. "Upload & Edit" par jayein
2. Video drag & drop karein box mein
3. Ya "Select Video" se browse karein
4. 500MB tak ki video allowed

**Method 2: Templates ke saath**
1. Template choose karein
2. "Apply" button click
3. Direct upload option milega
4. Processing automatic start hogi

**Supported Formats:**
• MP4 (Best)
• MOV (Apple)
• AVI (Windows)
• WebM (Web)

**Requirements:**
• Max: 500MB per video
• Min resolution: 480p
• Max resolution: 4K
• Audio: AAC, MP3 supported

**After Upload:**
• AI auto-analyze karega
• Edit tools available honge
• Save as draft ya process immediately

Ready? "Upload & Edit page" likhein.`,
          sender: "bot",
          timestamp: new Date(),
          type: "info"
        }
      };
    }

    // Check for login/signup on landing page
    if (isLandingPage && (lowerMsg.includes("login") || lowerMsg.includes("signin") || lowerMsg.includes("log in"))) {
      router.push("/login");
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: `🔐 **Login Page** par le ja raha hoon...

Enter your email and password to access your account.`,
          sender: "bot",
          timestamp: new Date(),
          type: "success"
        }
      };
    }

    if (isLandingPage && (lowerMsg.includes("signup") || lowerMsg.includes("sign up") || lowerMsg.includes("register") || lowerMsg.includes("account banao"))) {
      router.push("/signup");
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: `📝 **Signup Page** par le ja raha hoon...

New account banayein aur **free trial** shuru karein!`,
          sender: "bot",
          timestamp: new Date(),
          type: "success"
        }
      };
    }

    if (isLandingPage && (lowerMsg.includes("pricing") || lowerMsg.includes("plan") || lowerMsg.includes("price"))) {
      router.push("/pricing");
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: `💰 **Pricing Page** par le ja raha hoon...

Dekhein hamare affordable plans aur features!`,
          sender: "bot",
          timestamp: new Date(),
          type: "success"
        }
      };
    }
    
    // Check for analytics FIRST (before generic dashboard)
    if (lowerMsg.includes("analytics") || lowerMsg.includes("report") || lowerMsg.includes("stats")) {
      const analyticsRoute = routes.find(r => r.path === "/dashboard/admin/analytics");
      if (analyticsRoute) {
        const restriction = checkLandingPageRestriction(analyticsRoute.path);
        if (restriction.blocked) {
          return { matched: true, response: restriction.response };
        }
        if (lowerMsg.includes("kya hai") || lowerMsg.includes("detail") || lowerMsg.includes("guide") || 
            lowerMsg.includes("features") || lowerMsg.includes("kya kar") || lowerMsg.includes("about")) {
          return {
            matched: true,
            response: {
              id: Date.now().toString(),
              text: getPageGuide(analyticsRoute),
              sender: "bot",
              timestamp: new Date(),
              type: "info"
            }
          };
        }
        router.push(analyticsRoute.path);
        return {
          matched: true,
          response: {
            id: Date.now().toString(),
            text: `✅ **${analyticsRoute.name}** par le ja raha hoon...\n\n${analyticsRoute.description}\n\n🎯 Key Features:\n${analyticsRoute.features.slice(0, 3).map(f => f).join('\n')}`,
            sender: "bot",
            timestamp: new Date(),
            type: "success"
          }
        };
      }
    }

    // Direct path matches with landing page check
    // Filter routes to avoid duplicate analytics check
    const nonAnalyticsRoutes = routes.filter(r => r.path !== "/dashboard/admin/analytics");
    for (const route of nonAnalyticsRoutes) {
      const isMatch = route.keywords.some(keyword => lowerMsg.includes(keyword));
      
      if (isMatch) {
        // Check landing page restriction
        const restriction = checkLandingPageRestriction(route.path);
        if (restriction.blocked) {
          return { matched: true, response: restriction.response };
        }

        // Check if user wants detailed info about the page
        if (lowerMsg.includes("kya hai") || lowerMsg.includes("detail") || lowerMsg.includes("guide") || 
            lowerMsg.includes("features") || lowerMsg.includes("kya kar") || lowerMsg.includes("about")) {
          return {
            matched: true,
            response: {
              id: Date.now().toString(),
              text: getPageGuide(route),
              sender: "bot",
              timestamp: new Date(),
              type: "info"
            }
          };
        }

        // Navigate to the page
        router.push(route.path);
        return {
          matched: true,
          response: {
            id: Date.now().toString(),
            text: `✅ **${route.name}** par le ja raha hoon...\n\n${route.description}\n\n🎯 Key Features:\n${route.features.slice(0, 3).map(f => f).join('\n')}`,
            sender: "bot",
            timestamp: new Date(),
            type: "success"
          }
        };
      }
    }

    // Generic dashboard navigation
    if (lowerMsg.includes("dashboard") || lowerMsg.includes("home") || lowerMsg.includes("main page")) {
      const restriction = checkLandingPageRestriction("/dashboard");
      if (restriction.blocked) {
        return { matched: true, response: restriction.response };
      }
      router.push("/dashboard");
      return {
        matched: true,
        response: {
          id: Date.now().toString(),
          text: "🏠 **Dashboard** par le ja raha hoon...\n\nApka personal dashboard jahan aapki projects, stats aur activity overview dikhta hai.",
          sender: "bot",
          timestamp: new Date(),
          type: "success"
        }
      };
    }

    return { matched: false };
  };

  // Main processing function
  const processMessage = async (userMessage: string): Promise<Message> => {
    const lowerMsg = userMessage.toLowerCase();
    
    // Check navigation first
    const navResult = handleNavigation(userMessage);
    if (navResult.matched && navResult.response) {
      return navResult.response;
    }

    // Landing page specific help
    if (isLandingPage && (lowerMsg.includes("feature") || lowerMsg.includes("kaam karta") || lowerMsg.includes("kya hai"))) {
      return {
        id: Date.now().toString(),
        text: `🎯 **AI Video Editor Features**

🎬 **Core Features:**
• **50+ AI Templates** - Ready-made professional effects
• **Auto Video Editing** - AI automatically edit karti hai
• **Music Sync** - Effects beat ke saath sync hote hain
• **Smart Upload** - Drag & drop, 500MB max
• **Multiple Formats** - MP4, MOV, AVI, WebM

✨ **AI Tools:**
• Auto Cut & Trim
• Color Correction
• Background Music Add
• Text & Subtitles
• Smooth Transitions

💾 **Storage & Export:**
• Cloud save projects
• HD & 4K export
• Multiple quality options
• Direct download

🔐 **Account Features:**
• Free trial available
• Subscription plans
• Usage analytics
• Activity tracking

Ready to start? **"Signup karo"** ya **"Login karo"**`,
        sender: "bot",
        timestamp: new Date(),
        type: "info"
      };
    }

    // List all pages
    if (lowerMsg.includes("list") || lowerMsg.includes("sab pages") || lowerMsg.includes("all pages") || lowerMsg.includes("konsa page")) {
      if (isLandingPage) {
        return {
          id: Date.now().toString(),
          text: `📋 **Available Pages (Login Required):**

🎬 **Video Editing:**
• Templates - AI effects library
• Upload & Edit - Video editor
• My Projects - Saved videos

👤 **Account:**
• Dashboard - Overview & stats
• Activity Log - Your history
• Billing - Payments & plans
• Settings - Preferences

🔒 **Login karne ke baad ye sab access milega!**

**Abhi karna:** "Login" ya "Signup"`,
          sender: "bot",
          timestamp: new Date(),
          type: "info"
        };
      } else {
        const userRoutes = routes.filter(r => !r.path.includes("/admin/"));
        return {
          id: Date.now().toString(),
          text: `📋 **Available Pages:**

🎬 **Video Editing:**
${userRoutes.filter(r => r.path.includes("template") || r.path.includes("upload") || r.path.includes("project")).map(r => `• **${r.name}** - ${r.keywords.slice(0, 2).join(", ")}`).join('\n')}

👤 **Account:**
${userRoutes.filter(r => r.path.includes("dashboard") && !r.path.includes("/admin/")).map(r => `• **${r.name}** - ${r.keywords.slice(0, 2).join(", ")}`).join('\n')}

❓ **Detailed info ke liye:**
"[Page name] kya hai?" - jaise "Templates kya hai?"`,
          sender: "bot",
          timestamp: new Date(),
          type: "info"
        };
      }
    }

    // Help response
    if (lowerMsg.includes("help") || lowerMsg.includes("kya kar sakte") || lowerMsg.includes("madad")) {
      if (isLandingPage) {
        return {
          id: Date.now().toString(),
          text: `🤖 **Main aapki help kar sakta hoon:**

🔐 **Account:**
• "Login" - Existing account access
• "Signup" - New account + free trial
• "Pricing" - Plans dekhna

❓ **Info:**
• "Features kya hain?" - App features
• "List pages" - Sab pages ki list

**Login ke baad main:**
• Kisi bhi page par navigate kar sakta hoon
• Video editing guide de sakta hoon
• Har page ki details bata sakta hoon

**Ready?** "Signup karo"`,
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        };
      }
      return {
        id: Date.now().toString(),
        text: `🤖 **Main aapki help kar sakta hoon:**

🧭 **Navigation:**
• Kisi bhi page par le ja sakta hoon
• "Templates par le jao" - Direct redirect
• "Activity log kholo" - Specific page

📚 **Guides:**
• "Video kaise edit karun?" - Full tutorial
• "Templates guide" - Template use karna
• "Upload guide" - Video upload karna

❓ **Page Info:**
• "[Page] kya hai?" - Full details
• "[Page] features" - Features list
• Example: "Billing kya hai?"

**Kya chahiye?**`,
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
    }

    // Default response
    if (isLandingPage) {
      return {
        id: Date.now().toString(),
        text: `🤔 Samajh nahi aaya... 

🔐 **Aap abhi Landing Page par hain.**
Dashboard pages access karne ke liye:
• **"Login"** - Existing user
• **"Signup"** - New account

❓ **Ya pooch sakte hain:**
• "Features kya hain?" - App info
• "Pricing" - Plans dekhna
• "Help" - Assistant ki capabilities

**Kya karna chahate hain?**`,
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
    }
    
    return {
      id: Date.now().toString(),
      text: `🤔 Samajh nahi aaya... 

**Try karein:**
• "Templates par le jao" - Navigate
• "Video kaise edit karun?" - Guide
• "Activity kya hai?" - Page info
• "List pages" - Sab pages dekho
• "Help" - Capabilities

**Kya chahiye?**`,
      sender: "bot",
      timestamp: new Date(),
      type: "text"
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Small delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const botResponse = await processMessage(input);
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message) => {
    const isBot = message.sender === "bot";
    
    return (
      <div
        key={message.id}
        className={`flex ${isBot ? "justify-start" : "justify-end"} mb-4`}
      >
        <div
          className={`max-w-[90%] rounded-2xl p-4 ${
            isBot
              ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border border-slate-700/50 shadow-lg"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {isBot && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            {!isBot && (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>
              <span className="text-[10px] text-slate-400 mt-2 block opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (mode === "floating") {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          // Floating Button with Glow Animation
          <div className="relative group">
            {/* Animated Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-spin-slow blur-md opacity-40" style={{ animationDuration: '3s' }} />
            
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="relative rounded-full w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-2xl shadow-purple-500/40 transition-all duration-300 hover:scale-110 hover:shadow-purple-500/60 border-2 border-white/20"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </Button>
            
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-slate-700">
                AI Assistant
              </div>
            </div>
          </div>
        ) : (
          // Chat Window - Bigger, Better Styled
          <div className="relative">
            {/* Outer Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-3xl blur-lg opacity-30 animate-pulse" />
            
            <div className="relative w-[420px] h-[580px] rounded-3xl shadow-2xl border border-purple-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white p-5 relative overflow-hidden">
                {/* Header Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg">AI Assistant</span>
                      <p className="text-xs text-white/80">Navigation & Help</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-10 w-10 p-0 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map(renderMessage)}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700/50 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <span className="text-sm text-slate-400">Soch raha hoon...</span>
                        <div className="flex gap-1">
                          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" />
                          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Quick Navigation Buttons */}
              <div className="px-5 py-3 border-t border-slate-800/50 bg-slate-900/30">
                <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wider font-medium">
                  {isLandingPage ? "🔐 Login Required" : "⚡ Quick Navigation"}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {routes.slice(0, 4).map((route) => (
                    <button
                      key={route.path}
                      onClick={() => {
                        router.push(route.path);
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          text: `✅ **${route.name}** par le ja raha hoon...`,
                          sender: "bot",
                          timestamp: new Date(),
                          type: "success"
                        }]);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-purple-600/30 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white transition-all duration-200"
                    >
                      {route.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Input Area */}
              <div className="p-5 border-t border-slate-800/50 bg-slate-900/50">
                <div className="flex gap-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Kahan jaana hai? Type karein..."
                    className="flex-1 h-12 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <Button 
                    size="icon"
                    onClick={handleSend} 
                    disabled={!input.trim() || isTyping}
                    className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Try: &quot;Dashboard&quot;, &quot;Templates&quot;, &quot;User Management&quot;
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
