// Backend/controllers/booking.controller.js - PRODUCTION READY
import admin from "firebase-admin";
import { createRazorpayOrder } from "../services/razorpay.service.js";
import { verifyRazorpaySignature } from "../utils/verifySignature.js";
import { generateReferenceId } from "../utils/referenceIdHelper.js";
import {
  isCAAvailable,
  getAvailableCAs,
} from "../services/caAvailability.service.js";
import googleMeetService from "../services/googleMeet.service.js";
import brevoService from "../services/brevo.service.js";

const getDb = () => admin.firestore();

const getBusinessRef = (businessId) => {
  if (!businessId) {
    throw new Error("Business ID is required");
  }
  return getDb().collection("businesses").doc(businessId);
};

// ==================== GET PUBLIC SETTINGS ====================
export const getPublicSettings = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);
    const settingsDoc = await businessRef
      .collection("system")
      .doc("settings")
      .get();

    if (!settingsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    const settings = settingsDoc.data();

    const publicSettings = {
      business_name: settings.business_name || "",
      business_address: settings.business_address || "",
      advance_booking_days: settings.advance_booking_days || 15,
      slot_durations: settings.slot_durations || [],
      weekly_schedule: settings.weekly_schedule || {},
      off_days: settings.off_days || [],
      reminder_hours: settings.reminder_hours || 24,
    };

    res.json({
      success: true,
      data: publicSettings,
    });
  } catch (error) {
    console.error("❌ Error fetching public settings:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET AVAILABLE SLOTS ====================
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, ca_id, businessId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);

    const settingsDoc = await businessRef
      .collection("system")
      .doc("settings")
      .get();

    if (!settingsDoc.exists) {
      console.error("❌ System settings not found!");
      return res.status(500).json({
        success: false,
        message:
          "System settings not configured. Please contact administrator.",
      });
    }

    const settings = settingsDoc.data();

    if (!settings || !settings.weekly_schedule) {
      console.error("❌ Settings data is invalid:", settings);
      return res.status(500).json({
        success: false,
        message:
          "System settings are incomplete. Please contact administrator.",
      });
    }

    // Check if date is an off day
    const offDays = settings.off_days || [];
    if (offDays.includes(date)) {
      return res.json({
        success: true,
        data: {
          appointments: [],
          message: "This date is marked as off day",
          off_day: true,
        },
      });
    }

    // Check weekly schedule
    const dayOfWeek = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const daySchedule = settings.weekly_schedule?.[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled) {
      return res.json({
        success: true,
        data: {
          appointments: [],
          message: "This day is not available",
          off_day: true,
        },
      });
    }

    // Fetch booked appointments
    const appointmentsQuery = businessRef
      .collection("appointments")
      .where("date", "==", date)
      .where("payment_status", "==", "completed");

    const appointmentsSnapshot = await appointmentsQuery.get();

    const bookedAppointments = [];
    appointmentsSnapshot.forEach((doc) => {
      const data = doc.data();

      const shouldInclude =
        !ca_id ||
        ca_id === "null" ||
        ca_id === "" ||
        !data.assigned_ca ||
        data.assigned_ca === ca_id;

      if (shouldInclude && ["pending", "confirmed"].includes(data.status)) {
        bookedAppointments.push({
          id: doc.id,
          time_slot: data.time_slot,
          duration: data.duration,
          assigned_ca: data.assigned_ca || null,
          customer_name: data.customer_name,
        });
      }
    });

    // Get CA unavailable slots
    let caUnavailableSlots = [];
    if (ca_id && ca_id !== "null" && ca_id !== "") {
      const caDoc = await businessRef.collection("CA").doc(ca_id).get();
      if (caDoc.exists) {
        const caData = caDoc.data();
        const unavailableSlots = caData.unavailable_slots || [];
        caUnavailableSlots = unavailableSlots.filter(
          (slot) => slot.date === date,
        );
      }
    }

    res.json({
      success: true,
      data: {
        appointments: bookedAppointments,
        ca_unavailable_slots: caUnavailableSlots,
        working_hours: daySchedule,
        off_day: false,
        date: date,
        ca_id: ca_id || "all",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching available slots:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== CREATE BOOKING ORDER ====================
export const createBookingOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      consult_note,
      ca_id,
      date,
      time_slot,
      duration,
      businessId,
    } = req.body;

    // Validation
    if (
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !date ||
      !time_slot ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);

    const settingsDoc = await businessRef
      .collection("system")
      .doc("settings")
      .get();

    if (!settingsDoc.exists) {
      console.error("❌ Settings document not found!");
      return res.status(500).json({
        success: false,
        message: "System settings not configured",
      });
    }

    const settings = settingsDoc.data();

    if (!settings || !settings.slot_durations) {
      console.error("❌ slot_durations not found in settings");
      return res.status(500).json({
        success: false,
        message: "Pricing configuration is missing",
      });
    }

    // Check if CA is available (if CA is specified)
    if (ca_id) {
      const caAvailable = await isCAAvailable(
        businessId,
        ca_id,
        date,
        time_slot,
        parseInt(duration),
      );

      if (!caAvailable) {
        return res.status(400).json({
          success: false,
          message:
            "Selected CA is not available at this time. Please choose a different time slot or CA.",
        });
      }
    }

    // Check if slot is still available
    const existingAppointments = await businessRef
      .collection("appointments")
      .where("date", "==", date)
      .where("payment_status", "==", "completed")
      .get();

    let slotAvailable = true;
    const [slotHour, slotMinute] = time_slot.split(":").map(Number);
    const slotStartMinutes = slotHour * 60 + slotMinute;
    const slotEndMinutes = slotStartMinutes + parseInt(duration);

    existingAppointments.forEach((doc) => {
      const data = doc.data();

      const isSameCA =
        !ca_id || !data.assigned_ca || data.assigned_ca === ca_id;

      if (isSameCA && ["pending", "confirmed"].includes(data.status)) {
        const [existingHour, existingMinute] = data.time_slot
          .split(":")
          .map(Number);
        const existingStart = existingHour * 60 + existingMinute;
        const existingEnd = existingStart + (data.duration || 30);

        if (slotStartMinutes < existingEnd && slotEndMinutes > existingStart) {
          slotAvailable = false;
        }
      }
    });

    if (!slotAvailable) {
      return res.status(400).json({
        success: false,
        message: "This time slot is no longer available",
      });
    }

    // Find price for duration
    const slotConfig = settings.slot_durations.find(
      (s) => s.duration === parseInt(duration),
    );

    if (!slotConfig) {
      console.error("❌ Invalid duration:", duration);
      return res.status(400).json({
        success: false,
        message: "Invalid duration selected",
      });
    }

    const amount = slotConfig.price;

    const referenceId = await generateReferenceId(businessRef);

    const razorpayOrder = await createRazorpayOrder(amount, referenceId);

    const appointmentData = {
      customer_name,
      customer_email,
      customer_phone,
      consult_note: consult_note || "",
      assigned_ca: ca_id || "",
      date,
      time_slot,
      duration: parseInt(duration),
      amount,
      order_id: razorpayOrder.id,
      payment_status: "pending",
      status: "draft",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = businessRef.collection("appointments").doc(referenceId);

    await docRef.set(appointmentData);

    res.json({
      success: true,
      data: {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        appointment_id: referenceId,
        reference_id: referenceId,
      },
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== VERIFY PAYMENT ====================
export const verifyBookingPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointment_id,
      businessId,
    } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isValid) {
      console.error("❌ Invalid payment signature");
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const businessRef = getBusinessRef(businessId);
    const appointmentRef = businessRef.collection("appointments").doc(appointment_id);
    const appointmentDoc = await appointmentRef.get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Update appointment status
    await appointmentRef.update({
      payment_id: razorpay_payment_id,
      payment_status: "completed",
      status: "pending",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get updated appointment data
    const updatedDoc = await appointmentRef.get();
    const appointmentData = {
      id: appointment_id,
      reference_id: appointment_id,
      ...updatedDoc.data(),
    };

    // Fetch CA details from Firestore
    if (appointmentData.assigned_ca) {
      try {
        const caDoc = await businessRef
          .collection('CA')
          .doc(appointmentData.assigned_ca)
          .get();
        
        if (caDoc.exists) {
          const caData = caDoc.data();
          appointmentData.ca_email = caData.email;
          appointmentData.ca_name = caData.name;
          appointmentData.ca_phone = caData.phone || '';
        } else {
          console.error(`❌ CA document not found for ID: ${appointmentData.assigned_ca}`);
        }
      } catch (caError) {
        console.error('❌ Error fetching CA details:', caError.message);
      }
    }

    // Generate Google Meet Link
    try {
      const meetResult = await googleMeetService.createMeetLink(appointmentData);

      if (meetResult.success) {
        await appointmentRef.update({
          meet_link: meetResult.meetLink,
          meet_event_id: meetResult.eventId,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        appointmentData.meetLink = meetResult.meetLink;
        appointmentData.meet_link = meetResult.meetLink;
        appointmentData.meetEventId = meetResult.eventId;
      } else {
        console.error("❌ Failed to create Meet link:", meetResult.error);
      }
    } catch (meetError) {
      console.error("❌ Google Meet error:", meetError.message);
    }

    // Send Confirmation Emails (Customer + CA + Admin)
    try {
      const emailResult = await brevoService.sendConfirmationEmail(appointmentData);

      if (emailResult.success) {
        await appointmentRef.update({
          confirmation_email_sent: true,
          confirmation_email_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          brevo_message_id: emailResult.messageId,
          email_details: emailResult.details,
        });
      } else {
        console.error("❌ Failed to send confirmation emails:", emailResult.error);
      }
    } catch (emailError) {
      console.error("❌ Brevo email error:", emailError.message);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        appointment_id,
        reference_id: appointment_id,
        status: appointmentData.status,
        meet_link: appointmentData.meet_link || null,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET BOOKING DETAILS ====================
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);

    const doc = await businessRef
      .collection("appointments")
      .doc(bookingId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        reference_id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching booking:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET AVAILABLE CAs ====================
export const getAvailableCAsForSlot = async (req, res) => {
  try {
    const { date, time_slot, duration, businessId } = req.query;

    if (!date || !time_slot || !duration || !businessId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    const availableCAs = await getAvailableCAs(
      businessId,
      date,
      time_slot,
      parseInt(duration),
    );

    res.json({
      success: true,
      data: {
        available_cas: availableCAs,
        count: availableCAs.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching available CAs:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== UPDATE BOOKING (FOR RESCHEDULING) ====================
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { businessId, ...updateData } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);
    const bookingRef = businessRef.collection("appointments").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const existingBooking = bookingDoc.data();

    // Update Firestore
    await bookingRef.update({
      ...updateData,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update Google Meet event if date/time changed
    if (
      existingBooking.meet_event_id &&
      (updateData.date || updateData.time_slot)
    ) {
      try {
        const meetResult = await googleMeetService.updateMeetLink(
          existingBooking.meet_event_id,
          { ...existingBooking, ...updateData },
        );

        if (!meetResult.success) {
          console.error("❌ Failed to update Meet event:", meetResult.error);
        }
      } catch (error) {
        console.error("❌ Error updating Meet event:", error);
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: { id: bookingId, ...existingBooking, ...updateData },
    });
  } catch (error) {
    console.error("❌ Update Booking Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

// ==================== CANCEL BOOKING ====================
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business ID is required",
      });
    }

    const businessRef = getBusinessRef(businessId);
    const bookingRef = businessRef.collection("appointments").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const booking = bookingDoc.data();

    // Cancel Google Meet event
    if (booking.meet_event_id) {
      try {
        const meetResult = await googleMeetService.cancelMeetLink(
          booking.meet_event_id,
        );

        if (!meetResult.success) {
          console.error("❌ Failed to cancel Meet event:", meetResult.error);
        }
      } catch (error) {
        console.error("❌ Error cancelling Meet event:", error);
      }
    }

    // Update booking status
    await bookingRef.update({
      status: "cancelled",
      cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("❌ Cancel Booking Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};