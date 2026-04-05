import { auth } from "@clerk/nextjs/server";
import Dashboard from "@/components/dashboard/Dashboard";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  // const { isAuthenticated } = await auth();
  const isAuthenticated = true; // TODO: Re-enable auth check once we have a proper auth flow in place

  if (!isAuthenticated) return <LandingPage />;

  return <Dashboard />;
}
