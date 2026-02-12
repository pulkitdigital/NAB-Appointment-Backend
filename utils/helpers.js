import crypto from 'crypto';

/**
 * Generate unique reference ID for booking
 * Format: APT-YYYYMMDD-XXXX (e.g., APT-20240209-A1B2)
 */
export const generateReferenceId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `APT-${dateStr}-${random}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate mobile number (Indian format)
 */
export const isValidMobile = (mobile) => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDate = (dateStr) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date >= today;
};

/**
 * Check if date is within advance booking limit
 */
export const isWithinBookingLimit = (dateStr, advanceDays) => {
  const date = new Date(dateStr);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceDays);
  
  return date <= maxDate;
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};

/**
 * Calculate end time for a slot
 */
export const calculateEndTime = (startTime, durationMinutes) => {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
};