// Base URL
export const baseURL = import.meta.env.VITE_API_ENDPOINT;
console.log('base url', baseURL);


// Endpoints
const endPoints = {
  /*********************** Authentication*************************/
  // Login User
  login: `${baseURL}/api/login`,
  register: `${baseURL}/api/register`,
};

export default endPoints;
