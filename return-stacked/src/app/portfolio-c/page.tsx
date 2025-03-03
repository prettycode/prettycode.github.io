"use client";

import Link from "next/link";
import PortfolioBuilderC from "@/components/PortfolioBuilderC";

export default function PortfolioCPage() {
  return (
    <div className="flex flex-col min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Portfolio Builder C</h1>
      <p className="mb-8 max-w-3xl">
        Welcome to Portfolio Builder C - featuring a clean layout with advanced portfolio allocation controls.
      </p>
      <div className="mb-8 w-full max-w-6xl">
        <PortfolioBuilderC />
      </div>
      <Link href="/" className="text-purple-600 dark:text-purple-400 hover:underline mt-8">
        ← Back to home
      </Link>
    </div>
  );
} 