"use client";

import Link from "next/link";
import PortfolioBuilderB from "@/components/PortfolioBuilderB";

export default function PortfolioBPage() {
  return (
    <div className="flex flex-col min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Portfolio Builder B</h1>
      <p className="mb-8 max-w-3xl">
        Welcome to Portfolio Builder B - featuring a text-focused layout with detailed project descriptions.
      </p>
      <div className="mb-8 w-full max-w-6xl">
        <PortfolioBuilderB />
      </div>
      <Link href="/" className="text-green-600 dark:text-green-400 hover:underline mt-8">
        ← Back to home
      </Link>
    </div>
  );
} 