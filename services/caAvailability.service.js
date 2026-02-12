// Backend/services/caAvailability.service.js
import admin from 'firebase-admin';

const getDb = () => admin.firestore();

const getBusinessRef = (businessId) => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  return getDb().collection('businesses').doc(businessId);
};

/**
 * Check if a CA is available for a specific date and time
 * @param {string} businessId - Business ID
 * @param {string} caId - CA ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} timeSlot - Time slot (HH:MM)
 * @param {number} duration - Duration in minutes
 * @returns {Promise<boolean>} - True if available, false if unavailable
 */
export const isCAAvailable = async (businessId, caId, date, timeSlot, duration) => {
  try {
    if (!caId) {
      return true; // If no CA assigned, consider available
    }

    const businessRef = getBusinessRef(businessId);
    const caDoc = await businessRef.collection('CA').doc(caId).get();

    if (!caDoc.exists) {
      console.log(`CA ${caId} not found`);
      return false;
    }

    const caData = caDoc.data();
    const unavailableSlots = caData.unavailable_slots || [];

    if (unavailableSlots.length === 0) {
      return true; // No unavailable slots, CA is available
    }

    // Parse appointment time
    const [appointmentHour, appointmentMinute] = timeSlot.split(':').map(Number);
    const appointmentStartMinutes = appointmentHour * 60 + appointmentMinute;
    const appointmentEndMinutes = appointmentStartMinutes + duration;

    // Check if appointment overlaps with any unavailable slot on this date
    for (const slot of unavailableSlots) {
      if (slot.date !== date) {
        continue; // Different date, skip
      }

      // Parse unavailable slot times
      const [slotStartHour, slotStartMinute] = slot.start_time.split(':').map(Number);
      const [slotEndHour, slotEndMinute] = slot.end_time.split(':').map(Number);
      
      const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;

      // Check for overlap
      // Appointment is blocked if it starts before unavailable slot ends AND ends after unavailable slot starts
      const hasOverlap = appointmentStartMinutes < slotEndMinutes && appointmentEndMinutes > slotStartMinutes;

      if (hasOverlap) {
        console.log(`❌ CA ${caId} is unavailable on ${date} from ${slot.start_time} to ${slot.end_time}`);
        console.log(`   Appointment: ${timeSlot} (${duration} min) conflicts with unavailable slot`);
        return false;
      }
    }

    return true; // No conflicts found, CA is available

  } catch (error) {
    console.error('Error checking CA availability:', error);
    return false; // On error, consider unavailable for safety
  }
};

/**
 * Get all available CAs for a specific date and time
 * @param {string} businessId - Business ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} timeSlot - Time slot (HH:MM)
 * @param {number} duration - Duration in minutes
 * @returns {Promise<Array>} - Array of available CA objects
 */
export const getAvailableCAs = async (businessId, date, timeSlot, duration) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const casSnapshot = await businessRef.collection('CA').where('status', '==', 'active').get();

    const availableCAs = [];

    for (const doc of casSnapshot.docs) {
      const caId = doc.id;
      const isAvailable = await isCAAvailable(businessId, caId, date, timeSlot, duration);

      if (isAvailable) {
        const caData = doc.data();
        availableCAs.push({
          id: doc.id,
          name: caData.name,
          email: caData.email,
          specialization: caData.specialization,
          experience: caData.experience,
        });
      }
    }

    console.log(`✅ Found ${availableCAs.length} available CAs for ${date} ${timeSlot}`);
    return availableCAs;

  } catch (error) {
    console.error('Error getting available CAs:', error);
    return [];
  }
};

/**
 * Auto-assign an available CA to an appointment
 * @param {string} businessId - Business ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} timeSlot - Time slot (HH:MM)
 * @param {number} duration - Duration in minutes
 * @returns {Promise<object|null>} - Assigned CA object or null
 */
export const autoAssignCA = async (businessId, date, timeSlot, duration) => {
  try {
    const availableCAs = await getAvailableCAs(businessId, date, timeSlot, duration);

    if (availableCAs.length === 0) {
      console.log('❌ No available CAs for auto-assignment');
      return null;
    }

    // Simple strategy: assign to the first available CA
    // You can implement more complex logic here (e.g., load balancing, specialization matching)
    const assignedCA = availableCAs[0];
    
    console.log(`✅ Auto-assigned CA: ${assignedCA.name} (${assignedCA.id})`);
    return assignedCA;

  } catch (error) {
    console.error('Error auto-assigning CA:', error);
    return null;
  }
};