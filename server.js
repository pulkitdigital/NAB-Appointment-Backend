// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { initializeFirebase } from './config/firebase.js';
// import bookingRoutes from './routes/booking.routes.js';
// import adminRoutes from './routes/admin.routes.js';

// // Load environment variables
// dotenv.config();

// // Initialize Express app
// const app = express();
// const PORT = process.env.PORT || 5000;

// // Initialize Firebase
// initializeFirebase();

// // Middleware
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',  // CHANGED: 3000 -> 5173
//   credentials: true,
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   next();
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//   });
// });

// // API Routes
// app.use('/api/booking', bookingRoutes);
// app.use('/api/admin', adminRoutes);

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//   });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('Server error:', err);
//   res.status(500).json({
//     success: false,
//     message: 'Internal server error',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined,
//   });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`
// ╔════════════════════════════════════════════════════════════╗
// ║                                                            ║
// ║   🚀 Appointment Booking Backend Server                   ║
// ║                                                            ║
// ║   Status: RUNNING ✅                                       ║
// ║   Port: ${PORT}                                           ║
// ║   Environment: ${process.env.NODE_ENV || 'development'}   ║
// ║   Time: ${new Date().toLocaleString()}                    ║
// ║                                                            ║
// ╚════════════════════════════════════════════════════════════╝
//   `);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received, shutting down gracefully...');
//   process.exit(0);
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received, shutting down gracefully...');
//   process.exit(0);
// });

// export default app;










// Backend/server.js - WITH EMAIL SCHEDULER
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase.js';
import bookingRoutes from './routes/booking.routes.js';
import adminRoutes from './routes/admin.routes.js';
// ✅ NEW: Import email scheduler
import emailScheduler from './services/emailScheduler.service.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ✅ NEW: Test route for reminder emails
app.get('/test-reminder', async (req, res) => {
  try {
    console.log('🧪 Manual reminder test triggered');
    await emailScheduler.testReminders();
    res.json({ 
      success: true, 
      message: 'Test reminder check completed. Check server logs for details.' 
    });
  } catch (error) {
    console.error('❌ Test reminder error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// API Routes
app.use('/api/booking', bookingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 NAB Consultancy Backend Server                       ║
║                                                            ║
║   Status: RUNNING ✅                                       ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}   ║
║   Time: ${new Date().toLocaleString()}                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // ✅ NEW: Start email reminder scheduler
  try {
    emailScheduler.start();
    console.log('✅ Email reminder scheduler started successfully');
    console.log('⏰ Reminders will be sent daily at 9:00 AM IST');
  } catch (error) {
    console.error('❌ Failed to start email scheduler:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;