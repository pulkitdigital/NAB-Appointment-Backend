import { getAvailableCA } from '../services/firebase.service.js';
import { sanitizeInput } from './helpers.js';

/**
 * Auto-assign CA to appointment
 * @param {string} date - Appointment date (YYYY-MM-DD)
 * @param {string} timeSlot - Appointment time slot (HH:MM)
 * @returns {Promise<object>} Assigned CA object with id and name
 */
export const autoAssignCA = async (date, timeSlot) => {
  try {
    const ca = await getAvailableCA(date, timeSlot);
    
    if (!ca) {
      throw new Error('No available CA for assignment');
    }
    
    return {
      id: ca.id,
      name: sanitizeInput(ca.name),
      email: ca.email,
    };
  } catch (error) {
    console.error('Error auto-assigning CA:', error);
    throw error;
  }
};

/**
 * Validate CA assignment data
 * @param {object} assignmentData - Assignment data
 * @returns {object} { isValid: boolean, errors: array }
 */
export const validateCAAssignment = (assignmentData) => {
  const errors = [];
  
  if (!assignmentData.appointmentId || typeof assignmentData.appointmentId !== 'string') {
    errors.push('Invalid appointmentId');
  }
  
  if (!assignmentData.caId || typeof assignmentData.caId !== 'string') {
    errors.push('Invalid caId');
  }
  
  if (!assignmentData.caName || typeof assignmentData.caName !== 'string') {
    errors.push('Invalid caName');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format CA assignment response
 */
export const formatCAAssignmentResponse = (ca) => {
  return {
    success: true,
    data: {
      caId: ca.id,
      caName: ca.name,
      caEmail: ca.email,
      assignedAt: new Date().toISOString(),
    },
  };
};
