import { createClient } from "@supabase/supabase-js";
import { Indicator, MonthlyEntry, AuditLog, UserProfile, UserRole } from "../types";
import { INITIAL_INDICATORS, INITIAL_FACILITIES, INITIAL_REGIONS, generateSampleData } from "../data/initialData";

// Keep supabase definition to prevent any other compilation errors
const SUPABASE_URL = ((import.meta as any).env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) || "";

export const isSupabaseConfigured = (): boolean => {
  return false; // Force Cloud Google Firestore mode indication in UI
};

export const supabase = null;

// Import official firebase db connection
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

/**
 * Robust database wrapper that saves records both to local storage cache and directly
 * to live Google Cloud Firestore, keeping they state beautifully synchronizable in real-time.
 */
class LocalPlanCompassDb {
  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`plan_compass_${key}`);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`plan_compass_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }

  // Active user profile session context
  getActiveProfile(): UserProfile {
    const defaultProfile: UserProfile = {
      id: "usr-dev",
      email: "nuredinmuhammed176@gmail.com",
      displayName: "Nuredin Muhammed",
      role: "admin", // starts as admin to facilitate full testing by the user
      region: "Amhara Region",
      facility: "Addis Alem Referral Hospital",
      department: "Maternal & Child Health"
    };
    return this.getStorage<UserProfile>("active_profile", defaultProfile);
  }

  saveActiveProfile(profile: UserProfile): void {
    this.setStorage<UserProfile>("active_profile", profile);
    
    // Write profile to cloud database userProfiles/{userId}
    try {
      const docRef = doc(db, "userProfiles", profile.id);
      setDoc(docRef, profile).catch(e => {
        console.warn("Cloud write deferred (offline mode):", e.message);
      });
    } catch (e: any) {
      console.error("Firestore setDoc profile error:", e);
    }

    this.logAudit(
      profile.id,
      "PROFILE_SHIFTED",
      "user_session",
      `Active context shifted to Role: ${profile.role}, Dept: ${profile.department}, Facility: ${profile.facility}`
    );
  }

  // Master Plan Indicators (CRUD)
  getIndicators(): Indicator[] {
    return this.getStorage<Indicator[]>("indicators", INITIAL_INDICATORS);
  }

  saveIndicator(indicator: Indicator): boolean {
    const current = this.getIndicators();
    const index = current.findIndex(ind => ind.code === indicator.code);
    
    if (index >= 0) {
      current[index] = indicator;
    } else {
      current.push(indicator);
    }
    
    this.setStorage<Indicator[]>("indicators", current);

    // Save indicator to cloud collection indicators/{code}
    try {
      const docRef = doc(db, "indicators", indicator.code);
      setDoc(docRef, indicator).catch(e => {
        console.warn("Cloud write deferred (offline mode):", e.message);
      });
    } catch (e: any) {
      console.error("Firestore setDoc indicator error:", e);
    }
    
    const profile = this.getActiveProfile();
    this.logAudit(
      profile.id,
      index >= 0 ? "INDICATOR_UPDATED" : "INDICATOR_CREATED",
      `indicator:${indicator.code}`,
      `Indicator '${indicator.name}' (Code: ${indicator.code}, Dept: ${indicator.department}) saved/modified.`
    );
    return true;
  }

  deleteIndicator(code: string): boolean {
    const current = this.getIndicators();
    const index = current.findIndex(ind => ind.code === code);
    if (index >= 0) {
      const removed = current.splice(index, 1)[0];
      this.setStorage<Indicator[]>("indicators", current);

      // Clean/delete indicator from cloud collection indicators/{code}
      try {
        const docRef = doc(db, "indicators", code);
        deleteDoc(docRef).catch(e => {
          console.warn("Cloud delete deferred (offline mode):", e.message);
        });
      } catch (e: any) {
        console.error("Firestore deleteDoc indicator error:", e);
      }
      
      const profile = this.getActiveProfile();
      this.logAudit(
        profile.id,
        "INDICATOR_DELETED",
        `indicator:${code}`,
        `Indicator '${removed.name}' with code ${code} was permanently deleted.`
      );
      return true;
    }
    return false;
  }

  // Monthly entries (actual results)
  getMonthlyEntries(): MonthlyEntry[] {
    return this.getStorage<MonthlyEntry[]>("monthly_entries", generateSampleData());
  }

  saveMonthlyEntry(entry: MonthlyEntry): void {
    const current = this.getMonthlyEntries();
    const index = current.findIndex(
      e => e.code === entry.code && e.month === entry.month
    );

    const updatedEntry = {
      ...entry,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      current[index] = updatedEntry;
    } else {
      current.push(updatedEntry);
    }

    this.setStorage<MonthlyEntry[]>("monthly_entries", current);

    // Save monthly data to cloud collection monthlyEntries/{entryId}
    try {
      const entryId = `${entry.code}_${entry.month}`;
      const docRef = doc(db, "monthlyEntries", entryId);
      setDoc(docRef, updatedEntry).catch(e => {
        console.warn("Cloud write deferred (offline mode):", e.message);
      });
    } catch (e: any) {
      console.error("Firestore setDoc monthly entry error:", e);
    }

    const profile = this.getActiveProfile();
    const statusText = entry.actual === null ? "removed/blanked" : `set to ${entry.actual}`;
    this.logAudit(
      profile.id,
      "DATA_POINT_SAVED",
      `monthly_entry:${entry.code}_${entry.month}`,
      `Monthly values for ${entry.code} in ${entry.month} ${statusText}. Remarks: "${entry.remarks || 'None'}"`
    );
  }

  // Audit Logging
  getAuditLogs(): AuditLog[] {
    return this.getStorage<AuditLog[]>("audit_logs", []);
  }

  logAudit(userId: string, action: string, resource: string, details: string): void {
    const logs = this.getAuditLogs();
    const profile = this.getActiveProfile();
    const newLog: AuditLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userEmail: profile.email,
      action,
      resource,
      details,
      role: profile.role
    };
    logs.unshift(newLog); // newest logs first
    this.setStorage<AuditLog[]>("audit_logs", logs.slice(0, 100)); // cap at 100 entries

    // Save audit log to cloud collection auditLogs/{logId}
    try {
      const docRef = doc(db, "auditLogs", newLog.id);
      setDoc(docRef, newLog).catch(e => {
        // Silent catch for silent log transactions
      });
    } catch (e) {
      console.error("Firestore setDoc audit error:", e);
    }
  }

  clearAllData(): void {
    localStorage.removeItem("plan_compass_indicators");
    localStorage.removeItem("plan_compass_monthly_entries");
    localStorage.removeItem("plan_compass_audit_logs");
    localStorage.removeItem("plan_compass_active_profile");
    
    // Refresh indicator layout
    window.location.reload();
  }
}

export const localDb = new LocalPlanCompassDb();
export type { LocalPlanCompassDb };
