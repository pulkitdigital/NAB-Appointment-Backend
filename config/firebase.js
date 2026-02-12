// Backend/config/firebase.js
import admin from 'firebase-admin';

const initializeFirebase = () => {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`, // ✅ Storage bucket configuration
    });

    // Configure Firestore to ignore undefined properties
    const firestore = admin.firestore();
    firestore.settings({
      ignoreUndefinedProperties: true,
    });

    console.log('✅ Firebase initialized successfully');
    console.log('✅ Firebase Storage bucket:', admin.storage().bucket().name);
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    process.exit(1);
  }
};

const db = () => admin.firestore();

export { initializeFirebase, db, admin };