export type UserRole = "admin" | "regional_coordinator" | "facility_head" | "department_head" | "data_entry" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  region: string;
  facility: string;
  department: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
}

export interface Facility {
  id: string;
  regionId: string;
  code: string;
  name: string;
  type: "Hospital" | "Health Center" | "Health Post" | "Clinic";
}

export interface Indicator {
  code: string;
  category: string;
  name: string;
  unit: string;
  baseline2015: number;
  target2016: number;
  department: string;
}

export interface MonthlyEntry {
  code: string;
  month: string; // Hamle, Nehase, Meskerem, etc.
  actual: number | null; // Null means missing, 0 means explicit zero performance
  remarks?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  role: UserRole;
}
