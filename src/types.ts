export type UserRole = 'pregnant_woman' | 'asha_worker' | 'admin';
export type UserStatus = 'approved' | 'pending_approval' | 'rejected';
export type AppLanguage = 'hi' | 'en';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  village?: string;
  district?: string;
  lmpDate?: string;
  dueDate?: string;
  trimester?: number;
  bp?: string;
  hb?: number | string;
  weight?: number | string;
  ifaCount?: number | string;
  ancVisitsCompleted?: number;
  ashaWorkerId?: string;
  subCenter?: string;
  createdAt?: string;
}

export interface MotherRecord {
  id: string;
  name: string;
  age: number;
  phone: string;
  village: string;
  district?: string;
  lmpDate?: string;
  dueDate: string;
  currentWeek: number;
  highRisk: boolean;
  highRiskReason?: string;
  visited?: boolean;
  lastVisitedDate?: string;
  lastCheckupDate?: string;
  assignedAshaId: string;
  bloodGroup?: string;
  hemoglobin?: number;
  bp?: string;
  weight?: number;
  ifaCount?: number;
  ancVisitsCompleted: number;
  jsyRegistered: boolean;
  pmmvyRegistered?: boolean;
  notes?: string;
  createdAt: string;
}

export interface VisitLog {
  id: string;
  motherId: string;
  ashaId: string;
  date: string;
  weightKg: number;
  bp: string;
  hbGdl: number;
  ironTabletsGiven: number;
  dangerSignsObserved: string[];
  nextVisitDate: string;
  notes?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface HomeVisit {
  id: string;
  motherId: string;
  motherName: string;
  ashaId: string;
  village: string;
  scheduledDate: string;
  scheduledTime?: string;
  purpose: 'anc_checkup' | 'anemia_hb_test' | 'ifa_distribution' | 'high_risk_followup' | 'delivery_planning' | 'postnatal_care';
  status: 'scheduled' | 'completed' | 'rescheduled' | 'cancelled';
  notes?: string;
  createdAt: string;
}
