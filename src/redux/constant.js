// Base URL — must be supplied via VITE_API_URL at build time in production.
// Localhost fallback ONLY when running `vite dev` (DEV mode); a missing
// env var in a production build is a hard failure so we never ship an
// iOS bundle that silently points at localhost (it would 100% fail review
// and confuse users).
const envApiUrl = import.meta.env.VITE_API_URL;
if (!envApiUrl && !import.meta.env.DEV) {
  throw new Error('VITE_API_URL must be set for production builds. Got: ' + envApiUrl);
}
export const baseURL = envApiUrl || 'http://localhost:8000/api';

// Endpoints
const endPoints = {
  /*********************** Authentication *************************/
  // Login User
  login: `${baseURL}/v1/users/login/`,

  // Register User
  register: `${baseURL}/v1/users/personal-info-registration/`,

  // Forgot Password
  forgotPassword: `${baseURL}/v1/users/forgotpassword/`,

  // Reset Password
  resetPassword: `${baseURL}/v1/users/reset-password/`,

  // Update Profile
  updateProfile: `${baseURL}/v1/users/update-profile/`,

  // Update Password
  updatePassword: `${baseURL}/v1/users/passwordupdate/`,

  // Profile Details
  profileDetails: `${baseURL}/v1/users/profile-details/`,

  // Add Coach Profile
  addCoachProfile: `${baseURL}/v1/users/actor-coach/`,

  // Switch Role
  switchRole: `${baseURL}/v1/users/switch-role/`,

  /*********************** Authentication *************************/

  /************************* Auditions ****************************/
  // Casting Auditions
  castingAuditions: `${baseURL}/v1/auditions/casting-auditions/`,

  // Self Auditions
  selfAudition: `${baseURL}/v1/auditions/self-auditions/`,
  actorCastingAuditions: `${baseURL}/v1/auditions/actor-casting-auditions/`,

  auditionTracker: `${baseURL}/v1/auditions/tracker/`,

  auditionMaterial: `${baseURL}/v1/auditions/self-materials/`,
  getAuditionMaterial: `${baseURL}/v1/auditions/self-materials/get_audition_materials`,
  /************************* Auditions ****************************/


  /************************* Notifications ************************/
  myNotifications: `${baseURL}/v1/notifications/my-notifications/`,
  markNotificationRead: `${baseURL}/v1/notifications/mark-read/`,
  pushSubscribe: `${baseURL}/v1/notifications/push/subscribe/`,
  pushVapidKey: `${baseURL}/v1/notifications/push/vapid-key/`,

  /************************* Notifications ************************/

  /************************Script ************************/
  scripts: `${baseURL}/v1/scene-study/scripts/`,
  scriptAnalysis: `${baseURL}/v1/scene-study`,
  coachScriptScenes: `${baseURL}/v1/scene-study/coach/scripts/`,
  updateScriptMetadata: `${baseURL}/v1/scene-study/script/`,
  rehearsalStart: `${baseURL}/v1/scene-study/rehearsal/start/`,
  rehearsalComplete: `${baseURL}/v1/scene-study/rehearsal/complete/`,
  /*************************Script************************/

  /************************* Coaches ************************/
  coaches: `${baseURL}/v1/users/coaches/`,
  /************************* Coaches ************************/

  /******************** Dashboard Panels ********************/
  // Booking locations & membership
  locations: `${baseURL}/v1/bookings/locations/`,
  membership: `${baseURL}/v1/bookings/membership/`,

  // Dashboard auditions (generic)
  auditions: `${baseURL}/v1/auditions/`,
  auditionStats: `${baseURL}/v1/auditions/stats/`,

  // Reports
  reports: `${baseURL}/v1/auditions/reports/`,

  // Audition scripts (distinct from scene-study scripts)
  auditionScripts: `${baseURL}/v1/auditions/scripts/`,

  // Submissions
  submissions: `${baseURL}/v1/auditions/submissions/`,

  // Profile
  profile: `${baseURL}/v1/users/profile/`,

  // Rehearsals
  rehearsals: `${baseURL}/v1/rehearsals/`,
  searchUsers: `${baseURL}/v1/users/search/`,
  roomInvite: `${baseURL}/v1/rehearsals/invite/`,

  // Community
  communityPosts: `${baseURL}/v1/community/posts/`,

  // AI
  cdFeedback: `${baseURL}/v1/ai/cd-feedback/`,
  generateScene: `${baseURL}/v1/ai/generate-scene/`,
  parseBreakdown: `${baseURL}/v1/ai/parse-breakdown/`,
  formatScript: `${baseURL}/v1/ai/format-script/`,
  scenePartner: `${baseURL}/v1/ai/scene-partner/`,
  transcribe: `${baseURL}/v1/ai/transcribe/`,
  tts: `${baseURL}/v1/ai/tts/`,

  // Jericho — Self-Evolving AI Coach
  actorMemory: `${baseURL}/v1/ai/actor-memory/`,
  sessionLog: `${baseURL}/v1/ai/session-log/`,
  aiInsights: `${baseURL}/v1/ai/insights/`,
  aiEvolution: `${baseURL}/v1/ai/evolution/`,
  jerichoCoach: `${baseURL}/v1/ai/jericho/coach/`,

  // Push Notifications
  pushSubscribe: `${baseURL}/v1/notifications/push/subscribe/`,
  pushVapidKey: `${baseURL}/v1/notifications/push/vapid-key/`,

  // Wix Bookings
  wixServices: `${baseURL}/v1/wix/services/`,
  wixAvailability: `${baseURL}/v1/wix/availability/`,
  wixBook: `${baseURL}/v1/wix/book/`,
  wixSync: `${baseURL}/v1/wix/sync/`,
  /******************** Dashboard Panels ********************/

  // Subscriptions
  subscriptionStatus: `${baseURL}/v1/subscriptions/status/`,
  subscriptionCheckout: `${baseURL}/v1/subscriptions/checkout/`,
  subscriptionPortal: `${baseURL}/v1/subscriptions/portal/`,
  tokenBalance: `${baseURL}/v1/subscriptions/tokens/`,
  spendToken: `${baseURL}/v1/subscriptions/tokens/spend/`,
};

export default endPoints;
