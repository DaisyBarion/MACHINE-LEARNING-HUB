"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function CommentsContent({ articleId: propId, onPost }) {
    const searchParams = useSearchParams();
    const articleId = propId || searchParams.get('id'); 
    
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState(null);
    const textareaRef = useRef(null);

    // Auto-expand textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "0px";
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = (scrollHeight > 40 ? scrollHeight : 40) + "px";
        }
    }, [text]);

    useEffect(() => {
        if (articleId) fetchComments();
    }, [articleId]);

    const fetchComments = async () => {
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles(full_name, profile_pic)')
            .eq('article_id', articleId)
            .order('created_at', { ascending: true });
        
        if (error) console.error("Fetch error:", error.message);
        setComments(data || []);
        setLoading(false);
    };

    const handlePost = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !text.trim()) return;

        // 1. Insert the comment
        const { data: newComment, error: commentError } = await supabase.from('comments').insert([
            { 
                article_id: articleId, 
                content: text, 
                user_id: user.id,
                parent_id: replyTo?.id || null 
            }
        ]).select().single();

        if (!commentError) {
            // 2. Notification Logic
            try {
                // Fetch article owner and sender name
                const [articleRes, profileRes] = await Promise.all([
                    supabase.from('articles').select('author_id').eq('id', articleId).single(),
                    supabase.from('profiles').select('full_name').eq('id', user.id).single()
                ]);

                const authorId = articleRes.data?.author_id;
                const senderName = profileRes.data?.full_name;

                if (authorId && authorId !== user.id) {
                    await supabase.from('notifications').insert([{
                        receiver_id: authorId,
                        sender_id: user.id,
                        sender_name: senderName || "Someone",
                        type: replyTo ? 'reply' : 'comment',
                        article_id: articleId,
                        is_read: false
                    }]);
                }

                if (replyTo && replyTo.user_id !== user.id && replyTo.user_id !== authorId) {
                    await supabase.from('notifications').insert([{
                        receiver_id: replyTo.user_id,
                        sender_id: user.id,
                        sender_name: senderName || "Someone",
                        type: 'reply',
                        article_id: articleId,
                        is_read: false
                    }]);
                }
            } catch (notifErr) {
                console.error("Notification failed:", notifErr);
            }

            setText("");
            setReplyTo(null);
            fetchComments();
            if (onPost) onPost(articleId);
        }
    };

    const rootComments = comments.filter(c => !c.parent_id);

    const getThreadReplies = (parentId) => {
        let allReplies = [];
        const children = comments.filter(c => c.parent_id === parentId);
        
        children.forEach(child => {
            allReplies.push(child);
            allReplies = [...allReplies, ...getThreadReplies(child.id)];
        });
        
        return allReplies;
    };

    return (
        <div className="max-w-2xl mx-auto h-[85vh] flex flex-col text-white">
            
            {/* 1. FIXED HEADER INPUT */}
            <div className="flex-shrink-0 bg-[#2D3748] p-4 rounded-2xl border border-gray-700 mb-6 shadow-xl">
                {replyTo && (
                    <div className="flex justify-between items-center mb-2 px-1">
                        <p className="text-[9px] font-black uppercase text-blue-400">
                            Replying to {replyTo.profiles?.full_name}
                        </p>
                        <button onClick={() => setReplyTo(null)} className="text-[9px] text-gray-500 hover:text-white uppercase font-black">Cancel</button>
                    </div>
                )}
                <textarea 
                    ref={textareaRef}
                    className="w-full bg-transparent outline-none resize-none text-sm text-gray-200 min-h-[40px] max-h-[120px] overflow-y-auto" 
                    placeholder={replyTo ? "Write your reply..." : "Write your response..."}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button onClick={handlePost} className="mt-2 bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase float-right hover:bg-blue-700 active:scale-95 transition-all shadow-lg">
                    {replyTo ? 'Reply' : 'Post'}
                </button>
                <div className="clear-both"></div>
            </div>

            {/* 2. SCROLLABLE DISCUSSION AREA */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                <h3 className="font-black uppercase italic tracking-tighter mb-4 text-xs opacity-50">Discussion</h3>
                
                {loading ? (
                    <p className="text-gray-500 font-bold uppercase text-[10px] animate-pulse">Gathering comments...</p>
                ) : (
                    rootComments.map(main => (
                        <div key={main.id} className="space-y-4">
                            {/* Root Comment */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center font-bold overflow-hidden border border-white/10 shadow-md">
                                    {main.profiles?.profile_pic ? <img src={main.profiles.profile_pic} className="w-full h-full object-cover" alt="pfp" /> : main.profiles?.full_name?.charAt(0)}
                                </div>
                                <div className="bg-[#2D3748] p-4 rounded-2xl border border-gray-700 flex-1 shadow-sm">
                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">{main.profiles?.full_name}</p>
                                    <p className="text-sm text-gray-300 leading-relaxed">{main.content}</p>
                                    <button onClick={() => setReplyTo(main)} className="mt-3 text-[9px] font-black uppercase text-gray-500 hover:text-blue-400 transition-colors">Reply</button>
                                </div>
                            </div>

                            {/* Nested Replies */}
                            <div className="flex flex-col items-end space-y-3">
                                {getThreadReplies(main.id).map(reply => (
                                    <div key={reply.id} className="flex gap-3 w-[88%]">
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-gray-600">
                                            {reply.profiles?.profile_pic ? <img src={reply.profiles.profile_pic} className="w-full h-full object-cover" alt="pfp" /> : reply.profiles?.full_name?.charAt(0)}
                                        </div>
                                        <div className="bg-[#1A202C] p-3 rounded-2xl border border-gray-800 flex-1 shadow-inner">
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">{reply.profiles?.full_name}</p>
                                            <p className="text-xs text-gray-400 leading-snug">{reply.content}</p>
                                            <button onClick={() => setReplyTo(reply)} className="mt-2 text-[8px] font-black uppercase text-gray-600 hover:text-blue-400 transition-colors">Reply</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
                <div className="h-32 flex-shrink-0"></div>
            </div>
        </div>
    );
}

export default function CommentsPage(props) {
    return (
        <Suspense fallback={<div className="p-10 text-white font-black uppercase text-xs">Loading Discussion...</div>}>
            <CommentsContent {...props} />
        </Suspense>
    );
}