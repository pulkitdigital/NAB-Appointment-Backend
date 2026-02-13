# Backend Documentation - Appointment Booking System

## Overview

This is a complete Node.js/Express.js backend for an appointment booking system with Firebase Firestore database, Razorpay payment integration, Brevo email service, Google Meet integration, and automated reminder scheduling.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Firestore** - NoSQL database
- **Razorpay** - Payment gateway
- **Brevo (Sendinblue)** - Email service provider
- **Google Calendar API** - Google Meet link generation
- **Node-cron** - Automated reminder scheduler
- **Crypto** - Payment signature verification

## Project Structure

```
Backend/
├── server.js                       # App entry point
├── config/
│   └── firebase.js                 # Firebase initialization
├── routes/
│   ├── booking.routes.js           # Public booking routes
│   └── admin.routes.js             # Admin panel routes
├── controllers/
│   ├── booking.controller.js       # Booking logic with Meet & Brevo
│   └── admin.controller.js         # Admin operations
├── services/
│   ├── firebase.service.js         # Firestore operations
│   ├── brevo.service.js            # Email service (Brevo API)
│   ├── googleMeet.service.js       # Google Meet link creation
│   ├── reminderScheduler.service.js # Automated email reminders
│   ├── razorpay.service.js         # Payment processing
│   └── caAvailability.service.js   # CA availability checking
├── utils/
│   ├── referenceIdHelper.js        # Reference ID generation
│   └── verifySignature.js          # Payment verification
├── middlewares/
│   └── adminSecret.js              # Admin authentication
├── package.json
├── .env
└── .gitignore
```

## Environment Setup

### 1. Install Dependencies

```bash
cd Backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `Backend` folder:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Business ID (Firestore document ID)
BUSINESS_ID=nab-consultancy

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key

# Brevo Email Configuration
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=noreply@nabconsultancy.com
ADMIN_EMAIL=admin@nabconsultancy.com
ADMIN_NAME=Admin Team

# Google Calendar API (for Google Meet)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_CALENDAR_ID=primary

# Admin Configuration
ADMIN_SECRET=your_strong_admin_secret_key_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → Service Accounts
4. Generate new private key
5. Copy the credentials to your `.env` file

**Important:** The private key must have `\n` characters replaced with actual newlines in the .env file.

### 4. Razorpay Setup

1. Create account at [Razorpay](https://razorpay.com/)
2. Get your API keys from Dashboard → Settings → API Keys
3. Use test keys for development
4. Add both Key ID and Key Secret to `.env`

### 5. Brevo Email Setup

1. Create account at [Brevo (Sendinblue)](https://www.brevo.com/)
2. Go to SMTP & API → API Keys
3. Generate new API key
4. Add to `.env` as `BREVO_API_KEY`
5. Verify sender email in Brevo dashboard
6. Set `BREVO_SENDER_EMAIL` to verified email
7. Set `ADMIN_EMAIL` for admin notifications

**Benefits over Gmail SMTP:**
- Higher sending limits
- Better deliverability
- Professional email tracking
- No app password needed
- Dedicated IP option

### 6. Google Meet Setup

1. **Enable Google Calendar API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials

2. **Get OAuth Credentials:**
   - Create OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
   - Download credentials

3. **Generate Refresh Token:**
   ```bash
   # Run this once to get refresh token
   npm run setup-google
   # Follow the OAuth flow
   # Copy refresh token to .env
   ```

4. **Add to .env:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   ```

## Running the Server

### Development Mode

```bash
npm run dev
```

The server will start with nodemon for auto-restart on file changes.

### Production Mode

```bash
npm start
```

The server will be available at `http://localhost:5000`

## Key Features

### 1. Brevo Email Service

**Three-Way Email Notifications:**
- **Customer Email** - Booking confirmation with Google Meet link
- **CA Email** - Assignment notification with client details
- **Admin Email** - New booking notification

**Email Types:**
- Confirmation emails (sent after payment)
- Reminder emails (12hr, 1hr, 1min before appointment)

**Professional Templates:**
- HTML email templates with responsive design
- Brand colors and styling
- Dynamic content based on booking data

### 2. Google Meet Integration

**Automatic Meet Link Creation:**
- Creates Google Calendar event
- Generates Google Meet link
- Adds to calendar of organizer
- Included in confirmation email

**Event Details:**
- Event title with reference ID
- Customer and CA details in description
- Proper timezone handling (Asia/Kolkata)
- Meet link in email to all parties

