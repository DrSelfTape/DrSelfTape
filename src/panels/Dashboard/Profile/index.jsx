import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Upload, Loader2, Check, User } from 'lucide-react';
import { fetchProfileThunk, updateProfileThunk } from '../../../redux/features/profile/profileSlice';

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
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    dispatch(fetchProfileThunk());
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== undefined && val !== null) fd.append(key, val);
    });
    if (avatarFile) fd.append('user_image', avatarFile);
    if (headshotFile) fd.append('headshot', headshotFile);
    if (resumeFile) fd.append('resume_file', resumeFile);

    const result = await dispatch(updateProfileThunk(fd));
    if (updateProfileThunk.fulfilled.match(result)) {
      setToast('Profile updated!');
      setAvatarFile(null);
      setHeadshotFile(null);
      setResumeFile(null);
      setTimeout(() => setToast(null), 3000);
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
      <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <Check className="w-5 h-5" />
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Avatar Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-6 text-center">
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

            <h2 className="text-lg font-semibold text-white">
              {profile?.first_name || 'First'} {profile?.last_name || 'Last'}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 text-xs font-medium rounded-full bg-[#C855F0]/10 text-[#C855F0] capitalize">
              {profile?.role || 'actor'}
            </span>

            {/* Completion */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-[#999999]">Profile completion</span>
                <span className="font-semibold text-white">{completion}%</span>
              </div>
              <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
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
            <div className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">First Name</label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">Last Name</label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">Email</label>
                  <input
                    value={profile?.email || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-[#3A3A3A] rounded-lg bg-[#1E1E1E] text-[#999999] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">Phone</label>
                  <input
                    name="phone_no"
                    value={form.phone_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Actor Info */}
            <div className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Actor Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Tell casting directors about yourself..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#999999] mb-1">Reel URL</label>
                    <input
                      name="reel_url"
                      value={form.reel_url}
                      onChange={handleChange}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#999999] mb-1">Address</label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C855F0]/50 focus:border-[#C855F0] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Headshot */}
                <div>
                  <label className="block text-sm font-medium text-[#999999] mb-1">Headshot</label>
                  <div
                    onClick={() => headshotInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#C855F0] transition-colors"
                  >
                    {headshotPreview ? (
                      <img
                        src={headshotPreview}
                        alt="Headshot"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto text-[#666666] mb-2" />
                        <p className="text-sm text-[#999999]">Upload headshot</p>
                        <p className="text-xs text-[#666666] mt-1">JPG, PNG, WEBP</p>
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
                  <label className="block text-sm font-medium text-[#999999] mb-1">Resume (PDF)</label>
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#C855F0] transition-colors"
                  >
                    {resumeFile ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-[#999999] font-medium truncate">{resumeFile.name}</p>
                      </div>
                    ) : profile?.actor_profile?.resume_file ? (
                      <div className="py-4">
                        <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-[#999999]">Resume uploaded</p>
                        <p className="text-xs text-[#C855F0] mt-1">Click to replace</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 mx-auto text-[#666666] mb-2" />
                        <p className="text-sm text-[#999999]">Upload resume</p>
                        <p className="text-xs text-[#666666] mt-1">PDF only</p>
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
    </div>
  );
}
