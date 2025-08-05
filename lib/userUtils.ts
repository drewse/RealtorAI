import { doc, setDoc, getDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { UserDocument } from '@/lib/firestore-schema';

/**
 * Create or update a user document in Firestore
 * @param user - Firebase Auth User object
 * @returns Promise<void>
 */
export const createUserDocument = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user document
      const userData = {
        uid: user.uid,
        email: user.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preferences: {
          defaultTranscriptionLanguage: 'en-US',
          autoGenerateFollowUp: true,
          emailSignature: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          voiceSynthesisProvider: 'google' as const,
          defaultScheduleDelay: 30, // 30 minutes after recording
        }
      };

      await setDoc(userRef, userData);
      console.log('✅ User document created:', user.uid);
    } else {
      // Update existing user document with latest info
      const updateData = {
        email: user.email || userDoc.data().email,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, updateData, { merge: true });
      console.log('✅ User document updated:', user.uid);
    }
  } catch (error) {
    console.error('❌ Error creating/updating user document:', error);
    throw error;
  }
};

/**
 * Get user document from Firestore
 * @param uid - User ID
 * @returns Promise<UserDocument | null>
 */
export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserDocument;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting user document:', error);
    return null;
  }
}; 