### 3. Automated Reminder Scheduler

**Cron-based Email Reminders:**
- **12 hours before** - First reminder
- **1 hour before** - Second reminder  
- **1 minute before** - Final reminder (join now)

**Reminder Features:**
- Runs automatically in background
- Sends to Customer, CA, and Admin
- Different email templates for each timing
- Tracks which reminders were sent
- Prevents duplicate reminders

**Scheduler Logic:**
```javascript
// Runs every hour for 12hr and 1hr reminders
cron.schedule('0 * * * *', checkHourlyReminders)

// Runs every minute for 1min reminders
cron.schedule('* * * * *', check1MinuteReminders)
```

### 4. CA Availability Checking

**Smart CA Assignment:**
- Checks CA unavailable slots
- Validates slot availability before booking
- Auto-assigns available CA (if enabled)
- Fetches CA details for emails

**Unavailable Slots:**
CAs can mark specific dates/times as unavailable in Firestore:
```javascript
unavailable_slots: [
  { date: "2025-02-15", time_slot: "10:00" },
  { date: "2025-02-15", time_slot: "14:00" }
]
```

### 5. Reference ID System

**Format:** `NAB_YYYY_0001`

**Features:**
- Sequential numbering
- Year-wise reset
- Used as Firestore document ID
- Professional appearance
- Easy tracking

**Counter Management:**
```
Firestore Path:
businesses/{businessId}/system/counters/reference_id/current
  ├── year: 2025
  └── counter: 42
```

## API Endpoints

### Public Booking APIs

#### Get Public Settings
```http
GET /api/booking/settings?businessId=nab-consultancy
```

**Response:**
```json
{
  "success": true,
  "data": {
    "business_name": "NAB Consultancy",
    "business_address": "14 Sammelan Marg, Prayagraj",
    "advance_booking_days": 15,
    "slot_durations": [
      { "duration": 30, "price": 500 },
      { "duration": 60, "price": 1000 }
    ],
    "weekly_schedule": {
      "monday": { "enabled": true, "start": "09:00", "end": "18:00" },
      ...
    },
    "off_days": ["2025-02-15"],
    "reminder_hours": 24
  }
}
```

#### Get Available Slots
```http
GET /api/booking/slots?date=2025-02-09&businessId=nab-consultancy&ca_id=pulkit-singhal-681365
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "NAB_2025_0001",
        "time_slot": "14:00",
        "duration": 30,
        "assigned_ca": "pulkit-singhal-681365",
        "customer_name": "John Doe"
      }
    ],
    "ca_unavailable_slots": [
      { "date": "2025-02-09", "time_slot": "10:00" }
    ],
    "working_hours": {
      "enabled": true,
      "start": "09:00",
      "end": "18:00"
    },
    "off_day": false,
    "date": "2025-02-09",
    "ca_id": "pulkit-singhal-681365"
  }
}
```

#### Create Booking Order
```http
POST /api/booking/create-order
```

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9876543210",
  "date": "2025-02-09",
  "time_slot": "10:00",
  "duration": 30,
  "consult_note": "Tax consultation needed",
  "ca_id": "pulkit-singhal-681365",
  "businessId": "nab-consultancy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "order_xxxxx",
    "amount": 50000,
    "currency": "INR",
    "appointment_id": "NAB_2025_0001",
    "reference_id": "NAB_2025_0001"
  }
}
```

#### Verify Payment and Confirm Booking
```http
POST /api/booking/verify-payment
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx",
  "appointment_id": "NAB_2025_0001",
  "businessId": "nab-consultancy"
}
```

**What Happens:**
1. ✅ Verify payment signature
2. ✅ Update appointment status
3. ✅ Fetch CA details from Firestore
4. ✅ Create Google Meet link
5. ✅ Send emails (Customer + CA + Admin)
6. ✅ Return confirmation

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "appointment_id": "NAB_2025_0001",
    "reference_id": "NAB_2025_0001",
    "status": "pending",
    "meet_link": "https://meet.google.com/xxx-yyyy-zzz"
  }
}
```

#### Get Booking Details
```http
GET /api/booking/:bookingId?businessId=nab-consultancy
```

### Admin APIs

**Note:** All admin APIs require the `x-admin-secret` header.

