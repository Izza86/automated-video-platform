import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editor - Automated Video Editor",
  description: "Open the AI video editor workspace",
};

export const dynamic = "force-static";

export default function EditorEntryPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1408] px-6 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-purple-500/30 bg-black/30 p-8 backdrop-blur-sm">
        <h1 className="mb-3 font-bold text-3xl text-purple-300">
          Editor Workspace
        </h1>
        <p className="mb-6 text-white/75">
          Your full editor experience is available from the dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 font-semibold transition-colors hover:bg-purple-500"
            href="/dashboard/upload-edit"
          >
            Open Editor
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-purple-400/40 px-4 py-2 font-semibold text-purple-200 transition-colors hover:bg-purple-900/30"
            href="/login"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
