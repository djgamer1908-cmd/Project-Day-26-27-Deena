import { useState } from 'react';
import { X, MapPin, Clock, AlertTriangle, Copy, User, Phone, Sparkles, Loader2, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CivicIssue, IssueStatus } from '@/lib/types';
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import * as Icons from 'lucide-react';

interface IssueDetailProps {
  issue: CivicIssue;
  onClose: () => void;
  onUpdated: () => void;
}

export default function IssueDetail({ issue, onClose, onUpdated }: IssueDetailProps) {
  const { t } = useLanguage();
  const { isApprovedAuthority } = useAuth();
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [saving, setSaving] = useState(false);
  const catMeta = CATEGORY_META[issue.category];
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[catMeta.icon] || Icons.AlertCircle;

  const updateStatus = async (newStatus: IssueStatus) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      const { error } = await supabase.from('civic_issues').update({ status: newStatus }).eq('id', issue.id);
      if (error) throw error;
      onUpdated();
    } catch {
      setStatus(issue.status);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: IssueStatus): string => {
    const map: Record<IssueStatus, string> = {
      submitted: t('statusSubmitted'),
      classified: t('statusClassified'),
      acknowledged: t('statusAcknowledged'),
      in_progress: t('statusInProgress'),
      resolved: t('statusResolved'),
      rejected: t('statusRejected'),
    };
    return map[s];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {issue.photo_url ? (
            <img src={issue.photo_url} alt={issue.title || 'Issue'} className="w-full h-56 object-cover" />
          ) : (
            <div className={`w-full h-32 ${catMeta.bg} flex items-center justify-center`}>
              <Icon size={48} className={catMeta.text} />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{issue.title || 'Untitled Issue'}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${catMeta.bg} ${catMeta.text}`}>
                <Icon size={12} /> {catMeta.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_META[issue.status].color}`}>
                {statusLabel(issue.status)}
              </span>
              {issue.duplicate_of && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <Copy size={12} /> Dup
                </span>
              )}
            </div>
          </div>

          {issue.ai_summary && (
            <div className="flex items-start gap-2 bg-indigo-50 rounded-xl p-3 text-sm text-slate-600">
              <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <p>{issue.ai_summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">{t('description')}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{issue.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <AlertTriangle size={14} className="text-rose-500" />
              <span>{t('severity')}: <strong>{issue.severity}/5</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={14} className="text-slate-400" />
              <span>{new Date(issue.created_at).toLocaleString()}</span>
            </div>
            {issue.latitude && issue.longitude && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                <span>{issue.latitude.toFixed(4)}, {issue.longitude!.toFixed(4)}</span>
              </div>
            )}
            {issue.address && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                <span>{issue.address}</span>
              </div>
            )}
            {issue.reporter_name && (
              <div className="flex items-center gap-2 text-slate-600">
                <User size={14} className="text-slate-400" />
                <span>{issue.reporter_name}</span>
              </div>
            )}
            {issue.reporter_contact && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span>{issue.reporter_contact}</span>
              </div>
            )}
          </div>

          {/* Status management — authority only */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              {t('updateStatus')}
              {!isApprovedAuthority && <Lock size={12} className="text-slate-400" />}
            </h3>
            {isApprovedAuthority ? (
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={saving || status === s}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      status === s
                        ? STATUS_META[s].color + ' ring-2 ring-offset-1 ring-slate-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {saving && status === s && <Loader2 size={12} className="animate-spin inline mr-1" />}
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Only approved authorities can update the status of this report.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
