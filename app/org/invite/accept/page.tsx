import { Suspense } from "react";
import { InviteAcceptContent } from "./components/InviteAcceptContent";

function InviteAcceptPage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <InviteAcceptContent />
    </div>
  );
}

export default function InviteAcceptPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
          Loading...
        </div>
      }
    >
      <InviteAcceptPage />
    </Suspense>
  );
}
