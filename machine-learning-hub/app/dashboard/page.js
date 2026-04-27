"use client";
import { useEffect, useState } from 'react';
import CommentSection from '../comments/page';
import NotificationBell from '../NotifBell/page';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postStep, setPostStep] = useState(1);
  const [formData, setFormData] = useState({ title: '', info: '', content: '', image: '', imageFile: null });
  const [userProfile, setUserProfile] = useState(null);
  const [userReacts, setUserReacts] = useState(new Set()); 
  const [activeArticle, setActiveArticle] = useState(null);
  const [user, setUser] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  // 1. Initial Load
  useEffect(() => {
    const getInitialUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) setUser(authUser);
      else setLoading(false);
    };
    fetchArticles();
    getInitialUser();
  }, []);

  // 2. Load Profile & Likes once user is found
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_pic')
        .eq('id', user.id)
        .single();

      if (profileData) setUserProfile(profileData);
      fetchUserLikes();
    };

    fetchUserData();
  }, [user]); 

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('*, reacts(count), comments(count)') 
      .order('date', { ascending: false });
      
    if (!error && data) {
      const formattedData = data.map(article => ({
        ...article,
        heartCount: article.reacts[0]?.count || 0,
        commentCount: article.comments[0]?.count || 0
      }));
      setArticles(formattedData);
      
      const sortedTop = [...formattedData]
        .sort((a, b) => b.heartCount - a.heartCount)
        .slice(0, 5);
      setTopArticles(sortedTop);
      fetchUserLikes();
    }
    setLoading(false);
  };

  const fetchUserLikes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: likes } = await supabase.from('reacts').select('article_id').eq('user_id', user.id);
    if (likes) setUserReacts(new Set(likes.map(l => l.article_id)));
  };

  const fetchUserInfo = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;

    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .select('id, full_name, profile_pic')
      .eq('id', user.id)
      .single();

    if (profileData) {
      console.log("Fetched Profile Pic URL:", profileData.profile_pic);
      
      setUserProfile({
        id: profileData.id,
        full_name: profileData.full_name,
        profile_pic: profileData.profile_pic 
      });
    }
  };

  const toggleHeart = async (e, articleId) => {
  e.stopPropagation(); 
  if (!userProfile?.id) return alert("Login required!");

  const isLiked = userReacts.has(articleId);
  const targetArticle = articles.find(a => a.id === articleId);

  // 1. Optimistic UI Update
  setUserReacts(prev => {
    const next = new Set(prev);
    isLiked ? next.delete(articleId) : next.add(articleId);
    return next;
  });

  setArticles(prev => prev.map(art => 
    art.id === articleId 
      ? { ...art, heartCount: isLiked ? Math.max(0, art.heartCount - 1) : art.heartCount + 1 }
      : art
  ));

  // 2. Database Sync
  if (isLiked) {
    // Remove the heart from the reacts table
    await supabase
      .from('reacts')
      .delete()
      .eq('article_id', articleId)
      .eq('user_id', userProfile.id); 

    // Remove ONLY the 'react' notification (Leave comments alone!)
    if (targetArticle) {
      await supabase
        .from('notifications')
        .delete()
        .eq('receiver_id', targetArticle.author_id)
        .eq('sender_id', userProfile.id)
        .eq('article_id', articleId)
        .eq('type', 'react'); // This is the shield for your comments
    }
    } else {
    // 1. Record the heart
    await supabase
      .from('reacts')
      .insert([{ article_id: articleId, user_id: userProfile.id }]);

    if (targetArticle && targetArticle.author_id !== userProfile.id) {
      // 2. CLEAR OLD NOTIFS FIRST (The "Redo" fix)
      await supabase
        .from('notifications')
        .delete()
        .eq('receiver_id', targetArticle.author_id)
        .eq('sender_id', userProfile.id)
        .eq('article_id', articleId)
        .eq('type', 'react'); 

      // 3. INSERT FRESH NOTIF
      await supabase.from('notifications').insert([{
        receiver_id: targetArticle.author_id,
        sender_id: userProfile.id,
        sender_name: userProfile.full_name,
        type: 'react',
        article_id: articleId,
        is_read: false
      }]);
    }
  }
};

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login"; 
  };

  const handlePublish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required!");

    let finalImageUrl = formData.image; 

    if (formData.imageFile) {
      const file = formData.imageFile;
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `article-covers/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) return alert("Upload failed: " + uploadError.message);
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      finalImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from('articles').insert([{ 
      title: formData.title,
      info: formData.info,
      content: formData.content,
      image: finalImageUrl, 
      author_id: user.id,
      author_name: userProfile?.full_name 
    }]);

    if (!error) {
      setIsPosting(false);
      setPostStep(1);
      setFormData({ title: '', info: '', content: '', image: '', imageFile: null });
      fetchArticles(); 
    } else {
      alert("Database Error: " + error.message);
    }
  };
  

  const incrementCommentCount = (id) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, commentCount: a.commentCount + 1 } : a));
  };

  if (loading) return <div className="p-10 text-center text-white bg-[#1A202C] min-h-screen font-bold flex items-center justify-center">Initializing...</div>;

  return (
    <div className="min-h-screen bg-[#1A202C] pb-20 text-white font-sans">
      
      {/* --- TOP NAVIGATION --- */}
      <nav className="bg-[#2563EB] p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-4">
          <span className="font-black text-xl italic tracking-tighter cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.reload()}>
            PUBLINKLY
          </span>
          
          <div className="flex items-center gap-3">
            <NotificationBell />

            <button onClick={() => window.location.href = "/profile"} className="hover:text-gray-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            <button onClick={handleLogout} className="text-[10px] font-black border border-white/30 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:border-red-500 transition-all uppercase">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-10 px-4">
        {/* --- POST BOX --- */}
        <div className="bg-[#2D3748] p-5 rounded-2xl border border-gray-700 shadow-xl mb-12 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center overflow-hidden border-2 border-white/10">
            {userProfile?.profile_pic ? (
              <img src={userProfile.profile_pic} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <span className="text-white font-bold">{userProfile?.full_name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <button 
            onClick={() => setIsPosting(true)} 
            className="flex-1 bg-[#1A202C] text-left px-6 py-3 rounded-xl text-gray-400 hover:bg-[#252f3f] border border-gray-700 transition-all text-sm font-medium"
          >
            What story will you tell today, {userProfile?.full_name || 'Guest'}?
          </button>
        </div>

        {/* --- TOTAL COUNTER & TRENDING HEADER --- */}
        <div className="mb-6 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 bg-yellow-500 rounded-full"></div>
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Trending Highlights</h2>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Publications</span>
            <p className="text-xl font-black text-blue-500 leading-none">{articles.length}</p>
          </div>
        </div>

       {/* --- HORIZONTAL TRENDING CARDS (GRID VIEW) --- */}
      <div className="grid grid-cols-5 gap-3 mb-10">
        {articles
          .sort((a, b) => (b.heartCount || 0) - (a.heartCount || 0))
          .slice(0, 5)
          .map((item, index) => (
            <div
              key={`trending-card-${item.id}`}
              onClick={() => setSelectedArticle(item)}
              className="bg-gradient-to-br from-[#2D3748] to-[#1A202C] p-4 rounded-xl border border-[#2563EB]/20 hover:border-[#2563EB] transition-all cursor-pointer group shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]"
            >
              {/* Background Rank Number */}
              <div className="absolute -top-2 -right-1 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <span className="text-5xl font-black italic">#{index + 1}</span>
              </div>

              <div className="relative z-10">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                 Trending
                </span>
                <h3 className="text-xs font-bold mt-1 leading-tight line-clamp-3 group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
              </div>

              <div className="relative z-10 mt-2">
                <p className="text-[8px] text-gray-500 font-bold uppercase truncate">
                  {item.author_name}
                </p>
              </div>
            </div>
          ))}
      </div>

        {/* --- ALL ARTICLES LIST --- */}
        <div className="mb-6 mt-10 flex items-center gap-3">
          <div className="h-6 w-1.5 bg-blue-600 rounded-full"></div>
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Article Feed</h2>
        </div>

        <div className="grid gap-8">
          {articles
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((item) => {
              // Find if this article is in the top 5 trending list
              const trendingIndex = [...articles]
                .sort((a, b) => (b.heartCount || 0) - (a.heartCount || 0))
                .slice(0, 5)
                .findIndex(a => a.id === item.id);

              return (
                <div
                  key={`feed-${item.id}`}
                  onClick={() => setSelectedArticle(item)}
                  className="bg-[#2D3748] rounded-2xl overflow-hidden border border-gray-700 hover:border-[#2563EB]/50 cursor-pointer shadow-xl transition-all group"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-64 h-48 overflow-hidden relative">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="thumbnail" />
                      {trendingIndex !== -1 && (
                        <div className="absolute top-0 left-0 bg-blue-600 text-white text-[8px] font-black px-3 py-1 uppercase tracking-tighter italic">
                          Trending #{trendingIndex + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold leading-tight group-hover:text-blue-400 transition-colors">{item.title}</h3>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                          <span className="text-blue-400">By {item.author_name}</span>
                        </div>
                        <p className="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-2">{item.info}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-3 gap-10">
                          {/* HEART BUTTON */}
                          <button 
                            onClick={(e) => toggleHeart(e, item.id)}
                            className={`flex items-center justify-center gap-3 h-9 rounded-lg border transition-all active:scale-95 ${
                              userReacts.has(item.id)
                                ? "bg-[#2563EB]/20 border-[#2563EB] text-[#2563EB]"
                                : "bg-[#1A202C] border-gray-700 text-gray-400 hover:border-blue-500"
                            }`}
                          >
                            <svg className={`w-4 h-4 ${userReacts.has(item.id) ? "fill-current" : "fill-none stroke-[2.5]"}`} viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                            </svg>
                            <span className="text-xs font-black">{item.heartCount || 0}</span>
                          </button>

                          {/* COMMENT BUTTON */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveArticle(item); }}
                            className="flex items-center justify-center gap-3 px-4 py-2 rounded-xl border border-gray-700 bg-[#1A202C] text-gray-400 hover:border-blue-500 transition-all"
                          >
                            <svg className="w-4 h-4 fill-none stroke-[2.5]" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48L4.35 19.75l2.028-.676A8.91 8.91 0 0012 20.25z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase">{item.commentCount || 0}</span>
                          </button>

                          {/* SHARE BUTTON */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({ title: item.title, url: window.location.href }).catch(() => null);
                              } else {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Link copied!");
                              }
                            }}
                            className="flex items-center justify-center gap-3 px-4 py-2 rounded-xl border border-gray-700 bg-[#1A202C] text-gray-400 hover:border-green-500 transition-all"
                          >
                            <svg className="w-4 h-4 fill-none stroke-[2.5]" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 4.684m0 0a3 3 0 114.053 4.053 3 3 0 01-4.053-4.053zm0 10.632a3 3 0 114.053 4.053 3 3 0 01-4.053-4.053z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </main>

      {/* --- FULL POSTING MODAL --- */}
      {isPosting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#1A202C] w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden border border-gray-700 flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between bg-[#2D3748]">
              <h2 className="font-black uppercase tracking-widest text-sm">{postStep === 1 ? "Step 1: Write Story" : "Step 2: Add Details"}</h2>
              <button onClick={() => setIsPosting(false)} className="hover:rotate-90 transition-transform">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              {postStep === 1 ? (
                <textarea 
                  className="w-full h-full bg-transparent text-2xl outline-none resize-none font-medium text-gray-200" 
                  placeholder="What's on your mind? Type freely..." 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})} 
                />
              ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-blue-500 uppercase">Article Title</label>
                    <input className="w-full bg-[#2D3748] p-4 rounded-xl outline-none border border-transparent focus:border-blue-500 transition-all" placeholder="Enter a catchy title..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-blue-500 uppercase">Short Description</label>
                    <textarea className="w-full bg-[#2D3748] p-4 rounded-xl outline-none h-24 border border-transparent focus:border-blue-500 transition-all" placeholder="Brief summary of your article..." value={formData.info} onChange={(e) => setFormData({...formData, info: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-blue-500 uppercase">Cover Image</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="w-full bg-[#2D3748] p-4 rounded-xl outline-none file:bg-[#2563EB] file:text-white file:rounded-full file:border-0 file:px-4 file:mr-4 file:font-bold" 
                      onChange={(e) => setFormData({...formData, imageFile: e.target.files[0]})} 
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-800 flex justify-end gap-4 bg-[#2D3748]">
              {postStep === 2 && <button onClick={() => setPostStep(1)} className="font-bold opacity-50 hover:opacity-100 transition-opacity">Back</button>}
              <button 
                onClick={postStep === 1 ? () => setPostStep(2) : handlePublish} 
                className="bg-[#2563EB] px-10 py-3 rounded-full font-black tracking-widest text-sm hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
              >
                {postStep === 1 ? "NEXT" : "PUBLISH NOW"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULL ARTICLE VIEW --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#2D3748] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-y-auto relative shadow-2xl">
            <button onClick={() => setSelectedArticle(null)} className="fixed md:absolute top-5 right-5 z-20 bg-white text-black w-10 h-10 rounded-full font-bold shadow-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">✕</button>
            <div className="h-[450px] overflow-hidden">
                <img src={selectedArticle.image} className="w-full h-full object-cover" alt="cover" />
            </div>
            <div className="p-8 md:p-14">
              <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">{selectedArticle.title}</h1>
              <div className="mt-6 flex items-center gap-3 text-gray-500 font-black text-[10px] uppercase tracking-[0.2em]">
                <span>{new Date(selectedArticle.date).toLocaleDateString()}</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span className="text-blue-400">{selectedArticle.author_name}</span>
              </div>
              <div className="mt-12 text-gray-200 leading-relaxed text-xl whitespace-pre-wrap font-medium">
                {selectedArticle.content || selectedArticle.info}
              </div>
              <footer className="mt-20 pt-10 border-t border-gray-700 text-center text-gray-600 text-[10px] uppercase font-black tracking-widest">
                © Publinkly • Content remains the property of the author
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* --- COMMENT MODAL --- */}
        {activeArticle && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#2D3748] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col max-h-[80vh]">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#1A202C]">
                <div>
                  <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Discussion</h2>
                  <h3 className="font-bold text-sm line-clamp-1 italic">{activeArticle.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveArticle(null)} 
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Comment Logic Component */}
              <div className="flex-1 overflow-hidden p-6 bg-[#2D3748]">
                <CommentSection articleId={activeArticle.id} 
                  onPost={(id) => {
                    setArticles(prev => prev.map(art => 
                      art.id === id ? { ...art, commentCount: (art.commentCount || 0) + 1 } : art
                    ));
                  }}
                />
              </div>
              
            </div>
          </div>
        )}
    </div>
  );
}