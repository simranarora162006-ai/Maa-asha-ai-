import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import { 
  HeartHandshake, 
  User, 
  UserCheck, 
  ShieldAlert, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { loginWithEmail, loginWithAshaIdOrEmail, signUpUser, loginWithGoogle, demoLogin } = useAuth();
  const { t, language } = useLanguage();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('pregnant_woman');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [mode]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [lmpDate, setLmpDate] = useState('');
  const [manualTrimester, setManualTrimester] = useState<number | null>(null);
  const [ashaId, setAshaId] = useState('');
  const [instantApproveMode, setInstantApproveMode] = useState(true);

  const [ashaSuccessData, setAshaSuccessData] = useState<{
    id: string;
    name: string;
    village: string;
    email: string;
    phone: string;
    subCenter: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyAshaId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 3000);
  };

  const handleDownloadAshaCard = () => {
    if (!ashaSuccessData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ASHA Worker ID Card - ${ashaSuccessData.id}</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f4f8; margin: 0; }
          .card { width: 380px; background: #ffffff; border-radius: 16px; border: 2px solid #0284c7; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #0369a1, #0284c7); color: white; padding: 16px; text-align: center; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 4px 0 0; font-size: 11px; opacity: 0.9; }
          .body { padding: 20px; text-align: center; }
          .avatar { width: 70px; height: 70px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto 12px; border: 3px solid #0284c7; }
          .id-badge { background: #f0f9ff; border: 1.5px dashed #0284c7; color: #0369a1; font-weight: 800; font-size: 18px; padding: 8px 16px; border-radius: 8px; display: inline-block; margin-bottom: 16px; letter-spacing: 1px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
          .label { color: #64748b; font-weight: 600; }
          .value { color: #0f172a; font-weight: 700; }
          .footer { background: #f8fafc; padding: 12px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2>Government Health Worker</h2>
            <p>Maa Asha Maternal & Child Health System</p>
          </div>
          <div class="body">
            <div class="avatar">${(ashaSuccessData.name[0] || 'A').toUpperCase()}</div>
            <div class="id-badge">${ashaSuccessData.id}</div>
            <div class="info-row"><span class="label">Worker Name:</span><span class="value">${ashaSuccessData.name}</span></div>
            <div class="info-row"><span class="label">Assigned Village:</span><span class="value">${ashaSuccessData.village}</span></div>
            <div class="info-row"><span class="label">Sub-Center:</span><span class="value">${ashaSuccessData.subCenter}</span></div>
            <div class="info-row"><span class="label">Contact Phone:</span><span class="value">${ashaSuccessData.phone || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Email ID:</span><span class="value">${ashaSuccessData.email}</span></div>
          </div>
          <div class="footer">
            Official ASHA Identity Card • Verified by District Health Officer • National Health Mission
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calculate EDD (LMP + 280 days) and Trimester automatically from LMP
  const calculatePregnancyDetails = (lmpStr: string) => {
    if (!lmpStr) return { edd: '', trimester: 2 };
    const lmpTime = new Date(lmpStr).getTime();
    if (isNaN(lmpTime)) return { edd: '', trimester: 2 };

    const eddTime = lmpTime + 280 * 24 * 60 * 60 * 1000;
    const edd = new Date(eddTime).toISOString().split('T')[0];

    const diffDays = Math.floor((Date.now() - lmpTime) / (24 * 60 * 60 * 1000));
    const diffWeeks = Math.max(1, Math.floor(diffDays / 7));

    let tri = 1;
    if (diffWeeks > 13 && diffWeeks <= 27) tri = 2;
    else if (diffWeeks > 27) tri = 3;

    return { edd, trimester: tri };
  };

  const { edd: calculatedEdd, trimester: autoTrimester } = calculatePregnancyDetails(lmpDate);
  const calculatedTrimester = manualTrimester !== null ? manualTrimester : autoTrimester;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validate Mobile Number in Signup Mode
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    if (mode === 'signup' && cleanPhone && cleanPhone.length !== 10) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    // ASHA / ANM Healthcare Worker Credentials Verification
    if (role === 'asha_worker') {
      const currentAshaId = (ashaId || email).trim().toUpperCase();
      const currentPin = password.trim();

      if (!currentPin) {
        setErrorMsg(
          language === 'hi'
            ? 'कृपया 4-डिजिट सुरक्षा पिन या पासवर्ड दर्ज करें।'
            : 'Please enter 4-digit PIN or password.'
        );
        return;
      }

      setLoading(true);

      try {
        if (mode === 'login') {
          const identifier = (ashaId || email || phone).trim();
          await loginWithAshaIdOrEmail(identifier || 'ASHA-GOVT-101', currentPin);
        } else {
          const cleanEmail = email.trim().toLowerCase() || `asha.${Date.now()}@maaasha.in`;
          const res = await signUpUser({
            email: cleanEmail,
            password: currentPin,
            displayName: fullName || `ASHA Worker (${village || 'GOVT'})`,
            role: 'asha_worker',
            phone,
            village: village || 'Rampur Gram',
            district: district || 'Sehore',
            ashaWorkerId: currentAshaId || '',
            instantApprove: instantApproveMode
          });

          if (res?.ashaWorkerId) {
            setAshaSuccessData({
              id: res.ashaWorkerId,
              name: fullName || 'ASHA Worker',
              village: village || 'Rampur Gram',
              email: cleanEmail,
              phone: phone || '9876543210',
              subCenter: `PHC ${village || 'Rampur Gram'}`
            });
          }
        }
      } catch (err: any) {
        console.error('ASHA Auth error:', err);
        let msg = err.message || 'Authentication failed.';
        if (err.code === 'auth/email-already-in-use' || err.message?.includes('already registered')) {
          msg = language === 'hi' 
            ? 'यह ईमेल/आईडी पहले से पंजीकृत है। कृपया अपने मौजूदा पासवर्ड से लॉगिन करें।' 
            : 'Email or ASHA ID already registered. Please login with your existing password.';
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          msg = language === 'hi' 
            ? 'अमान्य आशा आईडी/ईमेल या पासवर्ड। कृपया सही क्रेडेंशियल दर्ज करें।' 
            : 'Invalid ASHA ID/Email or Password. Please enter correct credentials.';
        }
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Pregnant Woman Role Standard Validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg(
        language === 'hi' 
          ? 'कृपया एक वैध ईमेल पता दर्ज करें (उदा. sita@example.com)।' 
          : 'Please enter a valid email address (e.g. sita@example.com).'
      );
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg(
        language === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(trimmedEmail, password);
      } else {
        await signUpUser({
          email: trimmedEmail,
          password,
          displayName: fullName || trimmedEmail.split('@')[0],
          role: 'pregnant_woman',
          phone,
          village,
          district,
          lmpDate,
          dueDate: calculatedEdd,
          trimester: calculatedTrimester,
          ashaWorkerId: ashaId
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = language === 'hi' ? 'ईमेल या पासवर्ड गलत है। कृपया पुनः प्रयास करें।' : 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('already registered')) {
        msg = language === 'hi' ? 'यह ईमेल पहले से पंजीकृत है। कृपया अपने मौजूदा पासवर्ड से लॉगिन करें।' : 'Email already registered. Please login with your existing password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = language === 'hi' ? 'कृपया एक वैध ईमेल पता दर्ज करें (उदा. sita@example.com)।' : 'Please enter a valid email address (e.g. sita@example.com).';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = language === 'hi' 
          ? 'ईमेल/पासवर्ड प्रमाणीकरण सक्षम नहीं है। कृपया नया खाता बनाएं या सही पासवर्ड दर्ज करें।' 
          : 'Email/Password sign in issue. Please register a new account or enter correct credentials.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle(role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-8 px-4 flex items-center justify-center transition-colors">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Side Banner / Healthcare Info Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950 text-white p-8 flex flex-col justify-between relative overflow-hidden border-r border-slate-800">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="inline-flex items-center space-x-2 bg-sky-500/20 border border-sky-400/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-6 text-sky-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>{t.appTitle}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 leading-tight text-white">
              {language === 'hi' ? 'सुरक्षित मातृत्व एवं डिजिटल स्वास्थ्य सेवा' : 'Smart Maternal Health & ASHA Care'}
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
              {language === 'hi' 
                ? 'गर्भवती महिलाओं के लिए समय पर सलाह, पोषण मार्गदर्शन, और आशा कार्यकर्ताओं के लिए आसान डिजिटल रजिस्टर।' 
                : 'Empowering pregnant women with timely health guidance & providing ASHA workers with a seamless digital ANC tracker.'}
            </p>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>{language === 'hi' ? 'द्विभाषी (हिन्दी / English) एआई परामर्शदाता' : 'Bilingual (Hindi/English) AI Health Advisor'}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>{language === 'hi' ? 'भूमिका-आधारित पहुंच नियंत्रण (RBAC)' : 'Role-Based Access Control (Mothers & ASHA)'}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>{language === 'hi' ? 'उच्च जोखिम वाले मामलों की तुरंत चेतावनी' : 'High-Risk Pregnancy Alerts & JSY Tracker'}</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Login Cards at bottom of left panel */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
              {language === 'hi' ? 'त्वरित डेमो परीक्षण (Quick Demo)' : 'Quick Test Accounts:'}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                id="quick-demo-mother-btn"
                type="button"
                onClick={() => demoLogin('pregnant_woman', 'approved')}
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-left transition font-semibold border border-slate-700 text-slate-200"
              >
                🤰 {language === 'hi' ? 'माता' : 'Mother'}
              </button>
              <button
                id="quick-demo-asha-btn"
                type="button"
                onClick={() => demoLogin('asha_worker', 'approved')}
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-left transition font-semibold border border-slate-700 text-slate-200"
              >
                👩‍⚕️ {language === 'hi' ? 'आशा कार्यकर्ता' : 'ASHA Worker'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 bg-white dark:bg-slate-900">
          
          {/* Security Portal Badge */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-extrabold shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                {language === 'hi' 
                  ? '🔒 सत्यापित स्वास्थ्य विभाग पोर्टल - भारत सरकार' 
                  : '🔒 Verified Health Dept Portal - Govt of India'}
              </span>
            </div>
          </div>

          {/* Mode Tabs (Login / Register) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'login' 
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.login}
            </button>
            <button
              id="tab-signup-btn"
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signup' 
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.signup}
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 dark:bg-rose-950/70 dark:border-rose-900 rounded-xl flex items-start space-x-2 text-rose-800 dark:text-rose-200 text-xs font-semibold shadow-2xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t.role}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="role-mother-btn"
                  onClick={() => { setRole('pregnant_woman'); setErrorMsg(''); }}
                  className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition ${
                    role === 'pregnant_woman'
                      ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-600/20'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role === 'pregnant_woman' ? 'bg-sky-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{t.pregnantWoman}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Direct Care & AI Advisor</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="role-asha-btn"
                  onClick={() => { setRole('asha_worker'); setErrorMsg(''); }}
                  className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition ${
                    role === 'asha_worker'
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-600/20'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role === 'asha_worker' ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{t.ashaWorker}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      🔒 Credentials Required
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields for ASHA Worker vs Pregnant Woman */}
            {role === 'asha_worker' ? (
              <div className="space-y-4">
                {mode === 'login' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {language === 'hi' ? 'आशा कार्यकर्ता आईडी या फोन' : 'ASHA Worker ID or Registered Contact'}
                      </label>
                      <div className="relative">
                        <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="input-ashaid-login"
                          type="text"
                          required
                          value={ashaId}
                          onChange={(e) => setAshaId(e.target.value)}
                          placeholder="e.g. ASHA-RAMPUR-1024"
                          className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {language === 'hi' ? '4-डिजिट सुरक्षा पिन / पासवर्ड' : 'Secret Access PIN / Password'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="input-ashapin-login"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="4-Digit Security PIN"
                          className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* ASHA Worker Registration Mode */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {t.fullName} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="input-fullname-asha"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={language === 'hi' ? 'उदा. अनीता शर्मा' : 'e.g. Anita Sharma'}
                          className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {language === 'hi' ? 'आवंटित गाँव / स्थान' : 'Assigned Village / Location'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-village-asha"
                        type="text"
                        required
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder={language === 'hi' ? 'उदा. रामपुर, इंदौर' : 'e.g. Rampur, Indore'}
                        className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {t.phoneNumber} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-phone-asha"
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210 (Max 10 digits)"
                        className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                        {language === 'hi' ? 'गुप्त एक्सेस पिन / पासवर्ड' : 'Secret Access PIN / Password'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="input-ashapin-signup"
                          type="password"
                          required
                          minLength={4}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="4-Digit PIN or Secret Password"
                          className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    {/* Instant Admin Approval Switch for Demo Testing */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-teal-900 dark:text-teal-200 block">
                            {language === 'hi' ? 'त्वरित एडमिन स्वीकृति (डेमो/परीक्षण मोड)' : 'Instant Admin Approval (Demo Mode)'}
                          </span>
                          <span className="text-[10px] text-teal-700 dark:text-teal-400">
                            {language === 'hi' ? 'समीक्षा स्क्रीन को छोड़ें और तुरंत आशा पोर्टल पर जाएं' : 'Bypass review screen upon registration for testing'}
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                        <input
                          id="toggle-instant-approve"
                          type="checkbox"
                          checked={instantApproveMode}
                          onChange={(e) => setInstantApproveMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Pregnant Woman Fields */
              <div className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      {t.fullName}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="input-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={language === 'hi' ? 'उदा. सीता देवी' : 'e.g. Sita Devi'}
                        className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    {t.emailAddress}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                    {t.password}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                    />
                  </div>
                </div>

                {/* Additional Fields for Signup */}
                {mode === 'signup' && (
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                          {t.phoneNumber}
                        </label>
                        <input
                          id="input-phone"
                          type="tel"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                          {t.village}
                        </label>
                        <input
                          id="input-village"
                          type="text"
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                          placeholder={language === 'hi' ? 'गांव का नाम' : 'Village Name'}
                          className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                          {language === 'hi' ? 'अंतिम माहवारी की तारीख (LMP)' : 'Last Menstrual Period (LMP) Date'}
                        </label>
                        <input
                          id="input-lmpdate"
                          type="date"
                          value={lmpDate}
                          onChange={(e) => setLmpDate(e.target.value)}
                          className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                        />
                        {calculatedEdd ? (
                          <p className="mt-1 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                            {language === 'hi' 
                              ? `अनुमानित प्रसव तिथि (EDD): ${calculatedEdd}` 
                              : `Estimated Due Date (EDD): ${calculatedEdd}`}
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            {language === 'hi' ? 'EDD की स्वतः गणना होगी (280 दिन)' : 'EDD calculated automatically (280 days)'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                          {language === 'hi' ? 'वर्तमान तिमाही (स्वतः गणना)' : 'Current Trimester (Auto-calculated)'}
                        </label>
                        <select
                          id="select-trimester"
                          value={calculatedTrimester}
                          onChange={(e) => setManualTrimester(Number(e.target.value))}
                          className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                        >
                          <option value={1}>{language === 'hi' ? 'प्रथम तिमाही (सप्ताह 1-13)' : 'Trimester 1 (Weeks 1-13)'}</option>
                          <option value={2}>{language === 'hi' ? 'द्वितीय तिमाही (सप्ताह 14-27)' : 'Trimester 2 (Weeks 14-27)'}</option>
                          <option value={3}>{language === 'hi' ? 'तृतीय तिमाही (सप्ताह 28-40+)' : 'Trimester 3 (Weeks 28-40+)'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{mode === 'login' ? t.login : t.signup}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          {/* Alternative Google Sign In */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              id="google-login-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google Sign-In ({role === 'pregnant_woman' ? 'Mother' : 'ASHA Worker'})</span>
            </button>
          </div>

        </div>

      </div>

      {/* ASHA WORKER UNIQUE ID REGISTRATION SUCCESS MODAL */}
      {ashaSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-sky-200 dark:border-sky-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/50 rounded-2xl flex items-center justify-center text-sky-700 dark:text-sky-300 mx-auto mb-3 shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {language === 'hi' ? 'आशा कार्यकर्ता पंजीकरण सफल!' : 'ASHA Registration Successful!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {language === 'hi'
                  ? 'आपकी अद्वितीय आशा कार्यकर्ता आईडी जनरेट कर दी गई है।'
                  : 'Your unique official ASHA ID has been generated successfully.'}
              </p>
            </div>

            {/* Official ID Card Card Preview */}
            <div className="bg-gradient-to-br from-sky-50 via-sky-100/50 to-teal-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800/50 border-2 border-sky-300 dark:border-sky-700 rounded-2xl p-5 mb-6 text-center shadow-xs relative overflow-hidden">
              <div className="text-[10px] uppercase font-black text-sky-800 dark:text-sky-300 tracking-wider mb-2">
                NATIONAL HEALTH MISSION • MAA ASHA ID
              </div>
              
              <div className="inline-block bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border-2 border-dashed border-sky-500 dark:border-sky-400 mb-3 shadow-xs">
                <span className="text-xl font-black text-sky-800 dark:text-sky-300 tracking-widest font-mono">
                  {ashaSuccessData.id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border-t border-sky-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{ashaSuccessData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'hi' ? 'गांव/क्षेत्र:' : 'Village:'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{ashaSuccessData.village}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'hi' ? 'उप-केंद्र:' : 'Sub-Center:'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{ashaSuccessData.subCenter}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleCopyAshaId(ashaSuccessData.id)}
                className="py-2.5 px-3 rounded-xl border-2 border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>{copiedId ? (language === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : (language === 'hi' ? 'आईडी कॉपी करें' : 'Copy ID')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAshaCard}
                className="py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-1.5 transition"
              >
                <span>{language === 'hi' ? 'आईडी कार्ड डाउनलोड' : 'Download ID Card'}</span>
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 mb-5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {language === 'hi'
                  ? `पंजीकरण पुष्टि और ASHA ID आपके ईमेल (${ashaSuccessData.email}) पर भेज दी गई है।`
                  : `Confirmation and ASHA ID details sent to registered email (${ashaSuccessData.email}).`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAshaSuccessData(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition shadow-md"
            >
              {language === 'hi' ? 'पोर्टल पर जाएं' : 'Proceed to ASHA Portal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
