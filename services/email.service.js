import nodemailer from 'nodemailer';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send booking confirmation email
 * @param {object} bookingData - Booking details
 */
export const sendConfirmationEmail = async (bookingData) => {
  try {
    const { email, name, date, time_slot, reference_id, amount } = bookingData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Appointment Booking Confirmed ✅',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for booking your consultation appointment. Your booking has been confirmed.</p>
              
              <div style="margin: 20px 0;">
                <div class="detail-row">
                  <span class="detail-label">Reference ID:</span>
                  <span class="detail-value">${reference_id}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date(date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${time_slot}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Amount Paid:</span>
                  <span class="detail-value">₹${amount}</span>
                </div>
              </div>

              <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Important:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Please join 5 minutes before your scheduled time</li>
                  <li>Keep your reference ID for future correspondence</li>
                  <li>You will receive a reminder 24 hours before your appointment</li>
                </ul>
              </div>

              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br><strong>Appointment Booking Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send cancellation email
 * @param {object} bookingData - Booking details
 */
export const sendCancellationEmail = async (bookingData) => {
  try {
    const { email, name, date, time_slot, reference_id } = bookingData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Appointment Cancelled',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Your appointment has been cancelled.</p>
              <p><strong>Reference ID:</strong> ${reference_id}</p>
              <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN')}</p>
              <p><strong>Time:</strong> ${time_slot}</p>
              <p>If you wish to reschedule, please book a new appointment.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
};

export default transporter;
export const sendBookingConfirmation = sendConfirmationEmail;