import { type NextRequest, NextResponse } from "next/server";

/**
 * Accept-invitation endpoint.
 * Organization plugin is not enabled on the server, so this route
 * simply redirects to the dashboard with a notice.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;

  console.warn(
    `Accept invitation called for ${invitationId}, but organization plugin is not configured.`
  );

  // Redirect to dashboard — the invitation cannot be processed without the org plugin.
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
