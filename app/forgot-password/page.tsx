import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import CustomForgotPasswordFlow from "@/components/auth/CustomForgotPasswordFlow";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your LOGIC account password to restore access.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page() {
  return (
    <AuthShell
      mode="sign-in"
      title="Reset Password"
      subtitle="Recover access to your workspace by verifying your email and setting a new password."
    >
      <CustomForgotPasswordFlow />
    </AuthShell>
  );
}
