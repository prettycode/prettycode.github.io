import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <h1 className="text-3xl font-bold text-center">Portfolio Builder</h1>
        <p className="text-center mb-8">Choose which portfolio builder you would like to use:</p>
        
        <div className="flex gap-6 flex-col sm:flex-row flex-wrap justify-center">
          <Link href="/portfolio-a" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">A</div>
            <h2 className="text-xl font-semibold">Portfolio Builder A</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Modern, minimalist design with focus on visual content</p>
          </Link>
          
          <Link href="/portfolio-b" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">B</div>
            <h2 className="text-xl font-semibold">Portfolio Builder B</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Text-focused layout with detailed project descriptions</p>
          </Link>
          
          <Link href="/portfolio-c" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">C</div>
            <h2 className="text-xl font-semibold">Portfolio Builder C</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Clean layout with advanced portfolio allocation controls</p>
          </Link>

          <Link href="/portfolio-d" className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] p-8 transition-colors flex flex-col items-center gap-4 min-w-64">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">D</div>
            <h2 className="text-xl font-semibold">Portfolio Builder D</h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Interactive builder with locking and disabling features for ETFs</p>
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">© 2024 Stacked Portfolio Builder</p>
      </footer>
    </div>
  );
}
