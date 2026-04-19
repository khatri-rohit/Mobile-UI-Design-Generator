import { shadcn } from "@clerk/ui/themes";

const CLERK_SANS_STACK =
  "var(--font-sans), var(--font-geist-sans), Inter, 'Segoe UI', sans-serif";

const CLERK_MONO_STACK =
  "'JetBrains Mono', var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const sharedAppearance = {
  theme: shadcn,
  options: {
    shimmer: false,
  },
  variables: {
    fontFamily: CLERK_SANS_STACK,
    fontFamilyButtons: CLERK_MONO_STACK,
    borderRadius: "0.625rem",
  },
};

export const clerkUserButtonAppearance = {
  ...sharedAppearance,
};

export const clerkUserProfileAppearance = {
  ...sharedAppearance,
};

export const clerkAppearance = {
  cssLayerName: "clerk",
  ...sharedAppearance,
  userButton: clerkUserButtonAppearance,
  userProfile: clerkUserProfileAppearance,
};
