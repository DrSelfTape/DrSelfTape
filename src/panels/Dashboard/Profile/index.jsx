import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Camera, Upload, Loader2, Check, User, AlertCircle, DollarSign, ExternalLink, Copy, Share2, Gift, RefreshCw, Trash2 } from 'lucide-react';
import { fetchProfileThunk, updateProfileThunk } from '../../../redux/features/profile/profileSlice';
import { patchUserSettings } from '../../../redux/features/userSettings/userSettingsSlice';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import ProfileCompleteBadge from '../../../components/ProfileCompleteBadge';
import DeleteAccountModal from '../../../components/Dashboard/DeleteAccountModal';
import HeadshotCropper from '../../../components/Shared/HeadshotCropper';
import AppearanceCard from '../../../components/Shared/AppearanceCard';
import AuditionBadges, { BADGES } from '../../../components/AuditionBadges';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';

const PROFILE_FIELDS = [
  'first_name', 'last_name', 'email', 'phone_no', 'address',
  'bio', 'reel_url', 'user_image', 'headshot', 'resume_file',
];

function getCompletionPercent(profile) {
  if (!profile) return 0;
  let filled = 0;
  const checks = [
    profile.first_name, profile.last_name, profile.phone_no, profile.address,
    profile.user_image,
    profile.actor_profile?.bio, profile.actor_profile?.reel_url,
    profile.actor_profile?.headshot, profile.actor_profile?.resume_file,
  ];
  checks.forEach((v) => { if (v) filled++; });
  return Math.round((filled / checks.length) * 100);
}

