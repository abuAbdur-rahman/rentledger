import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingSupport } from "@/components/floating-support";

interface ComingSoonPageProps {
  searchParams: Promise<{ feature?: string }>;
}

export default async function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const params = await searchParams;
  const feature = params.feature || "This feature";

  const featureNames: Record<string, string> = {
    notifications: "Notifications",
    help: "Help & Support",
    settings: "Settings",
    profile: "Profile",
  };

  const displayName = featureNames[feature] || feature.replace(/-/g, " ");
  const showSupport = feature === "help";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showSupport && <FloatingSupport />}
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Coming Soon
        </h1>
        <p className="text-gray-500 mb-2">
          {displayName} is under construction.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          We&apos;re working hard to bring you this feature. Stay tuned!
        </p>
        <Button
          asChild
          className="h-11 rounded-xl font-semibold gap-2 bg-blue-500 hover:bg-blue-600"
        >
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
