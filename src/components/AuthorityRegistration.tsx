import { useState, type ReactNode } from 'react';
import { Loader2, AlertTriangle, User, Phone, ShieldCheck, Clock, Mail, MapPin, Calendar, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

interface AuthorityForm {
  name: string;
  age: string;
  gender: string;
  contact: string;
  second_contact: string;
  email: string;
  organization_email: string;
  organization_address: string;
}

const emptyForm: AuthorityForm = { name: '', age: '', gender: '', contact: '', second_contact: '', email: '', organization_email: '', organization_address: '' };

export default function AuthorityRegistration() {
  const { t } = useLanguage();
  const { user, authorityProfile, refreshAuthorityProfile } = useAuth();
  const [form, setForm] = useState<AuthorityForm>({ ...emptyForm, email: user?.email || '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isExpired = authorityProfile?.status === 'approved' && Boolean(authorityProfile.approved_until) && new Date(authorityProfile.approved_until!).getTime() <= Date.now();

  if (authorityProfile && authorityProfile.status === 'pending') return <StatusCard icon={<Clock size={28} className="text-amber-600" />} title={t('pendingApproval')} message={t('awaitingApproval')} />;
  if (authorityProfile && authorityProfile.status === 'rejected') return <StatusCard icon={<AlertTriangle size={28} className="text-rose-600" />} title={t('authorityRejected')} message="Your application was denied. You may submit a new application with updated details." />;
  if (authorityProfile && authorityProfile.status === 'blocked') return <StatusCard icon={<AlertTriangle size={28} className="text-rose-600" />} title={t('authorityBlocked')} message="Please contact the administrator for assistance." />;
  if (authorityProfile && authorityProfile.status === 'approved' && !isExpired) return <StatusCard icon={<ShieldCheck size={28} className="text-emerald-600" />} title="Authority access approved" message={`Your access is valid until ${new Date(authorityProfile.approved_until!).toLocaleDateString()}.`} />;

  const update = (key: keyof AuthorityForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const validate = () => {
    const required: (keyof AuthorityForm)[] = ['name', 'age', 'gender', 'contact', 'second_contact', 'email', 'organization_email', 'organization_address'];
    if (required.some((key) => !form[key].trim())) return 'Please complete every field before submitting.';
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 18 || age > 100) return 'Please enter a valid age between 18 and 100.';
    if (!form.email.includes('@') || !form.organization_email.includes('@')) return 'Please enter valid email addresses.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    setError(null);
    const values = { ...form, age: Number(form.age), email: form.email.trim().toLowerCase(), organization_email: form.organization_email.trim().toLowerCase() };
    const result = authorityProfile && isExpired
      ? await supabase.rpc('resubmit_expired_authority', { p_profile_id: authorityProfile.id, p_name: values.name.trim(), p_age: values.age, p_gender: values.gender.trim(), p_contact: values.contact.trim(), p_second_contact: values.second_contact.trim(), p_email: values.email, p_organization_email: values.organization_email, p_organization_address: values.organization_address.trim() })
      : await supabase.from('authority_profiles').insert({ ...values, user_id: user?.id || null, status: 'pending' });
    setSubmitting(false);
    if (result.error) { setError('We could not submit the application. Please try again.'); return; }
    await refreshAuthorityProfile();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck size={20} /> Authority application</h2>
        <p className="text-emerald-100 text-sm mt-1">{isExpired ? 'Your two-year authorization has expired. Submit a new application.' : 'Complete your details for master administrator review.'}</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name" icon={<User size={16} />} value={form.name} onChange={(value) => update('name', value)} />
          <Field label="Age" icon={<Calendar size={16} />} type="number" value={form.age} onChange={(value) => update('age', value)} />
          <label className="block text-sm font-semibold text-slate-700">Gender<select value={form.gender} onChange={(event) => update('gender', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-normal focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"><option value="">Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
          <Field label="Primary contact" icon={<Phone size={16} />} value={form.contact} onChange={(value) => update('contact', value)} />
          <Field label="Second contact" icon={<Phone size={16} />} value={form.second_contact} onChange={(value) => update('second_contact', value)} />
          <Field label="Personal email" icon={<Mail size={16} />} type="email" value={form.email} onChange={(value) => update('email', value)} />
          <Field label="Organization email" icon={<Mail size={16} />} type="email" value={form.organization_email} onChange={(value) => update('organization_email', value)} />
          <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Organization address<div className="relative mt-1.5"><MapPin size={16} className="absolute left-3 top-3 text-slate-400" /><textarea value={form.organization_address} onChange={(event) => update('organization_address', event.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm font-normal focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none resize-none" /></div></label>
        </div>
        {error && <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2"><AlertTriangle size={16} /> {error}</div>}
        <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
          {submitting ? 'Submitting...' : 'Submit application for authorisation'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, icon, type = 'text', value, onChange }: { label: string; icon: ReactNode; type?: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm font-normal focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none" /></div></label>;
}

function StatusCard({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto"><div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">{icon}</div><h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3><p className="text-sm text-slate-500">{message}</p></div>;
}
