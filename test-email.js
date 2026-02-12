import 'dotenv/config';
import transporter from './services/email.service.js';

(async () => {
  try {
    const to = process.env.SMTP_USER || process.env.EMAIL_FROM;
    if (!to) {
      console.error('No SMTP_USER or EMAIL_FROM set in .env — cannot run test.');
      process.exit(1);
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Backend SMTP Test',
      text: 'This is a test email from the appointment-booking backend. If you received this, SMTP is working.',
    });

    console.log('Test email sent:', info.messageId || info);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test email:', err.message || err);
    process.exit(1);
  }
})();
