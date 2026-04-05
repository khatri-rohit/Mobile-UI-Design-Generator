import "dotenv/config";
import { createClerkClient } from "@clerk/nextjs/server";

const API_VERSION = process.env.CLERK_API_VERSION || "v1";
const SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const API_URL = process.env.CLERK_API_URL || "";
const JWT_KEY = process.env.CLERK_JWT_KEY || "";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "ui-ux-builder";
const PACKAGE_VERSION = process.env.PACKAGE_VERSION || "0.0.0";

const SDK_METADATA = {
  name: PACKAGE_NAME,
  version: PACKAGE_VERSION,
  environment: process.env.NODE_ENV,
};

export const clerkClient = createClerkClient({
  secretKey: SECRET_KEY,
  apiUrl: API_URL,
  apiVersion: API_VERSION,
  jwtKey: JWT_KEY,
  userAgent: `${PACKAGE_NAME}@${PACKAGE_VERSION}`,
  sdkMetadata: SDK_METADATA,
});
