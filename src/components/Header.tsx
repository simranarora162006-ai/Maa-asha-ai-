import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  HeartHandshake, 
  Globe, 
  Sun, 
  Moon, 
  LogOut, 
  User,
  Home,
  MapPin,
  Code
} from 'lucide-react';

export type NavTab = 'home' | 'map_search' | 'about_developer';

interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const { userProfile, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Title */}
          <button
            onClick={() => onTabChange('home')}
            className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 min-w-0 text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap select-none">
              Maa Asha AI
            </span>
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              id="nav-home-btn"
              onClick={() => onTabChange('home')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-extrabold transition ${
                currentTab === 'home'
                  ? 'bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 text-sky-600" />
              <span>{language === 'hi' ? 'होम (Home)' : 'Home'}</span>
            </button>

            <button
              id="nav-map-search-btn"
              onClick={() => onTabChange('map_search')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-extrabold transition ${
                currentTab === 'map_search'
                  ? 'bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>{language === 'hi' ? 'मैप सर्च (Map Search)' : 'Map Search'}</span>
            </button>

            <button
              id="nav-about-dev-btn"
              onClick={() => onTabChange('about_developer')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-extrabold transition ${
                currentTab === 'about_developer'
                  ? 'bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-4 h-4 text-teal-600" />
              <span>{language === 'hi' ? 'डेवलपर के बारे में' : 'About Developer'}</span>
            </button>
          </nav>

          {/* Minimalist Controls (Right Side: Language, Theme, Logout/Profile) */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* 1. Language Toggle */}
            <button
              id="lang-toggle-btn"
              type="button"
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition focus:outline-none"
              title="Switch Language / भाषा बदलें"
            >
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="whitespace-nowrap">{language === 'hi' ? 'EN' : 'हिन्दी'}</span>
            </button>

            {/* 2. Dark/Light Theme Toggle */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition focus:outline-none"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* 3. Logout / Profile Icon */}
            {userProfile ? (
              <button
                id="logout-btn"
                type="button"
                onClick={logout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold transition focus:outline-none"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-medium" title="Guest">
                <User className="w-4 h-4" />
              </div>
            )}

          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onTabChange('home')}
            className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold transition ${
              currentTab === 'home'
                ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-slate-800'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{language === 'hi' ? 'होम' : 'Home'}</span>
          </button>

          <button
            onClick={() => onTabChange('map_search')}
            className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold transition ${
              currentTab === 'map_search'
                ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-slate-800'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>{language === 'hi' ? 'मैप सर्च' : 'Map Search'}</span>
          </button>

          <button
            onClick={() => onTabChange('about_developer')}
            className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold transition ${
              currentTab === 'about_developer'
                ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-slate-800'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Code className="w-4 h-4 text-teal-600" />
            <span>{language === 'hi' ? 'डेवलपर' : 'About Dev'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
