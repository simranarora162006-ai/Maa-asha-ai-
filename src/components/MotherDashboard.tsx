import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Heart, 
  Calendar, 
  Sparkles, 
  Send, 
  PhoneCall, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Baby, 
  Apple, 
  Pill, 
  Activity, 
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Bot,
  User,
  Info,
  Edit3,
  Scale,
  Droplet,
  X,
  Mic,
  MicOff,
  Volume2,
  Utensils,
  FileText,
  Award,
  Check,
  Hospital,
  MapPin,
  Navigation,
  Syringe,
  Shield
} from 'lucide-react';
import { ChatMessage } from '../types';
import { NearestHospitalFinder } from './NearestHospitalFinder';
import { getStoredBeneficiaries, saveAllBeneficiaries, evaluateMotherRisk } from '../lib/beneficiaryStorage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const MotherDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { t, language } = useLanguage();

  // Kick Counter State
  const [kicks, setKicks] = useState(6);
  const [pillsTaken, setPillsTaken] = useState({ ifa: true, calcium: false });

  // Vitals & ANC Checkup State
  const [vitals, setVitals] = useState<{
    bp: string;
    hb: number | string;
    weight: number | string;
    ifaCount: number | string;
    lastUpdated: string;
    hasData: boolean;
  }>(() => {
    // 1. Try saved vitals from localStorage first
    const storageKey = `vitals_${userProfile?.uid || 'guest'}`;
    const local = localStorage.getItem(storageKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }

    // 2. Try matched record from beneficiary storage
    const allMothers = getStoredBeneficiaries();
    const matched = allMothers.find(m => 
      (userProfile?.uid && m.id === userProfile.uid) ||
      (userProfile?.phone && m.phone === userProfile.phone) ||
      (userProfile?.displayName && m.name.includes(userProfile.displayName))
    );

    if (matched && (matched.bp && matched.bp !== '--' || matched.hemoglobin || matched.weight)) {
      return {
        bp: matched.bp || '--',
        hb: matched.hemoglobin ?? '',
        weight: matched.weight ?? '',
        ifaCount: matched.ifaCount ?? '',
        lastUpdated: matched.lastCheckupDate || 'Recorded',
        hasData: Boolean(matched.bp && matched.bp !== '--' || matched.hemoglobin || matched.weight)
      };
    }

    return {
      bp: userProfile?.bp || '--',
      hb: userProfile?.hb || '',
      weight: userProfile?.weight || '',
      ifaCount: userProfile?.ifaCount || '',
      lastUpdated: (userProfile?.bp && userProfile.bp !== '--' || userProfile?.hb || userProfile?.weight) ? 'Recorded' : 'Pending Checkup',
      hasData: Boolean(userProfile?.bp && userProfile.bp !== '--' || userProfile?.hb || userProfile?.weight)
    };
  });

  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedSchemeModal, setSelectedSchemeModal] = useState<'JSY' | 'PMMVY' | null>(null);
  const [activeDietTrimester, setActiveDietTrimester] = useState<1 | 2 | 3>(2);
  const [inputBp, setInputBp] = useState(vitals.bp);
  const [inputHb, setInputHb] = useState<string | number>(vitals.hb);
  const [inputWeight, setInputWeight] = useState<string | number>(vitals.weight);
  const [inputIfa, setInputIfa] = useState<string | number>(vitals.ifaCount);

  // Sync Vitals state dynamically when userProfile loads or storage updates
  useEffect(() => {
    const syncVitalsFromStorage = () => {
      const storageKey = `vitals_${userProfile?.uid || 'guest'}`;
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            setVitals(parsed);
            return;
          }
        } catch (e) {}
      }

      const allMothers = getStoredBeneficiaries();
      const matched = allMothers.find(m => 
        (userProfile?.uid && m.id === userProfile.uid) ||
        (userProfile?.phone && m.phone === userProfile.phone) ||
        (userProfile?.displayName && m.name.includes(userProfile.displayName))
      );

      if (matched && (matched.bp && matched.bp !== '--' || matched.hemoglobin || matched.weight)) {
        setVitals({
          bp: matched.bp || '--',
          hb: matched.hemoglobin ?? '',
          weight: matched.weight ?? '',
          ifaCount: matched.ifaCount ?? '',
          lastUpdated: matched.lastCheckupDate || 'Recorded',
          hasData: Boolean(matched.bp && matched.bp !== '--' || matched.hemoglobin || matched.weight)
        });
      } else if (userProfile?.bp || userProfile?.hb || userProfile?.weight) {
        setVitals({
          bp: userProfile.bp || '--',
          hb: userProfile.hb || '',
          weight: userProfile.weight || '',
          ifaCount: userProfile.ifaCount || '',
          lastUpdated: 'Recorded',
          hasData: Boolean(userProfile.bp && userProfile.bp !== '--' || userProfile.hb || userProfile.weight)
        });
      } else {
        setVitals({
          bp: '--',
          hb: '',
          weight: '',
          ifaCount: '',
          lastUpdated: 'Pending Checkup',
          hasData: false
        });
      }
    };

    syncVitalsFromStorage();
    window.addEventListener('beneficiariesUpdated', syncVitalsFromStorage);
    window.addEventListener('storage', syncVitalsFromStorage);
    return () => {
      window.removeEventListener('beneficiariesUpdated', syncVitalsFromStorage);
      window.removeEventListener('storage', syncVitalsFromStorage);
    };
  }, [userProfile]);

  // High Risk Pregnancy Detection Logic
  const systolic = vitals.bp ? parseInt(vitals.bp.split('/')[0] || '0', 10) : 0;
  const numericHb = typeof vitals.hb === 'number' ? vitals.hb : parseFloat(vitals.hb as string) || 0;
  const numericWeight = typeof vitals.weight === 'number' ? vitals.weight : parseFloat(vitals.weight as string) || 0;

  const isHighRisk = vitals.hasData && (
    (numericHb > 0 && numericHb < 11) ||
    systolic > 140 ||
    (numericWeight > 0 && numericWeight < 45)
  );
  
  const riskReasons: string[] = [];
  if (vitals.hasData) {
    if (numericHb > 0 && numericHb < 11) riskReasons.push(language === 'hi' ? 'कम हीमोग्लोबिन (< 11.0 g/dL)' : 'Low Hb (< 11.0 g/dL)');
    if (systolic > 140) riskReasons.push(language === 'hi' ? 'उच्च रक्तचाप (> 140 mmHg)' : 'High BP (> 140 mmHg)');
    if (numericWeight > 0 && numericWeight < 45) riskReasons.push(language === 'hi' ? 'कम वजन (< 45 kg)' : 'Low Weight (< 45 kg)');
  }

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    const newBp = inputBp.trim() || '120/80';
    const newHb = inputHb !== '' ? Number(inputHb) : '';
    const newWeight = inputWeight !== '' ? Number(inputWeight) : '';
    const newIfa = inputIfa !== '' ? Number(inputIfa) : '';

    const newVitalsObj = {
      bp: newBp,
      hb: newHb,
      weight: newWeight,
      ifaCount: newIfa,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasData: true
    };

    setVitals(newVitalsObj);

    // 1. Save to LocalStorage for immediate persistence across refresh
    const vitalsStorageKey = `vitals_${userProfile?.uid || 'guest'}`;
    localStorage.setItem(vitalsStorageKey, JSON.stringify(newVitalsObj));

    // 2. Update central beneficiary store & dynamically re-evaluate risk (Task 7)
    const storedList = getStoredBeneficiaries();
    const matchedIndex = storedList.findIndex(m => 
      (userProfile?.uid && m.id === userProfile.uid) ||
      (userProfile?.phone && m.phone === userProfile.phone) ||
      (userProfile?.displayName && m.name.includes(userProfile.displayName))
    );

    if (matchedIndex !== -1) {
      const existing = storedList[matchedIndex];
      const riskEval = evaluateMotherRisk(
        typeof newHb === 'number' ? newHb : undefined,
        newBp,
        typeof newWeight === 'number' ? newWeight : undefined,
        existing.highRisk,
        existing.highRiskReason
      );

      storedList[matchedIndex] = {
        ...existing,
        bp: newBp,
        hemoglobin: typeof newHb === 'number' ? newHb : existing.hemoglobin,
        weight: typeof newWeight === 'number' ? newWeight : existing.weight,
        ifaCount: typeof newIfa === 'number' ? newIfa : existing.ifaCount,
        highRisk: riskEval.isHighRisk,
        highRiskReason: riskEval.reason
      };
      saveAllBeneficiaries(storedList);
    }

    // 3. Update Firestore user document if logged in
    if (userProfile?.uid) {
      updateDoc(doc(db, 'users', userProfile.uid), {
        bp: newBp,
        hb: newHb,
        weight: newWeight,
        ifaCount: newIfa,
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Firestore vitals update notice:', err));
    }

    setShowVitalsModal(false);
  };

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: language === 'hi' 
        ? 'नमस्ते! मैं आपकी डिजिटल सहेली "माँ आशा एआई" हूँ। आज आप अपनी या शिशु की देखभाल के बारे में क्या पूछना चाहती हैं?' 
        : 'Hello! I am "Maa Asha AI", your maternal care assistant. How can I help you and your baby today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(language === 'hi' 
        ? 'आपके ब्राउज़र में आवाज़ पहचान (Web Speech API) समर्थित नहीं है। कृपया लिखकर प्रश्न पूछें।' 
        : 'Voice Speech Recognition is not supported in this browser. Please type your query.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Dynamic LMP & Gestational Age Calculation (Task 2)
  const calculateCurrentWeek = (lmpDateStr?: string, trimesterVal?: number): number => {
    if (lmpDateStr) {
      const lmpTime = new Date(lmpDateStr).getTime();
      if (!isNaN(lmpTime)) {
        const calculatedWeeks = Math.floor((Date.now() - lmpTime) / (7 * 24 * 60 * 60 * 1000));
        if (calculatedWeeks >= 1 && calculatedWeeks <= 42) return calculatedWeeks;
      }
    }
    if (trimesterVal === 1) return 10;
    if (trimesterVal === 2) return 20;
    if (trimesterVal === 3) return 32;
    return 16;
  };

  const week = calculateCurrentWeek(userProfile?.lmpDate, userProfile?.trimester);
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;

  // Calculate EDD
  let eddDateStr = userProfile?.dueDate;
  if (!eddDateStr && userProfile?.lmpDate) {
    const lmpTime = new Date(userProfile.lmpDate).getTime();
    if (!isNaN(lmpTime)) {
      eddDateStr = new Date(lmpTime + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
  }
  const currentEdd = eddDateStr || '2026-10-15';

  const daysRemaining = (() => {
    if (eddDateStr) {
      const eddTime = new Date(eddDateStr).getTime();
      if (!isNaN(eddTime)) {
        const diffDays = Math.ceil((eddTime - Date.now()) / (24 * 60 * 60 * 1000));
        return Math.max(0, diffDays);
      }
    }
    return Math.max(0, (40 - week) * 7);
  })();

  const currentMonth = Math.min(9, Math.max(1, Math.ceil(week / 4.33)));

  const getBabySizeInfo = (w: number) => {
    if (w <= 4) return { nameEn: "Poppy Seed", nameHi: "खसखस का दाना", weight: "0.5g", icon: "🌾" };
    if (w <= 8) return { nameEn: "Raspberry", nameHi: "रसबरी का दाना", weight: "1g", icon: "🍓" };
    if (w <= 12) return { nameEn: "Lime / Lemon", nameHi: "कागज़ी नींबू", weight: "14g", icon: "🍋" };
    if (w <= 16) return { nameEn: "Avocado", nameHi: "शरीफा या नाशपाती", weight: "100g", icon: "🥑" };
    if (w <= 20) return { nameEn: "Mango", nameHi: "पका आम", weight: "300g", icon: "🥭" };
    if (w <= 24) return { nameEn: "Papaya / Eggplant", nameHi: "पपीता / बैंगन के आकार का", weight: "600g", icon: "🍆" };
    if (w <= 28) return { nameEn: "Cauliflower", nameHi: "फूलगोभी या खरबूजा", weight: "1.0kg", icon: "🥦" };
    if (w <= 32) return { nameEn: "Pineapple", nameHi: "अनानास", weight: "1.5kg", icon: "🍍" };
    if (w <= 36) return { nameEn: "Musk Melon", nameHi: "सीताफल / खरबूजा", weight: "2.3kg", icon: "🍈" };
    return { nameEn: "Watermelon", nameHi: "तरबूज", weight: "3.2kg+", icon: "🍉" };
  };

  const babyInfo = getBabySizeInfo(week);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Scroll to top on dashboard mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Only auto-scroll chat end when user interacts or new messages arrive after initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatMessages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, aiLoading, isListening]);

  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || aiLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setInputPrompt('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          language: language,
          role: 'pregnant_woman',
          trimester: trimester
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response not supported by browser');
      }

      const decoder = new TextDecoder();
      let streamedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                streamedText += parsed.text;
                setChatMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId ? { ...msg, text: streamedText } : msg
                  )
                );
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore partial JSON parse chunks
            }
          }
        }
      }

      if (!streamedText) {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  text: language === 'hi'
                    ? 'क्षमा करें, प्रतिक्रिया उत्पन्न नहीं की जा सकी। कृपया पुनः प्रयास करें।'
                    : 'Sorry, response could not be generated. Please try again.'
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error('AI API streaming error:', err);
      const errorDetail = err.message || (language === 'hi' ? 'एआई प्रतिक्रिया प्राप्त करने में समस्या हुई।' : 'Error retrieving AI response.');
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: `⚠️ ${errorDetail}` }
            : msg
        )
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-teal-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-sky-900">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-sky-200 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-2 text-sky-100 border border-white/20">
              <Heart className="w-3.5 h-3.5 text-teal-300 fill-teal-300" />
              <span>{t.motherDashboard}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.welcome}, {userProfile?.displayName || 'माताजी'}!
            </h1>
            <p className="text-sky-100 text-xs sm:text-sm mt-1">
              Village: <span className="font-semibold">{userProfile?.village || 'Rampur'}</span> • Due Date: <span className="font-semibold">{userProfile?.dueDate || '2026-10-15'}</span>
            </p>
          </div>

          {/* Emergency SOS Call Buttons & Hospital Locator */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              id="sos-108-btn"
              href="tel:108"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>108 Ambulance (SOS)</span>
            </a>
            <a
              id="sos-102-btn"
              href="tel:102"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition"
            >
              <PhoneCall className="w-4 h-4 text-sky-200" />
              <span>102 Maternal Helpline</span>
            </a>
            <a
              id="find-hospital-header-btn"
              href="#nearest-hospital-section"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition"
            >
              <Hospital className="w-4 h-4" />
              <span>{language === 'hi' ? 'निकटतम अस्पताल / PHC' : 'Find Hospital / PHC'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Pregnancy Tracker, Kick Counter, ANC Checkups, Diet) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Pregnancy Tracker Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-100 dark:border-sky-900">
                  <Baby className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                    {t.pregnancyWeek} {week}
                  </h3>
                  <p className="text-xs text-sky-700 dark:text-sky-400 font-semibold">
                    {trimester === 1 ? t.trimester1 : trimester === 2 ? t.trimester2 : t.trimester3}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{daysRemaining}</span>
                <span className="text-[10px] text-slate-500 block">{t.daysLeft}</span>
              </div>
            </div>

            {/* Baby Growth Illustration Box */}
            <div className="bg-sky-50/60 dark:bg-slate-800/80 p-4 rounded-xl border border-sky-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{babyInfo.icon}</div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    {t.babySize}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                    {language === 'hi' ? babyInfo.nameHi : babyInfo.nameEn}
                  </div>
                  <div className="text-[11px] text-slate-500">Est. Weight: ~{babyInfo.weight}</div>
                </div>
              </div>
              <div className="text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-slate-700 font-semibold text-sky-700 dark:text-sky-300">
                Week {week} / 40
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Month 1</span>
                <span>Month {currentMonth} (Current)</span>
                <span>Month 9</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-sky-600 to-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${(week / 40) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Prominent Vitals & ANC Checkup Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Actionable Banner for New Registered Users without Checkup Data */}
            {!vitals.hasData && (
              <div className="bg-amber-50 dark:bg-amber-950/60 p-3.5 rounded-xl border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <p className="font-extrabold text-xs sm:text-sm">
                      {language === 'hi' 
                        ? '⚠️ अभी तक कोई एएनसी चेकअप / वाइटल्स डाटा नहीं जोड़ा गया है!' 
                        : '⚠️ No ANC Checkup Data Recorded Yet!'}
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                      {language === 'hi'
                        ? 'सुरक्षित गर्भावस्था एवं स्वास्थ्य ट्रैकिंग के लिए कृपया अपना बीपी, हीमोग्लोबिन तथा वजन दर्ज करें।'
                        : 'Please record your latest Blood Pressure, Hemoglobin & Weight for accurate maternal health monitoring.'}
                    </p>
                  </div>
                </div>
                <button
                  id="banner-log-vitals-btn"
                  onClick={() => {
                    setInputBp('');
                    setInputHb('');
                    setInputWeight('');
                    setInputIfa('');
                    setShowVitalsModal(true);
                  }}
                  className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black shadow-xs transition-transform active:scale-95 flex-shrink-0"
                >
                  <span>{language === 'hi' ? 'अभी जोड़ें' : 'Log Now'}</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-sky-700 dark:text-sky-400" />
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'स्वास्थ्य वाइटल्स एवं एएनसी जांच' : 'Health Vitals & ANC Checkup Log'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'hi' ? 'अंतिम अपडेट:' : 'Last Updated:'} <span className="font-semibold text-slate-700 dark:text-slate-300">{vitals.lastUpdated}</span>
                </p>
              </div>

              {/* Status Badge & Action Button */}
              <div className="flex items-center space-x-2">
                {!vitals.hasData ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === 'hi' ? 'जांच लंबित' : 'Awaiting Checkup'}</span>
                  </div>
                ) : isHighRisk ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>High Risk Alert</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-900">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                    <span>Normal Vitals</span>
                  </div>
                )}

                <button
                  id="open-vitals-modal-btn"
                  onClick={() => {
                    setInputBp(vitals.bp);
                    setInputHb(vitals.hb);
                    setInputWeight(vitals.weight);
                    setInputIfa(vitals.ifaCount);
                    setShowVitalsModal(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 ${
                    !vitals.hasData
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-4 ring-amber-300/50 dark:ring-amber-900/60 animate-pulse'
                      : 'bg-sky-700 hover:bg-sky-800 text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'वाइटल्स दर्ज करें' : 'Log / Update Vitals'}</span>
                </button>
              </div>
            </div>

            {/* Risk Warnings if High Risk */}
            {isHighRisk && (
              <div className="bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {language === 'hi' ? 'उच्च जोखिम गर्भावस्था (HRP) चेतावनी:' : 'High Risk Pregnancy (HRP) Alert Detected:'}
                  </p>
                  <p className="text-[11px] mt-0.5">{riskReasons.join(' • ')}</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-1">
                    {language === 'hi' 
                      ? '*कृपया निकटतम पीएचसी स्वास्थ्य केंद्र या अपनी आशा कार्यकर्ता से तुरंत परामर्श करें।' 
                      : '*Please consult your nearest PHC medical officer or ASHA worker immediately.'}
                  </p>
                </div>
              </div>
            )}

            {/* 3 Metric Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Blood Pressure */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                systolic > 140 
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900' 
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
              }`}>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  <span>Blood Pressure</span>
                </div>
                <div className="mt-2">
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {vitals.hasData && vitals.bp ? vitals.bp : '-- / --'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">mmHg</div>
                </div>
              </div>

              {/* Hemoglobin */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                numericHb > 0 && numericHb < 11 
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900' 
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
              }`}>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Droplet className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hemoglobin</span>
                </div>
                <div className="mt-2">
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {vitals.hasData && vitals.hb !== '' ? vitals.hb : '--'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">g/dL</div>
                </div>
              </div>

              {/* Weight */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                numericWeight > 0 && numericWeight < 45 
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900' 
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
              }`}>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <Scale className="w-3.5 h-3.5 text-teal-600" />
                  <span>Maternal Weight</span>
                </div>
                <div className="mt-2">
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {vitals.hasData && vitals.weight !== '' ? vitals.weight : '--'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">kg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Kick Counter & Daily Supplements Widget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Kick Counter */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{t.kickCounter}</span>
                </div>
                <button
                  id="reset-kicks-btn"
                  onClick={() => setKicks(0)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.resetKicks}</span>
                </button>
              </div>

              <div className="text-center py-2">
                <div className="text-3xl font-extrabold text-sky-700 dark:text-sky-300">{kicks}</div>
                <div className="text-[10px] text-slate-500">Recorded Fetal Kicks Today</div>
              </div>

              <button
                id="record-kick-btn"
                onClick={() => setKicks(kicks + 1)}
                className="w-full py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {t.recordKick}
              </button>
            </div>

            {/* Daily Supplements */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Daily Supplement Log</span>
                </div>

                <div className="space-y-2 text-xs">
                  <button
                    id="toggle-ifa-pill-btn"
                    onClick={() => setPillsTaken({ ...pillsTaken, ifa: !pillsTaken.ifa })}
                    className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition ${
                      pillsTaken.ifa ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-200' : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <span>IFA (Iron) Tablet</span>
                    <CheckCircle className={`w-4 h-4 ${pillsTaken.ifa ? 'text-teal-600' : 'text-slate-300'}`} />
                  </button>

                  <button
                    id="toggle-calcium-pill-btn"
                    onClick={() => setPillsTaken({ ...pillsTaken, calcium: !pillsTaken.calcium })}
                    className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition ${
                      pillsTaken.calcium ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-200' : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <span>Calcium Tablet</span>
                    <CheckCircle className={`w-4 h-4 ${pillsTaken.calcium ? 'text-teal-600' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-2">
                *Take IFA and Calcium at different times of the day with water.
              </div>
            </div>

          </div>

          {/* ANC Visits Checklist */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>{t.ancVisits} (Antenatal Care)</span>
              </h3>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400">2 of 4 Completed</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-teal-50 border border-teal-200 dark:bg-teal-950/60 dark:border-teal-900 rounded-xl">
                <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300">1st Visit (1-12 Wks)</div>
                <div className="text-slate-700 dark:text-slate-200 font-medium mt-1">✓ Completed</div>
                <div className="text-[9px] text-slate-500">HB & Weight Checked</div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 dark:bg-teal-950/60 dark:border-teal-900 rounded-xl">
                <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300">2nd Visit (14-26 Wks)</div>
                <div className="text-slate-700 dark:text-slate-200 font-medium mt-1">✓ Completed</div>
                <div className="text-[9px] text-slate-500">TT Vaccine 1 Done</div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 dark:bg-sky-950/60 dark:border-sky-900 rounded-xl">
                <div className="text-[10px] font-bold text-sky-800 dark:text-sky-300">3rd Visit (28-34 Wks)</div>
                <div className="text-sky-700 dark:text-sky-400 font-medium mt-1">⏳ Upcoming</div>
                <div className="text-[9px] text-slate-500">Due in 4 weeks</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl">
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">4th Visit (36-40 Wks)</div>
                <div className="text-slate-500 font-medium mt-1">Pending</div>
                <div className="text-[9px] text-slate-400">Final delivery plan</div>
              </div>
            </div>
          </div>

          {/* Trimester Wise Diet Chart & Nutrition Guidance */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'तिमाही अनुसार आहार निर्देश (Trimester Diet Chart)' : 'Trimester Wise Diet Chart'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {language === 'hi' ? 'मां और शिशु के पोषण हेतु दैनिक भोजन गाइड' : 'Daily nutrition & food recommendations for mother & baby'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                {language === 'hi' ? `वर्तमान: तिमाही ${activeDietTrimester}` : `Trimester ${activeDietTrimester}`}
              </span>
            </div>

            {/* Trimester Tabs */}
            <div className="flex space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              {[1, 2, 3].map((tri) => (
                <button
                  key={tri}
                  id={`diet-tab-trimester-${tri}`}
                  onClick={() => setActiveDietTrimester(tri as 1 | 2 | 3)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all text-center ${
                    activeDietTrimester === tri
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'hi' ? `${tri}ली तिमाही` : `Trimester ${tri}`}
                  <span className="block text-[9px] font-normal opacity-80">
                    {tri === 1 ? '(1-12 Wks)' : tri === 2 ? '(13-26 Wks)' : '(27-40 Wks)'}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Diet Content */}
            <div className="space-y-3 text-xs">
              {/* Nutrient Focus Banner */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200 flex items-start space-x-2">
                <Apple className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-xs">
                    {activeDietTrimester === 1 && (language === 'hi' ? 'मुख्य पोषण: फोलिक एसिड व विटामिन B12' : 'Key Focus: Folic Acid & Vitamin B12')}
                    {activeDietTrimester === 2 && (language === 'hi' ? 'मुख्य पोषण: आयरन (IFA) व कैल्शियम' : 'Key Focus: Iron (IFA) & Calcium Support')}
                    {activeDietTrimester === 3 && (language === 'hi' ? 'मुख्य पोषण: प्रोटीन, फाइबर व ऊर्जा' : 'Key Focus: Protein, Fiber & Energy Boost')}
                  </span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {activeDietTrimester === 1 && (language === 'hi' ? 'शिशु के मस्तिष्क एवं रीढ़ के विकास के लिए हरी सब्जियां व फोलिक एसिड जरूरी है।' : 'Prevents birth defects and supports brain and spinal tube development.')}
                    {activeDietTrimester === 2 && (language === 'hi' ? 'खून की कमी (Anemia) से बचाव के लिए 1 आयरन की गोली खाना खाने के बाद लें।' : 'Expands blood volume, prevents anemia, and builds strong fetal bones.')}
                    {activeDietTrimester === 3 && (language === 'hi' ? 'शिशु के वजन बढ़ाने के लिए प्रोटीन (दालें, दूध, पनीर) और फाइबर युक्त भोजन खाएं।' : 'Supports rapid weight gain of baby and keeps digestion smooth.')}
                  </p>
                </div>
              </div>

              {/* Recommended Food Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] flex items-center space-x-1.5 mb-1">
                    <span>🥦</span>
                    <span>{language === 'hi' ? 'हरी सब्जियां व साग' : 'Green Leafy Veggies'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {language === 'hi' ? 'पालक, मेथी, लौकी, बीन्स, सहजन (मोरिंगा)' : 'Spinach, Fenugreek, Drumsticks, Beans'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] flex items-center space-x-1.5 mb-1">
                    <span>🥛</span>
                    <span>{language === 'hi' ? 'दूध व डेयरी उत्पाद' : 'Milk & Dairy Products'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {language === 'hi' ? '2 गिलास दूध, ताजा दही, छाछ, पनीर' : '2 glasses Milk, fresh Curd, Buttermilk, Paneer'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] flex items-center space-x-1.5 mb-1">
                    <span>🫘</span>
                    <span>{language === 'hi' ? 'दालें व प्रोटीन' : 'Pulses & Protein'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {language === 'hi' ? 'मूंग दाल, चना, अंकुरित अनाज, उबला अंडा' : 'Lentils, Black Gram, Sprouts, Boiled Eggs'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] flex items-center space-x-1.5 mb-1">
                    <span>🍎</span>
                    <span>{language === 'hi' ? 'फल व आयरन स्रोत' : 'Iron Rich Fruits & Snacks'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {language === 'hi' ? 'गुड़-चना, अनार, अमरूद, आंवला, खजूर' : 'Jaggery & Roasted Gram, Guava, Pomegranate, Dates'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Delivery Essential Care & Injections Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'प्रसव के बाद जरूरी टीके (Post-Delivery Essential Care & Injections)' : 'Post-Delivery Essential Care & Injections (प्रसव के बाद जरूरी टीके)'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'hi'
                      ? 'प्रसव के तुरंत बाद मां की सुरक्षा, अत्यधिक रक्तस्राव की रोकथाम और रिकवरी हेतु जरूरी टीके'
                      : 'Vital vaccines & injections for mother\'s safety, bleeding protection, and fast recovery post-delivery'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                {language === 'hi' ? 'प्रसव पश्चात सुरक्षा' : 'Postnatal Care'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Anti-D (Rh-Negative Mother) Injection */}
              <div className="p-3.5 bg-gradient-to-br from-rose-50/70 to-pink-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 bg-rose-600 text-white rounded-md">
                        <Droplet className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        1. Anti-D (Rh-Negative Mother) Injection
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {language === 'hi'
                      ? 'यदि मां का ब्लड ग्रुप Rh-Negative है, तो भविष्य की गर्भावस्था सुरक्षित रखने के लिए प्रसव के 72 घंटे के भीतर लगवाना अनिवार्य है।'
                      : 'Must be taken within 72 hours of delivery if the mother is Rh-Negative to prevent Rh incompatibility in future pregnancies.'}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-rose-800 dark:text-rose-300 font-bold bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
                  <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>{language === 'hi' ? 'समय सीमा: प्रसव के 72 घंटे के भीतर' : 'Timeframe: Within 72 Hours Post-Birth'}</span>
                </div>
              </div>

              {/* 2. Oxytocin / PPH Protection */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 bg-amber-600 text-white rounded-md">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        2. Oxytocin / PPH Protection (पीपीएच बचाव)
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {language === 'hi'
                      ? 'प्रसव के तुरंत बाद अत्यधिक रक्तस्राव (Postpartum Hemorrhage) को रोकने और गर्भाशय को सुरक्षित संकुचित करने के लिए दी जाती है।'
                      : 'Prevents heavy bleeding (Postpartum Hemorrhage - PPH) post-delivery and helps the uterus contract safely.'}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-amber-900 dark:text-amber-300 font-bold bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
                  <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{language === 'hi' ? 'मुख्य सुरक्षा: अत्यधिक रक्तस्राव से बचाव' : 'Key Benefit: Prevents Heavy Bleeding'}</span>
                </div>
              </div>

              {/* 3. Tetanus Toxoid (TT/Td) */}
              <div className="p-3.5 bg-gradient-to-br from-sky-50/70 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-sky-200 dark:border-sky-800/60 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 bg-sky-600 text-white rounded-md">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        3. Tetanus Toxoid (TT / Td)
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {language === 'hi'
                      ? 'प्रसव के दौरान और बाद में मां तथा नवजात शिशु दोनों को खतरनाक टिटनेस और जीवाणु जनित संक्रमण से बचाती है।'
                      : 'Protects against maternal and neonatal tetanus infections, ensuring safety for both mother and newborn.'}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-sky-900 dark:text-sky-300 font-bold bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-sky-200 dark:border-sky-900">
                  <CheckCircle className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>{language === 'hi' ? 'संक्रमण सुरक्षा: मां व बच्चे के लिए' : 'Dual Defense: Mother & Baby'}</span>
                </div>
              </div>

              {/* 4. Iron Sucrose IV / Dose */}
              <div className="p-3.5 bg-gradient-to-br from-teal-50/70 to-emerald-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-teal-200 dark:border-teal-800/60 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 bg-teal-600 text-white rounded-md">
                        <Pill className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        4. Iron Sucrose IV / Dose (रक्त पूर्ति)
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {language === 'hi'
                      ? 'प्रसव में रक्त की हानि या एनीमिया होने पर तेजी से हीमोग्लोबिन स्तर बढ़ाकर मां की शारीरिक रिकवरी तेज करता है।'
                      : 'Recommended for fast recovery from blood loss and anemia, rapidly elevating hemoglobin levels and stamina.'}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-teal-900 dark:text-teal-300 font-bold bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-teal-200 dark:border-teal-900">
                  <Activity className="w-3 h-3 text-teal-600 shrink-0" />
                  <span>{language === 'hi' ? 'रक्त पूर्ति: तेजी से हीमोग्लोबिन रिकवरी' : 'Fast Hb Recovery & Anemia Defense'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sarkari Yojana / Govt Schemes (JSY & PMMVY) - Placed Just Above Danger Signs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'सरकारी योजनाएं (Sarkari Yojana - JSY & PMMVY)' : 'Government Health Schemes (JSY & PMMVY)'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {language === 'hi' ? 'मातृ स्वास्थ्य हेतु सरकारी नकद सहायता एवं वित्तीय लाभ' : 'Maternal welfare cash benefits & government financial aid'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200">
                DBT Direct Cash
              </span>
            </div>

            {/* Scheme Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: JSY */}
              <div className="p-3.5 bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-sky-200 dark:border-sky-800/60 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 bg-sky-700 text-white font-extrabold text-[10px] rounded-md">
                      JSY Scheme
                    </span>
                    <span className="text-xs font-black text-sky-900 dark:text-sky-200">
                      ₹1,400 Cash Assistance
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'जननी सुरक्षा योजना (JSY)' : 'Janani Suraksha Yojana (JSY)'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    {language === 'hi' 
                      ? 'सरकारी अस्पताल/PHC में सुरक्षित प्रसव कराने पर ग्रामीण माताओं को ₹1,400 की नकद राशि।' 
                      : 'Cash assistance of ₹1,400 for institutional delivery in government hospitals/PHCs.'}
                  </p>
                </div>
                <button
                  id="check-jsy-eligibility-btn"
                  onClick={() => setSelectedSchemeModal('JSY')}
                  className="mt-3 w-full py-1.5 px-3 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-extrabold transition shadow-2xs flex items-center justify-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'पात्रता देखें / Check Eligibility' : 'Check Eligibility / Details'}</span>
                </button>
              </div>

              {/* Card 2: PMMVY */}
              <div className="p-3.5 bg-gradient-to-br from-teal-50/80 to-emerald-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-teal-200 dark:border-teal-800/60 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 bg-teal-700 text-white font-extrabold text-[10px] rounded-md">
                      PMMVY Scheme
                    </span>
                    <span className="text-xs font-black text-teal-900 dark:text-teal-200">
                      ₹5,000 DBT Benefit
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    {language === 'hi' ? 'प्रधानमंत्री मातृ वंदना योजना (PMMVY)' : 'Pradhan Mantri Matru Vandana Yojana'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    {language === 'hi'
                      ? 'पहले बच्चे पर ₹5,000 की वित्तीय सहायता किस्तों में सीधे बैंक खाते में ट्रांसफर।'
                      : 'Financial benefit of ₹5,000 in installments directly transferred to mother\'s bank account.'}
                  </p>
                </div>
                <button
                  id="check-pmmvy-eligibility-btn"
                  onClick={() => setSelectedSchemeModal('PMMVY')}
                  className="mt-3 w-full py-1.5 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-extrabold transition shadow-2xs flex items-center justify-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'पात्रता देखें / Check Eligibility' : 'Check Eligibility / Details'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Health Care Advice & Important Guidance */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl p-5 border-2 border-amber-300/90 dark:border-amber-500/50 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm sm:text-base">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{t.dangerSigns}</span>
            </div>

            <p className="text-xs text-amber-950 dark:text-amber-100 font-semibold leading-relaxed">
              {t.dangerSubtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-900 dark:text-slate-100 font-medium pt-1">
              <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{t.danger1}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{t.danger2}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{t.danger3}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{t.danger4}</span>
              </div>
            </div>
          </div>

          {/* Nearest Hospital & PHC Finder Component */}
          <div id="nearest-hospital-section" className="scroll-mt-6">
            <NearestHospitalFinder language={language} userVillage={userProfile?.village} />
          </div>

        </div>

        {/* Right Column (Maa Asha AI Chat Assistant) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-sky-600/30 dark:border-sky-500/30 shadow-md flex flex-col space-y-3 p-4">
          
          {/* AI Header */}
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-1">
                  <span>{language === 'hi' ? 'एआई स्वास्थ्य साथी (Maa Asha AI)' : 'AI Health Assistant (Maa Asha AI)'}</span>
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? '24/7 मातृ स्वास्थ्य एवं सरकारी योजना मार्गदर्शक' : '24/7 Maternal Health & Scheme Guide'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 flex-shrink-0">
              {language === 'hi' ? 'द्विभाषी वॉइस' : 'Bilingual Voice'}
            </span>
          </div>

          {/* Medical Disclaimer Banner */}
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center space-x-2 font-medium">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {language === 'hi'
                ? 'चिकित्सा अस्वीकरण: एआई सलाह केवल जानकारी के लिए है। आपात स्थिति में डॉक्टर/आशा से संपर्क करें।'
                : 'Medical Disclaimer: AI advice is for information only. Consult doctor/ASHA worker in emergency.'}
            </span>
          </div>

          {/* Quick Prompts */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {language === 'hi' ? 'त्वरित प्रश्न:' : 'Quick Suggestions:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                language === 'hi' ? 'दूसरी तिमाही में क्या खाएं?' : 'What to eat in 2nd trimester?',
                language === 'hi' ? 'क्या हल्का सिरदर्द सामान्य है?' : 'Is mild headache normal?',
                language === 'hi' ? 'जननी सुरक्षा योजना (JSY) जानकारी' : 'JSY Scheme details',
                language === 'hi' ? 'आयरन (IFA) गोलियां कैसे खाएं?' : 'How to take IFA tablets?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  id={`quick-q-${idx}`}
                  type="button"
                  onClick={() => handleSendPrompt(q)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-600 hover:bg-sky-50 hover:border-sky-500 text-sky-900 dark:text-sky-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="min-h-[220px] max-h-[380px] overflow-y-auto p-3 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-sky-700 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    AI
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] p-3 rounded-2xl shadow-2xs text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-sky-700 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className={`text-[9px] block text-right mt-1 ${msg.sender === 'user' ? 'text-sky-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    Me
                  </div>
                )}
              </div>
            ))}

            {isListening && (
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 text-xs py-2 animate-pulse bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900">
                <Mic className="w-4 h-4 animate-bounce" />
                <span className="font-bold">
                  {language === 'hi' ? 'माइक सुन रहा है... बोलिए' : 'Listening to voice query... Speak now'}
                </span>
              </div>
            )}

            {aiLoading && (
              <div className="flex items-center space-x-2 text-sky-600 text-xs py-2">
                <Bot className="w-4 h-4 animate-spin" />
                <span>Maa Asha AI is generating advice...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Guaranteed Visible High-Contrast Input Box */}
          <div className="pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center space-x-2 p-1.5 bg-white dark:bg-slate-800 rounded-xl border-2 border-sky-600 dark:border-sky-500 shadow-sm"
            >
              <input
                id="ai-chat-input"
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={isListening ? (language === 'hi' ? 'सुन रहा है...' : 'Listening...') : (language === 'hi' ? 'स्वास्थ या योजना के बारे में पूछें...' : 'Ask about maternal health or government schemes...')}
                className="flex-1 px-3 py-2 text-xs sm:text-sm font-semibold bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />

              {/* Voice Mic Button */}
              <button
                id="voice-mic-btn"
                type="button"
                onClick={handleVoiceInput}
                title={language === 'hi' ? 'आवाज़ द्वारा पूछें' : 'Voice Input'}
                className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                id="send-ai-btn"
                type="submit"
                disabled={aiLoading || !inputPrompt.trim()}
                className="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs transition disabled:opacity-40 flex items-center space-x-1 flex-shrink-0"
              >
                <span>{language === 'hi' ? 'भेजें' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Interactive Log / Update Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {language === 'hi' ? 'स्वास्थ्य वाइटल्स दर्ज करें' : 'Log Health Vitals & ANC Checkup'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'hi' ? 'नवीनतम बीपी, हीमोग्लोबिन एवं वजन अपडेट करें' : 'Update your latest Blood Pressure, Hemoglobin & Weight'}
                </p>
              </div>
              <button
                id="close-vitals-modal-btn"
                onClick={() => setShowVitalsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
                    Blood Pressure (BP)
                  </label>
                  <input
                    id="input-vitals-bp"
                    type="text"
                    required
                    value={inputBp}
                    onChange={(e) => setInputBp(e.target.value)}
                    placeholder="e.g. 120/80"
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <span className="text-[10px] text-slate-500">Normal: &lt; 140/90</span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
                    Hemoglobin (Hb g/dL)
                  </label>
                  <input
                    id="input-vitals-hb"
                    type="number"
                    step="0.1"
                    required
                    value={inputHb}
                    onChange={(e) => setInputHb(e.target.value === '' ? '' : e.target.value)}
                    placeholder="e.g. 11.5"
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <span className="text-[10px] text-slate-500">Normal: &ge; 11.0 g/dL</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
                    Maternal Weight (kg)
                  </label>
                  <input
                    id="input-vitals-weight"
                    type="number"
                    step="0.5"
                    required
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value === '' ? '' : e.target.value)}
                    placeholder="e.g. 58"
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <span className="text-[10px] text-slate-500">Normal: &ge; 45 kg</span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
                    IFA Tablets Stock
                  </label>
                  <input
                    id="input-vitals-ifa"
                    type="number"
                    value={inputIfa}
                    onChange={(e) => setInputIfa(e.target.value === '' ? '' : e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <span className="text-[10px] text-slate-500">Tablets received</span>
                </div>
              </div>

              <button
                id="submit-vitals-btn"
                type="submit"
                className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-xs transition"
              >
                {language === 'hi' ? 'वाइटल्स सहेजें' : 'Save Health Vitals'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scheme Eligibility Modal (JSY & PMMVY) */}
      {selectedSchemeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-xs ${
                  selectedSchemeModal === 'JSY' ? 'bg-sky-700' : 'bg-teal-700'
                }`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {selectedSchemeModal === 'JSY'
                      ? (language === 'hi' ? 'जननी सुरक्षा योजना (JSY) पात्रता' : 'Janani Suraksha Yojana (JSY) Details')
                      : (language === 'hi' ? 'प्रधानमंत्री मातृ वंदना योजना (PMMVY)' : 'PMMVY Scheme Details')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'hi' ? 'सरकारी स्वास्थ्य लाभ एवं पात्रता मानदंड' : 'Government Welfare Benefit & Eligibility Criteria'}
                  </p>
                </div>
              </div>
              <button
                id="close-scheme-modal-btn"
                onClick={() => setSelectedSchemeModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheme Cash Benefit Badge */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              selectedSchemeModal === 'JSY'
                ? 'bg-sky-50 border-sky-200 text-sky-950 dark:bg-sky-950/50 dark:border-sky-900 dark:text-sky-200'
                : 'bg-teal-50 border-teal-200 text-teal-950 dark:bg-teal-950/50 dark:border-teal-900 dark:text-teal-200'
            }`}>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-70">
                  {language === 'hi' ? 'वित्तीय सहायता राशि' : 'Financial Cash Benefit'}
                </span>
                <span className="text-lg font-black">
                  {selectedSchemeModal === 'JSY' ? '₹1,400 (Rural) / ₹1,000 (Urban)' : '₹5,000 (3 Installments DBT)'}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold shadow-2xs">
                {selectedSchemeModal === 'JSY' ? '+ ₹300 ASHA' : '+ ₹6,000 2nd Girl Child'}
              </span>
            </div>

            {/* Eligibility Checklist */}
            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{language === 'hi' ? 'पात्रता की शर्तें (Eligibility Criteria):' : 'Eligibility Checklist:'}</span>
              </h4>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                {selectedSchemeModal === 'JSY' ? (
                  <>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'गर्भवती महिला की आयु 19 वर्ष या उससे अधिक होनी चाहिए।' : 'Pregnant woman must be at least 19 years old.'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'BPL/SC/ST राशन कार्डधारक या सरकारी अस्पताल में प्रसव कराने वाली महिलाएं।' : 'BPL / SC / ST category or institutional delivery at Govt Hospital/PHC.'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'स्वास्थ्य केंद्र पर एएनसी (ANC) जांच एवं एमसीपी कार्ड पंजीकृत होना अनिवार्य है।' : 'Must have Mother Child Protection (MCP) card registered with ASHA.'}</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'पहले जीवित बच्चे के जन्म पर सभी गर्भवती एवं स्तनपान कराने वाली माताओं हेतु।' : 'All pregnant & lactating mothers for 1st live child (except govt employees).'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'एलएमपी (LMP) तिथि के 560 दिनों के भीतर आंगनवाड़ी केंद्र (AWC) में पंजीकरण।' : 'Registration at Anganwadi Centre (AWC) within 560 days of LMP.'}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{language === 'hi' ? 'दूसरे बच्चे के बालिका (Girl Child) होने पर अतिरिक्त ₹6,000 की सहायता।' : 'Additional ₹6,000 support if the second child is a girl.'}</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Required Documents */}
            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 text-xs">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>{language === 'hi' ? 'आवश्यक दस्तावेज (Required Documents):' : 'Required Documents:'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  📄 {language === 'hi' ? 'माता का आधार कार्ड' : 'Mother\'s Aadhaar Card'}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  🏦 {language === 'hi' ? 'बैंक पासबुक (आधार से लिंक)' : 'Aadhaar-linked Bank Passbook'}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  📋 {language === 'hi' ? 'एमसीपी/थाई कार्ड (MCP Card)' : 'MCP Card / Thayi Card'}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  🆔 {language === 'hi' ? 'BPL राशन कार्ड / SC-ST प्रमाण' : 'BPL Ration Card / SC-ST Cert'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                id="ask-ai-scheme-modal-btn"
                onClick={() => {
                  const q = selectedSchemeModal === 'JSY'
                    ? (language === 'hi' ? 'जननी सुरक्षा योजना (JSY) के तहत अस्पताल में ₹1400 पाने की पूरी प्रक्रिया क्या है?' : 'What is the complete process to get ₹1400 under Janani Suraksha Yojana?')
                    : (language === 'hi' ? 'प्रधानमंत्री मातृ वंदना योजना (PMMVY) का फॉर्म 1-A कैसे भरें?' : 'How to fill Form 1-A for Pradhan Mantri Matru Vandana Yojana?');
                  handleSendPrompt(q);
                  setSelectedSchemeModal(null);
                }}
                className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-extrabold rounded-xl text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === 'hi' ? 'एआई से प्रक्रिया पूछें' : 'Ask AI How to Apply'}</span>
              </button>
              <button
                id="close-scheme-modal-footer-btn"
                onClick={() => setSelectedSchemeModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
