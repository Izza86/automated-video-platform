/**
 * Colab Health Check — Verify remote GPU server is live & ready
 * ===============================================================
 *
 * Before sending expensive video processing jobs to the Colab server,
 * this module pings the /health endpoint to confirm:
 *   • The server is reachable (ngrok tunnel active)
 *   • GPU is available and models are loaded
 *   • Server reports itself as healthy
 *
 * Returns a structured `ColabHealthStatus` with latency, GPU info,
 * and loaded model list.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ColabHealthStatus {
  /** Whether the server is reachable and healthy */
  healthy: boolean;
  /** Human-readable status message */
  message: string;
  /** Round-trip latency in ms */
  latencyMs: number;
  /** GPU device name (e.g. "Tesla T4") */
  gpuName?: string;
  /** GPU VRAM in GB */
  gpuVramGb?: number;
  /** Whether GPU (CUDA) is available */
  gpuAvailable?: boolean;
  /** List of loaded ML model names */
  loadedModels?: string[];
  /** Colab URL that was checked */
  url: string;
  /** ISO-8601 timestamp of the check */
  checkedAt: string;
  /** Raw response from the server (if available) */
  rawResponse?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal cache
// ─────────────────────────────────────────────────────────────────────────────

let _lastCheck: ColabHealthStatus | null = null;
let _lastCheckTime = 0;
const CACHE_TTL_MS = 30_000; // Cache for 30 seconds

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if the Colab GPU server is live and ready.
 *
 * @param force  Skip cache and always ping the server
 * @param timeoutMs  Request timeout (default: 10s)
 */
export async function checkColabHealth(
  force = false,
  timeoutMs = 10_000
): Promise<ColabHealthStatus> {
  const colabUrl = process.env.COLAB_GPU_URL;

  if (!colabUrl) {
    return {
      healthy: false,
      message: "COLAB_GPU_URL environment variable is not set",
      latencyMs: 0,
      url: "",
      checkedAt: new Date().toISOString(),
    };
  }

  // Validate URL format
  try {
    const parsed = new URL(colabUrl);
    if (!parsed.hostname) {
      throw new Error("Invalid hostname in COLAB_GPU_URL");
    }
  } catch (err) {
    console.error(`[colab-health] ❌ Invalid COLAB_GPU_URL: ${err instanceof Error ? err.message : String(err)}`);
    return {
      healthy: false,
      message: `Invalid COLAB_GPU_URL format: ${err instanceof Error ? err.message : String(err)}`,
      latencyMs: 0,
      url: colabUrl,
      checkedAt: new Date().toISOString(),
    };
  }

  // Return cached result if fresh enough
  if (!force && _lastCheck && Date.now() - _lastCheckTime < CACHE_TTL_MS) {
    return _lastCheck;
  }

  const healthUrl = `${colabUrl.replace(/\/+$/, "")}/health`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const t0 = performance.now();

    console.log(`[colab-health] Checking ${healthUrl} (attempt ${attempt}/2, timeout: ${timeoutMs / 1000}s)...`);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).catch(err => {
        throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)} — check COLAB_GPU_URL and network connectivity`);
      });

      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - t0);

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown");
        if (attempt < 2) {
          console.warn(`[colab-health] Attempt ${attempt} failed: HTTP ${response.status}: ${errText.slice(0, 200)} (${latencyMs}ms) — retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          continue;
        }
        const result: ColabHealthStatus = {
          healthy: false,
          message: `Server returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
          latencyMs,
          url: healthUrl,
          checkedAt: new Date().toISOString(),
        };
        _lastCheck = result;
        _lastCheckTime = Date.now();
        console.warn(`[colab-health] ❌ ${result.message} (${latencyMs}ms)`);
        return result;
      }

      const data = (await response.json()) as Record<string, unknown>;

      const result: ColabHealthStatus = {
        healthy: true,
        message: (data.status as string) ?? "OK",
        latencyMs,
        gpuName: data.gpu_name as string | undefined,
        gpuVramGb: data.gpu_vram_gb as number | undefined,
        gpuAvailable: data.gpu_available as boolean | undefined,
        loadedModels: data.loaded_models as string[] | undefined,
        url: healthUrl,
        checkedAt: new Date().toISOString(),
        rawResponse: data,
      };

      _lastCheck = result;
      _lastCheckTime = Date.now();

      console.log(
        `[colab-health] ✅ Healthy (${latencyMs}ms)` +
          (result.gpuName ? ` — GPU: ${result.gpuName}` : "") +
          (result.loadedModels?.length
            ? ` — Models: ${result.loadedModels.join(", ")}`
            : "")
      );

      return result;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - t0);
      let message: string;

      if (err instanceof Error && err.name === "AbortError") {
        message = `Health check timed out after ${timeoutMs / 1000}s — Colab server may be overloaded or offline`;
      } else {
        message = `Health check failed: ${err instanceof Error ? err.message : String(err)}`;
      }

      if (attempt < 2) {
        console.warn(`[colab-health] Attempt ${attempt} failed: ${message} (${latencyMs}ms) — retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }

      const result: ColabHealthStatus = {
        healthy: false,
        message,
        latencyMs,
        url: healthUrl,
        checkedAt: new Date().toISOString(),
      };

      _lastCheck = result;
      _lastCheckTime = Date.now();

      console.warn(`[colab-health] ❌ ${message} (${latencyMs}ms)`);
      return result;
    }
  }

  // Should not reach here, but just in case
  return {
    healthy: false,
    message: "Unexpected error in health check",
    latencyMs: 0,
    url: healthUrl,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get the last cached health check result (or null if never checked).
 */
export function getLastHealthCheck(): ColabHealthStatus | null {
  return _lastCheck;
}

/**
 * Clear the health check cache (forces a fresh check on next call).
 */
export function clearHealthCache(): void {
  _lastCheck = null;
  _lastCheckTime = 0;
}
