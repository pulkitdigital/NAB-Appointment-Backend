// Backend/services/business.service.js
import { db, admin } from '../config/firebase.js';

/**
 * Generate slug from business name
 * Example: "ABC Consultants Pvt Ltd" -> "abc-consultants-pvt-ltd"
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Replace multiple hyphens with single
};

/**
 * Create or get business
 */
export const getOrCreateBusiness = async (businessName) => {
  try {
    const slug = generateSlug(businessName);
    const businessRef = db().collection('businesses').doc(slug);
    
    const doc = await businessRef.get();
    
    if (!doc.exists) {
      // Create new business with default settings
      await businessRef.set({
        name: businessName,
        slug: slug,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Business created: ${slug}`);
    }
    
    return { id: slug, name: businessName };
  } catch (error) {
    console.error('Error in getOrCreateBusiness:', error);
    throw error;
  }
};

/**
 * Get business by slug
 */
export const getBusinessBySlug = async (slug) => {
  try {
    const doc = await db().collection('businesses').doc(slug).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting business:', error);
    throw error;
  }
};

/**
 * Get business reference helper
 */
export const getBusinessRef = (businessId) => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
  return db().collection('businesses').doc(businessId);
};