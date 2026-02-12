// Backend/services/brevo.service.js
import axios from 'axios';

/**
 * Brevo Email Service (formerly Sendinblue)
 * Sends booking confirmation and reminder emails
 */

class BrevoEmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@nabconsultancy.com';
    this.senderName = 'NAB Consultancy';
  }

  /**
   * Send booking confirmation email
   * @param {Object} bookingData - Booking details with meet link
   */
  async sendConfirmationEmail(bookingData) {
    try {
      const {
        customer_name,
        customer_email,
        date,
        time_slot,
        duration,
        reference_id,
        meetLink,
        meet_link,
        consult_note,
        amount
      } = bookingData;

      const finalMeetLink = meetLink || meet_link;

      const emailContent = this.generateConfirmationHTML({
        ...bookingData,
        meetLink: finalMeetLink
      });

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: customer_email,
            name: customer_name,
          },
        ],
        subject: `✅ Booking Confirmed - ${reference_id} | NAB Consultancy`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Confirmation email sent:', response.data);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('❌ Brevo Email Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send reminder email (24 hours before appointment)
   * @param {Object} bookingData - Booking details
   */
  async sendReminderEmail(bookingData) {
    try {
      const { customer_name, customer_email, date, time_slot, meetLink, meet_link, reference_id } = bookingData;

      const finalMeetLink = meetLink || meet_link;

      const emailContent = this.generateReminderHTML({
        ...bookingData,
        meetLink: finalMeetLink
      });

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: customer_email,
            name: customer_name,
          },
        ],
        subject: `⏰ Reminder: Your consultation is tomorrow | ${reference_id}`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Reminder email sent:', response.data);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('❌ Reminder Email Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate confirmation email HTML
   */
  generateConfirmationHTML(data) {
    const { customer_name, date, time_slot, duration, reference_id, meetLink, consult_note, amount } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .success-icon { width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .success-icon svg { width: 32px; height: 32px; fill: white; }
    .content { padding: 40px 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; color: #6b7280; min-width: 140px; }
    .detail-value { color: #1f2937; font-weight: 500; }
    .meet-button { display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; text-align: center; }
    .meet-button:hover { background-color: #059669; }
    .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .info-box ul { list-style: none; padding-left: 0; }
    .info-box li { padding: 8px 0; color: #1e40af; font-size: 14px; }
    .info-box li:before { content: "✓ "; color: #10b981; font-weight: bold; margin-right: 8px; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-info { color: #6b7280; font-size: 14px; line-height: 1.6; }
    .footer-info strong { display: block; color: #1f2937; margin-bottom: 8px; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="success-icon">
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      <h1>Booking Confirmed!</h1>
      <p>Your consultation has been successfully scheduled</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Appointment Details -->
      <div class="section">
        <div class="section-title">📅 Appointment Details</div>
        <div class="detail-row">
          <div class="detail-label">Reference ID:</div>
          <div class="detail-value"><strong>${reference_id}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Time:</div>
          <div class="detail-value">${time_slot}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Duration:</div>
          <div class="detail-value">${duration || 30} minutes</div>
        </div>
        ${amount ? `
        <div class="detail-row">
          <div class="detail-label">Amount Paid:</div>
          <div class="detail-value"><strong>₹${amount}</strong></div>
        </div>
        ` : ''}
      </div>

      <!-- Meet Link -->
      ${meetLink ? `
      <div class="section" style="text-align: center;">
        <div class="section-title">🎥 Join Your Consultation</div>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Please join 5 minutes before the scheduled time</p>
      </div>
      ` : ''}

      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">👤 Your Information</div>
        <div class="detail-row">
          <div class="detail-label">Name:</div>
          <div class="detail-value">${customer_name}</div>
        </div>
        ${consult_note ? `
        <div class="detail-row">
          <div class="detail-label">Notes:</div>
          <div class="detail-value">${consult_note}</div>
        </div>
        ` : ''}
      </div>

      <!-- What's Next -->
      <div class="info-box">
        <strong style="color: #1f2937; margin-bottom: 12px; display: block;">📌 What's Next?</strong>
        <ul>
          <li>You will receive a reminder email 24 hours before your appointment</li>
          <li>Please join the consultation 5 minutes early</li>
          <li>Keep your reference ID handy for any future correspondence</li>
          <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-info">
        <strong>NAB Consultancy</strong>
        14 Sammelan Marg, Near Chandralok Theatre<br>
        Prayagraj - 211003<br><br>
        Need help? Contact us at <a href="mailto:support@nabconsultancy.com" style="color: #3b82f6;">support@nabconsultancy.com</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate reminder email HTML
   */
  generateReminderHTML(data) {
    const { customer_name, date, time_slot, meetLink, reference_id } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .alarm-icon { width: 60px; height: 60px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .alarm-icon svg { width: 32px; height: 32px; fill: #f59e0b; }
    .content { padding: 40px 30px; }
    .highlight-box { background-color: #fef3c7; border: 2px solid #fbbf24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .highlight-box h2 { color: #92400e; font-size: 24px; margin-bottom: 8px; }
    .highlight-box p { color: #78350f; font-size: 18px; font-weight: 600; }
    .meet-button { display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-info { color: #6b7280; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alarm-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>
      </div>
      <h1>Appointment Reminder</h1>
      <p>Your consultation is tomorrow!</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear ${customer_name},</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.6;">This is a friendly reminder that you have a consultation scheduled with <strong>NAB Consultancy</strong> tomorrow.</p>

      <div class="highlight-box">
        <h2>${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <p>${time_slot}</p>
      </div>

      ${meetLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; margin-bottom: 16px;">Click below to join your consultation:</p>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 12px;"><strong>Please join 5 minutes early</strong></p>
      </div>
      ` : ''}

      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Reference ID: <strong>${reference_id}</strong></p>
    </div>

    <div class="footer">
      <div class="footer-info">
        <strong>NAB Consultancy</strong><br>
        14 Sammelan Marg, Near Chandralok Theatre<br>
        Prayagraj - 211003
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }
}

export default new BrevoEmailService();