import { db, auth, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../firebase';
import { increment } from 'firebase/firestore';

export interface UserUsage {
  dailyCount: number;
  featureCounts?: { [key: string]: number };
  lastReset: any; // Timestamp
}

const FREE_FEATURE_LIMIT = 10;

export const usageService = {
  /**
   * Checks if the user can perform an AI operation.
   * Returns true if allowed, false otherwise.
   */
  async checkUsage(userRole: string, featureId: string = 'global'): Promise<{ allowed: boolean; remaining: number }> {
    // Application is now totally free, supported by ads.
    return { allowed: true, remaining: 9999 };
  },

  /**
   * Increments the user's daily usage count for a specific feature (for analytics purposes only).
   */
  async incrementUsage(userRole: string, featureId: string = 'global', count: number = 1) {
    if (!auth.currentUser) return;

    try {
      const usageRef = doc(db, 'usage', auth.currentUser.uid);
      const usageSnap = await getDoc(usageRef);

      if (!usageSnap.exists()) {
        await setDoc(usageRef, {
          dailyCount: count,
          featureCounts: { [featureId]: count },
          lastReset: serverTimestamp(),
        });
      } else {
        await updateDoc(usageRef, {
          [`featureCounts.${featureId}`]: increment(count),
          dailyCount: increment(count)
        });
      }
    } catch (error) {
      console.error("Error incrementing usage stats:", error);
    }
  }
};
