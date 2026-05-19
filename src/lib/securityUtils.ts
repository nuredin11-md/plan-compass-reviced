import { localDb } from "./supabaseClient";

export class AuditLogger {
  static logAction(user: string, action: string, section: string, status: string, meta?: any) {
    localDb.logAudit(
      user,
      action,
      section,
      `Action: ${action} inside ${section} returned status ${status}. Details: ${JSON.stringify(meta || {})}`
    );
  }

  static logSecurityEvent(user: string, action: string, reason: string) {
    localDb.logAudit(
      user,
      "SECURITY_EVENT",
      action,
      `WARNING: Security event triggered: ${action}. Reason/Error: ${reason}`
    );
  }
}
