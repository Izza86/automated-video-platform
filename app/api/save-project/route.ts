import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { withDbRetry } from "@/db/drizzle";
import { project, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";

// ─────────────────────────────────────────────────────────────────────────────
// Background DB save — fire-and-forget.  Logs success/failure but never
// blocks the HTTP response.  Uses `withDbRetry` which auto-resets the pool
// on persistent connection failures (e.g. Neon cold-start / timeout).
// ─────────────────────────────────────────────────────────────────────────────
function saveToDbInBackground(
  userId: string,
  name: string,
  type: "template" | "reference-target",
  videoUrl: string,
  metadata: Record<string, unknown> | null
) {
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Fire-and-forget — do NOT await this at the call-site
  (async () => {
    try {
      // Ensure dev-guest user exists (FK constraint)
      if (userId === "dev-guest") {
        const existing = await withDbRetry(
          () =>
            db
              .select({ id: user.id })
              .from(user)
              .where(eq(user.id, "dev-guest"))
              .limit(1),
          "check-dev-guest"
        );
        if (existing.length === 0) {
          await withDbRetry(
            () =>
              db.insert(user).values({
                id: "dev-guest",
                name: "Dev Guest",
                email: "dev-guest@localhost",
                emailVerified: false,
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            "create-dev-guest"
          );
          console.log("[save-project/bg] Created dev-guest user.");
        }
      }

      await withDbRetry(
        () =>
          db.insert(project).values({
            id: projectId,
            userId,
            name,
            type,
            videoUrl,
            thumbnail: null,
            metadata: metadata ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        "insert-project"
      );
      console.log(`[save-project/bg] ✅ Saved to DB: ${projectId}`);
    } catch (err) {
      // After all retries exhausted — log but do NOT crash the server.
      // The user already has their video file in public/outputs/.
      console.error(
        "[save-project/bg] ❌ DB save failed after retries:",
        err instanceof Error ? err.message : err
      );
    }
  })();

  return projectId;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const session = await auth.api
      .getSession({ headers: request.headers })
      .catch((e) => {
        console.error("auth.api.getSession error", e);
        return null;
      });

    if (!(session && session.user)) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.warn(
        "No session found for /api/save-project; continuing in dev mode."
      );
    }

    const userId = session?.user?.id ?? "dev-guest";

    // ── Parse FormData ────────────────────────────────────────────────────
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Failed to parse form data." },
        { status: 400 }
      );
    }

    const videoFile = form.get("video") as File | null;
    const name = String(form.get("name") || "Untitled Project");
    const type = String(form.get("type") || "reference-target") as
      | "template"
      | "reference-target";
    const metadataField = form.get("metadata");
    const videoUrlOverride = form.get("videoUrlOverride") as string | null;

    let metadata: Record<string, unknown> | null = null;
    if (metadataField) {
      try {
        metadata = JSON.parse(String(metadataField));
      } catch {
        /* ignore */
      }
    }

    // ── Determine the video URL to store ──────────────────────────────────
    //    Priority: videoUrlOverride (already in public/outputs) > base64
    let videoUrlToStore = "";

    if (videoUrlOverride && videoUrlOverride.startsWith("/outputs/")) {
      // File already on disk in public/outputs — lightweight path
      videoUrlToStore = videoUrlOverride;
    } else if (videoFile && videoFile.size > 0) {
      // Convert to base64 data URL for DB storage
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      videoUrlToStore = `data:video/mp4;base64,${buffer.toString("base64")}`;
      console.log(
        `[save-project] Video size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`
      );
    }
    // else: analysis-only save — empty string

    // ══════════════════════════════════════════════════════════════════════
    //  DETACHED SAVE: Respond IMMEDIATELY, save to DB in background.
    //  The frontend gets the video URL right away — the DB write happens
    //  asynchronously with retry logic.  If it fails, the local file in
    //  public/outputs/ is still downloadable.
    // ══════════════════════════════════════════════════════════════════════
    const projectId = saveToDbInBackground(
      userId,
      name,
      type,
      videoUrlToStore,
      metadata
    );

    console.log(
      `[save-project] Responded immediately. Background save started: ${projectId}`
    );

    return NextResponse.json(
      {
        success: true,
        projectId,
        videoUrl: videoUrlOverride || undefined,
        message: "Video available. Saving to database in background.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[save-project] Error:", error);

    // ── ALWAYS return 200 with the local output info ──────────────────
    //    The video is already on disk — never throw a 500 that blocks
    //    the user from downloading their rendered output.
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        dbOffline: true,
        error:
          `Save failed: ${errMsg}. ` +
          "Your video was rendered and is available for download " +
          "from the local outputs folder.",
      },
      { status: 200 } // 200 so the client can still read the response
    );
  }
}
