import { setAuthToken } from '../redux/http';

export const isAuthenticatedUser = () => {
  const token = false;
  if (token) {
    setAuthToken(token);
    return true;
  } else {
    return false;
  }
};

export const currentRole = 'agent';
export const isValidRole =
  currentRole === 'actor' ||
  currentRole === 'agent' ||
  currentRole === 'castingDirector' ||
  currentRole === 'admin'
    ? true
    : false;

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  export const checkPasswordRequirements = (password) => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  });