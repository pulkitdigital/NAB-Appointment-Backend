/**
 * Middleware to verify admin secret for protected routes
 */
export const verifyAdmin = (req, res, next) => {
  const adminSecret = req.headers['x-admin-secret'] || req.query.admin_secret;
  
  if (!adminSecret) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required',
    });
  }
  
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Invalid admin credentials',
    });
  }
  
  next();
};