function getInitials(profile) {
  const f = profile?.first_name?.[0] || '';
  const l = profile?.last_name?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

export default function Profile() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, loading, updateLoading } = useSelector((s) => s.profile);
  const auditionStats = useSelector((s) => s.auditionTracker?.stats?.data || s.auditions?.stats?.data || null);
  const marketplaceTutorialSeen = useSelector((s) => s.userSettings?.data?.marketplace_tutorial_seen);
  // Opt-OUT semantics: absent/false means the user still gets nudges, so the
  // toggle reads inverted. Defaulting the other way would silently mute
  // everyone whose settings blob hasn't hydrated yet.
  const auditionNudgesOptOut = useSelector((s) => !!s.userSettings?.data?.audition_nudges_opt_out);
  const avatarInputRef = useRef(null);
  const headshotInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_no: '',
    address: '',
    bio: '',
    reel_url: '',
    union: '',
    based_in: '',
    years_experience: '',
    genres: [],
  });
  const [readerForm, setReaderForm] = useState({
    is_paid_reader: false,
    session_rate_15: '5',
    session_rate_30: '10',
    session_rate_60: '20',
  });
  const [connectLoading, setConnectLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState('not_connected'); // 'connected' | 'pending' | 'not_connected' | 'error'
  const [stripeDetails, setStripeDetails] = useState({});
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showMarketplaceTutorial, setShowMarketplaceTutorial] = useState(false);
  const [referral, setReferral] = useState({ code: '', share_url: '', uses: 0 });
  const [codeCopied, setCodeCopied] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showBadge, setShowBadge] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const hadProfileBefore = useRef(false);

  const fetchReaderProfile = useCallback(() => {
    return axios.get(`${baseURL}/v1/growth/marketplace/profile/`)
      .then(({ data }) => {
        const d = data?.data || {};
        setReaderForm({
          is_paid_reader: d.is_paid_reader || false,
          session_rate_15: String(d.session_rate_15 || 5),
          session_rate_30: String(d.session_rate_30 || 10),
          session_rate_60: String(d.session_rate_60 || 20),
        });
        setStripeStatus(d.stripe_status || 'not_connected');
        setStripeDetails(d.stripe_details || {});
        return d.stripe_status;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    dispatch(fetchAuditionStatsThunk());
    axios.get(`${baseURL}/v1/growth/referral/code/`)
      .then(({ data }) => setReferral(data?.data || {}))
      .catch(() => {});
    fetchReaderProfile();
  }, [dispatch, fetchReaderProfile]);

  // Auto-refresh Stripe status when returning from onboarding
  useEffect(() => {
    if (searchParams.get('connect') === 'complete') {
      searchParams.delete('connect');
      setSearchParams(searchParams, { replace: true });
      // Poll a few times — Stripe can take a moment to update
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        fetchReaderProfile().then((status) => {
          if (status === 'connected' || attempts >= 5) clearInterval(poll);
        });
      }, 3000);
      return () => clearInterval(poll);
    }
  }, [searchParams, setSearchParams, fetchReaderProfile]);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_no: profile.phone_no || '',
        address: profile.address || '',
        bio: profile.actor_profile?.bio || '',
        reel_url: profile.actor_profile?.reel_url || '',
        union: profile.actor_profile?.union || '',
        based_in: profile.actor_profile?.based_in || '',
        years_experience: profile.actor_profile?.years_experience || '',
        genres: profile.actor_profile?.genres || [],
      });
      setAvatarPreview(profile.user_image || null);
      setHeadshotPreview(profile.actor_profile?.headshot || null);
    }
  }, [profile]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [cropState, setCropState] = useState(null); // { src, setPreview, setFile }

  const handleFilePreview = (file, setPreview, setFile) => {
    if (!file) return;
    // Route face photos through the cropper so they're framed perfectly in
    // the circle/card before upload.
    if (file.type.startsWith('image/')) {
      setCropState({ src: URL.createObjectURL(file), setPreview, setFile });
      return;
    }
    setFile(file);
  };

  const onCropDone = (blob) => {
    const cs = cropState;
    setCropState(null);
    if (cs?.src) URL.revokeObjectURL(cs.src);
    if (!blob || !cs) return;
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    cs.setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => cs.setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const [validationPopup, setValidationPopup] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check all important fields and show a clear popup
    const missing = [];
    if (!form.first_name.trim()) missing.push('First Name');
    if (!form.last_name.trim()) missing.push('Last Name');
    if (!headshotFile && !headshotPreview) missing.push('Headshot Photo');
    if (!form.bio.trim()) missing.push('Bio');
    if (!form.union) missing.push('Union Status');

    if (missing.length > 0) {
      setValidationPopup(missing);
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (key === 'genres') {
        fd.append('genres', JSON.stringify(val));
      } else if (val !== undefined && val !== null && val !== '') {
        fd.append(key, val);
      }
    });
    if (avatarFile) fd.append('user_image', avatarFile);
    if (headshotFile) fd.append('headshot', headshotFile);
    if (resumeFile) fd.append('resume_file', resumeFile);

    // Save reader marketplace rates
    try {
      await axios.post(`${baseURL}/v1/growth/marketplace/profile/`, {
        is_paid_reader: readerForm.is_paid_reader,
        session_rate_15: parseFloat(readerForm.session_rate_15) || 5,
        session_rate_30: parseFloat(readerForm.session_rate_30) || 10,
        session_rate_60: parseFloat(readerForm.session_rate_60) || 20,
      });
    } catch {}

    const result = await dispatch(updateProfileThunk(fd));
    if (updateProfileThunk.fulfilled.match(result)) {
      const wasIncomplete = !hadProfileBefore.current;
      const hasPhoto = avatarFile || headshotFile;
      hadProfileBefore.current = true;

      setAvatarFile(null);
      setHeadshotFile(null);
      setResumeFile(null);

      // Mark tutorial step if headshot uploaded
      if (hasPhoto) {
        markStep('headshot');
        try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.UPLOAD_HEADSHOT, { source: 'profile_edit' }); } catch { /* swallow */ }
      }

      // Show badge + confetti if photo uploaded or first time completing profile
      if (hasPhoto || wasIncomplete) {
        setShowBadge(true);
      } else {
        setToastType('success');
        setToast('Profile updated!');
        setTimeout(() => setToast(null), 3000);
      }
    } else {
      setToastType('error');
      setToast(result.payload || 'Failed to save. Please try again.');
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--aurora-accent-deep)' }} />
      </div>
    );
  }

  const completion = getCompletionPercent(profile);

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto aurora-page-in">
      {cropState && (
        <HeadshotCropper
          imageSrc={cropState.src}
          onCancel={() => { URL.revokeObjectURL(cropState.src); setCropState(null); }}
          onComplete={onCropDone}
        />
      )}
      <div className="mb-5">
        <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>YOU</span>
        <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>My Profile</h1>
      </div>

      {/* Badge */}
      <ProfileCompleteBadge show={showBadge} onClose={() => setShowBadge(false)} />

      {/* Validation Popup */}
      {validationPopup && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-sm px-4"
          style={{ background: 'rgba(48,41,31,0.32)' }}
        >
          <div className="aurora-card p-6 max-w-sm w-full"
            style={{ background: 'var(--aurora-glass-strong)', animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,130,128,0.15)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--aurora-rose)' }} />
              </div>
              <h3 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>Complete Your Profile</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--aurora-sub)' }}>
              Please fill in the following before saving:
            </p>
            <div className="space-y-2 mb-6">
              {validationPopup.map((field) => (
                <div key={field} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,130,128,0.10)', border: '1px solid rgba(255,130,128,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--aurora-rose)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--aurora-rose)' }}>{field}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setValidationPopup(null)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
              style={{
                background: 'linear-gradient(135deg, var(--aurora-peach) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-accent-deep) 100%)',
                color: 'var(--aurora-bg)',
                boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
              }}
            >
              Got It
            </button>
          </div>
          <style>{`
            @keyframes badgePop {
              from { opacity: 0; transform: scale(0.8) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Marketplace Tutorial */}
      {showMarketplaceTutorial && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-sm px-4"
          style={{ background: 'rgba(48,41,31,0.32)' }}
        >
          <div className="aurora-card max-w-sm w-full p-7" style={{
            background: 'linear-gradient(135deg, var(--aurora-glass-strong), var(--aurora-glass-strong))',
            border: '1px solid rgba(252,224,114,0.2)',
            animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <div className="text-center mb-5">
              <span className="text-4xl">💰</span>
              <h2 className="text-xl font-bold mt-3" style={{ color: 'var(--aurora-text)' }}>Welcome to the Marketplace!</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--aurora-sub)' }}>
                You're about to start earning money as a reader. Here's how it works:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { emoji: '💵', title: 'Set Your Rates', desc: 'Choose what you charge for 15, 30, and 60 minute sessions.' },
                { emoji: '🏦', title: 'Connect Your Bank', desc: 'Link your bank account via Stripe so you get paid directly.' },
                { emoji: '🎬', title: 'Get Booked', desc: 'Actors browse your profile and book sessions. You get notified instantly.' },
                { emoji: '💸', title: 'Get Paid Automatically', desc: 'You keep 80% of every session. Money goes straight to your bank.' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--aurora-bg)' }}>
                  <span className="text-lg shrink-0 mt-0.5">{step.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--aurora-text)' }}>{step.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--aurora-sub)' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowMarketplaceTutorial(false);
                dispatch(patchUserSettings({ marketplace_tutorial_seen: true }));
              }}
              className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
              style={{ background: 'linear-gradient(135deg, var(--aurora-peach), var(--aurora-heritage-gold))', color: 'var(--aurora-bg)' }}
            >
              Let's Set Up My Rates
            </button>
          </div>
          <style>{`
            @keyframes badgePop {
              from { opacity: 0; transform: scale(0.7) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg animate-fade-in text-white ${toastType === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toastType === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Avatar Card */}
        <div className="lg:col-span-1">
          <div className="aurora-card p-6 text-center">
            {/* Avatar */}
            <div className="relative mx-auto w-32 h-32 mb-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4"
                  style={{ borderColor: 'rgba(212,168,95,0.20)' }}
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center border-4"
                  style={{ background: 'var(--aurora-heritage-gold)', borderColor: 'rgba(212,168,95,0.20)' }}
                >
                  <span className="text-3xl font-bold" style={{ color: 'var(--aurora-bg)' }}>
                    {getInitials(profile)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors"
                style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-bg)' }}
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                onChange={(e) =>
                  handleFilePreview(e.target.files[0], setAvatarPreview, setAvatarFile)
                }
              />
            </div>

            <h2 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>
              {profile?.first_name || 'First'} {profile?.last_name || 'Last'}
            </h2>
            <span
              className="inline-block mt-1 px-3 py-0.5 text-xs font-medium rounded-full capitalize"
              style={{ background: 'rgba(212,168,95,0.10)', color: 'var(--aurora-accent-deep)' }}
            >
              {profile?.role || 'actor'}
            </span>

            {/* Completion */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: 'var(--aurora-sub)' }}>Profile completion</span>
                <span className="aurora-mono font-semibold" style={{ color: 'var(--aurora-text)' }}>{completion}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--aurora-glass-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${completion}%`, background: 'var(--aurora-heritage-gold)' }}
                />
              </div>
            </div>
          </div>

          {/* Referral Card */}
          {referral.code && (
            <div className="aurora-card p-5 mt-6" style={{
              background: 'linear-gradient(135deg, rgba(212,168,95,0.08), var(--aurora-glass))',
              border: '1px solid rgba(212,168,95,0.30)',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4" style={{ color: 'var(--aurora-accent-deep)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--aurora-text)' }}>Your Referral Code</h3>
              </div>

              {/* Code */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 px-3 py-2.5 rounded-lg text-center aurora-mono text-lg font-bold tracking-widest" style={{
                  background: 'var(--aurora-glass)', border: '1px solid var(--aurora-line)', color: 'var(--aurora-accent-deep)',
                }}>
                  {referral.code}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(referral.share_url || `https://drselftape.app/signup?ref=${referral.code}`);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: codeCopied ? 'rgba(34,197,94,0.15)' : 'var(--aurora-glass)', border: '1px solid var(--aurora-line)' }}
                >
                  {codeCopied ? <Check className="w-4 h-4" style={{ color: 'var(--aurora-mint)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--aurora-sub)' }} />}
                </button>
              </div>

              {/* Share button (mobile) */}
              {navigator.share && (
                <button
                  type="button"
                  onClick={() => navigator.share({
                    title: 'Join me on Dr Self Tape',
                    text: 'Use my code to get 50 free AI tokens!',
                    url: referral.share_url || `https://drselftape.app/signup?ref=${referral.code}`,
                  }).catch(() => {})}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold mb-3 transition-colors"
                  style={{ background: 'rgba(212,168,95,0.12)', border: '1px solid rgba(212,168,95,0.35)', color: 'var(--aurora-accent-deep)' }}
                >
                  <Share2 className="w-4 h-4" /> Share Invite Link
                </button>
              )}

              <p className="text-xs text-center" style={{ color: 'var(--aurora-dim)' }}>
                {referral.uses > 0 ? `${referral.uses} referral${referral.uses !== 1 ? 's' : ''} · ` : ''}
                Both you and your friend get <span className="text-[var(--aurora-mint)] font-semibold">50 free tokens</span>
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="aurora-card p-6">
              <h3 className="aurora-display text-lg mb-4" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>First Name <span style={{ color: 'var(--aurora-accent-deep)' }}>*</span></label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Last Name <span style={{ color: 'var(--aurora-accent-deep)' }}>*</span></label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Email</label>
                  <input
                    value={profile?.email || ''}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg cursor-not-allowed" style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-sub)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Phone</label>
                  <input
                    name="phone_no"
                    value={form.phone_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                  />
                </div>
              </div>
            </div>

            {/* Actor Info */}
            <div className="aurora-card p-6">
              <h3 className="aurora-display text-lg mb-4" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>Actor Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Tell casting directors about yourself..."
                    className="w-full px-3 py-2 rounded-lg outline-none transition-colors resize-none" style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Reel URL</label>
                    <input
                      name="reel_url"
                      value={form.reel_url}
                      onChange={handleChange}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-glass-border)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Based In</label>
                    <input
                      name="based_in"
                      value={form.based_in}
                      onChange={handleChange}
                      placeholder="Los Angeles, CA"
                      className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-glass-border)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Union Status <span style={{ color: 'var(--aurora-accent-deep)' }}>*</span></label>
                    <select
                      name="union"
                      value={form.union}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-glass-border)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                    >
                      <option value="">Select union status</option>
                      <option value="sag-aftra">SAG-AFTRA</option>
                      <option value="aea">AEA</option>
                      <option value="non-union">Non-Union</option>
                      <option value="fi-core">Fi-Core</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Years of Experience</label>
                    <input
                      name="years_experience"
                      type="number"
                      min="0"
                      max="60"
                      value={form.years_experience}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 rounded-lg outline-none transition-colors" style={{ border: '1px solid var(--aurora-glass-border)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)' }}
                    />
                  </div>
                </div>

                {/* Genre Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--aurora-sub)' }}>Genre Types</label>
                  <div className="flex flex-wrap gap-2">
                    {['Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Action', 'Romance', 'Period', 'Musical', 'Indie'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          const genres = form.genres.includes(g)
                            ? form.genres.filter((x) => x !== g)
                            : [...form.genres, g];
                          setForm((prev) => ({ ...prev, genres }));
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          form.genres.includes(g)
                            ? ''
                            : 'bg-transparent'
                        }`}
                        style={form.genres.includes(g)
                          ? { background: 'var(--aurora-heritage-gold)', borderColor: 'var(--aurora-heritage-gold)', color: 'var(--aurora-bg)' }
                          : { borderColor: 'var(--aurora-line)', color: 'var(--aurora-sub)' }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reader Marketplace — Pricing */}
            <div className="aurora-card p-6" style={{
              background: 'linear-gradient(135deg, rgba(252,224,114,0.03), var(--aurora-glass))',
              border: '1px solid rgba(252,224,114,0.15)',
            }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,224,114,0.1)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: 'var(--aurora-heritage-gold)' }} />
                </div>
                <div>
                  <h3 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>Reader Marketplace</h3>
                  <p className="text-xs" style={{ color: 'var(--aurora-sub)' }}>Earn money reading with other actors</p>
                </div>
              </div>

              <div className="my-4" style={{ height: 1, background: 'var(--aurora-glass-border)' }} />

              {/* Toggle */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    const wasOff = !readerForm.is_paid_reader;
                    setReaderForm(prev => ({ ...prev, is_paid_reader: !prev.is_paid_reader }));
                    if (wasOff && !marketplaceTutorialSeen) {
                      setShowMarketplaceTutorial(true);
                    }
                  }}
                  className="relative w-12 h-7 rounded-full transition-colors"
                  style={{ background: readerForm.is_paid_reader ? 'var(--aurora-rose)' : 'var(--aurora-glass-border)' }}
                >
                  <div className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform" style={{
                    transform: readerForm.is_paid_reader ? 'translateX(20px)' : 'translateX(0)',
                  }} />
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--aurora-text)' }}>
                  {readerForm.is_paid_reader ? 'Paid Reader · Active' : 'Not offering paid sessions'}
                </span>
              </div>

              {/* Rates */}
              {readerForm.is_paid_reader && (
                <div className="space-y-5">
                  <div>
                    <p className="aurora-eyebrow mb-3" style={{ color: 'var(--aurora-dim)' }}>Your Session Rates</p>
                    <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'session_rate_15', label: '15 min' },
                      { key: 'session_rate_30', label: '30 min' },
                      { key: 'session_rate_60', label: '60 min' },
                    ].map(r => (
                      <div key={r.key}>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>{r.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--aurora-dim)' }}>$</span>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={readerForm[r.key]}
                            onChange={(e) => setReaderForm(prev => ({ ...prev, [r.key]: e.target.value }))}
                            className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm font-semibold outline-none transition-colors aurora-mono"
                            style={{ background: 'var(--aurora-glass)', border: '1px solid var(--aurora-line)', color: 'var(--aurora-text)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                    <p className="text-xs mt-2" style={{ color: 'var(--aurora-dim)' }}>
                      You keep 80%. Platform fee: 20%.
                    </p>
                  </div>

                  <div style={{ height: 1, background: 'var(--aurora-glass-border)' }} />

                  {/* Connect Stripe button */}
                  <div>
                    <p className="aurora-eyebrow mb-3" style={{ color: 'var(--aurora-dim)' }}>Payment Setup</p>
                  {stripeStatus === 'connected' ? (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(167,236,218,0.12)', border: '1px solid rgba(167,236,218,0.35)', color: 'var(--aurora-mint)' }}
                    >
                      <Check className="w-4 h-4" />
                      Bank Account Connected · Payouts Active
                    </div>
                  ) : stripeStatus === 'pending' ? (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-2"
                        style={{ background: 'rgba(252,224,114,0.1)', border: '1px solid rgba(252,224,114,0.3)', color: 'var(--aurora-heritage-gold)' }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verification Pending. Stripe is reviewing your account
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>
                          This can take a few minutes.
                        </p>
                        <button
                          type="button"
                          disabled={checkingStatus}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCheckingStatus(true);
                            fetchReaderProfile().finally(() => {
                              setTimeout(() => setCheckingStatus(false), 1000);
                            });
                          }}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-md transition-colors"
                          style={{ color: 'var(--aurora-heritage-gold)', background: 'rgba(252,224,114,0.08)', border: '1px solid rgba(252,224,114,0.2)', opacity: checkingStatus ? 0.6 : 1 }}
                        >
                          {checkingStatus
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking...</>
                            : <><RefreshCw className="w-3 h-3" /> Check Status</>
                          }
                        </button>
                      </div>
                      {stripeDetails && (stripeDetails.error || stripeDetails.requirements?.length > 0 || stripeDetails.disabled_reason) && (
                        <div className="text-xs px-3 py-2 rounded-md mt-1" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--aurora-dim)' }}>
                          {stripeDetails.error && <p>Error: {stripeDetails.error}</p>}
                          {stripeDetails.disabled_reason && <p>Reason: {stripeDetails.disabled_reason}</p>}
                          {stripeDetails.requirements?.length > 0 && <p>Pending: {stripeDetails.requirements.join(', ')}</p>}
                        </div>
                      )}
                    </div>
                  ) : stripeStatus === 'error' ? (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-2"
                        style={{ background: 'rgba(255,130,128,0.10)', border: '1px solid rgba(255,130,128,0.30)', color: 'var(--aurora-rose)' }}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Unable to verify: {stripeDetails?.error || 'Unknown error'}
                      </div>
                      <button
                        type="button"
                        disabled={checkingStatus}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCheckingStatus(true);
                          fetchReaderProfile().finally(() => setTimeout(() => setCheckingStatus(false), 1000));
                        }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-md transition-colors"
                        style={{ color: 'var(--aurora-rose)', background: 'rgba(255,130,128,0.08)', border: '1px solid rgba(255,130,128,0.20)' }}
                      >
                        {checkingStatus ? <><Loader2 className="w-3 h-3 animate-spin" /> Retrying...</> : <><RefreshCw className="w-3 h-3" /> Retry</>}
                      </button>
                    </div>
                  ) : stripeStatus === 'incomplete' ? (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-2"
                        style={{ background: 'rgba(255,130,128,0.10)', border: '1px solid rgba(255,130,128,0.30)', color: 'var(--aurora-rose)' }}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Setup Incomplete. Finish connecting your bank
                      </div>
                      <button
                        type="button"
                        disabled={connectLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConnectLoading(true);
                          axios.post(`${baseURL}/v1/growth/marketplace/connect/`)
                            .then(({ data }) => {
                              const url = data?.data?.onboarding_url;
                              if (url) window.location.href = url;
                              else setConnectLoading(false);
                            })
                            .catch(() => setConnectLoading(false));
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        style={{ background: 'rgba(167,236,218,0.1)', border: '1px solid rgba(167,236,218,0.3)', color: 'var(--aurora-mint)' }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {connectLoading ? 'Loading...' : 'Complete Setup'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={connectLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConnectLoading(true);
                        axios.post(`${baseURL}/v1/growth/marketplace/connect/`)
                          .then(({ data }) => {
                            const url = data?.data?.onboarding_url;
                            if (url) {
                              window.location.href = url;
                            } else {
                              alert('No onboarding URL returned. Please try again.');
                              setConnectLoading(false);
                            }
                          })
                          .catch((err) => {
                            alert(err?.response?.data?.message || 'Failed to set up payments. Please try again.');
                            setConnectLoading(false);
                          });
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{ background: 'rgba(167,236,218,0.1)', border: '1px solid rgba(167,236,218,0.3)', color: 'var(--aurora-mint)' }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {connectLoading ? 'Setting up...' : 'Connect Bank Account (Stripe)'}
                    </button>
                  )}
                  </div>
                </div>
              )}
            </div>

            {/* How you appear in Match. Sits ABOVE the file uploads because it
                decides which of them your swipe card actually uses, and because
                the avatar route needs to be as findable as the upload — a lot
                of actors will not put their face on a swipe card. */}
            <div className="mb-6">
              <AppearanceCard profile={profile} />
            </div>

            {/* File Uploads */}
            <div className="aurora-card p-6">
              <h3 className="aurora-display text-lg mb-4" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Headshot */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Headshot <span style={{ color: 'var(--aurora-accent-deep)' }}>*</span></label>
                  <div
                    onClick={() => headshotInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors" style={{ borderColor: 'var(--aurora-line)' }}
                  >
                    {headshotPreview ? (
                      <img
                        src={headshotPreview}
                        alt="Headshot"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--aurora-dim)' }} />
                        <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>Upload headshot</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--aurora-dim)' }}>JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={headshotInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    onChange={(e) =>
                      handleFilePreview(e.target.files[0], setHeadshotPreview, setHeadshotFile)
                    }
                  />
                </div>

                {/* Resume */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--aurora-sub)' }}>Resume (PDF)</label>
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors" style={{ borderColor: 'var(--aurora-line)' }}
                  >
                    {resumeFile ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--aurora-mint)' }} />
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--aurora-sub)' }}>{resumeFile.name}</p>
                      </div>
                    ) : profile?.actor_profile?.resume_file ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--aurora-mint)' }} />
                        <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>Resume uploaded</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--aurora-accent-deep)' }}>Click to replace</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--aurora-dim)' }} />
                        <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>Upload resume</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--aurora-dim)' }}>PDF only</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    onChange={(e) => setResumeFile(e.target.files[0] || null)}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateLoading}
                className="px-6 py-2.5 font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
                style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-bg)' }}
              >
                {updateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Achievements ─────────────────────────────────── */}
      <div className="aurora-card p-6 mt-6" style={{ background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>Achievements</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--aurora-dim)' }}>Milestones earned from your audition activity</p>
          </div>
          {auditionStats && (
            <div className="text-right">
              <p className="aurora-mono text-2xl font-bold" style={{ color: 'var(--aurora-accent-deep)' }}>
                {BADGES.filter(b => b.check(auditionStats)).length}
                <span className="text-base font-normal" style={{ color: 'var(--aurora-dim)' }}>/{BADGES.length}</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>earned</p>
            </div>
          )}
        </div>

        {auditionStats ? (
          <AuditionBadges stats={auditionStats} compact={false} />
        ) : (
          /* Placeholder — show all locked until stats load */
          <div>
            <h4 className="aurora-eyebrow mb-3" style={{ color: 'var(--aurora-dim)' }}>Start logging auditions to earn badges</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {BADGES.map((b) => (
                <div
                  key={b.id}
                  title={`${b.name}: ${b.desc}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl opacity-50 grayscale"
                  style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)' }}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--aurora-sub)' }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Notifications ── H-09: the M/W/F audition nudge previously went to
           every active user with no way out. The backend honours
           `audition_nudges_opt_out` for nudge-type sends only, so transactional
           notifications (your notes are ready, a reader replied) keep working
           either way — which is why this is scoped as "reminders", not "all
           notifications". Lives here rather than behind a deep link because an
           opt-out nobody can find is not an opt-out. */}
      <div className="aurora-card p-6 mt-6">
        <h2 className="aurora-display text-lg mb-2" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>
          Notifications
        </h2>
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="block text-sm font-semibold" style={{ color: 'var(--aurora-text)' }}>
              Audition reminders
            </span>
            <span className="block text-sm mt-1" style={{ color: 'var(--aurora-sub)' }}>
              An occasional nudge when it&apos;s a good day to tape. Turning this off
              won&apos;t stop alerts about your own tapes or messages.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={!auditionNudgesOptOut}
            onChange={(e) => dispatch(patchUserSettings({ audition_nudges_opt_out: !e.target.checked }))}
            className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[color:var(--aurora-heritage-gold)]"
          />
        </label>
      </div>

      {/* ── Privacy & Account ── Apple guideline 5.1.1(v) requires an
           in-app account deletion option for any app that supports
           account creation. Surface it clearly here so reviewers and
           users can find it without digging through menus. */}
      <div className="aurora-card p-6 mt-6">
        <h2 className="aurora-display text-lg mb-2" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>
          Privacy &amp; Account
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--aurora-sub)' }}>
          Permanently delete your account and all associated data.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteAccount(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: 'rgba(255,130,128,0.10)',
            border: '1px solid rgba(255,130,128,0.35)',
            color: 'var(--aurora-rose)',
          }}
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      <DeleteAccountModal open={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />

    </div>
  );
}
