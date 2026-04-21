/**
 * GET /api/healthcheck/colab
 *
 * Returns the health status of the remote Colab GPU server.
 * Use this before sending video processing jobs to verify the
 * server is live and ready.
 *
 * Query params:
 *   ?force=1  — bypass cache and ping the server fresh
 */

import { type NextRequest, NextResponse } from "next/server";
import { checkColabHealth } from "../../../../server/utils/colab-healthcheck";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const status = await checkColabHealth(force);

    return NextResponse.json(
      {
        success: true,
        data: status,
      },
      {
        status: status.healthy ? 200 : 503,
      }
    );
  } catch (err) {
    console.error("[healthcheck/colab] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        data: {
          healthy: false,
          message: "Internal health check error",
          latencyMs: 0,
          url: process.env.COLAB_GPU_URL ?? "",
          checkedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