```http
x-admin-secret: your_admin_secret_key
```

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard/stats?businessId=nab-consultancy
```

#### Get All Appointments
```http
GET /api/admin/appointments?businessId=nab-consultancy&status=confirmed&date=2025-02-09&limit=10
```

#### Update Appointment Status
```http
PATCH /api/admin/appointments/:appointmentId/status?businessId=nab-consultancy
```

#### Get System Settings
```http
GET /api/admin/settings?businessId=nab-consultancy
```

## Email System (Brevo)

### Email Flow

**1. Confirmation Emails (After Payment):**
```javascript
brevoService.sendConfirmationEmail(appointmentData)
```

Sends 3 emails:
- **Customer:** Booking confirmation + Meet link + Details
- **CA:** New appointment assigned + Client info + Meet link
- **Admin:** New booking notification + Summary

**2. Reminder Emails (Automated):**
```javascript
// Runs via cron scheduler
brevoService.sendReminderEmail(appointmentData)
```

Sends reminders at:
- **12 hours before:** "Your appointment is in 12 hours"
- **1 hour before:** "Your appointment is in 1 hour"  
- **1 minute before:** "Your appointment is starting NOW - Join!"

### Email Templates

**Customer Confirmation:**
- ✅ Success badge
- 📅 Appointment details (date, time, duration)
- 👤 Assigned CA name
- 💰 Amount paid
- 🎥 Google Meet button
- 📝 Customer notes
- 📌 What's next section
- 📧 Reference ID

**CA Confirmation:**
- 🔔 New appointment badge
- 📅 Appointment details
- 👤 Client information (name, email, phone)
- 📝 Client notes
- 🎥 Google Meet link

**Admin Notification:**
- 🔔 New booking badge
- 📅 Booking summary
- 💰 Revenue tracking
- 👤 Customer details
- 🧑‍💼 Assigned CA

**Reminder Templates:**
Urgency increases as appointment approaches:
- 12hr: Yellow/Warning theme
- 1hr: Orange/Urgent theme
- 1min: Red/Critical theme + "Join NOW" button

### Email Configuration

**Brevo API Setup:**
```javascript
// brevo.service.js
const payload = {
  sender: {
    name: 'NAB Consultancy',
    email: process.env.BREVO_SENDER_EMAIL
  },
  to: [{ email: customer_email, name: customer_name }],
  subject: 'Booking Confirmed - NAB_2025_0001',
  htmlContent: generatedHTML
};

await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
  headers: {
    'api-key': process.env.BREVO_API_KEY,
    'Content-Type': 'application/json'
  }
});
```

**Email Tracking:**
Firestore stores email status:
```javascript
{
  confirmation_email_sent: true,
  confirmation_email_sent_at: Timestamp,
  brevo_message_id: "msg_xxxxx",
  reminder_12hr_sent: true,
  reminder_1hr_sent: true,
  reminder_1min_sent: true
}
```

## Google Meet Integration

### Meet Link Creation

**When:** After successful payment verification

**Process:**
1. Create Google Calendar event
2. Add Meet conferencing
3. Set event details (title, description, time)
4. Get Meet link from event
5. Store in Firestore
6. Include in confirmation emails

**Code Flow:**
```javascript
// booking.controller.js
const meetResult = await googleMeetService.createMeetLink(appointmentData);

if (meetResult.success) {
  // Update appointment with Meet link
  await appointmentRef.update({
    meet_link: meetResult.meetLink,
    meet_event_id: meetResult.eventId
  });
  
  // Add to appointment data for emails
  appointmentData.meetLink = meetResult.meetLink;
}
```

**Event Details:**
```javascript
{
  summary: `NAB Consultation - ${reference_id}`,
  description: `
    Client: ${customer_name}
    Email: ${customer_email}
    Phone: ${customer_phone}
    CA: ${ca_name}
    Notes: ${consult_note}
  `,
  start: { dateTime: '2025-02-09T10:00:00+05:30' },
  end: { dateTime: '2025-02-09T10:30:00+05:30' },
  conferenceData: {
    createRequest: { requestId: unique_id }
  }
}
```

### Meet Link Features

- **Automatic Creation:** No manual intervention
- **Timezone Aware:** Uses Asia/Kolkata timezone
- **Duration Based:** End time = start + duration
- **Unique Links:** Each appointment gets unique Meet room
- **Email Integration:** Included in all confirmation emails
- **Update Support:** Can be updated if appointment rescheduled
- **Cancellation:** Event deleted if appointment cancelled

## Reminder Scheduler

### Scheduler Configuration

**Startup:**
```javascript
// server.js
import reminderScheduler from './services/reminderScheduler.service.js';

