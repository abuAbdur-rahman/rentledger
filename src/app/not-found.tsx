"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-black text-gray-400">404</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="h-11 rounded-xl font-semibold gap-2 bg-blue-500 hover:bg-blue-600"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-11 rounded-xl font-semibold gap-2 border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
