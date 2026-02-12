// Backend/services/emailScheduler.service.js - FIXED VERSION
import cron from 'node-cron';
import admin from 'firebase-admin';
import brevoService from './brevo.service.js';

/**
 * Email Scheduler Service
 * Runs daily to check for appointments in next 24 hours
 * and sends reminder emails
 */

class EmailSchedulerService {
  constructor() {
    // ✅ FIX: Don't access Firestore in constructor
    // Initialize it lazily when needed
    this.db = null;
    this.isRunning = false;
  }

  /**
   * Get Firestore instance (lazy initialization)
   */
  getDb() {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Start the scheduler
   * Runs every day at 9:00 AM IST
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    // Cron format: minute hour day month weekday
    // '0 9 * * *' = Every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Running daily reminder check...');
      await this.sendReminders();
    }, {
      timezone: 'Asia/Kolkata'
    });

    this.isRunning = true;
    console.log('✅ Email scheduler started - Will run daily at 9:00 AM IST');

    // Optional: Run immediately on startup for testing
    // Uncomment below line to test
    // this.sendReminders();
  }

  /**
   * Check all bookings and send reminders for appointments in next 24 hours
   */
  async sendReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Format dates for comparison (YYYY-MM-DD)
      const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

      console.log(`📅 Checking bookings for ${tomorrowDateStr}`);

      // ✅ Use lazy-loaded DB
      const db = this.getDb();

      // Get all businesses
      const businessesSnapshot = await db.collection('businesses').get();

      if (businessesSnapshot.empty) {
        console.log('⚠️  No businesses found');
        return;
      }

      let totalReminders = 0;

      // Loop through each business
      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        console.log(`🏢 Checking business: ${businessId}`);

        // Query appointments for tomorrow
        const appointmentsRef = db
          .collection('businesses')
          .doc(businessId)
          .collection('appointments');

        const snapshot = await appointmentsRef
          .where('date', '==', tomorrowDateStr)
          .where('payment_status', '==', 'completed')
          .where('status', 'in', ['pending', 'confirmed'])
          .get();

        if (snapshot.empty) {
          console.log(`  ✅ No appointments for ${businessId} on ${tomorrowDateStr}`);
          continue;
        }

        console.log(`  📧 Found ${snapshot.size} appointment(s) for ${businessId}`);

        // Send reminders for this business
        for (const doc of snapshot.docs) {
          const booking = { id: doc.id, ...doc.data() };
          const sent = await this.sendReminderEmail(doc.ref, booking);
          if (sent) totalReminders++;
        }
      }

      console.log(`✅ Reminder check complete. Sent ${totalReminders} reminder(s).`);
    } catch (error) {
      console.error('❌ Error in reminder scheduler:', error);
    }
  }

  /**
   * Send reminder email for a single booking
   * @param {Object} bookingRef - Firestore document reference
   * @param {Object} booking - Booking data
   */
  async sendReminderEmail(bookingRef, booking) {
    try {
      // Check if reminder already sent
      if (booking.reminder_sent) {
        console.log(`  ⏭️  Skipping ${booking.reference_id || booking.id} - Reminder already sent`);
        return false;
      }

      // Send email via Brevo
      const result = await brevoService.sendReminderEmail(booking);

      if (result.success) {
        // Mark reminder as sent in Firestore
        await bookingRef.update({
          reminder_sent: true,
          reminder_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          brevo_reminder_message_id: result.messageId,
        });

        console.log(`  ✅ Reminder sent: ${booking.reference_id || booking.id} → ${booking.customer_email}`);
        return true;
      } else {
        console.error(`  ❌ Failed to send reminder for ${booking.reference_id || booking.id}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`  ❌ Error sending reminder for ${booking.reference_id || booking.id}:`, error);
      return false;
    }
  }

  /**
   * Manual trigger for testing
   * Call this to test reminder emails without waiting for cron
   */
  async testReminders() {
    console.log('🧪 Running test reminder check...');
    await this.sendReminders();
  }
}

export default new EmailSchedulerService();