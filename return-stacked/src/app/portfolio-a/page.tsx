"use client";

import Link from "next/link";
import PortfolioBuilderA from "@/components/PortfolioBuilderA";

export default function PortfolioAPage() {
  return (
    <div className="flex flex-col min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Portfolio Builder A</h1>
      <p className="mb-8 max-w-3xl">
        Welcome to Portfolio Builder A - featuring a modern, minimalist design with focus on visual content.
      </p>
      <div className="mb-8 w-full max-w-6xl">
        <PortfolioBuilderA />
      </div>
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline mt-8">
        ← Back to home
      </Link>
    </div>
  );
} 