import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert, RefreshCw, CheckCircle2, UserCheck, Phone, MapPin, Building, Sparkles } from 'lucide-react';

export const PendingApproval: React.FC = () => {
  const { userProfile, approveAshaWorker, logout } = useAuth();
  const { t, language } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [selfApproved, setSelfApproved] = useState(false);

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
    }, 1000);
  };

  const handleSelfApprove = async () => {
    setSelfApproved(true);
    await approveAshaWorker(userProfile?.uid || '');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center relative overflow-hidden">
        
        <div className="w-16 h-16 bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          {t.pendingApprovalTitle}
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-md mx-auto">
          {t.pendingApprovalMsg}
        </p>

        {/* Worker Profile Card */}
        {userProfile && (
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left mb-6 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {userProfile.displayName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 uppercase">
                {t.pending}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 pt-1">
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>ID: {userProfile.ashaWorkerId || 'ASHA-MP-2026'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 text-sky-600" />
                <span>Sub-Center: {userProfile.subCenter || 'PHC Rampur'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Village: {userProfile.village || 'Rampur'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <span>Contact: {userProfile.phone || '9876543210'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-100/80 dark:bg-slate-800/50 p-3 rounded-xl text-left text-[11px] text-slate-600 dark:text-slate-400 mb-6 flex items-start space-x-2 border border-slate-200/60 dark:border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <span>{t.pendingNotice}</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="refresh-status-btn"
              onClick={handleRefresh}
              disabled={checking}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-sky-600' : ''}`} />
              <span>{t.refreshStatus}</span>
            </button>

            <button
              id="logout-pending-btn"
              onClick={logout}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition"
            >
              {t.logout}
            </button>
          </div>

          {/* Instant Admin Approval Switch for Demo Testing */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              id="demo-self-approve-btn"
              onClick={handleSelfApprove}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-2 transition"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>{t.demoApprove}</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'hi' 
                ? 'एडमिन सत्यापन का तुरंत परीक्षण करने के लिए इस बटन पर क्लिक करें' 
                : 'Click above to instantly simulate District Admin approval for evaluation'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
