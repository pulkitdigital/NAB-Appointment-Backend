// Backend/services/brevo.service.js - COMPLETE VERSION
import axios from 'axios';

class BrevoEmailService {
  constructor() {
    this.apiKey = null;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    this.senderEmail = null;
    this.senderName = 'NAB Consultancy';
    this.adminEmail = null;
    this.adminName = null;
    this.initialized = false;
  }

  /**
   * Initialize service when first used (lazy loading)
   */
  initialize() {
    if (this.initialized) return;

    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@nabconsultancy.com';
    this.adminEmail = process.env.ADMIN_EMAIL;
    this.adminName = process.env.ADMIN_NAME || 'Admin';

    if (!this.apiKey) {
      console.error('❌ CRITICAL: BREVO_API_KEY not found in environment variables!');
      console.error('   Add BREVO_API_KEY to your .env file');
      console.error('   Get API key from: https://app.brevo.com → Settings → SMTP & API');
    }

    this.initialized = true;
  }

  // ==================== CONFIRMATION EMAILS ====================

  /**
   * Send all 3 confirmation emails (Customer + CA + Admin)
   */
  async sendConfirmationEmail(bookingData) {
    this.initialize();

    const results = {
      customer: { success: false },
      ca: { success: false },
      admin: { success: false }
    };

    // 1. Send to Customer
    try {
      results.customer = await this.sendCustomerConfirmation(bookingData);
    } catch (error) {
      console.error('❌ Customer email failed:', error.message);
    }

    // 2. Send to CA (if assigned)
    if (bookingData.ca_email && bookingData.assigned_ca) {
      try {
        results.ca = await this.sendCAConfirmation(bookingData);
      } catch (error) {
        console.error('❌ CA email failed:', error.message);
      }
    }

    // 3. Send to Admin
    if (this.adminEmail) {
      try {
        results.admin = await this.sendAdminNotification(bookingData);
      } catch (error) {
        console.error('❌ Admin email failed:', error.message);
      }
    }

    return {
      success: results.customer.success,
      messageId: results.customer.messageId,
      details: results
    };
  }

