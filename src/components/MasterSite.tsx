import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Ban, UserCheck, Megaphone, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth, type AuthorityProfile } from '@/lib/AuthContext';
import type { CampaignApplication } from '@/lib/types';

interface MasterSiteProps {
  onNavigate: (site: 'citizen' | 'authority' | 'master') => void;
}

type Tab = 'overview' | 'approvals' | 'authorities' | 'campaigns';

export default function MasterSite({ onNavigate: _onNavigate }: MasterSiteProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<AuthorityProfile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: campaignData }] = await Promise.all([
      supabase.rpc('get_all_authority_profiles'),
      supabase.from('campaign_applications').select('*').order('created_at', { ascending: false }),
    ]);
    setProfiles((profileData as AuthorityProfile[]) || []);
    setCampaigns((campaignData as CampaignApplication[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateAuthorityStatus = async (profileId: string, status: string) => {
    setActing(profileId);
    if (status === 'approved' || status === 'rejected') {
      await supabase.functions.invoke('manage-authority-application', { body: { action: status === 'approved' ? 'approve' : 'deny', profileId } });
    } else {
      await supabase.rpc('update_authority_status', { p_profile_id: profileId, p_status: status });
    }
    setActing(null);
    load();
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    setActing(campaignId);
    await supabase.rpc('update_campaign_status', { p_campaign_id: campaignId, p_status: status });
    setActing(null);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  const pendingProfiles = profiles.filter((p) => p.status === 'pending');
  const approvedProfiles = profiles.filter((p) => p.status === 'approved');
  const blockedProfiles = profiles.filter((p) => p.status === 'blocked');
  const pendingCampaigns = campaigns.filter((c) => c.status === 'pending');

  const tabs: { id: Tab; label: string; icon: typeof CheckCircle2; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'approvals', label: t('approvalSubmissions'), icon: UserCheck, badge: pendingProfiles.length },
    { id: 'authorities', label: t('authoritiesList'), icon: CheckCircle2 },
    { id: 'campaigns', label: t('campaignApplications'), icon: Megaphone, badge: pendingCampaigns.length },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl px-6 py-5">
        <h2 className="text-xl font-bold text-white">{t('masterSite')}</h2>
        <p className="text-slate-300 text-sm mt-1">Full system control — approve authorities, manage access, and review campaigns.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === tb.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <tb.icon size={15} /> {tb.label}
            {tb.badge ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-xs">{tb.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Authorities', value: profiles.length, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Pending Approvals', value: pendingProfiles.length, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Approved', value: approvedProfiles.length, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Blocked', value: blockedProfiles.length, color: 'text-rose-600', bg: 'bg-rose-100' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <Building2 size={20} className={c.color} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="text-sm text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'approvals' && (
        <div className="space-y-3">
          {pendingProfiles.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No pending approval requests.</p>
          ) : (
            pendingProfiles.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Name</p><p className="font-semibold text-slate-800">{p.name}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Age / Gender</p><p className="text-sm text-slate-700">{p.age ?? '—'} / {p.gender || '—'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Personal email</p><p className="text-sm text-slate-700 flex items-center gap-1"><Mail size={13} /> {p.email}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Contacts</p><p className="text-sm text-slate-700 flex items-center gap-1"><Phone size={13} /> {p.contact} / {p.second_contact || '—'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Organization email</p><p className="text-sm text-slate-700 flex items-center gap-1"><Mail size={13} /> {p.organization_email || '—'}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-400">Organization address</p><p className="text-sm text-slate-700 flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0" /> {p.organization_address || '—'}</p></div>
                </div>
                <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                  <button onClick={() => updateAuthorityStatus(p.id, 'approved')} disabled={acting === p.id} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                    {acting === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Authorised
                  </button>
                  <button onClick={() => updateAuthorityStatus(p.id, 'rejected')} disabled={acting === p.id} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50">
                    <XCircle size={14} /> Denied
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'authorities' && (
        <div className="space-y-3">
          {profiles.filter((p) => p.status === 'approved' || p.status === 'blocked').length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No authorities registered.</p>
          ) : (
            profiles.filter((p) => p.status === 'approved' || p.status === 'blocked').map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    {p.status === 'blocked' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">Blocked</span>}
                  </div>
                  <p className="text-sm text-slate-500">{p.email}</p>
                  <p className="text-sm text-slate-500">{p.contact}</p>
                </div>
                {p.status === 'approved' ? (
                  <button onClick={() => updateAuthorityStatus(p.id, 'blocked')} disabled={acting === p.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-sm font-medium hover:bg-rose-200 transition disabled:opacity-50">
                    {acting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} {t('block')}
                  </button>
                ) : (
                  <button onClick={() => updateAuthorityStatus(p.id, 'approved')} disabled={acting === p.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200 transition disabled:opacity-50">
                    {acting === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t('unblock')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No campaign applications.</p>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-slate-800">{c.organization_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><UserCheck size={12} /> {c.applicant_name}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {c.applicant_email}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {c.applicant_contact}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {c.organization_name}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {c.organization_email}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {c.organization_contact}</span>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12} /> {c.organization_address}</p>
                    {c.status !== 'pending' && <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{c.status}</span>}
                  </div>
                  {c.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => updateCampaignStatus(c.id, 'approved')} disabled={acting === c.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                        {acting === c.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t('accept')}
                      </button>
                      <button onClick={() => updateCampaignStatus(c.id, 'rejected')} disabled={acting === c.id} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50">
                        <XCircle size={14} /> {t('reject')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
