import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Send, Users, Calendar, Lightbulb,
  ChevronDown, ChevronUp, Loader2, Pin, Lock,
} from 'lucide-react';

import {
  fetchPostsThunk,
  createPostThunk,
  likePostThunk,
  fetchCommentsThunk,
  createCommentThunk,
} from '../../../redux/features/community/communitySlice';
import { fetchBookingsThunk } from '../../../redux/features/bookings/bookingsSlice';

// ─── helpers ───────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const POST_TYPES = [
  { key: 'general',      label: 'General',      icon: null,  color: '#8a9a96' },
  { key: 'win',          label: 'Win',           icon: '🏆',  color: '#FCE072' },
  { key: 'question',     label: 'Question',      icon: '❓',  color: '#7eb8ec' },
  { key: 'tip',          label: 'Tip',           icon: '💡',  color: '#A7ECDA' },
  { key: 'announcement', label: 'Announcement',  icon: '📌',  color: '#FF8280' },
];

const TOPICS = [
  { key: '',          label: 'All Topics' },
  { key: 'selftape',  label: '🎥 Self Tape' },
  { key: 'auditions', label: '🎭 Auditions' },
  { key: 'callbacks', label: '📞 Callbacks' },
  { key: 'agents',    label: '💼 Agents & Mgrs' },
  { key: 'coaching',  label: '🎓 Coaching' },
  { key: 'industry',  label: '📰 Industry News' },
  { key: 'general',   label: '💬 General' },
];

const TYPE_COLOR = Object.fromEntries(POST_TYPES.map(t => [t.key, t.color]));
const TYPE_ICON  = Object.fromEntries(POST_TYPES.map(t => [t.key, t.icon]));

const QUICK_TIPS = [
  'Always slate with energy — first impressions count even on tape.',
  'Frame yourself mid-chest up for self-tapes unless told otherwise.',
  'Record a "throw-away" take first to shake off nerves.',
  'Lighting matters more than your camera. A ring light is the cheapest upgrade.',
  'Read the breakdown 3 times before you write a single word of your choices.',
];

// ─── avatar ────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, image, size = 36 }) => {
  const initials = `${(firstName||'')[0]||''}${(lastName||'')[0]||''}`.toUpperCase() || '?';
  const colors = ['#FF8280','#A7ECDA','#FCE072','#FFB49A','#b89aff','#5ee6b8','#7eb8ec'];
  let hash = 0;
  for (const c of `${firstName}${lastName}`) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];

  if (image) return <img src={image} alt={initials} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#080a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

// ─── role badge ────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const map = { actor: 'Actor', casting_director: 'CD', agent: 'Agent', coach: 'Coach', admin: 'Dr Self Tape' };
  if (!map[role]) return null;
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,236,218,0.12)', color: '#A7ECDA', fontWeight: 600 }}>
      {map[role]}
    </span>
  );
};

// ─── comment section ───────────────────────────────────────────────
const CommentSection = ({ postId, isAuthenticated, onLoginPrompt }) => {
  const dispatch = useDispatch();
  const comments = useSelector(s => s.community.commentsByPost?.[postId]) || [];
  const user = useSelector(s => s.auth.user);
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) { dispatch(fetchCommentsThunk(postId)); setLoaded(true); }
  }, [dispatch, postId, loaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) { onLoginPrompt(); return; }
    if (!text.trim()) return;
    dispatch(createCommentThunk({ postId, content: text.trim() }));
    setText('');
  };

  return (
    <div style={{ borderTop: '1px solid rgba(167,236,218,0.08)', paddingTop: 14, marginTop: 14 }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <Avatar firstName={c.author_first_name} lastName={c.author_last_name} image={c.author_image} size={30} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f2f0ed' }}>{c.author_first_name} {c.author_last_name}</span>
              <span style={{ fontSize: 11, color: '#4a5a56' }}>{timeAgo(c.created_at)}</span>
            </div>
            <p style={{ fontSize: 13, color: '#8a9a96', margin: 0 }}>{c.content}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
        {isAuthenticated
          ? <Avatar firstName={user?.first_name} lastName={user?.last_name} size={30} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,130,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={14} color="#FF8280" /></div>
        }
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onClick={!isAuthenticated ? onLoginPrompt : undefined}
          readOnly={!isAuthenticated}
          placeholder={isAuthenticated ? "Write a comment..." : "Sign in to comment..."}
          style={{ flex: 1, background: '#1a1c26', border: '1px solid rgba(167,236,218,0.1)', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: '#f2f0ed', outline: 'none', cursor: !isAuthenticated ? 'pointer' : 'text' }}
        />
        {isAuthenticated && (
          <button type="submit" disabled={!text.trim()} style={{ background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.3 }}>
            <Send size={16} color="#FF8280" />
          </button>
        )}
      </form>
    </div>
  );
};

