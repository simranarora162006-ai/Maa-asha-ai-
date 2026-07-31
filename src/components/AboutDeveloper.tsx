import React from 'react';
import { User, Award, Code2, GraduationCap, HeartHandshake, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AboutDeveloper: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-serif">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-sky-700 via-teal-600 to-indigo-800 text-white flex items-center justify-center shrink-0 shadow-lg border-2 border-white/20">
            <User className="w-12 h-12 text-white" />
          </div>

          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center space-x-2 bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs font-bold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Creator & Developer • MaaASHA AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'hi' ? 'डेवलपर के बारे में' : 'About the Developer'}
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center sm:justify-start space-x-1">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              <span>B.Sc. Biology Student • Churu District, Rajasthan</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Biography Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 text-slate-800 dark:text-slate-200 leading-relaxed text-base sm:text-lg">
        
        <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <Code2 className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {language === 'hi' ? 'व्यक्तिगत परिचय एवं यात्रा' : 'Personal Journey & Vision'}
          </h2>
        </div>

        <p className="indent-4">
          I am a second-year B.Sc. Biology student at a Government College from a small town in Churu district, Rajasthan. Growing up in a rural area has given me a deep understanding of real-world challenges, inspiring me to use technology to create practical and meaningful solutions. I have a strong interest in technology, innovation, and problem-solving.
        </p>

        <p className="indent-4">
          In 2025, I began my web development journey through CodeYogi, where I learned HTML, CSS, and JavaScript. I have also earned two certificates from CodeYogi for successfully completing my learning milestones.
        </p>

        <p className="indent-4">
          I participated in my first hackathon, where I built an AI-powered maternal healthcare web application, MaaASHA AI. The entire project was developed using prompt engineering, allowing me to transform ideas into a functional solution by effectively using AI tools.
        </p>

        <p className="indent-4">
          I am passionate about exploring the intersection of biology, artificial intelligence, and web development. I enjoy learning new technologies, working on real-world projects, and building solutions that create a meaningful social impact. I am committed to continuously improving my technical skills and contributing to innovative projects that make a difference.
        </p>

        {/* Highlights Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-sm">
          <div className="p-4 bg-sky-50 dark:bg-slate-800/60 rounded-2xl border border-sky-100 dark:border-slate-700 flex items-start space-x-3">
            <Award className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">CodeYogi Certified</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">HTML, CSS, JavaScript Milestones</div>
            </div>
          </div>

          <div className="p-4 bg-teal-50 dark:bg-slate-800/60 rounded-2xl border border-teal-100 dark:border-slate-700 flex items-start space-x-3">
            <HeartHandshake className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">MaaASHA AI Project</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Prompt Engineering & Healthcare</div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-slate-800/60 rounded-2xl border border-amber-100 dark:border-slate-700 flex items-start space-x-3">
            <GraduationCap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Biology & AI Synergy</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Rural Social Impact Tech</div>
            </div>
          </div>
        </div>

      </div>

      {/* Connect & Social Profiles Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Connect / Social Profiles
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {/* Telegram */}
          <button
            type="button"
            disabled
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#229ED9] text-white border border-[#229ED9] shadow-sm cursor-default opacity-100 select-none pointer-events-none"
            title="Telegram"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.37-3.61 3.98-1.66 4.81-1.95 5.35-1.96.12 0 .38.03.55.17.14.12.18.28.2.4.02.07.02.21 0 .37z"/>
            </svg>
            <span className="text-xs font-bold">Telegram</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            disabled
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#25D366] text-white border border-[#25D366] shadow-sm cursor-default opacity-100 select-none pointer-events-none"
            title="WhatsApp"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.82 14.12c-.25.71-1.25 1.3-1.74 1.38-.47.08-1.08.12-3.13-.71-2.62-1.07-4.31-3.75-4.44-3.92-.13-.17-1.06-1.41-1.06-2.69 0-1.28.67-1.91.91-2.17.25-.26.54-.33.72-.33.18 0 .36.01.52.01.17 0 .4-.06.63.48.25.58.83 2.03.9 2.18.08.15.13.33.02.53-.1.21-.16.33-.31.51-.15.18-.32.4-.46.54-.15.15-.31.32-.13.62.18.3 1.05 1.74 2.26 2.81 1.56 1.39 2.87 1.82 3.28 2.02.41.2.65.17.89-.11.24-.28 1.03-1.2 1.31-1.61.28-.41.56-.34.94-.2.38.14 2.42 1.14 2.83 1.35.41.21.69.31.79.48.1.18.1.1.02.81z"/>
            </svg>
            <span className="text-xs font-bold">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            disabled
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#1877F2] text-white border border-[#1877F2] shadow-sm cursor-default opacity-100 select-none pointer-events-none"
            title="Facebook"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9v-2.89h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34V21.88C18.34 21.12 22 16.99 22 12z"/>
            </svg>
            <span className="text-xs font-bold">Facebook</span>
          </button>

          {/* LinkedIn */}
          <button
            type="button"
            disabled
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#0A66C2] text-white border border-[#0A66C2] shadow-sm cursor-default opacity-100 select-none pointer-events-none"
            title="LinkedIn"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.67a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/>
            </svg>
            <span className="text-xs font-bold">LinkedIn</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            disabled
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-sm cursor-default opacity-100 select-none pointer-events-none"
            title="Instagram"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span className="text-xs font-bold">Instagram</span>
          </button>
        </div>
      </div>
    </div>
  );
};
