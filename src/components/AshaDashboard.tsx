import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MotherRecord, VisitLog, UserProfile, HomeVisit } from '../types';
import { 
  getStoredBeneficiaries, 
  addBeneficiary, 
  saveAllBeneficiaries, 
  evaluateMotherRisk, 
  isMotherInAshaScope, 
  getStoredHomeVisits, 
  saveHomeVisit, 
  updateHomeVisitStatus,
  cleanVillageName 
} from '../lib/beneficiaryStorage';
import { AshaAiCopilot } from './AshaAiCopilot';
import { 
  UserCheck, 
  Search, 
  Plus, 
  ShieldAlert, 
  Heart, 
  Calendar, 
  Phone, 
  MapPin, 
  CheckCircle, 
  Activity, 
  Pill, 
  FileText, 
  DollarSign, 
  Users, 
  Sparkles, 
  X,
  Building,
  Check,
  AlertCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const AshaDashboard: React.FC = () => {
  const { userProfile, fetchPendingWorkers, approveAshaWorker } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [activeTab, setActiveTab] = useState<'mothers' | 'hrp' | 'visit_scheduler' | 'schemes' | 'inventory' | 'pending_workers' | 'ai_copilot'>('mothers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchListening, setIsSearchListening] = useState(false);
  const searchRecognitionRef = React.useRef<any>(null);

  const handleVoiceSearch = () => {
    if (isSearchListening) {
      if (searchRecognitionRef.current) {
        searchRecognitionRef.current.stop();
      }
      setIsSearchListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(language === 'hi' 
        ? 'आपके ब्राउज़र में आवाज़ पहचान समर्थित नहीं है।' 
        : 'Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsSearchListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setSearchQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsSearchListening(false);
      };

      recognition.onend = () => {
        setIsSearchListening(false);
      };

      searchRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsSearchListening(false);
    }
  };
  const [showAddMotherModal, setShowAddMotherModal] = useState(false);
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [showScheduleVisitModal, setShowScheduleVisitModal] = useState(false);
  const [selectedMother, setSelectedMother] = useState<MotherRecord | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  // Synchronized Beneficiaries State
  const [mothers, setMothers] = useState<MotherRecord[]>(() => getStoredBeneficiaries());
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>(() => getStoredHomeVisits());

  useEffect(() => {
    const reloadMothers = () => {
      setMothers(getStoredBeneficiaries());
      setHomeVisits(getStoredHomeVisits());
    };
    reloadMothers();
    window.addEventListener('beneficiariesUpdated', reloadMothers);
    window.addEventListener('visitsUpdated', reloadMothers);
    window.addEventListener('storage', reloadMothers);
    return () => {
      window.removeEventListener('beneficiariesUpdated', reloadMothers);
      window.removeEventListener('visitsUpdated', reloadMothers);
      window.removeEventListener('storage', reloadMothers);
    };
  }, []);

  // Form states for Schedule Visit Modal
  const [schedMotherId, setSchedMotherId] = useState('');
  const [schedDate, setSchedDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState('10:00 AM');
  const [schedPurpose, setSchedPurpose] = useState<HomeVisit['purpose']>('anc_checkup');
  const [schedNotes, setSchedNotes] = useState('');

  const [pendingWorkers, setPendingWorkers] = useState<UserProfile[]>([]);

  // Modal Form States for Registering New Mother
  const [newMotherName, setNewMotherName] = useState('');
  const [newMotherAge, setNewMotherAge] = useState(24);
  const [newMotherPhone, setNewMotherPhone] = useState('');
  const [newMotherVillage, setNewMotherVillage] = useState('');
  const [newMotherLmpDate, setNewMotherLmpDate] = useState('');
  const [newMotherBloodGroup, setNewMotherBloodGroup] = useState('B+');
  const [newMotherHb, setNewMotherHb] = useState<number | string>('');
  const [newMotherBp, setNewMotherBp] = useState('');
  const [newMotherHighRisk, setNewMotherHighRisk] = useState(false);
  const [newMotherRiskReason, setNewMotherRiskReason] = useState('');

  // Auto-calculated EDD from LMP
  const calculatedMotherEdd = (() => {
    if (!newMotherLmpDate) return '';
    const time = new Date(newMotherLmpDate).getTime();
    if (isNaN(time)) return '';
    return new Date(time + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  })();

  // Modal Form States for Logging Home Visit
  const [visitWeight, setVisitWeight] = useState<number | string>('');
  const [visitBp, setVisitBp] = useState('');
  const [visitHb, setVisitHb] = useState<number | string>('');
  const [visitIfaGiven, setVisitIfaGiven] = useState(30);
  const [visitDangerSigns, setVisitDangerSigns] = useState<string[]>([]);

  useEffect(() => {
    // Load pending workers if tab requested
    if (activeTab === 'pending_workers') {
      fetchPendingWorkers().then(setPendingWorkers);
    }
  }, [activeTab]);

  const handleRegisterMother = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotherName.trim()) return;

    // Mobile Number Validation
    const cleanPhone = newMotherPhone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length !== 10) {
      alert(language === 'hi' ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const finalEdd = calculatedMotherEdd || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    
    // Calculate current pregnancy week from LMP if available
    let week = 16;
    if (newMotherLmpDate) {
      const lmpTime = new Date(newMotherLmpDate).getTime();
      if (!isNaN(lmpTime)) {
        const calculatedWeeks = Math.floor((Date.now() - lmpTime) / (7 * 24 * 60 * 60 * 1000));
        if (calculatedWeeks >= 1 && calculatedWeeks <= 42) {
          week = calculatedWeeks;
        }
      }
    }

    const hbVal = newMotherHb !== '' ? Number(newMotherHb) : undefined;
    const bpVal = newMotherBp.trim() || '--';
    const riskEval = evaluateMotherRisk(hbVal, bpVal, undefined, newMotherHighRisk, newMotherRiskReason);

    const newRecord: MotherRecord = {
      id: 'm-' + Date.now(),
      name: newMotherName.trim(),
      age: Number(newMotherAge) || 24,
      phone: cleanPhone,
      village: newMotherVillage.trim() || userProfile?.village || 'Rampur Gram',
      district: userProfile?.district || 'Sehore',
      lmpDate: newMotherLmpDate,
      dueDate: finalEdd,
      currentWeek: week,
      highRisk: riskEval.isHighRisk,
      highRiskReason: riskEval.reason,
      visited: false,
      assignedAshaId: userProfile?.ashaWorkerId || userProfile?.uid || 'ASHA-MP-1042',
      bloodGroup: newMotherBloodGroup || 'B+',
      hemoglobin: hbVal,
      bp: bpVal,
      lastCheckupDate: 'Pending Checkup',
      ancVisitsCompleted: 0,
      jsyRegistered: true,
      pmmvyRegistered: false,
      createdAt: new Date().toISOString()
    };

    const { mother: savedRecord, isDuplicate } = addBeneficiary(newRecord);
    setMothers(getStoredBeneficiaries());

    if (isDuplicate) {
      setDuplicateNotice('User already registered! Syncing beneficiary details with local ASHA worker.');
      setTimeout(() => setDuplicateNotice(null), 6000);
    }

    setShowAddMotherModal(false);

    setNewMotherName('');
    setNewMotherAge(24);
    setNewMotherPhone('');
    setNewMotherVillage('');
    setNewMotherLmpDate('');
    setNewMotherBloodGroup('B+');
    setNewMotherHb('');
    setNewMotherBp('');
    setNewMotherHighRisk(false);
    setNewMotherRiskReason('');
  };

  const handleScheduleVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedMotherId) return;

    const targetMother = mothers.find(m => m.id === schedMotherId);
    const newVisit: HomeVisit = {
      id: 'visit-' + Date.now(),
      motherId: schedMotherId,
      motherName: targetMother?.name || 'Beneficiary',
      ashaId: userProfile?.ashaWorkerId || userProfile?.uid || 'ASHA-GOVT-101',
      village: targetMother?.village || userProfile?.village || 'Rampur Gram',
      scheduledDate: schedDate,
      scheduledTime: schedTime,
      purpose: schedPurpose,
      status: 'scheduled',
      notes: schedNotes,
      createdAt: new Date().toISOString()
    };

    saveHomeVisit(newVisit);
    setHomeVisits(getStoredHomeVisits());
    setShowScheduleVisitModal(false);
    setSchedNotes('');
  };

  const handleLogVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMother) return;

    const newHb = visitHb !== '' ? Number(visitHb) : undefined;
    const newBp = visitBp.trim() || '--';
    const newWeight = visitWeight !== '' ? Number(visitWeight) : undefined;
    const todayStr = new Date().toISOString().split('T')[0];

    // Update mother record & dynamically re-evaluate risk (Task 7 override)
    const updatedMothers = mothers.map(m => {
      if (m.id === selectedMother.id) {
        const riskEval = evaluateMotherRisk(newHb, newBp, newWeight, m.highRisk, m.highRiskReason);
        return {
          ...m,
          ancVisitsCompleted: m.ancVisitsCompleted + 1,
          hemoglobin: newHb,
          bp: newBp,
          weight: newWeight,
          highRisk: riskEval.isHighRisk,
          highRiskReason: riskEval.reason,
          visited: true,
          lastVisitedDate: todayStr,
          lastCheckupDate: todayStr
        };
      }
      return m;
    });

    setMothers(updatedMothers);
    saveAllBeneficiaries(updatedMothers);
    setShowLogVisitModal(false);
    setSelectedMother(null);
  };

  const handleToggleVisited = (motherId: string) => {
    const updatedMothers = mothers.map(m => {
      if (m.id === motherId) {
        const isNowVisited = !m.visited;
        return {
          ...m,
          visited: isNowVisited,
          lastVisitedDate: isNowVisited ? new Date().toISOString().split('T')[0] : undefined,
          ancVisitsCompleted: isNowVisited ? Math.max(1, m.ancVisitsCompleted) : m.ancVisitsCompleted
        };
      }
      return m;
    });
    setMothers(updatedMothers);
    saveAllBeneficiaries(updatedMothers);
  };

  const scopedMothers = mothers.filter(m => isMotherInAshaScope(m, userProfile));

  const filteredMothers = scopedMothers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.village.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'hrp') {
      return matchesSearch && m.highRisk;
    }
    return matchesSearch;
  });

  const handleApprovePendingWorker = async (uid: string) => {
    await approveAshaWorker(uid);
    setPendingWorkers(pendingWorkers.filter(w => w.uid !== uid));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-teal-950 rounded-2xl p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-teal-500/20 text-teal-300 border border-teal-400/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <UserCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>{t.ashaDashboard}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t.welcome}, {userProfile?.displayName || 'आशा कार्यकर्ता'}!
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 font-normal">
              ASHA ID: <span className="font-semibold text-white">{userProfile?.ashaWorkerId || userProfile?.uid || 'ASHA Worker'}</span> • Sub-Center: <span className="font-semibold text-white">{userProfile?.subCenter || `PHC ${userProfile?.village || 'Rampur'}`}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            <button
              id="open-schedule-visit-btn"
              onClick={() => setShowScheduleVisitModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>{language === 'hi' ? 'गृह भ्रमण तय करें' : 'Schedule Visit'}</span>
            </button>

            <button
              id="open-add-mother-btn"
              onClick={() => setShowAddMotherModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>{t.registerNewMother}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Registration Prompt Notice */}
      {duplicateNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-700 rounded-2xl p-4 shadow-md flex items-center justify-between text-amber-900 dark:text-amber-200 animate-in slide-in-from-top">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-bold">{duplicateNotice}</span>
          </div>
          <button onClick={() => setDuplicateNotice(null)} className="text-amber-700 hover:text-amber-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Jurisdiction & Village Isolation Badge */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 text-sky-900 dark:text-sky-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>
            <strong>{language === 'hi' ? 'ग्राम अधिकार क्षेत्र (Village Jurisdiction):' : 'Jurisdiction Area:'}</strong> {userProfile?.village || 'Rampur Gram'} ({userProfile?.subCenter || 'PHC Rampur'})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="bg-sky-100 dark:bg-sky-900/80 px-2.5 py-1 rounded-lg text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-700">
            <strong>{language === 'hi' ? 'मैप किए गए लाभार्थी:' : 'Mapped Scope:'}</strong> {scopedMothers.length}
          </span>
          <span className="bg-teal-100 dark:bg-teal-900/80 px-2.5 py-1 rounded-lg text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700">
            <strong>{language === 'hi' ? 'यूनिक आशा आईडी:' : 'Unique ASHA ID:'}</strong> {userProfile?.ashaWorkerId || userProfile?.uid || 'ASHA-N/A'}
          </span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.totalRegistered}</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{scopedMothers.length}</div>
          <div className="text-[11px] text-teal-700 font-medium">Village Beneficiaries</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.highRiskCases}</div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">{scopedMothers.filter(m => m.highRisk).length}</div>
          <div className="text-[11px] text-rose-600 font-medium">HRP Monitoring Priority</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.visitsLogged}</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {scopedMothers.reduce((acc, m) => acc + m.ancVisitsCompleted, 0)}
          </div>
          <div className="text-[11px] text-teal-700 font-medium">Completed Home ANC</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.jsyEligible}</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {scopedMothers.filter(m => m.jsyRegistered).length}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">JSY Financial Aid</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto text-xs font-bold">
        <button
          id="tab-all-mothers"
          onClick={() => setActiveTab('mothers')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'mothers'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          {t.totalRegistered} ({mothers.length})
        </button>

        <button
          id="tab-hrp-mothers"
          onClick={() => setActiveTab('hrp')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition ${
            activeTab === 'hrp'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{t.highRiskCases} ({scopedMothers.filter(m => m.highRisk).length})</span>
        </button>

        <button
          id="tab-visit-scheduler"
          onClick={() => setActiveTab('visit_scheduler')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition ${
            activeTab === 'visit_scheduler'
              ? 'bg-teal-700 text-white shadow-xs font-bold'
              : 'text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{language === 'hi' ? '📅 गृह भ्रमण शेड्यूलर' : '📅 Home Visit Scheduler'} ({homeVisits.length})</span>
        </button>

        <button
          id="tab-ai-copilot"
          onClick={() => setActiveTab('ai_copilot')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition ${
            activeTab === 'ai_copilot'
              ? 'bg-gradient-to-r from-sky-700 to-indigo-700 text-white shadow-xs font-extrabold'
              : 'text-sky-800 dark:text-sky-300 font-extrabold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>{language === 'hi' ? '🤖 एआई कॉपायलट' : '🤖 AI Health Copilot'}</span>
        </button>

        <button
          id="tab-schemes"
          onClick={() => setActiveTab('schemes')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'schemes'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          {t.governmentSchemes}
        </button>

        <button
          id="tab-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
            activeTab === 'inventory'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          {t.medicineStock}
        </button>

        <button
          id="tab-pending-workers"
          onClick={() => setActiveTab('pending_workers')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center space-x-1 ${
            activeTab === 'pending_workers'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <span>{t.pendingWorkersList}</span>
          {pendingWorkers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'ai_copilot' && (
        <AshaAiCopilot 
          mothers={mothers} 
          initialMotherId={selectedMother?.id} 
          language={language} 
        />
      )}

      {/* Home Visit Scheduler Tab View */}
      {activeTab === 'visit_scheduler' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>{language === 'hi' ? 'गृह भ्रमण शेड्यूलर एवं ट्रैकर' : 'Home Visit Scheduler & Tracker'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'hi' 
                  ? 'अपने अधिकार क्षेत्र की माताओं के लिए एएनसी होम विजिट तय करें एवं स्थिति ट्रैक करें।' 
                  : 'Schedule and manage ANC home visits for mothers in your assigned village.'}
              </p>
            </div>

            <button
              onClick={() => setShowScheduleVisitModal(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'hi' ? 'नया गृह भ्रमण जोड़ें' : 'Schedule New Visit'}</span>
            </button>
          </div>

          {/* Visits Table / List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'hi' ? 'भ्रमण सूची (Schedule List)' : 'Scheduled Visits'} ({homeVisits.length})
              </span>
            </div>

            {homeVisits.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">
                {language === 'hi' ? 'कोई निर्धारित भ्रमण नहीं है।' : 'No home visits scheduled currently.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {homeVisits.map(visit => {
                  const isDone = visit.status === 'completed';
                  return (
                    <div key={visit.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{visit.motherName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isDone ? (language === 'hi' ? 'संपन्न (Completed)' : 'Completed') : (language === 'hi' ? 'निर्धारित (Scheduled)' : 'Scheduled')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>{visit.scheduledDate} {visit.scheduledTime && `• ${visit.scheduledTime}`}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{visit.village}</span>
                          </span>
                          <span className="font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md">
                            {visit.purpose.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        {visit.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{visit.notes}"</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {!isDone && (
                          <button
                            onClick={() => {
                              updateHomeVisitStatus(visit.id, 'completed');
                              setHomeVisits(getStoredHomeVisits());
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'hi' ? 'संपन्न मार्क करें' : 'Mark Completed'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            updateHomeVisitStatus(visit.id, 'cancelled');
                            setHomeVisits(getStoredHomeVisits());
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition"
                        >
                          {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'mothers' || activeTab === 'hrp') && (
        <div className="space-y-4">
          
          {/* Prominent AI Copilot Banner */}
          <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-700/60">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                    {language === 'hi' ? 'माँ आशा एआई - स्वास्थ्य सहायिका (AI Copilot)' : 'AI Health Copilot for ASHA Workers'}
                  </h3>
                  <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">LIVE</span>
                </div>
                <p className="text-xs text-sky-100 opacity-90 mt-0.5 font-medium">
                  {language === 'hi' 
                    ? 'गर्भवती माताओं के Hb, BP एवं जोखिम के आधार पर त्वरित डॉक्टरी सुझाव एवं आपातकालीन प्रोटोकॉल।'
                    : 'Select any mother for instant Hb/BP risk analysis, IFA protocols & emergency triggers.'}
                </p>
              </div>
            </div>

            <button
              id="open-copilot-banner-btn"
              onClick={() => setActiveTab('ai_copilot')}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2 flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{language === 'hi' ? 'एआई कॉपायलट खोलें' : 'Consult AI Copilot'}</span>
            </button>
          </div>

          {/* AI Visit Planner & Priority Recommendations (स्मार्ट गृह भ्रमण योजना) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-sky-800/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-sky-100 dark:bg-sky-950 rounded-lg text-sky-700 dark:text-sky-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {language === 'hi' ? '🤖 एआई गृह भ्रमण प्राथमिकता योजना (AI Visit Planner)' : '🤖 AI Smart Priority Visit Planner'}
                </h4>
              </div>
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800">
                {mothers.filter(m => m.highRisk || !m.visited).length} {language === 'hi' ? 'प्राथमिकता केस' : 'Priority Cases'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Priority 1: High Risk */}
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900">
                <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
                  <span>🚨 {language === 'hi' ? '1. उच्च जोखिम (High Risk HRP)' : '1. High Risk Pregnancy'}</span>
                  <span className="text-[10px] bg-rose-200 dark:bg-rose-900 px-1.5 py-0.5 rounded">
                    {mothers.filter(m => m.highRisk).length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                  {mothers.find(m => m.highRisk)
                    ? `${mothers.find(m => m.highRisk)?.name}: ${mothers.find(m => m.highRisk)?.highRiskReason || 'Check Hb & BP'}`
                    : (language === 'hi' ? 'सभी माताएं सामान्य स्थिति में हैं।' : 'All mothers are in normal condition.')}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                  💡 {language === 'hi' ? 'सुझाव: आज ही गृह भ्रमण करें, IFA डबल डोज व PHC रेफरल फॉर्म दें।' : 'Action: Visit today for IFA supply & PHC referral.'}
                </div>
              </div>

              {/* Priority 2: Due Delivery Soon */}
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                  <span>📅 {language === 'hi' ? '2. प्रसव निकट (Week 34+)' : '2. Delivery Approaching'}</span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                    {mothers.filter(m => m.currentWeek >= 32).length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                  {mothers.find(m => m.currentWeek >= 32)
                    ? `${mothers.find(m => m.currentWeek >= 32)?.name} (Wk ${mothers.find(m => m.currentWeek >= 32)?.currentWeek})`
                    : (language === 'hi' ? 'कोई प्रसव निकट नहीं है।' : 'No imminent deliveries.')}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  💡 {language === 'hi' ? 'सुझाव: 108 एम्बुलेंस योजना, JSY एवं 24/7 प्रसव अस्पताल की पुष्टि करें।' : 'Action: Confirm 108 ambulance & 24/7 hospital plan.'}
                </div>
              </div>

              {/* Priority 3: Pending Visits */}
              <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900">
                <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                  <span>⏳ {language === 'hi' ? '3. लंबित भ्रमण (Pending Visit)' : '3. Pending ANC Visits'}</span>
                  <span className="text-[10px] bg-sky-200 dark:bg-sky-900 px-1.5 py-0.5 rounded">
                    {mothers.filter(m => !m.visited).length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                  {mothers.find(m => !m.visited)
                    ? `${mothers.find(m => !m.visited)?.name} (${mothers.find(m => !m.visited)?.village})`
                    : (language === 'hi' ? 'सभी भ्रमण पूर्ण हो चुके हैं।' : 'All pending visits completed!')}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                  💡 {language === 'hi' ? 'सुझाव: ANC जांच, हीमोग्लोबिन एवं वजन माप के लिए विजिट करें।' : 'Action: Schedule routine ANC visit & check vitals.'}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-mothers-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isSearchListening ? (language === 'hi' ? 'सुन रहा है... बोलिए' : 'Listening...') : t.searchMothers}
              className="w-full pl-10 pr-12 py-2.5 text-sm font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-600 shadow-xs"
            />
            <button
              id="search-voice-mic-btn"
              type="button"
              onClick={handleVoiceSearch}
              title={language === 'hi' ? 'आवाज़ द्वारा खोजें' : 'Voice Search'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${
                isSearchListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {isSearchListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Table / Card List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">{t.name}</th>
                    <th className="px-4 py-3">{t.village}</th>
                    <th className="px-4 py-3">{t.dueDate}</th>
                    <th className="px-4 py-3">HB & BP</th>
                    <th className="px-4 py-3">Visit Status</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3 text-right">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMothers.map((mother) => (
                    <tr key={mother.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{mother.name}</div>
                        <div className="text-[10px] text-slate-400">Age {mother.age} • Ph: {mother.phone}</div>
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {mother.village}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        <div>{mother.dueDate}</div>
                        <div className="text-[10px] text-teal-700 font-semibold">Wk {mother.currentWeek}</div>
                      </td>

                      <td className="px-4 py-3 font-medium">
                        <div className={mother.hemoglobin && mother.hemoglobin < 9 ? 'text-rose-600 font-bold' : ''}>
                          HB: {mother.hemoglobin || '10.5'} g/dL
                        </div>
                        <div className="text-[10px] text-slate-400">BP: {mother.bp || '120/80'}</div>
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {mother.visited ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 border border-teal-200">
                            ✓ Visited ({mother.lastVisitedDate || 'Recorded'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200">
                            ⏳ Pending Visit
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">{mother.ancVisitsCompleted} ANC Checkups</div>
                      </td>

                      <td className="px-4 py-3">
                        {mother.highRisk ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            HRP ({mother.highRiskReason || 'Risk'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-100">
                            Normal Care
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`toggle-visited-${mother.id}`}
                            onClick={() => handleToggleVisited(mother.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                              mother.visited
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            <span>{mother.visited ? 'Mark Pending' : '✓ Mark Visited'}</span>
                          </button>

                          <button
                            id={`consult-ai-${mother.id}`}
                            onClick={() => {
                              setSelectedMother(mother);
                              setActiveTab('ai_copilot');
                            }}
                            className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 rounded-lg text-xs font-bold border border-sky-200 dark:border-sky-800 transition flex items-center space-x-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{language === 'hi' ? 'कॉपायलट' : 'AI'}</span>
                          </button>

                          <button
                            id={`log-visit-${mother.id}`}
                            onClick={() => { setSelectedMother(mother); setShowLogVisitModal(true); }}
                            className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            {t.logVisit}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Government Schemes Tab */}
      {activeTab === 'schemes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{t.jsyTitle}</h3>
                <p className="text-xs text-slate-500">{t.jsyDesc}</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <div className="font-bold">Eligibility & Procedure:</div>
              <div>• All BPL / SC / ST pregnant women in rural areas.</div>
              <div>• Direct Benefit Transfer (DBT) upon institutional delivery at PHC/CHC.</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{t.pmmvyTitle}</h3>
                <p className="text-xs text-slate-500">{t.pmmvyDesc}</p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
              <div className="font-bold">Instalment Structure:</div>
              <div>• 1st Instalment (₹1,000): Early pregnancy registration</div>
              <div>• 2nd Instalment (₹2,000): After at least 1 ANC checkup (6 months)</div>
              <div>• 3rd Instalment (₹2,000): After child birth & first cycle of immunizations</div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Pill className="w-5 h-5 text-emerald-600" />
            <span>{t.medicineStock}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.ifaTablets}</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">450 Strip</div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-2">{t.stockOk}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.calciumTablets}</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">320 Strip</div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-2">{t.stockOk}</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">{t.orsZinc}</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">15 Packets</div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full inline-block mt-2">{t.stockLow}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.bpApparatus}</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">1 Functional</div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-2">{t.stockOk}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Worker Approvals Tab */}
      {activeTab === 'pending_workers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>{t.pendingWorkersList}</span>
          </h3>

          {pendingWorkers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              {t.noPendingWorkers}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWorkers.map((worker) => (
                <div key={worker.uid} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{worker.displayName}</div>
                    <div className="text-[11px] text-slate-500">ASHA ID: {worker.ashaWorkerId || 'ASHA-2098'} • {worker.village} ({worker.district})</div>
                    <div className="text-[10px] text-slate-400">{worker.email} • Ph: {worker.phone}</div>
                  </div>

                  <button
                    id={`approve-worker-${worker.uid}`}
                    onClick={() => handleApprovePendingWorker(worker.uid)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.approveWorker}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Register New Pregnant Woman */}
      {showAddMotherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {t.registerNewMother}
              </h3>
              <button
                id="close-add-mother-modal"
                onClick={() => setShowAddMotherModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleRegisterMother} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Full Name</label>
                  <input
                    id="new-mother-name-input"
                    type="text"
                    required
                    value={newMotherName}
                    onChange={(e) => setNewMotherName(e.target.value)}
                    placeholder="e.g. Sunita Devi"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Age (Years)</label>
                  <input
                    id="new-mother-age-input"
                    type="number"
                    required
                    value={newMotherAge}
                    onChange={(e) => setNewMotherAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Phone Number</label>
                  <input
                    id="new-mother-phone-input"
                    type="tel"
                    required
                    value={newMotherPhone}
                    onChange={(e) => setNewMotherPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Village / Gram Panchayat</label>
                  <input
                    id="new-mother-village-input"
                    type="text"
                    required
                    value={newMotherVillage}
                    onChange={(e) => setNewMotherVillage(e.target.value)}
                    placeholder="Rampur"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Last Menstrual Period (LMP)</label>
                  <input
                    id="new-mother-lmp-input"
                    type="date"
                    required
                    value={newMotherLmpDate}
                    onChange={(e) => setNewMotherLmpDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  {calculatedMotherEdd ? (
                    <p className="mt-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
                      Auto EDD: {calculatedMotherEdd}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      EDD calculated automatically (+280 days)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Blood Group</label>
                  <select
                    id="new-mother-bloodgroup-select"
                    value={newMotherBloodGroup}
                    onChange={(e) => setNewMotherBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="O+">O+</option>
                    <option value="AB+">AB+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Hemoglobin (Hb g/dL)</label>
                  <input
                    id="new-mother-hb-input"
                    type="number"
                    step="0.1"
                    required
                    value={newMotherHb}
                    onChange={(e) => setNewMotherHb(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Blood Pressure (BP)</label>
                  <input
                    id="new-mother-bp-input"
                    type="text"
                    required
                    value={newMotherBp}
                    onChange={(e) => setNewMotherBp(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-300 dark:border-slate-700">
                <label className="flex items-center space-x-2 text-sm font-bold text-rose-800 dark:text-rose-300">
                  <input
                    id="new-mother-highrisk-checkbox"
                    type="checkbox"
                    checked={newMotherHighRisk}
                    onChange={(e) => setNewMotherHighRisk(e.target.checked)}
                  />
                  <span>Flag as High-Risk Pregnancy (HRP)</span>
                </label>

                {newMotherHighRisk && (
                  <input
                    id="new-mother-riskreason-input"
                    type="text"
                    value={newMotherRiskReason}
                    onChange={(e) => setNewMotherRiskReason(e.target.value)}
                    placeholder="e.g. Severe Anemia / High Blood Pressure"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                )}
              </div>

              <button
                id="submit-register-mother-btn"
                type="submit"
                className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-xs transition"
              >
                Save Registration to Register
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Health Vitals Log / ANC Checkup Visit */}
      {showLogVisitModal && selectedMother && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 mb-1 border border-sky-200 dark:border-sky-800">
                  <span>Periodic Health Vitals Log</span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Health Vitals & ANC Checkup Visit Log
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  {selectedMother.name} • {selectedMother.village}
                </p>
              </div>
              <button
                id="close-log-visit-modal"
                onClick={() => setShowLogVisitModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              Record current physical vitals observed during periodic ANC home visit or PHC checkup:
            </p>

            <form onSubmit={handleLogVisit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Weight (Kg)</label>
                  <input
                    id="visit-weight-input"
                    type="number"
                    value={visitWeight}
                    onChange={(e) => setVisitWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Blood Pressure (BP)</label>
                  <input
                    id="visit-bp-input"
                    type="text"
                    value={visitBp}
                    onChange={(e) => setVisitBp(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">Hemoglobin (Hb g/dL)</label>
                  <input
                    id="visit-hb-input"
                    type="number"
                    step="0.1"
                    value={visitHb}
                    onChange={(e) => setVisitHb(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">IFA Tablets Distributed</label>
                  <input
                    id="visit-ifa-input"
                    type="number"
                    value={visitIfaGiven}
                    onChange={(e) => setVisitIfaGiven(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <button
                id="submit-log-visit-btn"
                type="submit"
                className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-xs transition"
              >
                Save ANC Health Vitals Log
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE HOME VISIT MODAL */}
      {showScheduleVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>{language === 'hi' ? 'गृह भ्रमण निर्धारित करें' : 'Schedule Home Visit'}</span>
              </h3>
              <button onClick={() => setShowScheduleVisitModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'hi' ? 'लाभार्थी (गर्भवती महिला चुनें)' : 'Select Beneficiary Mother'}
                </label>
                <select
                  required
                  value={schedMotherId}
                  onChange={(e) => setSchedMotherId(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">{language === 'hi' ? '-- महिला का नाम चुनें --' : '-- Select Mother --'}</option>
                  {scopedMothers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.village}) {m.highRisk ? '• HRP High Risk' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'hi' ? 'भ्रमण तिथि' : 'Visit Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'hi' ? 'समय' : 'Visit Time'}
                  </label>
                  <input
                    type="text"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full h-11 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'hi' ? 'भ्रमण का उद्देश्य' : 'Visit Purpose'}
                </label>
                <select
                  value={schedPurpose}
                  onChange={(e) => setSchedPurpose(e.target.value as any)}
                  className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="anc_checkup">ANC Routine Checkup</option>
                  <option value="anemia_hb_test">Anemia & Hb Check</option>
                  <option value="ifa_distribution">IFA Tablets & Calcium</option>
                  <option value="high_risk_followup">High-Risk Care Follow-up</option>
                  <option value="delivery_planning">Birth Preparedness & Institutional Delivery</option>
                  <option value="postnatal_care">PNC Postnatal Care</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'hi' ? 'विशेष निर्देश / नोट्स' : 'Notes / Special Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  placeholder={language === 'hi' ? 'उदा. रक्तचाप जाँचें एवं आईएफए गोलियां दें' : 'e.g., Check BP and deliver IFA tablet pouch'}
                  className="w-full p-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
              >
                <span>{language === 'hi' ? 'भ्रमण शेड्यूलर में सहेजें' : 'Save & Schedule Visit'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
