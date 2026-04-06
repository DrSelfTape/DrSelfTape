import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Upload, Loader2, Check, User, AlertCircle } from 'lucide-react';
import { fetchProfileThunk, updateProfileThunk } from '../../../redux/features/profile/profileSlice';
import ProfileCompleteBadge from '../../../components/ProfileCompleteBadge';
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
  const { profile, loading, updateLoading } = useSelector((s) => s.profile);
  const auditionStats = useSelector((s) => s.auditionTracker?.stats?.data || s.auditions?.stats?.data || null);
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showBadge, setShowBadge] = useState(false);
  const hadProfileBefore = useRef(false);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    dispatch(fetchAuditionStatsThunk());
  }, [dispatch]);

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

  const handleFilePreview = (file, setPreview, setFile) => {
    if (!file) return;
    setFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
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

    const result = await dispatch(updateProfileThunk(fd));
    if (updateProfileThunk.fulfilled.match(result)) {
      const wasIncomplete = !hadProfileBefore.current;
      const hasPhoto = avatarFile || headshotFile;
      hadProfileBefore.current = true;

      setAvatarFile(null);
      setHeadshotFile(null);
      setResumeFile(null);

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
        <Loader2 className="w-8 h-8 animate-spin text-[#C855F0]" />
      </div>
    );
  }

  const completion = getCompletionPercent(profile);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>My Profile</h1>

      {/* Badge */}
      <ProfileCompleteBadge show={showBadge} onClose={() => setShowBadge(false)} />

      {/* Validation Popup */}
      {validationPopup && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{ background: 'var(--bg-elevated)' }}
            style={{ animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Complete Your Profile</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Please fill in the following before saving:
            </p>
            <div className="space-y-2 mb-6">
              {validationPopup.map((field) => (
                <div key={field} className="flex items-center gap-2 px-3 py-2 bg-red-500/8 border border-red-500/15 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-sm text-red-300 font-medium">{field}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setValidationPopup(null)}
              className="w-full py-3 rounded-xl bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold text-sm transition-colors"
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
          <div className="rounded-xl shadow-sm p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {/* Avatar */}
            <div className="relative mx-auto w-32 h-32 mb-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#C855F0]/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#C855F0] flex items-center justify-center border-4 border-[#C855F0]/20">
                  <span className="text-white text-3xl font-bold">
                    {getInitials(profile)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 bg-[#C855F0] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#A040C8] transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) =>
                  handleFilePreview(e.target.files[0], setAvatarPreview, setAvatarFile)
                }
              />
            </div>

            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {profile?.first_name || 'First'} {profile?.last_name || 'Last'}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 text-xs font-medium rounded-full bg-[#C855F0]/10 text-[#C855F0] capitalize">
              {profile?.role || 'actor'}
            </span>

            {/* Completion */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: 'var(--text-secondary)' }}>Profile completion</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{completion}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div
                  className="h-full bg-[#C855F0] rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="rounded-xl shadow-sm p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>First Name <span className="text-[#C855F0]">*</span></label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-active)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Last Name <span className="text-[#C855F0]">*</span></label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-active)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input
                    value={profile?.email || ''}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg cursor-not-allowed" style={{ border: '1px solid var(--border-active)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                  <input
                    name="phone_no"
                    value={form.phone_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-active)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Actor Info */}
            <div className="rounded-xl shadow-sm p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Actor Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Tell casting directors about yourself..."
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors resize-none" style={{ border: '1px solid var(--border-active)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reel URL</label>
                    <input
                      name="reel_url"
                      value={form.reel_url}
                      onChange={handleChange}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Based In</label>
                    <input
                      name="based_in"
                      value={form.based_in}
                      onChange={handleChange}
                      placeholder="Los Angeles, CA"
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Union Status <span className="text-[#C855F0]">*</span></label>
                    <select
                      name="union"
                      value={form.union}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select union status</option>
                      <option value="sag-aftra">SAG-AFTRA</option>
                      <option value="aea">AEA</option>
                      <option value="non-union">Non-Union</option>
                      <option value="fi-core">Fi-Core</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Years of Experience</label>
                    <input
                      name="years_experience"
                      type="number"
                      min="0"
                      max="60"
                      value={form.years_experience}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Genre Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Genre Types</label>
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
                            ? 'bg-[#C855F0] border-[#C855F0] text-white'
                            : 'bg-transparent hover:border-[#C855F0]/50'
                        }`}
                        style={!form.genres.includes(g) ? { borderColor: 'var(--border-active)', color: 'var(--text-secondary)' } : {}}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="rounded-xl shadow-sm p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Headshot */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Headshot <span className="text-[#C855F0]">*</span></label>
                  <div
                    onClick={() => headshotInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#C855F0] transition-colors" style={{ borderColor: 'var(--border-active)' }}
                  >
                    {headshotPreview ? (
                      <img
                        src={headshotPreview}
                        alt="Headshot"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload headshot</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={headshotInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleFilePreview(e.target.files[0], setHeadshotPreview, setHeadshotFile)
                    }
                  />
                </div>

                {/* Resume */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Resume (PDF)</label>
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#C855F0] transition-colors" style={{ borderColor: 'var(--border-active)' }}
                  >
                    {resumeFile ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{resumeFile.name}</p>
                      </div>
                    ) : profile?.actor_profile?.resume_file ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Resume uploaded</p>
                        <p className="text-xs text-[#C855F0] mt-1">Click to replace</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload resume</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF only</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
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
                className="px-6 py-2.5 bg-[#C855F0] text-white font-medium rounded-lg hover:bg-[#A040C8] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {updateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Achievements ─────────────────────────────────── */}
      <div className="rounded-2xl p-6 mt-6" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Achievements</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Milestones earned from your audition activity</p>
          </div>
          {auditionStats && (
            <div className="text-right">
              <p className="text-2xl font-bold text-[#C855F0]">
                {BADGES.filter(b => b.check(auditionStats)).length}
                <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>/{BADGES.length}</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>earned</p>
            </div>
          )}
        </div>

        {auditionStats ? (
          <AuditionBadges stats={auditionStats} compact={false} />
        ) : (
          /* Placeholder — show all locked until stats load */
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Start logging auditions to earn badges</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {BADGES.map((b) => (
                <div
                  key={b.id}
                  title={`${b.name}: ${b.desc}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl opacity-50 grayscale"
                  style={{ border: '1px solid var(--border-active)', background: 'var(--bg-surface)' }}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
