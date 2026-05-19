export interface BackupMetadata {
  id: string;
  timestamp: string;
  description: string;
  user: string;
  dataCount: number;
}

export class BackupManager {
  static listBackups(): BackupMetadata[] {
    try {
      const list = localStorage.getItem("plan_compass_auto_backups");
      return list ? JSON.parse(list) : [];
    } catch {
      return [];
    }
  }

  static createBackup(data: any, user: string, description: string) {
    try {
      const backups = this.listBackups();
      const nextId = `backup-${Date.now()}`;
      const newBackup: BackupMetadata = {
        id: nextId,
        timestamp: new Date().toISOString(),
        description,
        user,
        dataCount: data?.monthlyData?.length || 0
      };

      backups.unshift(newBackup);
      localStorage.setItem("plan_compass_auto_backups", JSON.stringify(backups));
      localStorage.setItem(`plan_compass_file_backup_${nextId}`, JSON.stringify(data));

      return { success: true, backupId: nextId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static restoreBackup(id: string, user: string) {
    try {
      const dataStr = localStorage.getItem(`plan_compass_file_backup_${id}`);
      if (!dataStr) {
        return { success: false, error: "Backup file not found in registry" };
      }
      return { success: true, data: JSON.parse(dataStr) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static deleteBackup(id: string, user: string): boolean {
    try {
      const backups = this.listBackups();
      const filtered = backups.filter(b => b.id !== id);
      localStorage.setItem("plan_compass_auto_backups", JSON.stringify(filtered));
      localStorage.removeItem(`plan_compass_file_backup_${id}`);
      return true;
    } catch {
      return false;
    }
  }

  static exportBackup(id: string): boolean {
    try {
      const dataStr = localStorage.getItem(`plan_compass_file_backup_${id}`);
      if (!dataStr) return false;
      
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PlanCompass_Export_${id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export class DataRecovery {
  static validateAndRepairData(data: any[], user: string) {
    if (!Array.isArray(data)) {
      return { valid: false, errors: ["Data payload must be an array of monthly records."], repaired: [] };
    }

    const repaired: any[] = [];
    const errors: string[] = [];

    data.forEach((entry, idx) => {
      if (!entry.code || !entry.month) {
        errors.push(`Record ${idx} is missing required code or month attributes.`);
      } else {
        repaired.push({
          code: String(entry.code),
          month: String(entry.month),
          actual: entry.actual !== undefined && entry.actual !== null ? Number(entry.actual) : null,
          remarks: entry.remarks ? String(entry.remarks) : "",
          updatedAt: entry.updatedAt ? String(entry.updatedAt) : new Date().toISOString()
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      repaired
    };
  }
}
