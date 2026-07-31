import { MotherRecord, UserProfile, HomeVisit } from '../types';

const STORAGE_KEY = 'maa_asha_beneficiaries';
const HOME_VISITS_KEY = 'maa_asha_home_visits';

export function cleanVillageName(villageStr?: string): string {
  if (!villageStr) return '';
  return villageStr
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove brackets e.g. (रामपुर)
    .replace(/\b(gram|sub-center|subcenter|phc|chc|center|village|panchayat)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function generateUniqueAshaId(villageStr?: string): string {
  const clean = cleanVillageName(villageStr).toUpperCase() || 'RAMPUR';
  const villageTag = clean.length > 8 ? clean.substring(0, 8) : clean;
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `ASHA-${villageTag}-${randNum}`;
}

export function isMotherInAshaScope(mother: MotherRecord, ashaProfile?: UserProfile | null): boolean {
  if (!ashaProfile) return true; // Default fallback if profile uninitialized
  if (ashaProfile.role === 'admin') return true; // Admin can view all
  if (ashaProfile.role !== 'asha_worker') return true;

  const ashaVillageClean = cleanVillageName(ashaProfile.village);
  const motherVillageClean = cleanVillageName(mother.village);

  // Strict Village Filtering for ASHA Workers
  if (ashaVillageClean) {
    // 1. Village name match or containment
    if (motherVillageClean && (
      ashaVillageClean.includes(motherVillageClean) || 
      motherVillageClean.includes(ashaVillageClean)
    )) {
      return true;
    }

    // 2. Direct assignment by ASHA Worker ID or UID
    if (ashaProfile.ashaWorkerId && mother.assignedAshaId === ashaProfile.ashaWorkerId) {
      return true;
    }
    if (ashaProfile.uid && mother.assignedAshaId === ashaProfile.uid) {
      return true;
    }

    // Strict Isolation: Hide all patients from other villages (e.g. Saharanpur, Kalyanpur, Sundarnagar)
    return false;
  }

  return true;
}

export function evaluateMotherRisk(
  hb?: number,
  bp?: string,
  weight?: number,
  manualHighRisk?: boolean,
  manualReason?: string
): { isHighRisk: boolean; reason?: string } {
  const reasons: string[] = [];

  const sys = bp ? parseInt(bp.split('/')[0] || '0', 10) : 0;
  const dia = bp && bp.includes('/') ? parseInt(bp.split('/')[1] || '0', 10) : 0;

  if (hb !== undefined && hb > 0 && hb < 11.0) {
    if (hb < 8.0) {
      reasons.push(`Severe Anemia (Hb ${hb} g/dL)`);
    } else {
      reasons.push(`Moderate Anemia (Hb ${hb} g/dL)`);
    }
  }

  if (sys > 140 || dia > 90) {
    reasons.push(`High BP / Hypertension (${bp} mmHg)`);
  }

  if (weight !== undefined && weight > 0 && weight < 45) {
    reasons.push(`Low Maternal Weight (${weight} kg)`);
  }

  if (reasons.length > 0) {
    return { isHighRisk: true, reason: reasons.join(' • ') };
  }

  return { isHighRisk: false, reason: undefined };
}

export const INITIAL_SEED_MOTHERS: MotherRecord[] = [
  {
    id: 'm1',
    name: 'Radha Bai (राधा बाई)',
    age: 23,
    phone: '9826011223',
    village: 'Rampur Gram',
    district: 'Sehore',
    dueDate: '2026-09-10',
    currentWeek: 28,
    highRisk: true,
    highRiskReason: 'Severe Anemia (Hb 8.2 g/dL)',
    visited: false,
    assignedAshaId: 'ASHA-GOVT-101',
    bloodGroup: 'B+',
    hemoglobin: 8.2,
    bp: '130/85',
    weight: 48,
    ancVisitsCompleted: 3,
    jsyRegistered: true,
    pmmvyRegistered: true,
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'm2',
    name: 'Pooja Vishwakarma (पूजा विश्वकर्मा)',
    age: 26,
    phone: '9754122334',
    village: 'Sundarnagar',
    district: 'Bhopal',
    dueDate: '2026-11-20',
    currentWeek: 18,
    highRisk: false,
    visited: false,
    assignedAshaId: 'ASHA-GOVT-101',
    bloodGroup: 'O+',
    hemoglobin: 11.5,
    bp: '120/80',
    weight: 52,
    ancVisitsCompleted: 2,
    jsyRegistered: true,
    pmmvyRegistered: true,
    createdAt: '2026-02-14T10:00:00.000Z'
  },
  {
    id: 'm3',
    name: 'Meena Sharma (मीना शर्मा)',
    age: 29,
    phone: '9981233445',
    village: 'Kalyanpur',
    district: 'Sehore',
    dueDate: '2026-08-05',
    currentWeek: 33,
    highRisk: true,
    highRiskReason: 'Pregnancy Induced Hypertension (BP 145/95)',
    visited: false,
    assignedAshaId: 'ASHA-GOVT-101',
    bloodGroup: 'A+',
    hemoglobin: 10.1,
    bp: '145/95',
    weight: 56,
    ancVisitsCompleted: 3,
    jsyRegistered: true,
    pmmvyRegistered: false,
    createdAt: '2026-03-01T10:00:00.000Z'
  }
];

export function calculateCurrentWeek(lmpDate?: string, trimester?: number): number {
  if (lmpDate) {
    const lmpTime = new Date(lmpDate).getTime();
    if (!isNaN(lmpTime)) {
      const weeks = Math.floor((Date.now() - lmpTime) / (7 * 24 * 60 * 60 * 1000));
      if (weeks >= 1 && weeks <= 42) return weeks;
    }
  }
  if (trimester === 1) return 10;
  if (trimester === 2) return 20;
  if (trimester === 3) return 32;
  return 16;
}

export function getStoredBeneficiaries(): MotherRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_MOTHERS));
      return INITIAL_SEED_MOTHERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_MOTHERS));
    return INITIAL_SEED_MOTHERS;
  } catch (err) {
    console.warn('Error reading beneficiaries from storage:', err);
    return INITIAL_SEED_MOTHERS;
  }
}

