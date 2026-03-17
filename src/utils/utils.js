import { useEffect } from 'react';
import { setAuthToken } from '../redux/http';
import { useStoreData } from '../hooks/useStoreData';

export const isAuthenticatedUser = () => {
  const { token } = useStoreData();

  if (token) {
    setAuthToken(token);
    return true;
  } else {
    return false;
  }
};

// Email Validation
export const validateEmail = (email) => {
  var emailRegex = /^\w.+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
  return emailRegex.test(email);
};

// Password Validation
export const validatePassword = (password) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
  specialChar: /[!@#$%^&*()_\-+=<>?{}[\]~`|\\:;"',./]/.test(password),
});

// Empty Check
export const isEmpty = (obj) => {
  return Object.values(obj)?.some(
    (value) =>
      value === null ||
      value === undefined ||
      value === '' ||
      Number.isNaN(value)
  );
};

// Error Check
export const isError = (obj) => {
  return Object.values(obj)?.some(
    (value) => value !== null && value !== undefined && value !== ''
  );
};

export function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// FN TO GET NAME OF THE PAGE
export const getPageName = (path) => {
  let pageName = '';
  const routeName = path?.includes('-') ? path?.split('-') : path;
  if (typeof routeName === 'object') {
    pageName = routeName
      ?.map((item) => item?.charAt(0)?.toLocaleUpperCase() + item?.slice(1))
      ?.join(' ');
  } else {
    pageName = routeName?.charAt(0)?.toLocaleUpperCase() + routeName?.slice(1);
  }
  return pageName;
};

export const getStatusStyles = (status) => {
  switch (status?.toLowerCase()) {
    case 'applied':
      return 'bg-blue-500';
    case 'scheduled':
      return 'bg-amber-500';
    case 'callback':
      return 'bg-teal-500';
    case 'booked':
      return 'bg-green-600';
    case 'rejected':
      return 'bg-danger';
    default:
      return 'bg-gray-400';
  }
};

// global utility function
export const clearFileInputById = (id) => {
  const fileInput = document.getElementById(id);
  if (fileInput) {
    fileInput.value = ''; // clear the file input
    const event = new Event('change', { bubbles: true }); // trigger change if needed
    fileInput.dispatchEvent(event);
  }
};

export const formatRelativeTime = (dateInput) => {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export const filterAvailableReaders = (readers, currentUserEmail) => {
  if (!Array.isArray(readers) || readers.length === 0) {
    return [];
  }

  if (!currentUserEmail) {
    // If no user email, only filter by is_available_now
    return readers.filter((reader) => reader.is_available_now === true);
  }

  // Normalize emails for comparison (lowercase, trim)
  const normalizedUserEmail = currentUserEmail.toLowerCase().trim();

  return readers.filter((reader) => {
    // Exclude if is_available_now is false
    if (reader.is_available_now === false) {
      return false;
    }

    // Exclude if email matches current user's email
    const readerEmail = reader.email || reader.user_email || '';
    const normalizedReaderEmail = readerEmail.toLowerCase().trim();
    
    if (normalizedReaderEmail && normalizedReaderEmail === normalizedUserEmail) {
      return false;
    }

    return true;
  });
};