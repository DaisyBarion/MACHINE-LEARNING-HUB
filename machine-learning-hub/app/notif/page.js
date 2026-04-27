"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function NotifPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const channelRef = useRef(null);

  const markAllAsRead = async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Initial Fetch
      const { data, error } = await supabase
        .from('notifications')
        .select(`*, articles ( title )`)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setNotifications(data);
        if (data.some(n => !n.is_read)) markAllAsRead(user.id);
      }
      setLoading(false);

      // 2. Real-time setup
      if (!channelRef.current) {
        channelRef.current = supabase.channel(`notif-feed-${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `receiver_id=eq.${user.id}`
          }, async (payload) => {
            if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
              return;
            }

            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new;
              if (newNotif.article_id) {
                const { data: artData } = await supabase
                  .from('articles').select('title').eq('id', newNotif.article_id).single();
                newNotif.articles = artData;
              }

              setNotifications(prev => [newNotif, ...prev]);
              markAllAsRead(user.id);
            }
          })
          .subscribe();
      }
    };

    setupRealtime();

    return () => { 
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1A202C] text-white p-6">
      <div className="max-w-xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black tracking-tighter">NOTIFICATIONS</h1>
          <button onClick={() => router.push("/dashboard")} className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-xl hover:bg-white hover:text-black transition-all">BACK</button>
        </header>

        {loading ? <p className="text-center text-gray-500 font-bold">Syncing...</p> : (
          <div className="space-y-4">
            {notifications.length === 0 ? <p className="text-center text-gray-600 text-sm">No notifications yet.</p> : 
              notifications.map(n => (
                <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-transparent border-gray-800' : 'bg-[#2D3748] border-blue-500 shadow-lg'}`}>
                  <p className="text-sm">
                    <span className="font-bold text-blue-400">{n.sender_name}</span> liked your post
                    {n.articles?.title && <span className="block text-gray-400 italic mt-1">"{n.articles.title}"</span>}
                  </p>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}