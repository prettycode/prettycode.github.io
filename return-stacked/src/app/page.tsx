import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <h1 className="text-3xl font-bold text-center">Portfolio Builder</h1>
        <p className="text-center mb-8">Access our interactive portfolio builder:</p>
        
        <div className="flex gap-6 flex-col sm:flex-row flex-wrap justify-center">
          <Link href="/portfolio" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">PB</div>
            <h2 className="text-xl font-semibold">Portfolio Builder</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Access our comprehensive portfolio builder with multiple visualization options</p>
          </Link>
          
          <Link href="/portfolio" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">F</div>
            <h2 className="text-xl font-semibold">ETF Portfolio Visualizer</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Visualize ETF portfolios and analyze exposures across asset classes and markets</p>
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">© 2024 Stacked Portfolio Builder</p>
      </footer>
    </div>
  );
}
