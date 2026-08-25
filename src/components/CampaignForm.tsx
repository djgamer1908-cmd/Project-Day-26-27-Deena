import { useState } from 'react';
import { Megaphone, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';

export default function CampaignForm() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    applicant_name: '',
    applicant_contact: '',
    applicant_email: '',
    organization_name: '',
    organization_contact: '',
    organization_email: '',
    organization_address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    for (const [key, val] of Object.entries(form)) {
      if (!val.trim()) {
        setError('Please fill in all fields.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from('campaign_applications').insert(form);
      if (insErr) throw new Error('Failed to submit application');
      setSuccess(true);
      setForm({ applicant_name: '', applicant_contact: '', applicant_email: '', organization_name: '', organization_contact: '', organization_email: '', organization_address: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Application Submitted!</h3>
        <p className="text-sm text-slate-500 mb-4">Your campaign application has been received and is pending review.</p>
        <button onClick={() => setSuccess(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition">
          Submit Another
        </button>
      </div>
    );
  }

  const fields: { key: keyof typeof form; label: string; type?: string }[] = [
    { key: 'applicant_name', label: t('applicantName') },
    { key: 'applicant_contact', label: t('applicantContact') },
    { key: 'applicant_email', label: t('applicantEmail'), type: 'email' },
    { key: 'organization_name', label: t('organizationName') },
    { key: 'organization_contact', label: t('organizationContact') },
    { key: 'organization_email', label: t('organizationEmail'), type: 'email' },
    { key: 'organization_address', label: t('organizationAddress') },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone size={20} /> {t('applyCampaign')}</h2>
        <p className="text-slate-300 text-sm mt-1">Apply to host an awareness campaign in your community.</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.key === 'organization_address' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{f.label}</label>
              {f.key === 'organization_address' ? (
                <textarea
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none resize-none"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none"
                />
              )}
            </div>
          ))}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
          {submitting ? 'Submitting...' : t('submitApplication')}
        </button>
      </div>
    </div>
  );
}
