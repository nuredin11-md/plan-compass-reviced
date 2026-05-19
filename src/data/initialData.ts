import { Region, Facility, Indicator, MonthlyEntry } from "../types";

export const INITIAL_REGIONS: Region[] = [
  { id: "reg-1", code: "AMHARA", name: "Amhara Region" },
  { id: "reg-2", code: "OROMIA", name: "Oromia Region" },
  { id: "reg-3", code: "SNNPR", name: "SNNPR Region" },
  { id: "reg-4", code: "ADDIS", name: "Addis Ababa City Administration" }
];

export const INITIAL_FACILITIES: Facility[] = [
  { id: "fac-1", regionId: "reg-1", code: "AMHARA_H01", name: "Addis Alem Referral Hospital", type: "Hospital" },
  { id: "fac-2", regionId: "reg-1", code: "AMHARA_HC02", name: "Mersa Health Center", type: "Health Center" },
  { id: "fac-3", regionId: "reg-2", code: "OROMIA_H01", name: "Adama General Hospital & Medical College", type: "Hospital" },
  { id: "fac-4", regionId: "reg-3", code: "SNNPR_H01", name: "Hawassa University Comprehensive Hospital", type: "Hospital" },
  { id: "fac-5", regionId: "reg-4", code: "ADDIS_HC01", name: "Bole Health Center", type: "Health Center" }
];

export const DEPARTMENTS = [
  "Maternal & Child Health",
  "Tuberculosis (TB) Program",
  "HIV/AIDS & STI",
  "Nutrition & Food Security",
  "WASH (Water, Sanitation, Hygiene)",
  "Non-Communicable Diseases (NCD)"
];

export const INITIAL_INDICATORS: Indicator[] = [
  {
    code: "MCH_ANC_04",
    category: "Maternal Health",
    name: "Antenatal Care 4th Visit (ANC4) Coverage",
    unit: "%",
    baseline2015: 68,
    target2016: 85,
    department: "Maternal & Child Health"
  },
  {
    code: "MCH_SBA_01",
    category: "Maternal Health",
    name: "Skilled Birth Attendance (SBA) Rate",
    unit: "%",
    baseline2015: 72,
    target2016: 90,
    department: "Maternal & Child Health"
  },
  {
    code: "MCH_PNC_01",
    category: "Maternal Health",
    name: "Postnatal Care (PNC) Visit within 48 Hours",
    unit: "%",
    baseline2015: 55,
    target2016: 75,
    department: "Maternal & Child Health"
  },
  {
    code: "MCH_IMM_01",
    category: "Child Health",
    name: "Penta 3 / Measles Immunization Coverage",
    unit: "%",
    baseline2015: 80,
    target2016: 95,
    department: "Maternal & Child Health"
  },
  {
    code: "TB_DET_01",
    category: "Tuberculosis",
    name: "Tuberculosis Case Detection Rate (CDR)",
    unit: "%",
    baseline2015: 64,
    target2016: 80,
    department: "Tuberculosis (TB) Program"
  },
  {
    code: "TB_TXC_01",
    category: "Tuberculosis",
    name: "TB Treatment Success Rate (TSR)",
    unit: "%",
    baseline2015: 86,
    target2016: 92,
    department: "Tuberculosis (TB) Program"
  },
  {
    code: "HIV_ART_01",
    category: "HIV/AIDS",
    name: "Antiretroviral Therapy (ART) Initiation Rate",
    unit: "%",
    baseline2015: 88,
    target2016: 95,
    department: "HIV/AIDS & STI"
  },
  {
    code: "HIV_VL_01",
    category: "HIV/AIDS",
    name: "Viral Load Suppression Rate among ART Patients",
    unit: "%",
    baseline2015: 83,
    target2016: 90,
    department: "HIV/AIDS & STI"
  },
  {
    code: "NUT_MAM_01",
    category: "Nutrition",
    name: "Severe Acute Malnutrition (SAM) Treatment Cure Rate",
    unit: "%",
    baseline2015: 75,
    target2016: 85,
    department: "Nutrition & Food Security"
  },
  {
    code: "NUT_IYCF_01",
    category: "Nutrition",
    name: "Exclusive Breastfeeding Rate (under 6 months)",
    unit: "%",
    baseline2015: 59,
    target2016: 70,
    department: "Nutrition & Food Security"
  },
  {
    code: "WSH_LAT_01",
    category: "Sanitation",
    name: "Latrine Utilization Coverage in Community Areas",
    unit: "%",
    baseline2015: 61,
    target2016: 80,
    department: "WASH (Water, Sanitation, Hygiene)"
  },
  {
    code: "NCD_HTN_01",
    category: "NCD Management",
    name: "Hypertension Controlled Treatment Retention Rate",
    unit: "%",
    baseline2015: 45,
    target2016: 65,
    department: "Non-Communicable Diseases (NCD)"
  }
];

export const ETHIOPIAN_MONTHS = [
  "Hamle",
  "Nehase",
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tirr",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene"
];

// Generates some high-fidelity sample data.
// We purposefully leave some months as null (missing) to demonstrate the "Zero-Data" checks,
// and make some explicitly 0 to demonstrate the "Zero Performance" status.
export const generateSampleData = (): MonthlyEntry[] => {
  const data: MonthlyEntry[] = [];
  const now = new Date().toISOString();

  INITIAL_INDICATORS.forEach((ind) => {
    // Fill first 8 months with interesting numbers
    ETHIOPIAN_MONTHS.forEach((m, idx) => {
      let actual: number | null = null;
      let remarks = "";

      // Simulate reporting progress: Only first 8 months populated for many indicators
      if (idx < 8) {
        // Base value starts around baseline and moves up/down towards target
        const progressFactor = idx / 11;
        const trend = ind.target2016 - ind.baseline2015;
        const baseVal = ind.baseline2015 + trend * progressFactor;
        
        // Add random variance
        const variance = (Math.sin(idx + ind.name.length) * 8);
        const calculated = Math.min(100, Math.max(0, Math.round(baseVal + variance)));
        
        // Make individual entries interesting
        if (ind.code === "NCD_HTN_01" && idx === 4) {
          // Explicit zero-performance representing drug stockout or clinical pause
          actual = 0;
          remarks = "Critical: Antihypertensive pharmaceuticals short supply. Clinic visits paused.";
        } else if (ind.code === "MCH_SBA_01" && idx === 6) {
          actual = 0;
          remarks = "Ambulance down during severe road blocks. ZERO home delivery alternatives reached referral facility.";
        } else if (ind.code === "NUT_MAM_01" && idx === 5) {
          actual = 81;
          remarks = "UNICEF supply arrived in mass quantities.";
        } else {
          actual = calculated;
        }
      } else {
        // Late months remain unsubmitted (null) for demo
        actual = null;
      }

      data.push({
        code: ind.code,
        month: m,
        actual,
        remarks,
        updatedAt: now
      });
    });
  });

  return data;
};
