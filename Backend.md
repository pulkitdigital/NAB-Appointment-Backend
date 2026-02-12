# Backend Documentation - Appointment Booking System

## Overview

This is a complete Node.js/Express.js backend for an appointment booking system with Firebase Firestore database, Razorpay payment integration, and email notifications. The system supports dynamic pricing based on consultation duration, customizable working hours, off-day management, and automatic CA assignment.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Firestore** - NoSQL database
- **Razorpay** - Payment gateway
- **Nodemailer** - Email service
- **Crypto** - Payment signature verification

## Project Structure

```
Backend/
├── server.js                  # App entry (root)
├── config/
│   └── firebase.js            # Firebase initialization
├── routes/
│   ├── booking.routes.js
│   └── admin.routes.js
├── controllers/
│   ├── booking.controller.js
│   └── admin.controller.js
├── services/
│   ├── firebase.service.js
│   ├── email.service.js
│   └── razorpay.service.js
├── utils/
│   ├── helpers.js
│   ├── slotLock.js
│   └── verifySignature.js
├── middlewares/
│   └── adminSecret.js
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

Create a `.env` file in the `Backend` folder (a starter `.env` has been added). Update the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=your-email@gmail.com

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

### 5. Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security
   - 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use this app password in `SMTP_PASS`

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

## API Endpoints

### Public Booking APIs

#### Get Available Slots
```http
GET /api/booking/slots?date=2024-02-09
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-02-09",
    "available": ["09:00", "09:30", "10:00", ...],
    "booked": ["14:00", "14:30"],
    "offDay": false,
    "slotDurations": [
      { "duration": 30, "price": 500 },
      { "duration": 60, "price": 1000 }
    ]
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
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "9876543210",
  "date": "2024-02-09",
  "time_slot": "10:00",
  "duration": 30,
  "consult_note": "Tax consultation needed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_xxxxx",
      "amount": 50000,
      "currency": "INR"
    },
    "bookingData": {
      "reference_id": "APT-20240209-A1B2",
      ...
    }
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
  "bookingData": {
    "reference_id": "APT-20240209-A1B2",
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking confirmed successfully",
  "data": {
    "appointmentId": "doc_id",
    "reference_id": "APT-20240209-A1B2",
    ...
  }
}
```

#### Get Booking Details
```http
GET /api/booking/:bookingId
```

### Admin APIs

**Note:** All admin APIs require the `x-admin-secret` header.

```http
x-admin-secret: your_admin_secret_key
```

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAppointments": 150,
    "todayAppointments": 5,
    "pendingAppointments": 3,
    "completedAppointments": 120,
    "totalRevenue": 75000
  }
}
```

#### Get All Appointments
```http
GET /api/admin/appointments?status=confirmed&date=2024-02-09&limit=10
```

**Query Parameters:**
- `status` - Filter by status (pending, confirmed, completed, cancelled)
- `date` - Filter by date (YYYY-MM-DD)
- `assigned_ca` - Filter by CA ID
- `limit` - Number of results
- `search` - Search by name, email, mobile, or reference ID

#### Update Appointment Status
```http
PATCH /api/admin/appointments/:appointmentId/status
```

**Request Body:**
```json
{
  "status": "completed"
}
```

#### Assign CA to Appointment
```http
PATCH /api/admin/appointments/:appointmentId/assign
```

**Request Body:**
```json
{
  "caId": "ca_doc_id"
}
```

#### Get All CAs
```http
GET /api/admin/ca/list
```

#### Create New CA
```http
POST /api/admin/ca/create
```

**Request Body:**
```json
{
  "name": "CA Rajesh Kumar",
  "email": "rajesh@example.com",
  "mobile": "9876543210",
  "specialization": "Tax & Audit",
  "experience": 10,
  "status": "active"
}
```

#### Update CA
```http
PATCH /api/admin/ca/:caId
```

#### Delete CA
```http
DELETE /api/admin/ca/:caId
```

#### Get System Settings
```http
GET /api/admin/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "advance_booking_days": 15,
    "slot_durations": [
      { "duration": 30, "price": 500 },
      { "duration": 60, "price": 1000 }
    ],
    "working_hours": {
      "start": "09:00",
      "end": "18:00"
    },
    "off_days": ["2024-02-15", "2024-02-25"],
    "auto_assign_ca": true,
    "email_notifications": true,
    "sms_notifications": false,
    "reminder_hours": 24
  }
}
```

#### Update System Settings
```http
PATCH /api/admin/settings
```

**Request Body:**
```json
{
  "advance_booking_days": 15,
  "slot_durations": [
    { "duration": 30, "price": 500 },
    { "duration": 60, "price": 1000 }
  ],
  "working_hours": {
    "start": "09:00",
    "end": "18:00"
  }
}
```

#### Add Off Day
```http
POST /api/admin/settings/off-day
```

**Request Body:**
```json
{
  "date": "2024-02-15",
  "reason": "Public Holiday"
}
```

