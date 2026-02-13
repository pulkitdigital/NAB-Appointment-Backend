// Backend/services/reminderScheduler.service.js - PRODUCTION READY
import cron from 'node-cron';
import admin from 'firebase-admin';
import brevoService from './brevo.service.js';

class ReminderSchedulerService {
  constructor() {
    this.db = null;
    this.isRunning = false;
  }

  getDb() {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Start the scheduler
   * Runs every minute to check for 1-minute reminders
   * Also checks hourly for 12hr and 1hr reminders
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Reminder scheduler already running');
      return;
    }

    // Run every minute for 1-minute reminders
    cron.schedule('* * * * *', async () => {
      await this.check1MinuteReminders();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run every hour for 12hr and 1hr reminders
    cron.schedule('0 * * * *', async () => {
      await this.sendHourlyReminders();
    }, {
      timezone: 'Asia/Kolkata'
    });

    this.isRunning = true;
    console.log('✅ Email reminder scheduler started');
  }

  /**
   * Check for 1-minute reminders (runs every minute)
   */
  async check1MinuteReminders() {
    try {
      const now = new Date();
      const db = this.getDb();

      const businessesSnapshot = await db.collection('businesses').get();
      if (businessesSnapshot.empty) return;

      let totalSent = 0;

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const sent = await this.checkAndSendForWindow(
          businessId,
          now,
          0, // 0 hours = 1 minute
          '1 minute',
          true // isMinuteReminder flag
        );
        totalSent += sent;
      }

    } catch (error) {
      console.error('❌ Error in 1-minute reminder check:', error);
    }
  }

  /**
   * Send hourly reminders (12hr and 1hr)
   */
  async sendHourlyReminders() {
    try {
      const now = new Date();
      const db = this.getDb();

      const businessesSnapshot = await db.collection('businesses').get();

      if (businessesSnapshot.empty) {
        return;
      }

      let totalReminders = 0;

      const reminderWindows = [
        { hours: 12, label: '12 hours' },
        { hours: 1, label: '1 hour' }
      ];

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;

        for (const window of reminderWindows) {
          const sent = await this.checkAndSendForWindow(
            businessId,
            now,
            window.hours,
            window.label,
            false
          );
          totalReminders += sent;
        }
      }

    } catch (error) {
      console.error('❌ Error in hourly reminder scheduler:', error);
    }
  }

  /**
   * Check and send reminders for a specific time window
   * @param {boolean} isMinuteReminder - True for 1-minute reminder
   */
  async checkAndSendForWindow(businessId, now, hoursBeforeAppointment, label, isMinuteReminder = false) {
    try {
      const db = this.getDb();
      
      let targetTime, windowStart, windowEnd, targetDateStr;

      if (isMinuteReminder) {
        // For 1-minute reminder: target is now + 1 minute
        targetTime = new Date(now.getTime() + 1 * 60 * 1000);
        // Window: ±30 seconds
        windowStart = new Date(targetTime.getTime() - 30 * 1000);
        windowEnd = new Date(targetTime.getTime() + 30 * 1000);
        targetDateStr = targetTime.toISOString().split('T')[0];
      } else {
        // For hourly reminders: target is now + X hours
        targetTime = new Date(now.getTime() + hoursBeforeAppointment * 60 * 60 * 1000);
        // Window: ±30 minutes
        windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
        windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);
        targetDateStr = targetTime.toISOString().split('T')[0];
      }

      // Query appointments
      const appointmentsRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('appointments');

      const snapshot = await appointmentsRef
        .where('date', '==', targetDateStr)
        .where('payment_status', '==', 'completed')
        .where('status', 'in', ['pending', 'confirmed'])
        .get();

      if (snapshot.empty) {
        return 0;
      }

      let sentCount = 0;

      for (const doc of snapshot.docs) {
        const booking = { id: doc.id, ...doc.data() };
        
        // Parse appointment time
        const appointmentTime = this.parseAppointmentTime(booking.date, booking.time_slot);
        
        // Check if appointment falls within the reminder window
        if (appointmentTime >= windowStart && appointmentTime <= windowEnd) {
          // Check if this specific reminder was already sent
          const reminderKey = isMinuteReminder 
            ? 'reminder_1min_sent' 
            : `reminder_${hoursBeforeAppointment}hr_sent`;
          
          if (!booking[reminderKey]) {
            const sent = await this.sendReminderEmail(
              doc.ref,
              booking,
              isMinuteReminder ? '1min' : `${hoursBeforeAppointment}hr`,
              reminderKey,
              businessId
            );
            if (sent) sentCount++;
          }
        }
      }

      return sentCount;
    } catch (error) {
      console.error(`❌ Error checking ${label} window:`, error);
      return 0;
    }
  }

  /**
   * Parse appointment date and time into Date object
   */
  parseAppointmentTime(dateStr, timeSlot) {
    let time = timeSlot;
    if (timeSlot.includes('-')) {
      time = timeSlot.split('-')[0].trim();
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    
    return date;
  }

  /**
   * Send reminder email
   * Fetches CA details before sending
   */
  async sendReminderEmail(bookingRef, booking, timeLabel, reminderKey, businessId) {
    try {
      // Fetch CA details if assigned
      if (booking.assigned_ca && !booking.ca_email) {
        try {
          const db = this.getDb();
          const caDoc = await db
            .collection('businesses')
            .doc(businessId)
            .collection('CA')
            .doc(booking.assigned_ca)
            .get();
          
          if (caDoc.exists) {
            const caData = caDoc.data();
            booking.ca_email = caData.email;
            booking.ca_name = caData.name;
          }
        } catch (error) {
          console.error(`❌ Failed to fetch CA details:`, error.message);
        }
      }

      // Extract hours for email template
      let hours = 1;
      if (timeLabel === '12hr') hours = 12;
      else if (timeLabel === '1hr') hours = 1;
      else if (timeLabel === '1min') hours = 0; // 0 means 1 minute

      const result = await brevoService.sendReminderEmail({
        ...booking,
        hours_before: hours
      });

      if (result.success) {
        const updateData = {
          [reminderKey]: true,
          [`${reminderKey}_at`]: admin.firestore.FieldValue.serverTimestamp(),
          [`brevo_reminder_${timeLabel}_message_id`]: result.messageId
        };

        await bookingRef.update(updateData);
        return true;
      } else {
        console.error(`❌ Failed to send ${timeLabel} reminder:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending ${timeLabel} reminder:`, error);
      return false;
    }
  }

  /**
   * Manual test trigger
   */
  async testReminders() {
    console.log('🧪 Running test reminder check...');
    await this.sendHourlyReminders();
    await this.check1MinuteReminders();
  }
}

export default new ReminderSchedulerService();