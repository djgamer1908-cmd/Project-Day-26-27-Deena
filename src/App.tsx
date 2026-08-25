import { useState, useEffect } from 'react';
import { Map, LayoutDashboard, ListChecks, Plus, ShieldCheck, Sparkles, Megaphone, ArrowLeft, Users, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CivicIssue } from '@/lib/types';
import { useAuth, type Site } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import ReportForm from '@/components/ReportForm';
import IssueFeed from '@/components/IssueFeed';
import IssueDetail from '@/components/IssueDetail';
import Dashboard from '@/components/Dashboard';
import MapView from '@/components/MapView';
import CampaignForm from '@/components/CampaignForm';
import Landing from '@/components/Landing';
import AuthModal from '@/components/AuthModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Footer from '@/components/Footer';
import AuthorityRegistration from '@/components/AuthorityRegistration';
import MasterSite from '@/components/MasterSite';

type CitizenTab = 'report' | 'feed' | 'dashboard' | 'map' | 'campaigns';

function App() {
  const { t } = useLanguage();
  const { user, loading, isMaster, isApprovedAuthority, authorityProfile, site, setSite, signOut } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showAuth, setShowAuth] = useState(false);
  const [citizenTab, setCitizenTab] = useState<CitizenTab>('report');
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allIssues, setAllIssues] = useState<CivicIssue[]>([]);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (citizenTab === 'map' || site === 'authority' || site === 'master') {
      supabase.from('civic_issues').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        if (data) setAllIssues(data as CivicIssue[]);
      });
    }
  }, [citizenTab, site, refreshKey]);

  const navigate = (target: Site) => {
    if (target === 'master' && !user) {
      setAuthMode('signin');
      setShowAuth(true);
      return;
    }
    setSite(target);
    setShowLanding(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><ShieldCheck className="animate-pulse text-slate-400" size={32} /></div>;
  }

  if (showLanding) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 text-lg leading-tight">{t('appName')}</h1>
                <p className="text-xs text-slate-500 leading-tight">{t('tagline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <button onClick={signOut} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition">{t('logout')}</button>
              ) : (
                <button onClick={() => { setAuthMode('signin'); setShowAuth(true); }} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition">{t('login')}</button>
              )}
              <button onClick={() => navigate('master')} title="Master portal" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition" aria-label="Master portal"><ShieldCheck size={18} /></button>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <Landing onNavigate={navigate} onAuth={() => { setAuthMode('signin'); setShowAuth(true); }} />
        <Footer />
        {showAuth && <AuthModal mode={authMode} onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  // Master site
  if (site === 'master') {
    if (!isMaster) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md">
            <ShieldCheck size={40} className="text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">{t('accessDenied')}</h2>
            <p className="text-sm text-slate-500 mb-4">{t('masterOnly')}</p>
            <button onClick={() => setShowLanding(true)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition">{t('selectPortal')}</button>
          </div>
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader site="master" onBack={() => setShowLanding(true)} onSignOut={signOut} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <MasterSite onNavigate={navigate} />
        </main>
        <Footer />
        {selectedIssue && <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdated={refresh} />}
      </div>
    );
  }

  // Authority site
  if (site === 'authority') {
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-50">
          <SiteHeader site="authority" onBack={() => setShowLanding(true)} onSignOut={() => setShowLanding(true)} />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"><AuthorityRegistration /></main>
          <Footer />
        </div>
      );
    }

    // If master user logs in via authority, show master link
    if (isMaster && !authorityProfile) {
      return (
        <div className="min-h-screen bg-slate-50">
          <SiteHeader site="authority" onBack={() => setShowLanding(true)} onSignOut={signOut} extraButton={isMaster ? { label: t('masterSite'), onClick: () => setSite('master') } : undefined} />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <AuthorityDashboard issues={allIssues} onSelect={setSelectedIssue} refreshKey={refreshKey} />
          </main>
          <Footer />
          {selectedIssue && <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdated={refresh} />}
        </div>
      );
    }

    // Not registered yet
    if (!authorityProfile) {
      return (
        <div className="min-h-screen bg-slate-50">
          <SiteHeader site="authority" onBack={() => setShowLanding(true)} onSignOut={signOut} />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <AuthorityRegistration />
          </main>
          <Footer />
        </div>
      );
    }

    // Pending / rejected / blocked
    if (!isApprovedAuthority) {
      return (
        <div className="min-h-screen bg-slate-50">
          <SiteHeader site="authority" onBack={() => setShowLanding(true)} onSignOut={signOut} />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <AuthorityRegistration />
          </main>
          <Footer />
        </div>
      );
    }

    // Approved authority
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader site="authority" onBack={() => setShowLanding(true)} onSignOut={signOut} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <AuthorityDashboard issues={allIssues} onSelect={setSelectedIssue} refreshKey={refreshKey} />
        </main>
        <Footer />
        {selectedIssue && <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdated={refresh} />}
      </div>
    );
  }

  // Citizen site (default)
  const tabs: { id: CitizenTab; label: string; icon: typeof Map }[] = [
    { id: 'report', label: t('reportIssue'), icon: Plus },
    { id: 'feed', label: t('issues'), icon: ListChecks },
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'map', label: t('map'), icon: Map },
    { id: 'campaigns', label: t('campaigns'), icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader site="citizen" onBack={() => setShowLanding(true)} onSignOut={signOut} />
      {citizenTab === 'report' && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm text-slate-200 mb-4">
                <Sparkles size={14} /> {t('tagline')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">{t('heroTitle')}</h2>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{t('heroSubtitle')}</p>
            </div>
          </div>
        </div>
      )}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setCitizenTab(tb.id)} className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${citizenTab === tb.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tb.icon size={15} /> {tb.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {citizenTab === 'report' && <div className="max-w-2xl mx-auto"><ReportForm onSubmitted={() => { refresh(); setCitizenTab('feed'); }} /></div>}
        {citizenTab === 'feed' && <IssueFeed onSelect={setSelectedIssue} refreshKey={refreshKey} />}
        {citizenTab === 'dashboard' && <Dashboard onSelect={setSelectedIssue} refreshKey={refreshKey} />}
        {citizenTab === 'map' && <MapView issues={allIssues} onSelect={setSelectedIssue} />}
        {citizenTab === 'campaigns' && <div className="max-w-2xl mx-auto"><CampaignForm /></div>}
      </main>
      <Footer />
      {selectedIssue && <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdated={refresh} />}
      {showAuth && <AuthModal mode={authMode} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function SiteHeader({ site, onBack, onSignOut, extraButton }: { site: Site; onBack: () => void; onSignOut: () => void; extraButton?: { label: string; onClick: () => void } }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const siteMeta = {
    citizen: { label: t('citizenPortal'), icon: Users, color: 'from-blue-500 to-blue-600' },
    authority: { label: t('authorityPortal'), icon: Building2, color: 'from-emerald-500 to-emerald-600' },
    master: { label: t('masterPortal'), icon: ShieldCheck, color: 'from-slate-700 to-slate-800' },
  };
  const meta = siteMeta[site];
  const Icon = meta.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"><ArrowLeft size={18} /></button>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">{t('appName')}</h1>
            <p className="text-xs text-slate-500 leading-tight">{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {extraButton && <button onClick={extraButton.onClick} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition">{extraButton.label}</button>}
          {user && <span className="text-xs text-slate-400 hidden sm:block">{user.email}</span>}
          {user && <button onClick={onSignOut} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition">{t('logout')}</button>}
        </div>
      </div>
    </header>
  );
}

function AuthorityDashboard({ issues, onSelect, refreshKey }: { issues: CivicIssue[]; onSelect: (i: CivicIssue) => void; refreshKey: number }) {
  return <Dashboard onSelect={onSelect} refreshKey={refreshKey} />;
}

export default App;
