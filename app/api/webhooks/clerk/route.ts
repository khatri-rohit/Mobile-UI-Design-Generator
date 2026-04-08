/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Provider = "GOOGLE" | "GITHUB" | "EMAIL";
type SessionStatus = "ACTIVE" | "ENDED" | "REVOKED";

function timestampToDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return new Date(numeric);
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function extractPrimaryEmail(userData: any, clerkUserId: string): string {
  const primaryId =
    userData?.primary_email_address_id ?? userData?.primaryEmailAddressId;
  const addresses = userData?.email_addresses ?? userData?.emailAddresses;

  if (Array.isArray(addresses) && addresses.length > 0) {
    if (primaryId) {
      const primary = addresses.find(
        (address: any) =>
          (address?.id ?? address?.emailAddressId) === primaryId,
      );
      const primaryEmail = primary?.email_address ?? primary?.emailAddress;
      if (typeof primaryEmail === "string" && primaryEmail.length > 0) {
        return primaryEmail;
      }
    }

    const fallback = addresses[0]?.email_address ?? addresses[0]?.emailAddress;
    if (typeof fallback === "string" && fallback.length > 0) {
      return fallback;
    }
  }

  return `${clerkUserId}@clerk.local`;
}

function extractDisplayName(userData: any, email: string): string {
  const firstName = userData?.first_name ?? userData?.firstName;
  const lastName = userData?.last_name ?? userData?.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName.length > 0) {
    return fullName;
  }

  const username = userData?.username;
  if (typeof username === "string" && username.length > 0) {
    return username;
  }

  return email.split("@")[0] ?? "User";
}

function inferProvider(externalAccounts: unknown): Provider {
  if (!Array.isArray(externalAccounts) || externalAccounts.length === 0) {
    return "EMAIL";
  }

  const provider = String(
    (externalAccounts[0] as any)?.provider ??
      (externalAccounts[0] as any)?.providerName ??
      (externalAccounts[0] as any)?.identification_type ??
      "",
  ).toLowerCase();

  if (provider.includes("google")) {
    return "GOOGLE";
  }

  if (provider.includes("github")) {
    return "GITHUB";
  }

  return "EMAIL";
}

function mapSessionEventToStatus(eventType: string): SessionStatus | null {
  if (eventType === "session.created") {
    return "ACTIVE";
  }

  if (eventType === "session.ended") {
    return "ENDED";
  }

  if (eventType === "session.revoked") {
    return "REVOKED";
  }

  return null;
}

async function upsertUserFromWebhookData(tx: any, userData: any) {
  const clerkUserId = userData?.id;
  if (!clerkUserId || typeof clerkUserId !== "string") {
    return null;
  }

  const email = extractPrimaryEmail(userData, clerkUserId);
  const name = extractDisplayName(userData, email);
  const provider = inferProvider(
    userData?.external_accounts ?? userData?.externalAccounts,
  );

  return tx.user.upsert({
    where: {
      clerkUserId,
    },
    create: {
      clerkUserId,
      email,
      name,
      provider,
      isActive: true,
    },
    update: {
      email,
      name,
      provider,
      isActive: true,
    },
  });
}

async function ensureUserForSession(tx: any, clerkUserId: string) {
  const existing = await tx.user.findUnique({
    where: {
      clerkUserId,
    },
  });

  if (existing) {
    return existing;
  }

  const fallbackEmail = `${clerkUserId}@clerk.local`;

  return tx.user.create({
    data: {
      clerkUserId,
      email: fallbackEmail,
      name: fallbackEmail.split("@")[0] ?? "User",
      provider: "EMAIL",
      isActive: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const signingSecret =
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ??
      process.env.CLERK_WEBHOOK_SECRET;

    if (!signingSecret) {
      logger.error(
        "Missing Clerk webhook signing secret. Set CLERK_WEBHOOK_SIGNING_SECRET (or CLERK_WEBHOOK_SECRET).",
      );

      return NextResponse.json(
        {
          error: true,
          message: "Webhook signing secret is not configured",
        },
        { status: 500 },
      );
    }

    const evt = await verifyWebhook(req, {
      signingSecret,
    });
    const webhookMessageId =
      req.headers.get("svix-id") ??
      `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log(webhookMessageId);
    console.log(evt.data);
    const duplicate = await prisma.clerkWebhookEvent.findUnique({
      where: {
        id: webhookMessageId,
      },
    });

    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.clerkWebhookEvent.create({
        data: {
          id: webhookMessageId,
          eventType: evt.type,
        },
      });

      if (evt.type === "user.created" || evt.type === "user.updated") {
        await upsertUserFromWebhookData(tx, evt.data);
      }

      if (evt.type === "user.deleted") {
        const clerkUserId = (evt.data as any)?.id;
        if (typeof clerkUserId === "string" && clerkUserId.length > 0) {
          await tx.user.updateMany({
            where: {
              clerkUserId,
            },
            data: {
              isActive: false,
            },
          });
        }
      }

      if (
        evt.type === "session.created" ||
        evt.type === "session.ended" ||
        evt.type === "session.revoked"
      ) {
        const sessionData = evt.data as any;
        const clerkSessionId = sessionData?.id;
        const clerkUserId = sessionData?.user_id ?? sessionData?.userId;
        const status = mapSessionEventToStatus(evt.type);

        if (
          typeof clerkSessionId === "string" &&
          clerkSessionId.length > 0 &&
          typeof clerkUserId === "string" &&
          clerkUserId.length > 0 &&
          status
        ) {
          const user = await ensureUserForSession(tx, clerkUserId);
          const issuedAt =
            timestampToDate(
              sessionData?.created_at ?? sessionData?.createdAt,
            ) ?? new Date();
          const expiresAt = timestampToDate(
            sessionData?.expire_at ?? sessionData?.expiresAt,
          );

          await tx.appSession.upsert({
            where: {
              clerkSessionId,
            },
            create: {
              userId: user.id,
              clerkSessionId,
              status,
              issuedAt,
              expiresAt: expiresAt ?? undefined,
              lastActiveAt: new Date(),
            },
            update: {
              userId: user.id,
              status,
              expiresAt: expiresAt ?? undefined,
              lastActiveAt: new Date(),
            },
          });
        }
      }

      await tx.authAuditEvent.create({
        data: {
          clerkUserId:
            (evt.data as any)?.id ??
            (evt.data as any)?.user_id ??
            (evt.data as any)?.userId ??
            null,
          clerkSessionId:
            (evt.data as any)?.id && String(evt.type).startsWith("session.")
              ? (evt.data as any)?.id
              : null,
          eventType: evt.type,
          eventSource: "WEBHOOK",
          metadata: {
            webhookEventId: webhookMessageId,
            webhookType: evt.type,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to process Clerk webhook", error);
    return NextResponse.json(
      {
        error: true,
        message: "Invalid or failed Clerk webhook processing",
      },
      { status: 400 },
    );
  }
}
