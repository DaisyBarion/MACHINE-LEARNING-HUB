"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// REUSABLE MODAL COMPONENT
const Modal = ({ isOpen, title, children, onClose, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#2D3748] border-2 border-gray-700 w-full max-w-lg rounded-3xl p-8 shadow-2xl transform animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-6 border-b border-gray-700 pb-2">{title}</h3>
        {children}
        <div className="mt-8 flex gap-3">
          {footer}
          <button onClick={onClose} className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userArticles, setUserArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingArticle, setUpdatingArticle] = useState(false);
  
  const [editingArticle, setEditingArticle] = useState(null);
  
  // Modal States
  const [showLocalhostWarning, setShowLocalhostWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [articleToDelete, setArticleToDelete] = useState(null);

  useEffect(() => {
    getProfileData();
  }, []);

  const getProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: articlesData } = await supabase.from('articles').select('*').eq('author_id', user.id).order('date', { ascending: false });
      setProfile(profileData);
      setUserArticles(articlesData || []);
    }
    setLoading(false);
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!event.target.files?.[0]) return;
      const file = event.target.files[0];
      const filePath = `avatars/${user.id}-${Date.now()}.${file.name.split('.').pop()}`;

      const { error: upErr } = await supabase.storage.from('images').upload(filePath, file);
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      const { error: dbErr } = await supabase.from('profiles').update({ profile_pic: data.publicUrl }).eq('id', user.id);
      if (dbErr) throw dbErr;

      setProfile({ ...profile, profile_pic: data.publicUrl });
    } catch (e) {
      setErrorMessage(e.message);
    } finally { setUploading(false); }
  };

  const handleArticleImageUpload = async (event) => {
    try {
      setUpdatingArticle(true);
      if (!event.target.files?.[0]) return;
      const file = event.target.files[0];
      const filePath = `articles/${Date.now()}-${file.name}`;

      const { error: upErr } = await supabase.storage.from('images').upload(filePath, file);
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setEditingArticle({ ...editingArticle, image: data.publicUrl });
    } catch (e) {
      setErrorMessage("Image upload failed. Please try again.");
    } finally { setUpdatingArticle(false); }
  };

  const deleteArticle = async () => {
    if (!articleToDelete) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleToDelete);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setUserArticles(userArticles.filter(a => a.id !== articleToDelete));
      setArticleToDelete(null);
    }
  };

  const handleUpdateArticle = async () => {
    if (!editingArticle?.id) return;
    setUpdatingArticle(true);

    const { data, error } = await supabase
      .from('articles')
      .update({ 
        title: editingArticle.title, 
        info: editingArticle.info,
        content: editingArticle.content,
        image: editingArticle.image
      })
      .eq('id', editingArticle.id)
      .select();

    if (error) {
      setErrorMessage("Update failed: " + error.message);
    } else if (data && data.length > 0) {
      setUserArticles(userArticles.map(a => a.id === editingArticle.id ? data[0] : a));
      setEditingArticle(null);
    } else {
      setErrorMessage("No changes were saved. Please check your permissions.");
    }
    setUpdatingArticle(false);
  };

  if (loading) return <div className="min-h-screen bg-[#1A202C] flex items-center justify-center font-black italic text-blue-500 underline">PUBLINKLY...</div>;

  return (
    <div className="min-h-screen bg-[#1A202C] text-white font-sans pb-20">
      
      <Modal 
        isOpen={showLocalhostWarning} 
        title="Localhost Detected" 
        onClose={() => setShowLocalhostWarning(false)}
        footer={
          <button onClick={() => setShowLocalhostWarning(false)} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all">
            Understood
          </button>
        }
      >
        <p className="text-gray-300 text-sm font-bold">You are running in a local environment. Ensure Supabase is configured for development.</p>
      </Modal>

      {/* ERROR MODAL */}
      <Modal 
        isOpen={!!errorMessage} 
        title="System Notice" 
        onClose={() => setErrorMessage("")}
        footer={
          <button onClick={() => setErrorMessage("")} className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all">
            Close
          </button>
        }
      >
        <p className="text-gray-300 text-sm font-bold">{errorMessage}</p>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal 
        isOpen={!!articleToDelete} 
        title="Confirm Deletion" 
        onClose={() => setArticleToDelete(null)}
        footer={
          <button onClick={deleteArticle} className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all">
            Delete Permanently
          </button>
        }
      >
        <p className="text-gray-300 text-sm font-bold">Are you sure you want to delete this story? This action cannot be undone.</p>
      </Modal>

      {/* EDIT MODAL */}
      <Modal 
        isOpen={!!editingArticle} 
        title="Edit Full Article" 
        onClose={() => setEditingArticle(null)}
        footer={
          <button onClick={handleUpdateArticle} disabled={updatingArticle} className="flex-[2] py-3 bg-[#2563EB] hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
            {updatingArticle ? "Saving..." : "Save Updates"}
          </button>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Display Image</label>
            <div className="relative h-32 w-full bg-[#1A202C] rounded-xl border border-gray-700 overflow-hidden group">
              <img src={editingArticle?.image} className="w-full h-full object-cover opacity-60" alt="" />
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                <input type="file" accept="image/*" onChange={handleArticleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Title</label>
            <input 
              className="w-full bg-[#1A202C] border border-gray-700 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-blue-500 text-white"
              value={editingArticle?.title || ""} 
              onChange={e => setEditingArticle({...editingArticle, title: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Short Snippet (Info)</label>
            <input 
              className="w-full bg-[#1A202C] border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-white font-bold"
              value={editingArticle?.info || ""} 
              onChange={e => setEditingArticle({...editingArticle, info: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Content</label>
            <textarea 
              rows="6"
              className="w-full bg-[#1A202C] border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-white resize-none"
              value={editingArticle?.content || ""} 
              onChange={e => setEditingArticle({...editingArticle, content: e.target.value})}
            />
          </div>
        </div>
      </Modal>

      {/* --- PAGE HEADER --- */}
      <div className="h-40 bg-[#2563EB] relative">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <button onClick={() => window.location.href = "/dashboard"} className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <span className="text-xl font-black uppercase tracking-tighter text-white">Profile</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* --- PROFILE CARD --- */}
        <div className="relative -mt-12 bg-[#2D3748] rounded-3xl p-8 border border-gray-700 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-2xl bg-[#1A202C] flex items-center justify-center text-3xl font-black border-4 border-[#2D3748] overflow-hidden shadow-xl">
                {profile?.profile_pic ? <img src={profile.profile_pic} className="w-full h-full object-cover" alt="Profile" /> : profile?.full_name?.charAt(0) || "U"}
                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                <span className="text-[10px] font-black uppercase text-white tracking-widest">{uploading ? "..." : "Edit"}</span>
                <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
              </label>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">{profile?.full_name}</h1>
              <p className="text-gray-400 font-bold text-xs lowercase mt-1">{userEmail}</p>
              <div className="mt-6 flex gap-4 justify-center md:justify-start">
                <div className="bg-[#1A202C] px-5 py-2 rounded-xl border border-gray-700 text-center">
                  <span className="block text-[9px] text-gray-500 font-black tracking-widest uppercase">Articles</span>
                  <span className="text-lg font-bold text-white">{userArticles.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ARTICLE LIST --- */}
        <div className="mt-12">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6 border-b border-gray-800 pb-2 text-white">Your Published Stories</h2>
          <div className="grid gap-4">
            {userArticles.map((article) => (
              <div key={article.id} className="bg-[#2D3748]/40 border border-gray-800 p-4 rounded-2xl flex gap-4 items-center group hover:border-blue-500/30 transition-all">
                <img src={article.image} className="w-16 h-16 object-cover rounded-lg shadow-md" alt="" />
                <div className="flex-1">
                  <h4 className="font-bold text-md leading-tight text-white">{article.title}</h4>
                  <p className="text-gray-500 text-[10px] uppercase font-black mt-1">{new Date(article.date).toLocaleDateString()}</p>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingArticle(article)}
                    className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={() => setArticleToDelete(article.id)}
                    className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}