// ─── post card ─────────────────────────────────────────────────────
const PostCard = ({ post, isAuthenticated, onLoginPrompt }) => {
  const dispatch = useDispatch();
  const [showComments, setShowComments] = useState(false);
  const typeColor = TYPE_COLOR[post.post_type] || '#8a9a96';
  const typeIcon = TYPE_ICON[post.post_type];

  const handleLike = () => {
    if (!isAuthenticated) { onLoginPrompt(); return; }
    dispatch(likePostThunk(post.id));
  };

  return (
    <div style={{
      background: '#13151d',
      borderRadius: 16,
      border: `1px solid rgba(167,236,218,0.07)`,
      borderLeft: `3px solid ${typeColor}`,
      padding: 20,
      marginBottom: 16,
      position: 'relative',
    }}>
      {/* Pinned badge */}
      {post.is_pinned && (
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#FF8280' }}>
          <Pin size={12} /> Pinned
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar firstName={post.author_first_name} lastName={post.author_last_name} image={post.author_image} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f2f0ed' }}>{post.author_first_name} {post.author_last_name}</span>
            <RoleBadge role={post.author_role} />
            <span style={{ fontSize: 11, color: '#4a5a56' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${typeColor}18`, color: typeColor }}>
          {typeIcon ? `${typeIcon} ` : ''}{POST_TYPES.find(t => t.key === post.post_type)?.label || 'General'}
        </span>
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, color: '#c8d0cc', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{post.content}</p>

      {post.image && (
        <img src={post.image} alt="Post" style={{ borderRadius: 10, width: '100%', maxHeight: 360, objectFit: 'cover', marginBottom: 14 }} />
      )}

      {/* Topic chip */}
      {post.topic && post.topic !== 'general' && (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#8a9a96', marginBottom: 12, display: 'inline-block' }}>
          #{post.topic}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 4 }}>
        <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: post.is_liked_by_me ? '#FF8280' : '#4a5a56', fontSize: 13, fontWeight: 500, transition: 'color 0.15s' }}>
          <Heart size={17} fill={post.is_liked_by_me ? '#FF8280' : 'none'} color={post.is_liked_by_me ? '#FF8280' : '#4a5a56'} />
          {post.likes_count || 0}
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a56', fontSize: 13, fontWeight: 500 }}>
          <MessageCircle size={17} color="#4a5a56" />
          {post.comment_count || 0}
          {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post.id} isAuthenticated={isAuthenticated} onLoginPrompt={onLoginPrompt} />
      )}
    </div>
  );
};

// ─── create post box ───────────────────────────────────────────────
const CreatePostBox = ({ isAuthenticated, onLoginPrompt }) => {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const createLoading = useSelector(s => s.community.createLoading);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [topic, setTopic] = useState('general');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) { onLoginPrompt(); return; }
    if (!content.trim() || createLoading) return;
    dispatch(createPostThunk({ content: content.trim(), post_type: postType, topic }));
    setContent('');
    setPostType('general');
  };

  if (!isAuthenticated) {
    return (
      <div onClick={onLoginPrompt} style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20, marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,130,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Lock size={18} color="#FF8280" />
        </div>
        <div style={{ flex: 1, background: '#1a1c26', borderRadius: 20, padding: '10px 18px', color: '#4a5a56', fontSize: 14 }}>
          Sign in to share a win, tip, or question...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20, marginBottom: 20 }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar firstName={user?.first_name} lastName={user?.last_name} size={40} />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share a win, tip, or question with the community..."
            rows={3}
            style={{ flex: 1, background: '#1a1c26', border: '1px solid rgba(167,236,218,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#f2f0ed', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {/* Post type pills */}
          {POST_TYPES.filter(t => t.key !== 'announcement').map(t => (
            <button key={t.key} type="button" onClick={() => setPostType(t.key)} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${postType === t.key ? t.color : 'rgba(167,236,218,0.1)'}`,
              background: postType === t.key ? `${t.color}18` : 'transparent',
              color: postType === t.key ? t.color : '#8a9a96', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
            }}>
              {t.icon ? `${t.icon} ` : ''}{t.label}
            </button>
          ))}

          {/* Topic dropdown */}
          <select value={topic} onChange={e => setTopic(e.target.value)} style={{ marginLeft: 'auto', background: '#1a1c26', border: '1px solid rgba(167,236,218,0.1)', borderRadius: 10, padding: '4px 10px', fontSize: 12, color: '#8a9a96', outline: 'none', cursor: 'pointer' }}>
            {TOPICS.filter(t => t.key).map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="submit" disabled={!content.trim() || createLoading} style={{
            background: 'linear-gradient(135deg, #FF8280, #e06e6c)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '8px 22px', fontSize: 14, fontWeight: 600, cursor: content.trim() ? 'pointer' : 'not-allowed',
            opacity: content.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s',
          }}>
            {createLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Post
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── join CTA (shown to logged-out users in sidebar) ───────────────
const JoinCTA = ({ onLoginPrompt }) => (
  <div style={{ background: 'linear-gradient(135deg, #1a1c26, #13151d)', borderRadius: 16, border: '1px solid rgba(255,130,128,0.2)', padding: 20, textAlign: 'center' }}>
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,130,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
      <Users size={22} color="#FF8280" />
    </div>
    <h3 style={{ color: '#f2f0ed', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Join the Community</h3>
    <p style={{ color: '#8a9a96', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>Sign in to post, comment, and connect with fellow actors.</p>
    <button onClick={onLoginPrompt} style={{ background: 'linear-gradient(135deg, #FF8280, #e06e6c)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
      Sign In / Join
    </button>
  </div>
);

// ─── spotlight ─────────────────────────────────────────────────────
const SpotlightCard = ({ posts }) => {
  const authorMap = {};
  (posts || []).forEach(p => {
    const key = `${p.author_first_name} ${p.author_last_name}`;
    if (!authorMap[key]) authorMap[key] = { name: key, firstName: p.author_first_name, lastName: p.author_last_name, image: p.author_image, likes: 0, posts: 0 };
    authorMap[key].likes += p.likes_count || 0;
    authorMap[key].posts += 1;
  });
  const spotlight = Object.values(authorMap).sort((a, b) => b.likes - a.likes).slice(0, 3);

  return (
    <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20 }}>
      <h3 style={{ color: '#f2f0ed', fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={15} color="#A7ECDA" /> Member Spotlight
      </h3>
      {spotlight.length === 0
        ? <p style={{ fontSize: 12, color: '#4a5a56', margin: 0 }}>Be the first to post!</p>
        : spotlight.map(m => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar firstName={m.firstName} lastName={m.lastName} image={m.image} size={34} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f2f0ed', margin: '0 0 2px' }}>{m.name}</p>
              <p style={{ fontSize: 11, color: '#4a5a56', margin: 0 }}>{m.posts} posts · {m.likes} likes</p>
            </div>
          </div>
        ))
      }
    </div>
  );
};

// ─── events ────────────────────────────────────────────────────────
const EventsCard = ({ bookings }) => {
  const now = new Date();
  const upcoming = (Array.isArray(bookings) ? bookings : [])
    .filter(b => new Date(b.start_datetime) >= now)
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 4);

  return (
    <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20 }}>
      <h3 style={{ color: '#f2f0ed', fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={15} color="#FCE072" /> Upcoming Sessions
      </h3>
      {upcoming.length === 0
        ? <p style={{ fontSize: 12, color: '#4a5a56', margin: 0 }}>No sessions this week</p>
        : upcoming.map(b => (
          <div key={b.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(252,224,114,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={15} color="#FCE072" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f2f0ed', margin: '0 0 2px' }}>
                {(b.session_type || 'Session').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p style={{ fontSize: 11, color: '#4a5a56', margin: 0 }}>
                {new Date(b.start_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        ))
      }
    </div>
  );
};

// ─── tips rotator ──────────────────────────────────────────────────
const TipsCard = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % QUICK_TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20 }}>
      <h3 style={{ color: '#f2f0ed', fontSize: 14, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lightbulb size={15} color="#FCE072" /> Quick Tips
      </h3>
      <p style={{ fontSize: 13, color: '#8a9a96', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 12px' }}>"{QUICK_TIPS[idx]}"</p>
      <div style={{ display: 'flex', gap: 5 }}>
        {QUICK_TIPS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === idx ? '#FF8280' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.2s' }} />
        ))}
      </div>
    </div>
  );
};

// ─── login prompt modal ────────────────────────────────────────────
const LoginPrompt = ({ onClose, onLogin }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#13151d', borderRadius: 20, border: '1px solid rgba(255,130,128,0.2)', padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,130,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Lock size={24} color="#FF8280" />
      </div>
      <h2 style={{ color: '#f2f0ed', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Join the Conversation</h2>
      <p style={{ color: '#8a9a96', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
        Sign in to post, comment, and like — and become part of the Dr Self Tape actor community.
      </p>
      <button onClick={onLogin} style={{ background: 'linear-gradient(135deg, #FF8280, #e06e6c)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 10 }}>
        Sign In
      </button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a5a56', fontSize: 13, cursor: 'pointer' }}>
        Continue browsing
      </button>
    </div>
  </div>
);

// ─── skeleton ──────────────────────────────────────────────────────
const Skeleton = () => (
  <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 20, marginBottom: 16 }}>
    {[40, 80, 60].map((w, i) => (
      <div key={i} style={{ height: i === 0 ? 12 : 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: `${w}%`, marginBottom: 10 }} />
    ))}
  </div>
);

// ─── main ──────────────────────────────────────────────────────────
export default function Community() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { posts: rawPosts, loading, error } = useSelector(s => s.community);
  const { bookings } = useSelector(s => s.bookings);
  const user = useSelector(s => s.auth.user);
  const isAuthenticated = !!user?.token;

  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const [activeTopic, setActiveTopic] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    dispatch(fetchPostsThunk(activeTopic ? { type: activeTopic } : undefined));
    if (isAuthenticated) dispatch(fetchBookingsThunk());
  }, [dispatch, activeTopic, isAuthenticated]);

  const handleLoginPrompt = () => setShowLoginPrompt(true);
  const handleLogin = () => navigate('/login');

  const pinnedPosts = posts.filter(p => p.is_pinned);
  const feedPosts   = posts.filter(p => !p.is_pinned);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: "'Poppins', sans-serif" }}>
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} onLogin={handleLogin} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f2f0ed', margin: '0 0 4px' }}>Community</h1>
          <p style={{ fontSize: 14, color: '#8a9a96', margin: 0 }}>Connect with fellow actors, share wins, and grow together.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(94,230,184,0.08)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#5ee6b8' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5ee6b8', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Public Forum
        </div>
      </div>

      {/* Topic Filter Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {TOPICS.map(t => (
          <button key={t.key} onClick={() => setActiveTopic(t.key)} style={{
            fontSize: 13, padding: '6px 16px', borderRadius: 20, border: `1px solid ${activeTopic === t.key ? '#FF8280' : 'rgba(167,236,218,0.1)'}`,
            background: activeTopic === t.key ? 'rgba(255,130,128,0.12)' : 'transparent',
            color: activeTopic === t.key ? '#FF8280' : '#8a9a96', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Feed */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CreatePostBox isAuthenticated={isAuthenticated} onLoginPrompt={handleLoginPrompt} />

          {error && <div style={{ background: 'rgba(255,100,100,0.1)', color: '#FF8280', borderRadius: 10, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {loading ? (
            <><Skeleton /><Skeleton /><Skeleton /></>
          ) : (
            <>
              {/* Pinned announcements first */}
              {pinnedPosts.map(post => (
                <PostCard key={post.id} post={post} isAuthenticated={isAuthenticated} onLoginPrompt={handleLoginPrompt} />
              ))}

              {/* Feed */}
              {feedPosts.length === 0 && pinnedPosts.length === 0 ? (
                <div style={{ background: '#13151d', borderRadius: 16, border: '1px solid rgba(167,236,218,0.07)', padding: 48, textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(167,236,218,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Users size={26} color="#A7ECDA" />
                  </div>
                  <h3 style={{ color: '#f2f0ed', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Be the first to post!</h3>
                  <p style={{ color: '#8a9a96', fontSize: 14, margin: 0 }}>Share a win, ask a question, or drop a tip for fellow actors.</p>
                </div>
              ) : (
                feedPosts.map(post => (
                  <PostCard key={post.id} post={post} isAuthenticated={isAuthenticated} onLoginPrompt={handleLoginPrompt} />
                ))
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isAuthenticated && <JoinCTA onLoginPrompt={handleLoginPrompt} />}
          <SpotlightCard posts={posts} />
          {isAuthenticated && <EventsCard bookings={bookings} />}
          <TipsCard />
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
