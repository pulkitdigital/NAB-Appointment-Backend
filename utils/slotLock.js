/**
 * Utility to manage slot locking mechanism to prevent double-booking
 */

const lockedSlots = new Map(); // Store locked slots with timestamps

/**
 * Lock a slot for a user for a specified duration
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeSlot - Time slot (HH:MM format)
 * @param {number} lockDuration - Lock duration in milliseconds (default: 5 minutes)
 * @returns {boolean} True if slot was locked successfully
 */
export const lockSlot = (date, timeSlot, lockDuration = 5 * 60 * 1000) => {
  const key = `${date}__${timeSlot}`;
  const now = Date.now();
  
  // Check if slot is already locked and not expired
  if (lockedSlots.has(key)) {
    const lockData = lockedSlots.get(key);
    if (lockData.expiresAt > now) {
      return false; // Slot is already locked
    }
    // Remove expired lock
    lockedSlots.delete(key);
  }
  
  // Lock the slot
  lockedSlots.set(key, {
    lockedAt: now,
    expiresAt: now + lockDuration,
  });
  
  return true;
};

/**
 * Release a locked slot
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeSlot - Time slot (HH:MM format)
 * @returns {boolean} True if slot was released
 */
export const releaseSlot = (date, timeSlot) => {
  const key = `${date}__${timeSlot}`;
  return lockedSlots.delete(key);
};

/**
 * Check if a slot is currently locked
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeSlot - Time slot (HH:MM format)
 * @returns {boolean} True if slot is locked
 */
export const isSlotLocked = (date, timeSlot) => {
  const key = `${date}__${timeSlot}`;
  
  if (!lockedSlots.has(key)) {
    return false;
  }
  
  const lockData = lockedSlots.get(key);
  const isExpired = lockData.expiresAt <= Date.now();
  
  if (isExpired) {
    lockedSlots.delete(key);
    return false;
  }
  
  return true;
};

/**
 * Get time remaining for a locked slot (in milliseconds)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} timeSlot - Time slot (HH:MM format)
 * @returns {number} Milliseconds remaining, or 0 if not locked
 */
export const getSlotLockTime = (date, timeSlot) => {
  const key = `${date}__${timeSlot}`;
  
  if (!lockedSlots.has(key)) {
    return 0;
  }
  
  const lockData = lockedSlots.get(key);
  const timeRemaining = lockData.expiresAt - Date.now();
  
  return Math.max(0, timeRemaining);
};

/**
 * Cleanup expired locks (run periodically)
 */
export const cleanupExpiredLocks = () => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, lockData] of lockedSlots.entries()) {
    if (lockData.expiresAt <= now) {
      lockedSlots.delete(key);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
};

/**
 * Periodically cleanup expired locks (run every 1 minute)
 */
export const startCleanupInterval = (interval = 60 * 1000) => {
  const cleanupId = setInterval(() => {
    const cleaned = cleanupExpiredLocks();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired slot locks`);
    }
  }, interval);
  
  return cleanupId;
};
