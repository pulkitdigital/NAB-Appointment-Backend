// Backend/services/googleMeet.service.js - FIXED VERSION
import { google } from 'googleapis';

/**
 * Google Meet Service
 * Generates Google Meet links for appointments
 */

class GoogleMeetService {
  constructor() {
    // OAuth2 client setup
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // ✅ FIX: Set credentials properly
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      console.log('✅ Google OAuth credentials configured');
    } else {
      console.error('❌ GOOGLE_REFRESH_TOKEN not found in environment variables!');
    }

    // Initialize Calendar API with auth
    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });
  }

  /**
   * Create Google Meet event
   * @param {Object} bookingData - Booking details
   * @returns {Object} - Event details with meet link
   */
  async createMeetLink(bookingData) {
    try {
      const { date, time_slot, duration, customer_name, customer_email, consult_note } = bookingData;

      console.log('🎥 Creating Meet link for:', customer_name, 'on', date, time_slot);

      // Parse date and time
      const startDateTime = this.parseDateTime(date, time_slot);
      const endDateTime = new Date(startDateTime.getTime() + (duration || 30) * 60000);

      console.log('📅 Event time:', startDateTime.toISOString(), 'to', endDateTime.toISOString());

      // Create calendar event
      const event = {
        summary: `NAB Consultancy - Consultation with ${customer_name}`,
        description: `
Consultation Booking Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer: ${customer_name}
Email: ${customer_email}
Duration: ${duration || 30} minutes
${consult_note ? `Notes: ${consult_note}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAB Consultancy
14 Sammelan Marg, Near Chandralok Theatre
Prayagraj - 211003
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          { email: customer_email, displayName: customer_name }
        ],
        conferenceData: {
          createRequest: {
            requestId: `nab-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };

      console.log('📤 Sending event to Google Calendar API...');

      // Insert event
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send email notifications to attendees
        resource: event,
      });

      const meetLink = response.data.hangoutLink;
      const eventId = response.data.id;

      console.log('✅ Google Meet link created:', meetLink);

      return {
        success: true,
        meetLink,
        eventId,
        startTime: startDateTime,
        endTime: endDateTime,
      };
    } catch (error) {
      console.error('❌ Google Meet Error Details:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      if (error.errors) {
        console.error('   Details:', error.errors);
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update existing Google Meet event
   * @param {String} eventId - Google Calendar event ID
   * @param {Object} updateData - Updated booking details
   */
  async updateMeetLink(eventId, updateData) {
    try {
      const { date, time_slot, duration } = updateData;

      const startDateTime = this.parseDateTime(date, time_slot);
      const endDateTime = new Date(startDateTime.getTime() + (duration || 30) * 60000);

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: {
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Asia/Kolkata',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Asia/Kolkata',
          },
        },
        sendUpdates: 'all',
      });

      console.log('✅ Google Meet event updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Update Meet Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel Google Meet event
   * @param {String} eventId - Google Calendar event ID
   */
  async cancelMeetLink(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all', // Notify attendees
      });

      console.log('✅ Google Meet event cancelled');
      return { success: true };
    } catch (error) {
      console.error('❌ Cancel Meet Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse date and time slot into Date object
   * @param {String} dateStr - Date string (YYYY-MM-DD)
   * @param {String} timeSlot - Time slot (e.g., "10:00 AM - 10:30 AM" or "10:00")
   * @returns {Date}
   */
  parseDateTime(dateStr, timeSlot) {
    // Extract start time from slot (handle both formats)
    let startTime = timeSlot;
    if (timeSlot.includes('-')) {
      startTime = timeSlot.split('-')[0].trim();
    }
    
    // Remove AM/PM if present and parse
    startTime = startTime.replace(/\s*(AM|PM|am|pm)\s*/, '').trim();
    
    const [hours, minutes] = startTime.split(':').map(Number);

    // Create date object in IST timezone
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);

    return date;
  }
}

export default new GoogleMeetService();