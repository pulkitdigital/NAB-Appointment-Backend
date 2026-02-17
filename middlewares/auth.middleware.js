//backend/middlewares/auth.middleware.js
import admin from 'firebase-admin';

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Token missing' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = decodedToken;
    next();

  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - Invalid or expired token' 
    });
  }
};

export default verifyToken;