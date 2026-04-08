import { NextResponse } from "next/server";

import { isAuthError, requireAuthContext } from "@/lib/get-auth";
import logger from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAuthContext({
      request: req,
      eventType: "signout.initiated",
      allowPendingSession: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        {
          error: true,
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    logger.error("Failed to create logout audit event", error);

    return NextResponse.json(
      {
        error: true,
        message: "Failed to create logout audit event",
      },
      { status: 500 },
    );
  }
}
