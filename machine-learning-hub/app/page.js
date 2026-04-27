"use client";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#1A202C] p-6 text-center text-white font-sans relative overflow-hidden">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 w-64 h-64 bg-[#2563EB] opacity-10 blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl">
        <h1 className="text-7xl md:text-8xl font-black text-[#2563EB] italic tracking-tighter animate-in fade-in zoom-in duration-700">
          PUBLINKLY
        </h1>
        
        <p className="mt-6 text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
          Where Stories & Community Intersect
        </p>
        
        <div className="mt-8 h-1 w-16 bg-gray-700 mx-auto rounded-full"></div>

        <p className="mt-8 text-gray-500 font-medium text-sm md:text-base leading-relaxed max-w-lg mx-auto">
          Publinkly is a high-performance publishing platform built for modern creators. It offers a seamless digital ecosystem that bridges the gap between content and community.
        </p>

        <div className="mt-12 flex items-center justify-center">
          <a 
            href="/login" 
            className="px-14 py-4 bg-[#2563EB] text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
          >
            Get Started
          </a>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] leading-relaxed">
        Daisy Mae Barion • INFOT 6 <br />
        SECOND-SEMESTER | 2026
      </div>
    </main>
  );
}