"use client";
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // Error/Success state
  const [loading, setLoading] = useState(false);

  const handleAction = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      if (isRegister) {
        // REGISTER LOGIC
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (error) throw error;

        setMessage({ text: "Registration Successful! Please login.", type: "success" });
        setIsRegister(false); // Automatically switch back to login
      } else {

        // LOGIN LOGIC 
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans text-black">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm border-t-8 border-[#C01818]">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isRegister ? "Create Account" : "User Login"}
        </h2>

        {message.text && (
          <div className={`mb-4 p-3 rounded text-sm font-medium ${
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleAction} className="space-y-4">
          {isRegister && (
            <input 
              type="text" placeholder="Full Name" required
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border p-3 rounded focus:ring-2 focus:ring-[#C01818] outline-none border-gray-300"
            />
          )}
          <input 
            type="email" placeholder="Email Address" required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded focus:ring-2 focus:ring-[#C01818] outline-none border-gray-300"
          />
          <input 
            type="password" placeholder="Password" required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded focus:ring-2 focus:ring-[#C01818] outline-none border-gray-300"
          />
          
          <button 
            disabled={loading}
            className="w-full bg-[#C01818] text-white p-3 rounded font-bold hover:bg-[#a01414] transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : (isRegister ? "Register" : "Login")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {!isRegister ? (
            <p>Don't have an account? <button onClick={() => { setIsRegister(true); setMessage({text:'', type:''}); }} className="text-[#C01818] font-bold hover:underline cursor-pointer">Register</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => { setIsRegister(false); setMessage({text:'', type:''}); }} className="text-[#C01818] font-bold hover:underline cursor-pointer">Login</button></p>
          )}
        </div>
      </div>
    </div>
  );
}