import { db, auth, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../firebase';
import { increment } from 'firebase/firestore';

export interface UserUsage {
  dailyCount: number;
  lastReset: any; // Timestamp
}

const FREE_DAILY_LIMIT = 5;

export const usageService = {
  /**
   * Checks if the user can perform an AI operation.
   * Returns true if allowed, false otherwise.
   */
  async checkUsage(userRole: string): Promise<{ allowed: boolean; remaining: number }> {
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
      await setDoc(usageRef, {
        dailyCount: 0,
        lastReset: serverTimestamp(),
      });
      return { allowed: true, remaining: FREE_DAILY_LIMIT };
    }

    const data = usageSnap.data() as UserUsage;
    const lastResetDate = data.lastReset?.toDate() || new Date(0);
    const lastResetTime = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate()).getTime();

    if (today > lastResetTime) {
      // New day, reset counter
      await updateDoc(usageRef, {
        dailyCount: 0,
        lastReset: serverTimestamp(),
      });
      return { allowed: true, remaining: FREE_DAILY_LIMIT };
    }

    const remaining = FREE_DAILY_LIMIT - data.dailyCount;
    return { 
      allowed: data.dailyCount < FREE_DAILY_LIMIT, 
      remaining: Math.max(0, remaining) 
    };
  },

  /**
   * Increments the user's daily usage count.
   */
  async incrementUsage(userRole: string, count: number = 1) {
    if (userRole === 'pro' || userRole === 'admin') return;
    if (!auth.currentUser) return;

    const usageRef = doc(db, 'usage', auth.currentUser.uid);
    await updateDoc(usageRef, {
      dailyCount: increment(count),
    });
  }
};
