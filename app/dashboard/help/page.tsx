"use client";

import {
  ArrowLeft,
  Book,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I upload and edit videos?",
      answer:
        "Navigate to 'Upload & Edit' from the dashboard. Upload a reference video (the style you want) and a target video (the video to edit). Our AI will analyze the reference video and apply its editing style to your target video.",
    },
    {
      question: "What video formats are supported?",
      answer:
        "We support most common video formats including MP4, MOV, AVI, and WebM. For best results, we recommend using MP4 format with H.264 encoding.",
    },
    {
      question: "How long does video processing take?",
      answer:
        "Processing time depends on video length and complexity. Typically, a 2-minute video takes 3-5 minutes to process. You'll see real-time progress updates during processing.",
    },
    {
      question: "Can I use templates instead of reference videos?",
      answer:
        "Yes! Browse our Templates section to find pre-made editing styles. Simply select a template and upload your target video to apply the style instantly.",
    },
    {
      question: "What is the maximum video file size?",
      answer:
        "You can upload videos up to 1GB in size. For optimal performance, we recommend keeping videos under 500MB.",
    },
    {
      question: "How do I download my edited videos?",
      answer:
        "After processing completes, you'll see a 'Download Edited Video' button. Click it to save the video to your device. All your projects are also saved in 'My Projects' for future access.",
    },
    {
      question: "Can I edit videos on mobile devices?",
      answer:
        "Yes, our platform is fully responsive and works on mobile devices. However, for the best experience with large video files, we recommend using a desktop or tablet.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely! All video uploads are encrypted and processed securely. We don't store your videos permanently - they're deleted after processing unless you save them to your projects.",
    },
  ];

  const quickLinks = [
    {
      title: "Upload & Edit",
      description: "Start editing videos with AI-powered tools",
      icon: Video,
      color: "from-blue-600 to-cyan-600",
      href: "/dashboard/upload-edit",
    },
    {
      title: "Templates",
      description: "Browse pre-made editing style templates",
      icon: Zap,
      color: "from-purple-600 to-pink-600",
      href: "/dashboard/templates",
    },
    {
      title: "My Projects",
      description: "View and manage your video projects",
      icon: FileText,
      color: "from-green-600 to-emerald-600",
      href: "/dashboard/my-projects",
    },
    {
      title: "Analytics",
      description: "Track your video creation stats",
      icon: Book,
      color: "from-orange-600 to-amber-600",
      href: "/dashboard/analytics",
    },
  ];

  const contactOptions = [
    {
      title: "Email Support",
      description: "support@automatedvideoeditor.com",
      icon: Mail,
      action: "mailto:support@automatedvideoeditor.com",
    },
    {
      title: "Live Chat",
      description: "Available Mon-Fri, 9am-5pm EST",
      icon: MessageCircle,
      action:
        "mailto:support@automatedvideoeditor.com?subject=Live%20Support%20Request",
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div>
            <Link
              className="group mb-6 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
              href="/dashboard"
            >
              <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="flex items-center gap-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-3xl text-transparent sm:text-4xl">
                  <HelpCircle className="h-10 w-10 text-purple-400" />
                  Help & Support
                </h1>
                <p className="mt-2 text-gray-400">
                  Find answers, tutorials, and get assistance
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-gray-400" />
              <input
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 py-3 pr-4 pl-12 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles, tutorials, or FAQs..."
                type="text"
                value={searchQuery}
              />
            </div>
          </div>

          {/* Quick Links Grid */}
          <div>
            <h2 className="mb-6 font-bold text-2xl">Quick Links</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Link
                    className="group rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 text-left transition-all hover:border-purple-500/60"
                    href={link.href}
                    key={index}
                  >
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-r ${link.color} mb-4 flex items-center justify-center transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mb-2 font-semibold text-white">
                      {link.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{link.description}</p>
                    <div className="mt-3 flex items-center gap-1 text-purple-400 text-sm transition-all group-hover:gap-2">
                      Learn more <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="mb-6 font-bold text-2xl">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs
                .filter(
                  (faq) =>
                    !searchQuery ||
                    faq.question
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((faq, index) => (
                  <div
                    className="overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]"
                    key={index}
                  >
                    <button
                      className="flex w-full items-center justify-between px-6 py-4 text-left transition-all hover:bg-white/5"
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                    >
                      <span className="font-semibold text-white">
                        {faq.question}
                      </span>
                      <ChevronRight
                        className={`h-5 w-5 text-purple-400 transition-transform ${expandedFaq === index ? "rotate-90" : ""}`}
                      />
                    </button>
                    {expandedFaq === index && (
                      <div className="border-purple-500/20 border-t px-6 pt-4 pb-4 text-gray-400">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Contact Support */}
          <div>
            <h2 className="mb-6 font-bold text-2xl">Contact Support</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {contactOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <a
                    className="group rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] p-6 transition-all hover:border-purple-500/60"
                    href={option.action}
                    key={index}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600/20 transition-all group-hover:bg-purple-600/30">
                        <Icon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 flex items-center gap-2 font-semibold text-white">
                          {option.title}
                          <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Additional Resources */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6 sm:p-8">
            <h2 className="mb-4 font-bold text-2xl">Need More Help?</h2>
            <p className="mb-6 text-gray-400">
              Our support team is here to help you with any questions or issues
              you may encounter. We typically respond within 24 hours.
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
