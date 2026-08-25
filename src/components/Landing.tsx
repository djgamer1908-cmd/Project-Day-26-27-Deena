import { Users, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth, type Site } from '@/lib/AuthContext';

interface LandingProps {
  onNavigate: (site: Site) => void;
  onAuth: () => void;
}

export default function Landing({ onNavigate, onAuth }: LandingProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  const portals = [

    {
      site: 'citizen' as Site,
      icon: Users,
      title: t('citizenPortal'),
      desc: 'Report civic issues, track their status, apply for awareness campaigns, and view the map of all reported problems.',
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      site: 'authority' as Site,
      icon: Building2,
      title: t('authorityPortal'),
      desc: 'Review reported issues, update their status, manage priorities, and respond to citizen complaints efficiently.',
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm text-slate-200 mb-6">
              <Sparkles size={14} /> {t('tagline')}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">{t('appName')}</h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8">{t('heroSubtitle')}</p>
            <p className="text-slate-400 text-base mb-8">{t('selectPortal')}</p>
          </div>
        </div>
      </div>

      {/* Portal cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-12 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((p) => (
            <button
              key={p.site}
              onClick={() => onNavigate(p.site)}
              className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-300 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-4`}>
                <p.icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{p.desc}</p>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 group-hover:gap-2 transition-all">
                Enter <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>

        {/* Auth status */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-500">Signed in as <strong className="text-slate-700">{user.email}</strong></span>
              <button onClick={signOut} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition">{t('logout')}</button>
            </>
          ) : (
            <button onClick={onAuth} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition">{t('login')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