export function saveAllBeneficiaries(list: MotherRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('beneficiariesUpdated'));
  } catch (err) {
    console.warn('Error saving beneficiaries to storage:', err);
  }
}

export function addBeneficiary(mother: MotherRecord): { mother: MotherRecord; isDuplicate: boolean } {
  const currentList = getStoredBeneficiaries();
  
  // Check for duplicate record by ID or phone number
  const cleanPhone = mother.phone.replace(/\D/g, '');
  const existingIndex = currentList.findIndex((m) => {
    if (mother.id && m.id === mother.id) return true;
    const mPhone = m.phone.replace(/\D/g, '');
    if (cleanPhone && mPhone && cleanPhone === mPhone) return true;
    if (m.name.toLowerCase().trim() === mother.name.toLowerCase().trim() && 
        cleanVillageName(m.village) === cleanVillageName(mother.village)) return true;
    return false;
  });

  if (existingIndex !== -1) {
    // Update existing record with new details instead of duplicating
    const existing = currentList[existingIndex];
    const updated: MotherRecord = {
      ...existing,
      ...mother,
      id: existing.id, // Preserve original ID
      assignedAshaId: mother.assignedAshaId || existing.assignedAshaId,
      village: mother.village || existing.village
    };
    currentList[existingIndex] = updated;
    saveAllBeneficiaries(currentList);
    return { mother: updated, isDuplicate: true };
  }

  const updatedList = [mother, ...currentList];
  saveAllBeneficiaries(updatedList);
  return { mother, isDuplicate: false };
}

