import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor - Automated Video Editor",
  description: "Open the AI video editor workspace",
};

export const dynamic = "force-static";

export default function EditorEntryPage() {
  return (
    <main className="min-h-screen bg-[#1a1408] text-white flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-2xl border border-purple-500/30 bg-black/30 p-8 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-purple-300 mb-3">Editor Workspace</h1>
        <p className="text-white/75 mb-6">
          Your full editor experience is available from the dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/upload-edit"
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 font-semibold hover:bg-purple-500 transition-colors"
          >
            Open Editor
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-purple-400/40 px-4 py-2 font-semibold text-purple-200 hover:bg-purple-900/30 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
