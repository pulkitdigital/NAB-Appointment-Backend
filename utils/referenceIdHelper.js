// Backend/utils/referenceIdHelper.js
import admin from 'firebase-admin';

/**
 * Get current year
 * @returns {number} Current year (e.g., 2026)
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Get or initialize counter for the current year
 * @param {FirebaseFirestore.DocumentReference} businessRef - Business reference
 * @param {number} year - Current year
 * @returns {Promise<number>} Next counter value
 */
async function getNextCounter(businessRef, year) {
  const counterRef = businessRef
    .collection('system')
    .doc('counters');

  try {
    // Use Firestore transaction to ensure atomicity
    const nextCounter = await admin.firestore().runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let counterData = {};
      let currentCounter = 0;

      if (counterDoc.exists) {
        counterData = counterDoc.data();
        
        // Check if year has changed
        if (counterData.year === year) {
          currentCounter = counterData.counter || 0;
        } else {
          // New year - reset counter
          console.log(`🔄 New year detected. Resetting counter from ${counterData.year} to ${year}`);
          currentCounter = 0;
        }
      }

      // Increment counter
      const newCounter = currentCounter + 1;

      // Update counter in database
      transaction.set(counterRef, {
        year: year,
        counter: newCounter,
        last_updated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return newCounter;
    });

    return nextCounter;
  } catch (error) {
    console.error('❌ Error getting counter:', error);
    throw error;
  }
}

/**
 * Generate reference ID in format: NAB_YYYY_0001
 * This will also be used as the Firestore document ID
 * @param {FirebaseFirestore.DocumentReference} businessRef - Business reference
 * @returns {Promise<string>} Generated reference ID
 */
export async function generateReferenceId(businessRef) {
  try {
    const year = getCurrentYear();
    const counter = await getNextCounter(businessRef, year);
    
    // Format counter with leading zeros (4 digits)
    const paddedCounter = String(counter).padStart(4, '0');
    
    // Generate Reference ID: NAB_2026_0001
    const referenceId = `NAB_${year}_${paddedCounter}`;
    
    console.log(`✅ Generated Reference ID: ${referenceId}`);
    
    return referenceId;
  } catch (error) {
    console.error('❌ Error generating reference ID:', error);
    throw new Error('Failed to generate reference ID');
  }
}

/**
 * Get current counter value (for display purposes)
 * @param {FirebaseFirestore.DocumentReference} businessRef - Business reference
 * @returns {Promise<{year: number, counter: number}>} Current counter info
 */
export async function getCurrentCounter(businessRef) {
  try {
    const counterRef = businessRef
      .collection('system')
      .doc('counters');
    
    const counterDoc = await counterRef.get();
    
    if (!counterDoc.exists) {
      return { year: getCurrentYear(), counter: 0 };
    }
    
    const data = counterDoc.data();
    return {
      year: data.year || getCurrentYear(),
      counter: data.counter || 0
    };
  } catch (error) {
    console.error('❌ Error getting current counter:', error);
    throw error;
  }
}