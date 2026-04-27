"use client";
import { useEffect, useState, useRef, memo } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const NotificationBell = memo(function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(null); 
  const channelRef = useRef(null);
  const isFetching = useRef(false);

  const fetchCount = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      isFetching.current = false;
      return;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', session.user.id)
      .eq('is_read', false);

    if (!error) {
      // Only update state if the value actually changed to prevent micro-flickers
      setUnreadCount(prev => prev === count ? prev : (count || 0));
    }
    isFetching.current = false;
  };

  useEffect(() => {
    fetchCount();

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || channelRef.current) return;

      channelRef.current = supabase.channel(`navbar-notifs-${session.user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `receiver_id=eq.${session.user.id}` 
        }, () => fetchCount())
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return (
    <Link href="/notif" className="relative cursor-pointer p-2 hover:bg-white/10 rounded-full transition-all block">
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>

      {/* Logic: Only render if we have a count and it's > 0 */}
      {unreadCount !== null && unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-[#2563EB]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
});

export default NotificationBell;