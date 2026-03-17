import { updateScriptMetadata } from './features/sceneStudyScripts/sceneStudyScriptsSlice';

// Base URL
export const baseURL = 'https://drselftape-api.testerp.co/api';

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

  /************************* Bookings ****************************/
  bookings: `${baseURL}/v1/bookings/`,
  bookingDetail: (id) => `${baseURL}/v1/bookings/${id}/`,
  /************************* Bookings ****************************/

  /************************* Notifications ************************/
  myNotifications: `${baseURL}/v1/notifications/my-notifications/`,
  markNotificationRead: `${baseURL}/v1/notifications/mark-read/`,

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
};

export default endPoints;
