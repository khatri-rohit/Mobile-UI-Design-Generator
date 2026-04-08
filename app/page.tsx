import { auth } from "@clerk/nextjs/server";
import Dashboard from "@/components/dashboard/Dashboard";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) return <LandingPage />;

  return <Dashboard />;
}
