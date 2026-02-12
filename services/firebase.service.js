// Backend/services/firebase.service.js
import { db, admin } from '../config/firebase.js';
import { getCurrentCounter } from '../utils/referenceIdHelper.js'; // ✅ UPDATED: Changed from genuineIdHelper

/**
 * Generate readable ID from name
 */
const generateReadableId = (name) => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
  
  const timestamp = Date.now().toString().slice(-6);
  return `${slug}-${timestamp}`;
};

/**
 * Get business reference
 */
const getBusinessRef = (businessId) => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  return db().collection('businesses').doc(businessId);
};

// ==================== SYSTEM SETTINGS ====================

/**
 * Get system settings
 */
export const getSystemSettings = async (businessId) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const settingsDoc = await businessRef
      .collection('system')
      .doc('settings')
      .get();
    
    if (!settingsDoc.exists) {
      throw new Error('System settings not found');
    }
    
    return settingsDoc.data();
  } catch (error) {
    console.error('Error fetching system settings:', error);
    throw error;
  }
};

/**
 * Update system settings
 */
export const updateSystemSettings = async (businessId, settingsData) => {
  try {
    const businessRef = getBusinessRef(businessId);
    
    await businessRef
      .collection('system')
      .doc('settings')
      .set(settingsData, { merge: true });
    
    return settingsData;
  } catch (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
};

// ==================== COUNTER MANAGEMENT ====================

/**
 * Get current reference ID counter
 * ✅ UPDATED: Function name and description updated
 */
export const getReferenceIdCounter = async (businessId) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const counterInfo = await getCurrentCounter(businessRef);
    
    return {
      current_year: counterInfo.year,
      current_counter: counterInfo.counter,
      next_id: `NAB_${counterInfo.year}_${String(counterInfo.counter + 1).padStart(4, '0')}`
    };
  } catch (error) {
    console.error('Error getting counter:', error);
    throw error;
  }
};

// ✅ BACKWARD COMPATIBILITY: Keep old function name for existing code
export const getGenuineIdCounter = getReferenceIdCounter;

// ==================== CA MANAGEMENT ====================

/**
 * Get all CAs for a business
 */
export const getCAList = async (businessId) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const casSnapshot = await businessRef.collection('CA').get();
    
    const cas = [];
    casSnapshot.forEach(doc => {
      cas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return cas;
  } catch (error) {
    console.error('Error fetching CA list:', error);
    throw error;
  }
};

/**
 * Create new CA
 */
export const createCA = async (businessId, caData) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const caId = generateReadableId(caData.name);
    
    const caRef = businessRef.collection('CA').doc(caId);
    
    await caRef.set({
      ...caData,
      status: caData.status || 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { id: caId, ...caData };
  } catch (error) {
    console.error('Error creating CA:', error);
    throw error;
  }
};

/**
 * Update CA
 */
export const updateCA = async (businessId, caId, caData) => {
  try {
    const businessRef = getBusinessRef(businessId);
    
    await businessRef.collection('CA').doc(caId).update({
      ...caData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { id: caId, ...caData };
  } catch (error) {
    console.error('Error updating CA:', error);
    throw error;
  }
};

/**
 * Delete CA
 */
export const deleteCA = async (businessId, caId) => {
  try {
    const businessRef = getBusinessRef(businessId);
    await businessRef.collection('CA').doc(caId).delete();
    
    return { id: caId };
  } catch (error) {
    console.error('Error deleting CA:', error);
    throw error;
  }
};

// ==================== APPOINTMENT MANAGEMENT ====================

/**
 * Get available CA for assignment
 */
export const getAvailableCA = async (businessId, date, timeSlot) => {
  try {
    const businessRef = getBusinessRef(businessId);
    
    // Get all active CAs
    const casSnapshot = await businessRef
      .collection('CA')
      .where('status', '==', 'active')
      .get();
    
    if (casSnapshot.empty) {
      return null;
    }
    
    // Get appointments for this date/time
    const appointmentsSnapshot = await businessRef
      .collection('appointments')
      .where('date', '==', date)
      .where('time_slot', '==', timeSlot)
      .where('status', 'in', ['confirmed', 'pending'])
      .get();
    
    const assignedCAIds = new Set();
    appointmentsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.assigned_ca) {
        assignedCAIds.add(data.assigned_ca);
      }
    });
    
    // Find first available CA
    for (const doc of casSnapshot.docs) {
      if (!assignedCAIds.has(doc.id)) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting available CA:', error);
    throw error;
  }
};

/**
 * Create appointment
 * ⚠️ NOTE: This function is kept for backward compatibility
 * However, for new appointments with reference ID as document ID,
 * use the booking.controller.js createBookingOrder function instead
 */
export const createAppointment = async (businessId, appointmentData) => {
  try {
    const businessRef = getBusinessRef(businessId);
    
    // ⚠️ WARNING: This still uses generateReadableId
    // For proper reference ID (NAB_YYYY_0001), use booking.controller.js
    const appointmentId = generateReadableId(appointmentData.customer_name);
    
    const appointmentRef = businessRef.collection('appointments').doc(appointmentId);
    
    await appointmentRef.set({
      ...appointmentData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      id: appointmentId,
      ...appointmentData
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

/**
 * Get all appointments
 */
export const getAllAppointments = async (businessId, filters = {}) => {
  try {
    const businessRef = getBusinessRef(businessId);
    let query = businessRef.collection('appointments');
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    if (filters.date) {
      query = query.where('date', '==', filters.date);
    }
    
    if (filters.ca_id) {
      query = query.where('assigned_ca', '==', filters.ca_id);
    }
    
    const snapshot = await query.orderBy('created_at', 'desc').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting appointments:', error);
    throw error;
  }
};

/**
 * Update appointment
 */
export const updateAppointment = async (businessId, appointmentId, appointmentData) => {
  try {
    const businessRef = getBusinessRef(businessId);
    
    await businessRef
      .collection('appointments')
      .doc(appointmentId)
      .update({
        ...appointmentData,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    return { id: appointmentId, ...appointmentData };
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

/**
 * Get single appointment
 */
export const getAppointment = async (businessId, appointmentId) => {
  try {
    const businessRef = getBusinessRef(businessId);
    const doc = await businessRef
      .collection('appointments')
      .doc(appointmentId)
      .get();
    
    if (!doc.exists) {
      throw new Error('Appointment not found');
    }
    
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting appointment:', error);
    throw error;
  }
};