#### Remove Off Day
```http
DELETE /api/admin/settings/off-day
```

**Request Body:**
```json
{
  "date": "2024-02-15"
}
```

## Firestore Collections

### appointments
```javascript
{
  id: "auto-generated",
  reference_id: "APT-20240209-A1B2",
  name: "John Doe",
  email: "john@example.com",
  mobile: "9876543210",
  date: "2024-02-09",
  time_slot: "10:00",
  duration: 30,
  amount: 500,
  consult_note: "Tax consultation",
  status: "confirmed", // pending, confirmed, completed, cancelled
  payment_id: "pay_xxxxx",
  payment_status: "completed",
  order_id: "order_xxxxx",
  assigned_ca: "ca_doc_id",
  assigned_ca_name: "CA Rajesh Kumar",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### cas
```javascript
{
  id: "auto-generated",
  name: "CA Rajesh Kumar",
  email: "rajesh@example.com",
  mobile: "9876543210",
  specialization: "Tax & Audit",
  experience: 10,
  status: "active", // active, inactive
  created_at: "2024-02-09T10:00:00.000Z"
}
```

### settings
```javascript
{
  id: "system",
  advance_booking_days: 15,
  slot_durations: [
    { duration: 30, price: 500 },
    { duration: 60, price: 1000 }
  ],
  working_hours: {
    start: "09:00",
    end: "18:00"
  },
  off_days: ["2024-02-15", "2024-02-25"],
  auto_assign_ca: true,
  email_notifications: true,
  sms_notifications: false,
  reminder_hours: 24
}
```

## Key Features

### 1. Dynamic Pricing
- Configure multiple duration options (30min, 60min, etc.)
- Each duration has its own price
- Prices can be updated in settings

### 2. Off Day Management
- Admin can mark specific dates as off days
- Bookings are blocked on off days
- Existing appointments are not affected

### 3. Advance Booking Control
- Configure how many days in advance bookings are allowed (e.g., 15 days)
- Prevents users from booking too far ahead

### 4. Auto CA Assignment
- When enabled, automatically assigns CAs to new bookings
- Uses round-robin logic for balanced distribution
- Can be turned off for manual assignment

### 5. Payment Verification
- Double verification of Razorpay signatures
- Re-checks slot availability after payment
- Prevents double booking during payment process
- Uses Firestore transactions for atomic operations

### 6. Email Notifications
- Automatic confirmation emails after booking
- Cancellation emails when appointments are cancelled
- Professional HTML email templates
- Can be toggled in settings

## Security Features

### Payment Security
- Server-side payment verification only
- Never trust frontend payment status
- Razorpay signature validation
- Secure key management

### Admin Authentication
- Simple secret-key based auth
- Header-based authentication
- Environment variable storage
- Easy to implement and secure for single-admin systems

### Data Validation
- Input sanitization
- Email and mobile validation
- Date format validation
- Required field checks

## Error Handling

The API follows a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing admin secret)
- `403` - Forbidden (invalid admin secret)
- `404` - Not Found
- `500` - Internal Server Error

## Testing

### Test Payment Flow

Use Razorpay test cards:

**Successful Payment:**
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment:**
- Card: `4000 0000 0000 0002`

### Test Admin APIs

Use curl or Postman:

```bash
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "x-admin-secret: your_admin_secret_key"
```

## Deployment

### Environment Variables
Make sure all production environment variables are set:
- Use production Razorpay keys
- Use production Firebase credentials
- Set strong admin secret
- Configure production SMTP

### Database Indexing
Create indexes in Firestore for better performance:
- `appointments`: Index on `date`, `time_slot`, `status`
- `cas`: Index on `status`

### Monitoring
- Monitor API response times
- Track payment success rates
- Monitor email delivery
- Check Firestore usage

## Troubleshooting

### Firebase Connection Issues
- Verify credentials in `.env`
- Check Firebase project ID
- Ensure private key has proper newlines
- Verify service account has Firestore permissions

### Razorpay Payment Fails
- Check API keys are correct
- Verify signature verification logic
- Use test mode for development
- Check Razorpay dashboard for errors

### Email Not Sending
- Verify Gmail app password
- Check SMTP settings
- Ensure less secure apps is disabled
- Use app-specific password

### Slot Booking Conflicts
- Ensure Firestore transactions are working
- Check slot availability logic
- Verify date/time formats
- Test concurrent bookings

## Performance Optimization

- Use Firestore indexes for queries
- Cache settings in memory
- Batch read operations where possible
- Use connection pooling for email
- Implement rate limiting if needed

## Future Enhancements

- SMS notifications via Twilio
- Google Calendar integration
- WhatsApp notifications
- Multi-admin support with roles
- Advanced analytics
- Appointment rescheduling
- Automated reminders via cron jobs
- Video call integration

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Test with curl/Postman
4. Check Firebase console
5. Verify Razorpay dashboard

---

**Version:** 1.0.0  
**Last Updated:** February 2026