"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleAction = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        setMessage({ text: "Success! Check your email to confirm and log in.", type: "success" });
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1A202C] p-4 font-sans text-white">
      <div className="bg-[#2D3748] p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="font-black text-3xl italic tracking-tighter text-[#2563EB] mb-2">
            PUBLINKLY
          </h1>
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
            {isRegister ? "Join the Community" : "Welcome Back"}
          </h2>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-xs font-black uppercase tracking-wider border ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-500 border-red-500/50' 
              : 'bg-green-500/10 text-green-500 border-green-500/50'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleAction} className="space-y-5">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" placeholder="e.g. Snow Leviste" required
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#1A202C] border border-gray-700 p-4 rounded-xl focus:border-[#2563EB] outline-none transition-all text-sm"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" placeholder="name@example.com" required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1A202C] border border-gray-700 p-4 rounded-xl focus:border-[#2563EB] outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" placeholder="••••••••" required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1A202C] border border-gray-700 p-4 rounded-xl focus:border-[#2563EB] outline-none transition-all text-sm"
            />
          </div>
          
          <button 
            disabled={loading}
            className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Processing..." : (isRegister ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setFullName(''); setMessage({text:'', type:''}); }} 
            className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-[#2563EB] transition-colors"
          >
            {!isRegister ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}