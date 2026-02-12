// Backend/middlewares/business.middleware.js

/**
 * Attach business ID to request
 * Priority: Header > Query > Environment > Default
 */
export const attachBusinessId = (req, res, next) => {
  const businessId = 
    req.headers['x-business-id'] || 
    req.query.businessId || 
    process.env.DEFAULT_BUSINESS_ID ||
    'default-business';
  
  req.businessId = businessId;
  next();
};