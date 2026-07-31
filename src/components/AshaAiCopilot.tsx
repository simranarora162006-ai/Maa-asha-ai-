import React, { useState, useEffect } from 'react';
import { MotherRecord } from '../types';
import { 
  Sparkles, 
  Send, 
  ShieldAlert, 
  Pill, 
  Activity, 
  CheckCircle2, 
  PhoneCall, 
  UserCheck, 
  Bot, 
  X, 
  Stethoscope,
  ChevronRight,
  AlertCircle,
  Clock,
  Lightbulb,
  Mic,
  MicOff
} from 'lucide-react';

interface AshaAiCopilotProps {
  mothers: MotherRecord[];
  initialMotherId?: string | null;
  language: 'hi' | 'en';
  onClose?: () => void;
  isModal?: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  protocols?: { title: string; desc: string; type: 'emergency' | 'warning' | 'info' }[];
}

export const AshaAiCopilot: React.FC<AshaAiCopilotProps> = ({
  mothers,
  initialMotherId,
  language,
  onClose,
  isModal = false
}) => {
  const [selectedMotherId, setSelectedMotherId] = useState<string>(
    initialMotherId || (mothers.length > 0 ? mothers[0].id : 'general')
  );

  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

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
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setQueryInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
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

  const selectedMother = mothers.find(m => m.id === selectedMotherId) || null;

  // Initial greeting / chat history
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Generate initial contextual greeting when mother changes
    if (selectedMother) {
      const isHi = language === 'hi';
      const welcomeText = isHi
        ? `नमस्ते आशा कार्यकर्ता बहन! आप **${selectedMother.name}** (${selectedMother.village}, सप्ताह ${selectedMother.currentWeek}) की देखभाल परामर्श ले रही हैं।\n\n**वर्तमान स्थिति:**\n• हिमोग्लोबिन (Hb): ${selectedMother.hemoglobin || 10.5} g/dL\n• ब्लड प्रेशर (BP): ${selectedMother.bp || '120/80'}\n• जोखिम श्रेणी: ${selectedMother.highRisk ? '⚠️ उच्च जोखिम (HRP - ' + (selectedMother.highRiskReason || 'जोखिम') + ')' : 'सामान्य देखभाल'}\n\nआप मुझसे इस माता के उपचार, IFA खुराक, आहार या emergency referral steps के बारे में कोई भी प्रश्न पूछ सकती हैं।`
        : `Hello ASHA worker! You are consulting care guidance for **${selectedMother.name}** (${selectedMother.village}, Week ${selectedMother.currentWeek}).\n\n**Vitals Summary:**\n• Hemoglobin (Hb): ${selectedMother.hemoglobin || 10.5} g/dL\n• Blood Pressure (BP): ${selectedMother.bp || '120/80'}\n• Risk Category: ${selectedMother.highRisk ? '⚠️ High Risk Pregnancy (HRP - ' + (selectedMother.highRiskReason || 'Risk') + ')' : 'Normal Care'}\n\nAsk me any question regarding IFA dosage, diet counseling, or emergency referral protocols for this mother.`;

      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      const isHi = language === 'hi';
      setMessages([
        {
          id: 'welcome-gen-' + Date.now(),
          sender: 'ai',
          text: isHi
            ? 'नमस्ते! मैं आपका **माँ आशा एआई स्वास्थ्य कॉपायलट** हूँ। किसी भी पंजीकृत गर्भवती माता को चुनें या सामान्य गर्भावस्था देखभाल, IFA खुराक और सरकारी योजनाओं पर प्रश्न पूछें।'
            : 'Hello! I am your **Maa Asha AI Health Copilot**. Select any registered mother or ask general maternal care, IFA dosage, and scheme questions.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [selectedMotherId, language]);

  // Dynamic Rule-Based Smart Action Protocols for Selected Mother
  const generateActionProtocols = (mother: MotherRecord | null) => {
    if (!mother) return [];
    const protocols: { title: string; desc: string; type: 'emergency' | 'warning' | 'info' }[] = [];

    const hb = mother.hemoglobin || 10.5;
    const bp = mother.bp || '120/80';
    const sysBp = parseInt(bp.split('/')[0]) || 120;
    const diaBp = parseInt(bp.split('/')[1]) || 80;

    // Hb Protocol
    if (hb < 9.0) {
      protocols.push({
        title: language === 'hi' ? '🚨 गंभीर एनीमिया (Severe Anemia Alert - Hb < 9)' : '🚨 Severe Anemia Protocol (Hb < 9 g/dL)',
        desc: language === 'hi' 
          ? 'तुरंत 2 IFA लाल गोलियां दैनिक + PHC/CHC में ANM/डॉक्टर से पैरेन्टरल आयरन (IV Iron sucrose) हेतु रेफर करें।' 
          : 'Prescribe 2 IFA red tablets daily + Immediate referral to PHC/CHC for IV Iron Sucrose evaluation.',
        type: 'emergency'
      });
    } else if (hb < 11.0) {
      protocols.push({
        title: language === 'hi' ? '⚠️ मध्यम एनीमिया परामर्श (Hb 9-10.9 g/dL)' : '⚠️ Moderate Anemia Guidance (Hb 9-10.9 g/dL)',
        desc: language === 'hi'
          ? '1 IFA लाल गोली प्रतिदिन (विटामिन सी युक्त आंवला/नींबू पानी के साथ)। गुड़, चना, पालक एवं सहजन की पत्तियां खाने की सलाह दें।'
          : '1 IFA red tablet daily with Vitamin C (lemon water). Advise iron-rich foods: jaggery, roasted chana, spinach, drumstick leaves.',
        type: 'warning'
      });
    }

    // BP Protocol
    if (sysBp >= 140 || diaBp >= 90) {
      protocols.push({
        title: language === 'hi' ? '🚨 उच्च रक्तचाप चेतावनी (High BP Alert ≥ 140/90)' : '🚨 High BP / Pre-Eclampsia Risk (≥ 140/90)',
        desc: language === 'hi'
          ? 'प्री-एकलम्पसिया का खतरा! सिरदर्द, धुंधला दिखना चेक करें। तुरंत ANM को सूचित करें और PHC पर BP मॉनिटरिंग हेतु भेजें।'
          : 'Pre-eclampsia risk! Check for headache or blurred vision. Immediately notify ANM & refer to PHC for urgent BP management.',
        type: 'emergency'
      });
    }

    // High Risk Flag Protocol
    if (mother.highRisk) {
      protocols.push({
        title: language === 'hi' ? '🛡️ HRP विशेष प्रोटोकॉल' : '🛡️ High Risk Pregnancy Protocol',
        desc: language === 'hi'
          ? `कारण: ${mother.highRiskReason || 'उच्च जोखिम'}। महीने में 2 बार गृह भ्रमण करें और 108 एम्बुलेंस आपातकालीन योजना तैयार रखें।`
          : `Reason: ${mother.highRiskReason || 'High Risk'}. Conduct bi-weekly home visits & establish 108 Ambulance birth plan.`,
        type: 'emergency'
      });
    }

    // ANC visit protocol
    if (mother.ancVisitsCompleted < 4) {
      protocols.push({
        title: language === 'hi' ? '📅 ANC जांच ट्रैकिंग' : '📅 ANC Checkup Schedule',
        desc: language === 'hi'
          ? `वर्तमान ANC: ${mother.ancVisitsCompleted}/4। निकटतम VHND (ग्राम स्वास्थ्य पोषण दिवस) पर अगली जांच सुनिश्चित करें।`
          : `Completed ANC: ${mother.ancVisitsCompleted}/4. Schedule next ANC at the upcoming Village Health Nutrition Day (VHND).`,
        type: 'info'
      });
    }

    return protocols;
  };

  const currentProtocols = generateActionProtocols(selectedMother);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || queryInput).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiMsgId = 'ai-' + Date.now();
    const initialAiMsg: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    setQueryInput('');
    setLoading(true);

    try {
      const patientContext = selectedMother
        ? `[SELECTED PATIENT DETAILS: Name: ${selectedMother.name}, Age: ${selectedMother.age}, Village: ${selectedMother.village}, Gestational Week: ${selectedMother.currentWeek}, Hb: ${selectedMother.hemoglobin || '10.5'} g/dL, BP: ${selectedMother.bp || '120/80'}, High Risk: ${selectedMother.highRisk ? 'YES (' + (selectedMother.highRiskReason || 'High Risk') + ')' : 'NO'}, Due Date: ${selectedMother.dueDate}]`
        : '[PATIENT CONTEXT: General ASHA Guidance Query]';

      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${patientContext}\n\nASHA Worker Question: ${query}`,
          language,
          role: 'asha_worker',
          trimester: selectedMother ? Math.ceil(selectedMother.currentWeek / 13) : 2
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response not available');
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
                setMessages(prev =>
                  prev.map(msg =>
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
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  text: language === 'hi'
                    ? 'प्रतिक्रिया उत्पन्न नहीं हो सकी। कृपया दोबारा प्रयास करें।'
                    : 'Response could not be generated. Please try again.'
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error('AI Advisor streaming error:', err);
      const errText = err.message || (language === 'hi' ? 'उत्तर प्राप्त करने में त्रुटि हुई।' : 'Failed to retrieve AI response.');
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMsgId
            ? { ...msg, text: `⚠️ ${errText}` }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    {
      labelHi: 'Hb 8.2 ग्राम पर क्या देखभाल दें?',
      labelEn: 'Care needed for HB 8.2?',
      query: 'What care and IFA dosage is needed for HB 8.2 g/dL?'
    },
    {
      labelHi: 'क्या BP 140/90 हाई रिस्क है?',
      labelEn: 'Is BP 140/90 high risk?',
      query: 'Is BP 140/90 high risk and what emergency action should I take?'
    },
    {
      labelHi: 'गंभीर लक्षण (Danger Signs) क्या हैं?',
      labelEn: 'What are pregnancy danger signs?',
      query: 'What are the key emergency danger signs requiring immediate PHC referral?'
    },
    {
      labelHi: 'ANC जांच एवं JSY प्रक्रिया',
      labelEn: 'ANC Schedule & JSY aid',
      query: 'What ANC checkups and JSY/PMMVY benefits apply for this pregnancy week?'
    }
  ];

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-sky-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col ${isModal ? 'max-h-[90vh] h-[750px] w-full' : 'w-full'}`}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                {language === 'hi' ? 'माँ आशा एआई - स्वास्थ्य कॉपायलट' : 'AI Health Copilot for ASHA Workers'}
              </h2>
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live AI
              </span>
            </div>
            <p className="text-xs text-sky-100 opacity-90 font-medium">
              {language === 'hi'
                ? 'गर्भवती माता हेतु स्वचालित जोखिम विश्लेषण, IFA खुराक व आपातकालीन रेफरल गाइड'
                : 'Smart maternal risk analysis, IFA protocols & immediate emergency triggers'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
        
        {/* Left Column: Patient Context Selector & Automatic Action Protocols */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 p-4 overflow-y-auto space-y-4">
          
          {/* Patient Dropdown Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>{language === 'hi' ? 'पंजीकृत लाभार्थी चुनें' : 'Select Registered Mother'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold">({mothers.length} {language === 'hi' ? 'माताएं' : 'Mothers'})</span>
            </label>

            <select
              id="copilot-mother-selector"
              value={selectedMotherId}
              onChange={(e) => setSelectedMotherId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 rounded-xl border border-sky-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 shadow-xs"
            >
              <option value="general">
                {language === 'hi' ? '💡 सामान्य प्रश्न (बिना माता चयन के)' : '💡 General ASHA Guidance (No specific mother)'}
              </option>
              {mothers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.highRisk ? '⚠️ HRP: ' : '• '} {m.name} ({m.village} - Hb: {m.hemoglobin || '10.5'}, BP: {m.bp || '120/80'})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Mother Vitals Summary Card */}
          {selectedMother && (
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <span>{selectedMother.name}</span>
                    <span className="text-xs font-semibold text-slate-500">({selectedMother.age} yrs)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    📍 {selectedMother.village} • Wk {selectedMother.currentWeek} (EDD: {selectedMother.dueDate})
                  </div>
                </div>
                {selectedMother.highRisk ? (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 animate-pulse">
                    HIGH RISK
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    NORMAL
                  </span>
                )}
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Hemoglobin</div>
                  <div className={`text-xs font-black ${selectedMother.hemoglobin && selectedMother.hemoglobin < 9 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-800 dark:text-slate-100'}`}>
                    {selectedMother.hemoglobin || '10.5'} <span className="text-[9px] font-normal">g/dL</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Blood Press.</div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {selectedMother.bp || '120/80'}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">ANC Visits</div>
                  <div className="text-xs font-black text-teal-700 dark:text-teal-300">
                    {selectedMother.ancVisitsCompleted} / 4 Done
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Immediate Smart Action Protocols */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <span>{language === 'hi' ? 'स्वचालित ऐक्शन प्रोटोकॉल' : 'Smart Action Protocols'}</span>
            </div>

            {currentProtocols.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{language === 'hi' ? 'सभी वाइटल्स सामान्य' : 'Standard Routine Care'}</div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    {language === 'hi' ? 'नियमित ANC चेकअप व प्रतिदिन 1 IFA लाल गोली परामर्श जारी रखें।' : 'Continue routine ANC monitoring and 1 daily IFA red tablet supplementation.'}
                  </div>
                </div>
              </div>
            ) : (
              currentProtocols.map((protocol, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    protocol.type === 'emergency'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                      : protocol.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                      : 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100'
                  }`}
                >
                  <div className="font-extrabold flex items-center justify-between">
                    <span>{protocol.title}</span>
                    {protocol.type === 'emergency' && (
                      <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-md">ACTION REQD</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-medium">{protocol.desc}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick Consultation Chips */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>{language === 'hi' ? 'त्वरित प्रश्न सुझाव' : 'Quick Copilot Questions'}</span>
            </div>

            <div className="flex flex-col space-y-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.query)}
                  className="text-left px-3 py-2 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 transition flex items-center justify-between group shadow-2xs"
                >
                  <span className="truncate pr-2">
                    {language === 'hi' ? prompt.labelHi : prompt.labelEn}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Chat History & Interactive Input */}
        <div className="lg:col-span-7 flex flex-col h-[480px] lg:h-full bg-white dark:bg-slate-900">
          
          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold shadow-xs ${
                  msg.sender === 'user' ? 'bg-sky-700' : 'bg-gradient-to-tr from-sky-600 to-indigo-600'
                }`}>
                  {msg.sender === 'user' ? <UserCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-2 shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-sky-700 text-white font-medium rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-normal rounded-tl-none border border-slate-200/80 dark:border-slate-700/60'
                }`}>
                  <div className="whitespace-pre-wrap font-sans leading-relaxed">
                    {msg.text}
                  </div>

                  <div className={`text-[10px] text-right pt-1 opacity-75 ${msg.sender === 'user' ? 'text-sky-100' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-sky-700 dark:text-sky-400 font-bold p-3 bg-sky-50 dark:bg-slate-800 rounded-2xl w-fit animate-pulse border border-sky-200 dark:border-slate-700">
                <Sparkles className="w-4 h-4 animate-spin text-sky-600" />
                <span>{language === 'hi' ? 'एआई कॉपायलट जवाब तैयार कर रहा है...' : 'AI Copilot analyzing maternal health guidelines...'}</span>
              </div>
            )}
          </div>

          {/* Chat Input Box */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
              <input
                id="copilot-query-input"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={
                  isListening
                    ? (language === 'hi' ? 'सुन रहा है... बोलिए' : 'Listening... Speak now')
                    : (language === 'hi'
                        ? selectedMother
                          ? `${selectedMother.name} के बारे में प्रश्न पूछें (उदा: Hb 8.2 देखभाल, BP 140/90...)`
                          : 'माँ आशा एआई कॉपायलट से प्रश्न पूछें...'
                        : selectedMother
                          ? `Ask question regarding ${selectedMother.name}...`
                          : 'Ask AI Copilot regarding care protocols...')
                }
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 shadow-xs"
              />

              <button
                id="copilot-voice-mic-btn"
                type="button"
                onClick={handleVoiceInput}
                title={language === 'hi' ? 'आवाज़ द्वारा पूछें' : 'Voice Input'}
                className={`p-2.5 rounded-2xl transition-all flex-shrink-0 flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
              </button>

              <button
                id="copilot-send-button"
                type="submit"
                disabled={!queryInput.trim() || loading}
                className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 flex-shrink-0"
              >
                <span>{language === 'hi' ? 'पूछें' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-1.5 text-center font-bold">
              {language === 'hi'
                ? '⚠️ चिकित्सकीय सलाह ANM/PHC डॉक्टर द्वारा पुष्टि की जानी चाहिए। आपातस्थिति में 108 पर कॉल करें।'
                : '⚠️ Clinical decisions should be confirmed with ANM / PHC Medical Officer. Call 108 in emergency.'}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
