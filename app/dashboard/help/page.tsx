"use client";

import Link from "next/link";
import { ArrowLeft, HelpCircle, Book, MessageCircle, Mail, FileText, Video, Zap, Search, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I upload and edit videos?",
      answer: "Navigate to 'Upload & Edit' from the dashboard. Upload a reference video (the style you want) and a target video (the video to edit). Our AI will analyze the reference video and apply its editing style to your target video."
    },
    {
      question: "What video formats are supported?",
      answer: "We support most common video formats including MP4, MOV, AVI, and WebM. For best results, we recommend using MP4 format with H.264 encoding."
    },
    {
      question: "How long does video processing take?",
      answer: "Processing time depends on video length and complexity. Typically, a 2-minute video takes 3-5 minutes to process. You'll see real-time progress updates during processing."
    },
    {
      question: "Can I use templates instead of reference videos?",
      answer: "Yes! Browse our Templates section to find pre-made editing styles. Simply select a template and upload your target video to apply the style instantly."
    },
    {
      question: "What is the maximum video file size?",
      answer: "You can upload videos up to 1GB in size. For optimal performance, we recommend keeping videos under 500MB."
    },
    {
      question: "How do I download my edited videos?",
      answer: "After processing completes, you'll see a 'Download Edited Video' button. Click it to save the video to your device. All your projects are also saved in 'My Projects' for future access."
    },
    {
      question: "Can I edit videos on mobile devices?",
      answer: "Yes, our platform is fully responsive and works on mobile devices. However, for the best experience with large video files, we recommend using a desktop or tablet."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely! All video uploads are encrypted and processed securely. We don't store your videos permanently - they're deleted after processing unless you save them to your projects."
    }
  ];

  const quickLinks = [
    {
      title: "Getting Started Guide",
      description: "Learn the basics of video editing with our platform",
      icon: Book,
      color: "from-blue-600 to-cyan-600"
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step tutorial videos",
      icon: Video,
      color: "from-purple-600 to-pink-600"
    },
    {
      title: "Best Practices",
      description: "Tips for optimal video editing results",
      icon: Zap,
      color: "from-green-600 to-emerald-600"
    },
    {
      title: "Documentation",
      description: "Detailed technical documentation",
      icon: FileText,
      color: "from-orange-600 to-amber-600"
    }
  ];

  const contactOptions = [
    {
      title: "Email Support",
      description: "support@automatedvideoeditor.com",
      icon: Mail,
      action: "mailto:support@automatedvideoeditor.com"
    },
    {
      title: "Live Chat",
      description: "Available Mon-Fri, 9am-5pm EST",
      icon: MessageCircle,
      action: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                  <HelpCircle className="w-10 h-10 text-purple-400" />
                  Help & Support
                </h1>
                <p className="text-gray-400 mt-2">Find answers, tutorials, and get assistance</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help articles, tutorials, or FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Quick Links Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <button
                    key={index}
                    className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all group text-left"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{link.title}</h3>
                    <p className="text-sm text-gray-400">{link.description}</p>
                    <div className="flex items-center gap-1 text-purple-400 text-sm mt-3 group-hover:gap-2 transition-all">
                      Learn more <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all"
                  >
                    <span className="font-semibold text-white">{faq.question}</span>
                    <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform ${expandedFaq === index ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4 text-gray-400 border-t border-purple-500/20 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Contact Support</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <a
                    key={index}
                    href={option.action}
                    className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/30 transition-all">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                          {option.title}
                          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-sm text-gray-400">{option.description}</p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Additional Resources */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
            <p className="text-gray-400 mb-6">
              Our support team is here to help you with any questions or issues you may encounter. 
              We typically respond within 24 hours.
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
