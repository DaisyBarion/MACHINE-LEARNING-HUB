export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
      <h1 className="text-5xl font-extrabold text-[#C01818] tracking-tight">Machine Learning Hub</h1>
      <p className="mt-4 text-gray-600 font-medium uppercase tracking-widest">A simple integrated website that demonstrates how a frontend app, a cloud database, and hosting work together as one system.</p>
      <a href="/login" className="mt-8 px-10 py-3 bg-[#C01818] text-white rounded-md hover:bg-[#a01414] font-bold shadow-lg transition-all active:scale-95">
        Get Started
      </a>
    </main>
  );
}