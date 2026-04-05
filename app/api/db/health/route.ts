import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isAuthError, requireAuthContext } from "@/lib/get-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAuthContext({
      request: req,
      eventType: "db.health.checked",
    });

    const result = await prisma.$queryRaw<
      Array<{ ok: number }>
    >`SELECT 1 AS ok`;

    return NextResponse.json({
      ok: result[0]?.ok === 1,
      message: "Prisma is connected to Supabase.",
    });
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

    const err = error as Error;
    logger.error(err);

    return NextResponse.json(
      {
        error: true,
        message: err.message,
      },
      { status: 500 },
    );
  }
}