  /**
   * Send CUSTOMER confirmation email
   */
  async sendCustomerConfirmation(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateCustomerConfirmationHTML(bookingData);

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: bookingData.customer_email,
            name: bookingData.customer_name,
          },
        ],
        subject: `✅ Booking Confirmed - ${bookingData.reference_id} | NAB Consultancy`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ Customer email error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', JSON.stringify(error.response.data, null, 2));
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Send CA confirmation email
   */
  async sendCAConfirmation(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateCAConfirmationHTML(bookingData);

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: bookingData.ca_email,
            name: bookingData.ca_name || 'CA',
          },
        ],
        subject: `🔔 New Appointment Assigned - ${bookingData.reference_id}`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ CA email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send ADMIN notification email
   */
  async sendAdminNotification(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateAdminNotificationHTML(bookingData);

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: this.adminEmail,
            name: this.adminName,
          },
        ],
        subject: `🔔 New Booking - ${bookingData.reference_id}`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ Admin email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== REMINDER EMAILS ====================

  /**
   * Send reminder emails (3 separate emails: Customer + CA + Admin)
   */
  async sendReminderEmail(bookingData) {
    this.initialize();

    const results = {
      customer: { success: false },
      ca: { success: false },
      admin: { success: false }
    };

    // 1. Send to Customer
    try {
      results.customer = await this.sendCustomerReminder(bookingData);
    } catch (error) {
      console.error('❌ Customer reminder failed:', error.message);
    }

    // 2. Send to CA
    if (bookingData.ca_email && bookingData.assigned_ca) {
      try {
        results.ca = await this.sendCAReminder(bookingData);
      } catch (error) {
        console.error('❌ CA reminder failed:', error.message);
      }
    }

    // 3. Send to Admin
    if (this.adminEmail) {
      try {
        results.admin = await this.sendAdminReminder(bookingData);
      } catch (error) {
        console.error('❌ Admin reminder failed:', error.message);
      }
    }

    return {
      success: results.customer.success,
      messageId: results.customer.messageId,
      details: results
    };
  }

  /**
   * Send CUSTOMER reminder
   */
  async sendCustomerReminder(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateCustomerReminderHTML(bookingData);
      const hours = bookingData.hours_before || 24;

      let subjectLine = `⏰ Reminder: Your consultation | ${bookingData.reference_id}`;
      
      if (hours === 0) {
        subjectLine = `🔔 STARTING NOW: Your consultation | ${bookingData.reference_id}`;
      } else if (hours === 1) {
        subjectLine = `🔔 In 1 hour: Your consultation | ${bookingData.reference_id}`;
      } else if (hours === 12) {
        subjectLine = `⏰ In 12 hours: Your consultation | ${bookingData.reference_id}`;
      }

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: bookingData.customer_email,
            name: bookingData.customer_name,
          },
        ],
        subject: subjectLine,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ Customer reminder error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send CA reminder
   */
  async sendCAReminder(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateCAReminderHTML(bookingData);
      const hours = bookingData.hours_before || 24;

      let timeLabel = `${hours}hr`;
      if (hours === 0) timeLabel = 'NOW';

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: bookingData.ca_email,
            name: bookingData.ca_name || 'CA',
          },
        ],
        subject: `🔔 Upcoming Appointment ${timeLabel === 'NOW' ? 'starting NOW' : 'in ' + timeLabel} - ${bookingData.reference_id}`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ CA reminder error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send ADMIN reminder
   */
  async sendAdminReminder(bookingData) {
    try {
      if (!this.apiKey) throw new Error('BREVO_API_KEY is not configured');

      const emailContent = this.generateAdminReminderHTML(bookingData);
      const hours = bookingData.hours_before || 24;

      let timeLabel = `${hours}hr`;
      if (hours === 0) timeLabel = 'NOW';

      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: this.adminEmail,
            name: this.adminName,
          },
        ],
        subject: `🔔 Appointment ${timeLabel === 'NOW' ? 'starting NOW' : 'in ' + timeLabel} - ${bookingData.reference_id}`,
        htmlContent: emailContent,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return { success: true, messageId: response.data.messageId };
      
    } catch (error) {
      console.error('❌ Admin reminder error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== HTML TEMPLATES ====================

  /**
   * CUSTOMER Confirmation Email HTML
   */
  generateCustomerConfirmationHTML(data) {
    const { customer_name, date, time_slot, duration, reference_id, meetLink, consult_note, amount, ca_name } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 40px 30px; text-align: center; }
    .success-icon { width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .success-icon svg { width: 32px; height: 32px; fill: white; }
    .content { padding: 40px 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; color: #6b7280; min-width: 140px; }
    .detail-value { color: #1f2937; font-weight: 500; }
    .meet-button { display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .info-box ul { list-style: none; padding-left: 0; }
    .info-box li { padding: 8px 0; color: #1e40af; font-size: 14px; }
    .info-box li:before { content: "✓ "; color: #10b981; font-weight: bold; margin-right: 8px; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      <h1>Booking Confirmed!</h1>
      <p>Your consultation has been successfully scheduled</p>
    </div>

    <div class="content">
      <div style="margin-bottom: 30px;">
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
        ${ca_name ? `
        <div class="detail-row">
          <div class="detail-label">Consultant:</div>
          <div class="detail-value">${ca_name}</div>
        </div>
        ` : ''}
        ${amount ? `
        <div class="detail-row">
          <div class="detail-label">Amount Paid:</div>
          <div class="detail-value"><strong>₹${amount}</strong></div>
        </div>
        ` : ''}
      </div>

      ${meetLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <div class="section-title">🎥 Join Your Consultation</div>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Please join 5 minutes before the scheduled time</p>
      </div>
      ` : ''}

      ${consult_note ? `
      <div style="margin-bottom: 30px;">
        <div class="section-title">📝 Your Notes</div>
        <p style="color: #4b5563; line-height: 1.6;">${consult_note}</p>
      </div>
      ` : ''}

      <div class="info-box">
        <strong style="color: #1f2937; margin-bottom: 12px; display: block;">📌 What's Next?</strong>
        <ul>
          <li>You will receive reminder emails at: 12hr, 1hr, and 1min before your appointment</li>
          <li>Please join the consultation 5 minutes early</li>
          <li>Keep your reference ID handy for any future correspondence</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <strong style="display: block; margin-bottom: 8px; color: #1f2937;">NAB Consultancy</strong>
      14 Sammelan Marg, Near Chandralok Theatre<br>
      Prayagraj - 211003
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * CA Confirmation Email HTML
   */
  generateCAConfirmationHTML(data) {
    const { customer_name, customer_email, customer_phone, date, time_slot, duration, reference_id, meetLink, consult_note, ca_name } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; color: #6b7280; min-width: 140px; }
    .detail-value { color: #1f2937; font-weight: 500; }
    .meet-button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Appointment Assigned</h1>
      <p>You have been assigned a new consultation</p>
    </div>

    <div class="content">
      <p style="margin-bottom: 20px;">Dear ${ca_name || 'CA'},</p>

      <div style="margin-bottom: 30px;">
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
      </div>

      <div style="margin-bottom: 30px;">
        <div class="section-title">👤 Client Information</div>
        <div class="detail-row">
          <div class="detail-label">Name:</div>
          <div class="detail-value">${customer_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Email:</div>
          <div class="detail-value">${customer_email}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Phone:</div>
          <div class="detail-value">${customer_phone}</div>
        </div>
        ${consult_note ? `
        <div class="detail-row">
          <div class="detail-label">Notes:</div>
          <div class="detail-value">${consult_note}</div>
        </div>
        ` : ''}
      </div>

      ${meetLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <div class="section-title">🎥 Meeting Link</div>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <strong>NAB Consultancy</strong>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * ADMIN Notification Email HTML
   */
  generateAdminNotificationHTML(data) {
    const { customer_name, customer_email, customer_phone, date, time_slot, duration, reference_id, amount, ca_name } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; color: #6b7280; min-width: 140px; }
    .detail-value { color: #1f2937; font-weight: 500; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Booking Received</h1>
      <p>New appointment has been booked</p>
    </div>

    <div class="content">
      <div style="margin-bottom: 30px;">
        <div class="section-title">📅 Booking Details</div>
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
        ${ca_name ? `
        <div class="detail-row">
          <div class="detail-label">Assigned CA:</div>
          <div class="detail-value">${ca_name}</div>
        </div>
        ` : ''}
        ${amount ? `
        <div class="detail-row">
          <div class="detail-label">Amount:</div>
          <div class="detail-value"><strong>₹${amount}</strong></div>
        </div>
        ` : ''}
      </div>

      <div style="margin-bottom: 30px;">
        <div class="section-title">👤 Customer Details</div>
        <div class="detail-row">
          <div class="detail-label">Name:</div>
          <div class="detail-value">${customer_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Email:</div>
          <div class="detail-value">${customer_email}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Phone:</div>
          <div class="detail-value">${customer_phone}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <strong>NAB Consultancy Admin Panel</strong>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * CUSTOMER Reminder Email (12hr, 1hr, 1min)
   */
  generateCustomerReminderHTML(data) {
    const { customer_name, date, time_slot, meetLink, reference_id, hours_before = 24, ca_name } = data;

    let urgencyColor = '#ef4444';
    let urgencyMessage = 'Your consultation is starting NOW!';
    let headerText = 'Join Now!';

    if (hours_before === 12) {
      urgencyColor = '#f59e0b';
      urgencyMessage = 'Your consultation is in 12 hours!';
      headerText = 'In 12 Hours';
    } else if (hours_before === 1) {
      urgencyColor = '#ef4444';
      urgencyMessage = 'Your consultation is in 1 hour!';
      headerText = 'In 1 Hour';
    } else if (hours_before === 0) {
      urgencyColor = '#dc2626';
      urgencyMessage = 'Your consultation is starting NOW!';
      headerText = 'Join Now!';
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .highlight-box { background-color: #fef3c7; border: 2px solid #fbbf24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .highlight-box h2 { color: #92400e; font-size: 24px; margin-bottom: 8px; }
    .highlight-box p { color: #78350f; font-size: 18px; font-weight: 600; }
    .meet-button { display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; ${hours_before === 0 ? 'animation: pulse 2s infinite;' : ''} }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .urgent-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 700; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Appointment Reminder</h1>
      <p>${urgencyMessage}</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="urgent-badge">${headerText}</span>
      </div>
      
      <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customer_name},</p>
      ${hours_before === 0 ? `
        <p style="font-size: 18px; font-weight: 700; color: #dc2626; text-align: center; margin: 20px 0;">
          Your consultation is starting now! Please join immediately.
        </p>
      ` : `
        <p style="font-size: 16px;">This is a friendly reminder about your upcoming consultation.</p>
      `}

      <div class="highlight-box">
        <h2>${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <p>${time_slot}</p>
        ${ca_name ? `<p style="margin-top: 12px;">with ${ca_name}</p>` : ''}
      </div>

      ${meetLink ? `
      <div style="text-align: center;">
        <a href="${meetLink}" class="meet-button">Join Google Meet ${hours_before === 0 ? 'NOW' : ''}</a>
      </div>
      ` : ''}

      <p style="margin-top: 20px; font-size: 14px; color: #6b7280; text-align: center;">Reference ID: <strong>${reference_id}</strong></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * CA Reminder Email
   */
  generateCAReminderHTML(data) {
    const { customer_name, date, time_slot, meetLink, reference_id, hours_before = 24, ca_name, customer_phone } = data;

    let urgencyColor = hours_before === 0 ? '#dc2626' : (hours_before === 1 ? '#ef4444' : '#3b82f6');
    let timeText = hours_before === 0 ? 'NOW' : (hours_before === 1 ? '1 hour' : '12 hours');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: ${urgencyColor}; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .meet-button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Upcoming Appointment${hours_before === 0 ? ' Starting NOW' : ''}</h1>
      <p>${hours_before === 0 ? 'Join immediately!' : `In ${timeText}`}</p>
    </div>
    <div class="content">
      <p>Dear ${ca_name || 'CA'},</p>
      <p style="margin: 20px 0; font-weight: ${hours_before === 0 ? 'bold' : 'normal'}; color: ${hours_before === 0 ? '#dc2626' : '#4b5563'};">
        ${hours_before === 0 ? 'Your appointment is starting now!' : `You have an appointment in ${timeText}.`}
      </p>
      
      <div class="detail-row"><strong>Client:</strong> ${customer_name}</div>
      <div class="detail-row"><strong>Phone:</strong> ${customer_phone}</div>
      <div class="detail-row"><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div class="detail-row"><strong>Time:</strong> ${time_slot}</div>
      <div class="detail-row"><strong>Reference:</strong> ${reference_id}</div>
      
      ${meetLink ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${meetLink}" class="meet-button">Join Meeting ${hours_before === 0 ? 'NOW' : ''}</a>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * ADMIN Reminder Email
   */
  generateAdminReminderHTML(data) {
    const { customer_name, date, time_slot, reference_id, hours_before = 24, ca_name } = data;

    let timeText = hours_before === 0 ? 'NOW' : (hours_before === 1 ? '1hr' : '12hr');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .detail { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🔔 Appointment ${hours_before === 0 ? 'starting NOW' : 'in ' + timeText}</h2>
    <div class="detail"><strong>Reference:</strong> ${reference_id}</div>
    <div class="detail"><strong>Customer:</strong> ${customer_name}</div>
    <div class="detail"><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    <div class="detail"><strong>Time:</strong> ${time_slot}</div>
    ${ca_name ? `<div class="detail"><strong>CA:</strong> ${ca_name}</div>` : ''}
  </div>
</body>
</html>
    `;
  }
}

export default new BrevoEmailService();