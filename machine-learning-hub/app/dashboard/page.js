"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserName(user.user_metadata.full_name || "User");
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#C01818] p-4 text-white shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center px-4">
          <span className="font-bold text-xl tracking-tighter italic">MACHING LEARNING HUB</span>
          <button onClick={() => window.location.href = '/login'} className="text-sm border border-white px-4 py-1 rounded hover:bg-white hover:text-[#C01818] transition-colors font-bold cursor-pointer">Logout</button>
        </div>
      </nav>
      
      <main className="flex flex-col items-center justify-center mt-20 px-4">
        <div className="bg-white p-12 rounded-lg shadow-md text-center border-l-8 border-[#C01818] max-w-2xl w-full">
          <h1 className="text-4xl font-black text-gray-800 uppercase tracking-widest break-words">
            WELCOME, {userName}!
          </h1>
          <p className="mt-4 text-gray-500 italic">System Integration Verified Successfully.</p>
        </div>
      </main>
    </div>
  );
}