import { useState } from 'react';
import { X, Mail, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

interface AuthModalProps {
  onClose: () => void;
  mode?: 'signin' | 'signup';
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useLanguage();
  const { sendLoginLink } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await sendLoginLink(email.trim());
    setLoading(false);
    if (result.error) setError('That email is not authorised for portal access.');
    else setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t('login')}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Login link sent</h3>
              <p className="text-sm text-slate-500">Check {email} for your secure login link.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-500">Use the email address authorised for the authority or master portal. Citizens can report issues without logging in.</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('email')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none" />
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2"><AlertCircle size={16} /> {error}</div>}
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Send Secure Login Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