export function registerMotherFromProfile(profile: Partial<UserProfile>): { mother: MotherRecord; isDuplicate: boolean } {
  const currentWeek = calculateCurrentWeek(profile.lmpDate, profile.trimester);
  
  let computedDueDate = profile.dueDate;
  if (!computedDueDate && profile.lmpDate) {
    const lmpTime = new Date(profile.lmpDate).getTime();
    if (!isNaN(lmpTime)) {
      computedDueDate = new Date(lmpTime + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
  }
  if (!computedDueDate) {
    computedDueDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
  }

  const motherVillage = profile.village || 'Rampur Gram';
  const assignedAshaId = profile.ashaWorkerId || generateUniqueAshaId(profile.village);

  const newMother: MotherRecord = {
    id: profile.uid || 'mother-' + Date.now(),
    name: profile.displayName || profile.email?.split('@')[0] || 'Registered Mother',
    age: 24,
    phone: profile.phone || '9876543210',
    village: motherVillage,
    district: profile.district || 'Sehore',
    lmpDate: profile.lmpDate || '',
    dueDate: computedDueDate,
    currentWeek: currentWeek,
    highRisk: false,
    visited: false,
    assignedAshaId: assignedAshaId,
    bloodGroup: 'B+',
    hemoglobin: profile.hb ? Number(profile.hb) : undefined,
    bp: profile.bp || '--',
    weight: profile.weight ? Number(profile.weight) : undefined,
    ifaCount: profile.ifaCount ? Number(profile.ifaCount) : 0,
    lastCheckupDate: 'Pending Checkup',
    ancVisitsCompleted: profile.ancVisitsCompleted || 0,
    jsyRegistered: true,
    pmmvyRegistered: true,
    createdAt: new Date().toISOString()
  };

  return addBeneficiary(newMother);
}

// Initial seed home visits
export const INITIAL_HOME_VISITS: HomeVisit[] = [
  {
    id: 'v1',
    motherId: 'm1',
    motherName: 'Radha Bai (राधा बाई)',
    ashaId: 'ASHA-GOVT-101',
    village: 'Rampur Gram',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    scheduledTime: '10:00 AM',
    purpose: 'high_risk_followup',
    status: 'scheduled',
    notes: 'Check Hb levels and severe anemia symptoms. Ensure IFA tablets taken.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'v2',
    motherId: 'm3',
    motherName: 'Meena Sharma (मीना शर्मा)',
    ashaId: 'ASHA-GOVT-101',
    village: 'Kalyanpur',
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // In 2 days
    scheduledTime: '11:30 AM',
    purpose: 'anc_checkup',
    status: 'scheduled',
    notes: 'Monitor BP and check for swelling/hypertension.',
    createdAt: new Date().toISOString()
  }
];

export function getStoredHomeVisits(): HomeVisit[] {
  try {
    const raw = localStorage.getItem(HOME_VISITS_KEY);
    if (!raw) {
      localStorage.setItem(HOME_VISITS_KEY, JSON.stringify(INITIAL_HOME_VISITS));
      return INITIAL_HOME_VISITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return INITIAL_HOME_VISITS;
  } catch (e) {
    return INITIAL_HOME_VISITS;
  }
}

export function saveHomeVisit(visit: HomeVisit): void {
  const list = getStoredHomeVisits();
  const existingIndex = list.findIndex(v => v.id === visit.id);
  let updatedList: HomeVisit[];
  if (existingIndex !== -1) {
    updatedList = [...list];
    updatedList[existingIndex] = visit;
  } else {
    updatedList = [visit, ...list];
  }
  try {
    localStorage.setItem(HOME_VISITS_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('visitsUpdated'));
  } catch (e) {}
}

export function updateHomeVisitStatus(visitId: string, status: HomeVisit['status']): void {
  const list = getStoredHomeVisits();
  const updated = list.map(v => v.id === visitId ? { ...v, status } : v);
  try {
    localStorage.setItem(HOME_VISITS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('visitsUpdated'));
  } catch (e) {}
}

