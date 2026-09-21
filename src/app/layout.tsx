import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ottodot Edu — Admin Booking Dashboard",
  description: "High-reliability trial session booking and concurrency testing system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased">
        {/* Fixed Top SaaS Navbar */}
        <header className="fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-50">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-200">
                O
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
                    Ottodot
                  </span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                    Edu
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Trial Operations Suite
                </span>
              </div>
            </div>

            {/* Navigation Right Actions & Mock User Profile */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>PostgreSQL DB Active</span>
              </div>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800">
                    Administrator
                  </span>
                  <span className="text-[11px] text-slate-400">
                    admin@ottodot.com
                  </span>
                </div>
                <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-semibold text-xs ring-2 ring-white shadow-xs">
                  AD
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="max-w-7xl mx-auto pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
