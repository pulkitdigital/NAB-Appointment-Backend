//backend/controllers/auth.controller.js
import { admin } from '../config/firebase.js';

// ✅ Admin Login - email/password se login karo
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required',
      });
    }

    // Firebase REST API se verify karo
    const { default: fetch } = await import('node-fetch');
    const firebaseApiKey = process.env.FIREBASE_API_KEY;

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'Login failed';
      if (errorMsg.includes('INVALID_PASSWORD') || errorMsg.includes('EMAIL_NOT_FOUND') || errorMsg.includes('INVALID_LOGIN_CREDENTIALS')) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      return res.status(401).json({ success: false, message: 'Login failed' });
    }

    // Admin email check karo
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
    if (!adminEmails.includes(email)) {
      return res.status(403).json({ success: false, message: 'Access denied - Not an admin' });
    }

    return res.status(200).json({
      success: true,
      token: data.idToken,
      user: { email: data.email, uid: data.localId },
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Token verify karo
export const verifyAdmin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];

    if (!adminEmails.includes(decodedToken.email)) {
      return res.status(403).json({ success: false, message: 'Access denied - Not an admin' });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin verified',
      user: { uid: decodedToken.uid, email: decodedToken.email },
    });

  } catch (error) {
    console.error('Admin verify error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ✅ Logged in admin ki profile
export const getAdminProfile = async (req, res) => {
  try {
    const { uid, email } = req.user;
    return res.status(200).json({ success: true, user: { uid, email } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};