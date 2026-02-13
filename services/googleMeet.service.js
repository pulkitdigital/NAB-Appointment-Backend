// Backend/services/googleMeet.service.js - PRODUCTION READY
import { google } from 'googleapis';

class GoogleMeetService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.initialized = false;
  }

  // Initialize only when first used
  initialize() {
    if (this.initialized) return;

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    } else {
      console.error('❌ GOOGLE_REFRESH_TOKEN not found in environment variables!');
      throw new Error('GOOGLE_REFRESH_TOKEN is required');
    }

    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });

    this.initialized = true;
  }

  async createMeetLink(bookingData) {
    this.initialize();

    try {
      const { date, time_slot, duration, customer_name, customer_email, consult_note } = bookingData;

      const startDateTime = this.parseDateTime(date, time_slot);
      const endDateTime = new Date(startDateTime.getTime() + (duration || 30) * 60000);

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
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendUpdates: 'all',
        resource: event,
      });

      const meetLink = response.data.hangoutLink;
      const eventId = response.data.id;

      return {
        success: true,
        meetLink,
        eventId,
        startTime: startDateTime,
        endTime: endDateTime,
      };
    } catch (error) {
      console.error('❌ Google Meet Error:', error.message);
      if (error.code) {
        console.error('   Code:', error.code);
      }
      if (error.errors) {
        console.error('   Details:', JSON.stringify(error.errors, null, 2));
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateMeetLink(eventId, updateData) {
    this.initialize();

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

      return { success: true };
    } catch (error) {
      console.error('❌ Update Meet Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async cancelMeetLink(eventId) {
    this.initialize();

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Cancel Meet Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  parseDateTime(dateStr, timeSlot) {
    let startTime = timeSlot;
    if (timeSlot.includes('-')) {
      startTime = timeSlot.split('-')[0].trim();
    }
    
    startTime = startTime.replace(/\s*(AM|PM|am|pm)\s*/, '').trim();
    const [hours, minutes] = startTime.split(':').map(Number);

    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);

    return date;
  }
}

export default new GoogleMeetService();