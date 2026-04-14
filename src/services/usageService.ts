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
    if (userRole === 'pro' || userRole === 'admin') {
      return { allowed: true, remaining: 999 };
    }

    if (!auth.currentUser) return { allowed: false, remaining: 0 };

    const usageRef = doc(db, 'usage', auth.currentUser.uid);
    const usageSnap = await getDoc(usageRef);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (!usageSnap.exists()) {
      // First time usage
      const initialFeatureCounts = { [featureId]: 0 };
      await setDoc(usageRef, {
        dailyCount: 0,
        featureCounts: initialFeatureCounts,
        lastReset: serverTimestamp(),
      });
      return { allowed: true, remaining: FREE_FEATURE_LIMIT };
    }

    const data = usageSnap.data() as UserUsage;
    const lastResetDate = data.lastReset?.toDate() || new Date(0);
    const lastResetTime = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate()).getTime();

    if (today > lastResetTime) {
      // New day, reset counter
      await updateDoc(usageRef, {
        dailyCount: 0,
        featureCounts: {},
        lastReset: serverTimestamp(),
      });
      return { allowed: true, remaining: FREE_FEATURE_LIMIT };
    }

    const featureCounts = data.featureCounts || {};
    const currentCount = featureCounts[featureId] || 0;
    const remaining = FREE_FEATURE_LIMIT - currentCount;

    return { 
      allowed: currentCount < FREE_FEATURE_LIMIT, 
      remaining: Math.max(0, remaining) 
    };
  },

  /**
   * Increments the user's daily usage count for a specific feature.
   */
  async incrementUsage(userRole: string, featureId: string = 'global', count: number = 1) {
    if (userRole === 'pro' || userRole === 'admin') return;
    if (!auth.currentUser) return;

    const usageRef = doc(db, 'usage', auth.currentUser.uid);
    
    // We use a dynamic key for the update
    await updateDoc(usageRef, {
      [`featureCounts.${featureId}`]: increment(count),
      dailyCount: increment(count) // Keep global count for stats
    });
  }
};
