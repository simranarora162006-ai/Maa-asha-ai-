import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header, NavTab } from './components/Header';
import { AuthPage } from './components/AuthPage';
import { MotherDashboard } from './components/MotherDashboard';
import { AshaDashboard } from './components/AshaDashboard';
import { PendingApproval } from './components/PendingApproval';
import { AboutDeveloper } from './components/AboutDeveloper';
import { NearestHospitalFinder } from './components/NearestHospitalFinder';
import { Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const { language, t } = useLanguage();
  const [showLoading, setShowLoading] = React.useState(true);
  const [currentTab, setCurrentTab] = React.useState<NavTab>('home');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [userProfile, showLoading, currentTab]);

  const isLoading = loading && showLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-serif">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Loading Maa Asha AI Healthcare Portal...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-serif transition-colors duration-200">
      <Header currentTab={currentTab} onTabChange={setCurrentTab} />

      <main className="flex-1">
        {!userProfile ? (
          currentTab === 'about_developer' ? (
            <AboutDeveloper />
          ) : (
            <AuthPage />
          )
        ) : currentTab === 'about_developer' ? (
          <AboutDeveloper />
        ) : currentTab === 'map_search' ? (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
            <NearestHospitalFinder language={language} userVillage={userProfile?.village} />
          </div>
        ) : (
          <>
            {/* Pregnant Woman / Mother View */}
            {userProfile.role === 'pregnant_woman' && <MotherDashboard />}

            {/* ASHA Worker View */}
            {userProfile.role === 'asha_worker' && (
              userProfile.status === 'pending_approval' ? (
                <PendingApproval />
              ) : (
                <AshaDashboard />
              )
            )}

            {/* Admin / Supervisor View */}
            {userProfile.role === 'admin' && <AshaDashboard />}
          </>
        )}
      </main>

      {/* Global Footer - Matches Hero Banner Gradient */}
      <footer className="bg-gradient-to-r from-slate-900 via-sky-950 to-teal-950 border-t border-slate-800 py-5 text-center text-xs text-slate-200 font-serif">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-medium">
            © {new Date().getFullYear()} <span className="font-bold text-sky-400">{t.appTitle}</span> • National Maternal Care & ASHA Support Platform
          </div>
          <div className="flex flex-wrap items-center justify-center space-x-3 text-xs font-semibold text-slate-300">
            <span className="text-teal-300 font-bold">108 Emergency Ambulance</span>
            <span>•</span>
            <span className="text-teal-300 font-bold">102 Maternal Helpline</span>
            <span>•</span>
            <span>Pradhan Mantri Matru Vandana Yojana (PMMVY)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