// Start scheduler after server starts
reminderScheduler.start();
```

**Cron Jobs:**
```javascript
// Every hour (for 12hr and 1hr reminders)
cron.schedule('0 * * * *', async () => {
  await sendHourlyReminders();
}, { timezone: 'Asia/Kolkata' });

// Every minute (for 1min reminders)
cron.schedule('* * * * *', async () => {
  await check1MinuteReminders();
}, { timezone: 'Asia/Kolkata' });
```

### Reminder Logic

**Finding Appointments:**
```javascript
// Get appointments for today
const appointments = await db
  .collection('appointments')
  .where('date', '==', todayDate)
  .where('payment_status', '==', 'completed')
  .where('status', 'in', ['pending', 'confirmed'])
  .get();

// Filter by time window
for (appointment of appointments) {
  const appointmentTime = parseTime(appointment.time_slot);
  const timeDiff = appointmentTime - now;
  
  if (timeDiff === targetWindow) {
    sendReminder(appointment);
  }
}
```

**Preventing Duplicates:**
```javascript
// Check if reminder already sent
if (appointment.reminder_12hr_sent) {
  skip();
} else {
  sendReminder();
  updateFlag('reminder_12hr_sent', true);
}
```

**CA Details Fetching:**
```javascript
// Fetch CA email before sending reminder
if (appointment.assigned_ca && !appointment.ca_email) {
  const caDoc = await db
    .collection('CA')
    .doc(appointment.assigned_ca)
    .get();
  
  appointment.ca_email = caDoc.data().email;
  appointment.ca_name = caDoc.data().name;
}
```

### Reminder Email Content

**12-Hour Reminder:**
```
Subject: ⏰ Reminder: Your consultation | NAB_2025_0001
Theme: Yellow/Warning
Message: "Your consultation is in 12 hours!"
CTA: "View Details"
```

**1-Hour Reminder:**
```
Subject: 🔔 In 1 hour: Your consultation | NAB_2025_0001
Theme: Orange/Urgent
Message: "Your consultation is in 1 hour!"
CTA: "Prepare to Join"
```

**1-Minute Reminder:**
```
Subject: 🔔 STARTING NOW: Your consultation | NAB_2025_0001
Theme: Red/Critical (pulsing animation)
Message: "Your consultation is starting NOW!"
CTA: "Join Google Meet NOW" (prominent button)
```

## Firestore Collections

### appointments
```javascript
{
  // Basic Info
  id: "NAB_2025_0001",  // Reference ID as document ID
  reference_id: "NAB_2025_0001",
  
  // Customer Info
  customer_name: "John Doe",
  customer_email: "john@example.com",
  customer_phone: "9876543210",
  consult_note: "Tax consultation",
  
  // Appointment Details
  date: "2025-02-09",
  time_slot: "10:00",
  duration: 30,
  
  // Payment Info
  amount: 500,
  order_id: "order_xxxxx",
  payment_id: "pay_xxxxx",
  payment_status: "completed",
  
  // Status
  status: "confirmed",  // draft, pending, confirmed, completed, cancelled
  
  // CA Assignment
  assigned_ca: "pulkit-singhal-681365",
  ca_email: "pulkit@example.com",  // Fetched when needed
  ca_name: "Pulkit Singhal",
  
  // Google Meet
  meet_link: "https://meet.google.com/xxx-yyyy-zzz",
  meet_event_id: "event_id_from_google",
  
  // Email Tracking
  confirmation_email_sent: true,
  confirmation_email_sent_at: Timestamp,
  brevo_message_id: "msg_xxxxx",
  
  // Reminder Tracking
  reminder_12hr_sent: true,
  reminder_12hr_sent_at: Timestamp,
  reminder_1hr_sent: true,
  reminder_1hr_sent_at: Timestamp,
  reminder_1min_sent: true,
  reminder_1min_sent_at: Timestamp,
  
  // Timestamps
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### CA
```javascript
{
  id: "pulkit-singhal-681365",
  name: "Pulkit Singhal",
  email: "pulkitdigitalsolutions@gmail.com",
  phone: "9876543210",
  experience: 3,
  intro: "Lorem ipsum dolor sit amet...",
  status: "active",
  
  // Unavailable slots
  unavailable_slots: [
    {
      date: "2025-02-15",
      time_slot: "10:00",
      reason: "Personal appointment"
    }
  ],
  
  createdAt: Timestamp
}
```

### system/settings
```javascript
{
  business_name: "NAB Consultancy",
  business_address: "14 Sammelan Marg, Prayagraj - 211003",
  
  advance_booking_days: 15,
  
  slot_durations: [
    { duration: 30, price: 500 },
    { duration: 60, price: 1000 }
  ],
  
  weekly_schedule: {
    monday: { enabled: true, start: "09:00", end: "18:00" },
    tuesday: { enabled: true, start: "09:00", end: "18:00" },
    // ... other days
  },
  
  off_days: ["2025-02-15", "2025-03-25"],
  
  auto_assign_ca: true,
  reminder_hours: 24
}
```

### system/counters/reference_id/current
```javascript
{
  year: 2025,
  counter: 42
}
```

## Security Features

### Payment Security
- Server-side signature verification only
- Re-check slot availability after payment
- Firestore transactions for atomic operations
- Secure key management in environment variables

### Email Security
- Brevo API authentication
- Sender email verification required
- No credentials exposed to client
- Rate limiting on Brevo side

### Admin Authentication
- Secret-key based authentication
- Header validation on each request
- Environment variable storage
- Easy to rotate secrets

### Data Validation
- Input sanitization
- Email format validation
- Phone number validation (10 digits)
- Date/time format checks
- Required field validation

## Error Handling

**Consistent Format:**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error (dev mode only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing admin secret)
- `403` - Forbidden (invalid admin secret)
- `404` - Not Found
- `500` - Internal Server Error

**Email Errors:**
```javascript
// Non-blocking email errors
try {
  await brevoService.sendConfirmationEmail(data);
} catch (emailError) {
  console.error('Email failed but booking succeeded');
  // Booking still created successfully
}
```

## Performance Optimization

- Firestore composite indexes for queries
- Settings cached in memory
- Batch operations where possible
- Connection pooling for API calls
- Lazy initialization of services
- Efficient cron scheduling

## Testing

### Test Payment Flow
Use Razorpay test cards:

**Successful:**
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed:**
- Card: `4000 0000 0000 0002`

### Test Email Flow
1. Complete a test booking
2. Check console for email logs
3. Verify 3 emails sent (Customer, CA, Admin)
4. Check Brevo dashboard for delivery stats

### Test Reminders
```javascript
// Manually trigger reminder check
reminderScheduler.testReminders();
```

Or create appointment 1 minute in future and wait.

### Test Google Meet
1. Complete booking
2. Check Meet link in confirmation email
3. Verify event in Google Calendar
4. Join Meet link to test

## Deployment

### Environment Variables
Ensure all production variables set:
- Production Razorpay keys
- Production Firebase credentials
- Brevo API key with verified sender
- Google OAuth with production callback URL
- Strong admin secret

### Database Indexing
Create indexes in Firestore:
- `appointments`: `date`, `time_slot`, `status`, `payment_status`
- `CA`: `status`

### Monitoring
- API response times
- Payment success rates
- Email delivery rates (Brevo dashboard)
- Reminder scheduler health
- Google Calendar API quota

## Troubleshooting

### Brevo Emails Not Sending
- Verify API key is correct
- Check sender email is verified in Brevo
- Ensure daily sending limit not exceeded
- Check Brevo dashboard for bounce/spam reports
- Verify JSON payload format

### Google Meet Links Not Creating
- Check OAuth credentials
- Verify refresh token is valid
- Ensure Calendar API is enabled
- Check API quota in Google Console
- Verify calendar permissions

### Reminders Not Sending
- Check cron scheduler is running (`console.log` in cron)
- Verify timezone is set correctly (`Asia/Kolkata`)
- Check appointment has `payment_status: completed`
- Ensure reminder flags not already set
- Verify Brevo API is working

### CA Email Missing
- Ensure CA document has `email` field
- Check CA is assigned to appointment
- Verify code fetches CA details before sending
- Check Firestore security rules allow read

## Future Enhancements

- WhatsApp notifications via Twilio
- SMS reminders via MSG91
- Advanced analytics dashboard
- Appointment rescheduling
- Multi-business support
- CA self-service portal
- Customer booking history
- Video call directly in app

---

**Version:** 2.0.0  
**Last Updated:** February 2026
**Major Updates:** Brevo integration, Google Meet, Automated Reminders