// Backend/controllers/admin.controller.js - COMPLETE VERSION
import admin from 'firebase-admin';
import {
  getCAList,
  createCA as createCAService,
  updateCA as updateCAService,
  deleteCA as deleteCAService,
  getSystemSettings as getSystemSettingsService,
  updateSystemSettings as updateSystemSettingsService,
  getAllAppointments,
  updateAppointment,
} from '../services/firebase.service.js';
import { uploadImage, deleteImage, updateProfilePicture } from '../services/imageUpload.service.js';

// ✅ Database helper
const getDb = () => admin.firestore();

// ✅ Get business reference
const getBusinessRef = (businessId) => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  return getDb().collection('businesses').doc(businessId);
};

// ==================== DASHBOARD ====================

/**
 * GET /api/admin/dashboard/stats?businessId=nab-consultancy
 * Get dashboard statistics
 */
export const getDashboard = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const businessRef = getBusinessRef(businessId);

    // Get all appointments
    const appointmentsSnapshot = await businessRef
      .collection('appointments')
      .get();

    let totalAppointments = 0;
    let pendingAppointments = 0;
    let confirmedAppointments = 0;
    let completedAppointments = 0;
    let cancelledAppointments = 0;
    let totalRevenue = 0;

    appointmentsSnapshot.forEach(doc => {
      const data = doc.data();
      totalAppointments++;

      if (data.payment_status === 'completed') {
        totalRevenue += data.amount || 0;
      }

      switch (data.status) {
        case 'pending':
          pendingAppointments++;
          break;
        case 'confirmed':
          confirmedAppointments++;
          break;
        case 'completed':
          completedAppointments++;
          break;
        case 'cancelled':
          cancelledAppointments++;
          break;
      }
    });

    // Get total CAs
    const casSnapshot = await businessRef.collection('CA').get();
    const totalCAs = casSnapshot.size;

    res.json({
      success: true,
      data: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        totalCAs,
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== APPOINTMENTS ====================

/**
 * GET /api/admin/appointments?businessId=nab-consultancy&status=pending&date=2026-02-10
 * Get all appointments with filters
 */
export const getAppointments = async (req, res) => {
  try {
    const { businessId, status, date, ca_id } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    let query = businessRef.collection('appointments');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (date) {
      query = query.where('date', '==', date);
    }
    if (ca_id) {
      query = query.where('assigned_ca', '==', ca_id);
    }

    // Sort by created_at descending
    query = query.orderBy('created_at', 'desc');

    const snapshot = await query.get();

    // ✅ Fetch all appointments with CA details
    const appointments = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let caDetails = null;

      // ✅ If CA is assigned, fetch CA details including profile picture
      if (data.assigned_ca) {
        try {
          const caDoc = await businessRef
            .collection('CA')
            .doc(data.assigned_ca)
            .get();
          
          if (caDoc.exists) {
            const caData = caDoc.data();
            caDetails = {
              id: caDoc.id,
              name: caData.name,
              email: caData.email,
              profile_picture: caData.profile_picture || null,
            };
          }
        } catch (error) {
          console.error(`❌ Failed to fetch CA ${data.assigned_ca}:`, error);
        }
      }

      appointments.push({
        id: doc.id,
        ...data,
        ca_details: caDetails,
        created_at: data.created_at?.toDate?.() || null,
        updated_at: data.updated_at?.toDate?.() || null,
      });
    }

    res.json({
      success: true,
      data: { appointments }
    });

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PATCH /api/admin/appointments/:appointmentId/status
 * Update appointment status
 */
export const updateStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { businessId, status } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    await updateAppointment(businessId, appointmentId, { status });

    res.json({
      success: true,
      message: 'Status updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PATCH /api/admin/appointments/:appointmentId/assign
 * Assign CA to appointment
 */
export const assignCA = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { businessId, ca_id } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    if (!ca_id) {
      return res.status(400).json({
        success: false,
        message: 'CA ID is required'
      });
    }

    // Verify CA exists
    const businessRef = getBusinessRef(businessId);
    const caDoc = await businessRef.collection('CA').doc(ca_id).get();

    if (!caDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'CA not found'
      });
    }

    await updateAppointment(businessId, appointmentId, { assigned_ca: ca_id });

    res.json({
      success: true,
      message: 'CA assigned successfully'
    });

  } catch (error) {
    console.error('❌ Error assigning CA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PATCH /api/admin/appointments/:appointmentId
 * Update appointment details
 */
export const updateAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { businessId, ...updateData } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    await updateAppointment(businessId, appointmentId, updateData);

    res.json({
      success: true,
      message: 'Appointment updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== CA MANAGEMENT ====================

/**
 * GET /api/admin/ca/list?businessId=nab-consultancy
 * Get all CAs with profile pictures
 */
export const getCAs = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    const casSnapshot = await businessRef.collection('CA').get();

    const cas = [];
    casSnapshot.forEach(doc => {
      const data = doc.data();
      cas.push({
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || data.mobile || '',
        specialization: data.specialization || '',
        experience: data.experience || 0,
        qualification: data.qualification || '',
        intro: data.intro || '',
        status: data.status || 'active',
        profile_picture: data.profile_picture || null,
        unavailable_slots: data.unavailable_slots || [],
      });
    });

    res.json({
      success: true,
      data: { cas }
    });

  } catch (error) {
    console.error('❌ Error fetching CAs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/admin/ca/create
 * Create new CA with profile picture
 */
export const createCA = async (req, res) => {
  try {
    const { businessId, name, email, phone, specialization, profile_picture, ...otherData } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    let profilePictureUrl = null;

    // ✅ Upload profile picture if provided
    if (profile_picture && profile_picture.startsWith('data:image')) {
      try {
        profilePictureUrl = await uploadImage(profile_picture, 'ca-profiles', name);
      } catch (uploadError) {
        console.error('⚠️ Profile picture upload failed:', uploadError.message);
      }
    }

    const caData = {
      name,
      email,
      phone,
      specialization: specialization || '',
      status: 'active',
      profile_picture: profilePictureUrl,
      ...otherData
    };

    const ca = await createCAService(businessId, caData);

    res.json({
      success: true,
      message: 'CA created successfully',
      data: {
        ...ca,
        profile_picture: profilePictureUrl
      }
    });

  } catch (error) {
    console.error('❌ Error creating CA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PATCH /api/admin/ca/:caId
 * Update CA with optional profile picture update
 */
export const updateCA = async (req, res) => {
  try {
    const { caId } = req.params;
    const { businessId, profile_picture, ...updateData } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    const caRef = businessRef.collection('CA').doc(caId);

    const caDoc = await caRef.get();
    if (!caDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'CA not found'
      });
    }

    const currentData = caDoc.data();
    let finalUpdateData = { ...updateData };

    const caName = updateData.name || currentData.name;

    // ✅ Handle profile picture update
    if (profile_picture !== undefined) {
      if (profile_picture === null) {
        if (currentData.profile_picture) {
          await deleteImage(currentData.profile_picture);
        }
        finalUpdateData.profile_picture = null;
      } else if (profile_picture.startsWith('data:image')) {
        try {
          const newImageUrl = await updateProfilePicture(
            profile_picture,
            currentData.profile_picture,
            caName
          );
          finalUpdateData.profile_picture = newImageUrl;
        } catch (uploadError) {
          console.error('⚠️ Profile picture update failed:', uploadError.message);
          delete finalUpdateData.profile_picture;
        }
      } else if (profile_picture.startsWith('http')) {
        delete finalUpdateData.profile_picture;
      }
    }

    await caRef.update({
      ...finalUpdateData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await caRef.get();
    const updatedData = updatedDoc.data();

    res.json({
      success: true,
      message: 'CA updated successfully',
      data: {
        id: caId,
        ...updatedData
      }
    });

  } catch (error) {
    console.error('❌ Error updating CA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/admin/ca/:caId?businessId=nab-consultancy
 * Delete CA and its profile picture
 */
export const deleteCA = async (req, res) => {
  try {
    const { caId } = req.params;
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    const caDoc = await businessRef.collection('CA').doc(caId).get();

    if (caDoc.exists) {
      const caData = caDoc.data();
      if (caData.profile_picture) {
        await deleteImage(caData.profile_picture);
      }
    }

    await deleteCAService(businessId, caId);

    res.json({
      success: true,
      message: 'CA deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting CA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SETTINGS ====================

/**
 * GET /api/admin/settings?businessId=nab-consultancy
 */
export const getSystemSettings = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const settings = await getSystemSettingsService(businessId);

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PATCH /api/admin/settings
 */
export const updateSystemSettings = async (req, res) => {
  try {
    const { businessId, ...settingsData } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    await updateSystemSettingsService(businessId, settingsData);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/admin/settings/off-day
 */
export const addOffDay = async (req, res) => {
  try {
    const { businessId, date } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    const settingsRef = businessRef.collection('system').doc('settings');

    await settingsRef.update({
      off_days: admin.firestore.FieldValue.arrayUnion(date)
    });

    res.json({
      success: true,
      message: 'Off day added successfully'
    });

  } catch (error) {
    console.error('❌ Error adding off day:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/admin/settings/off-day
 */
export const removeOffDay = async (req, res) => {
  try {
    const { businessId, date } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const businessRef = getBusinessRef(businessId);
    const settingsRef = businessRef.collection('system').doc('settings');

    await settingsRef.update({
      off_days: admin.firestore.FieldValue.arrayRemove(date)
    });

    res.json({
      success: true,
      message: 'Off day removed successfully'
    });

  } catch (error) {
    console.error('❌ Error removing off day:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== COUNTER MANAGEMENT ====================

/**
 * POST /api/admin/counter/reset
 * ✅ NEW: Reset reference ID counter to 0
 */
export const resetCounter = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const db = getDb();
    const counterRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('system')
      .doc('counters')
      .collection('reference_id')
      .doc('counter');

    // Reset to 0
    await counterRef.set({
      year: new Date().getFullYear(),
      counter: 0,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Counter reset to 0 successfully',
      data: {
        year: new Date().getFullYear(),
        counter: 0,
        next_id: `NAB_${new Date().getFullYear()}_0001`
      }
    });

  } catch (error) {
    console.error('❌ Error resetting counter:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};