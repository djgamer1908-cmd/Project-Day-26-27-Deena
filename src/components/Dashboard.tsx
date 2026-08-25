import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Clock, Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CivicIssue, IssueCategory } from '@/lib/types';
import { CATEGORY_META, STATUS_META } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import * as Icons from 'lucide-react';

interface DashboardProps {
  onSelect: (issue: CivicIssue) => void;
  refreshKey: number;
}

interface Stats {
  total: number;
  byCategory: Record<IssueCategory, number>;
  byStatus: Record<string, number>;
  duplicates: number;
  resolved: number;
  highPriority: number;
}

export default function Dashboard({ onSelect, refreshKey }: DashboardProps) {
  const { t } = useLanguage();
  const [topIssues, setTopIssues] = useState<CivicIssue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: all } = await supabase.from('civic_issues').select('*').order('priority_score', { ascending: false });
      if (cancelled || !all) return;
      const issues = all as CivicIssue[];

      const byCategory = {} as Record<IssueCategory, number>;
      const byStatus: Record<string, number> = {};
      let duplicates = 0, resolved = 0, highPriority = 0;
      for (const iss of issues) {
        byCategory[iss.category] = (byCategory[iss.category] || 0) + 1;
        byStatus[iss.status] = (byStatus[iss.status] || 0) + 1;
        if (iss.duplicate_of) duplicates++;
        if (iss.status === 'resolved') resolved++;
        if (iss.priority_score >= 80) highPriority++;
      }
      setStats({ total: issues.length, byCategory, byStatus, duplicates, resolved, highPriority });
      setTopIssues(issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected').slice(0, 8));
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  const statCards = [
    { label: t('totalReports'), value: stats.total, icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: t('highPriority'), value: stats.highPriority, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: t('resolved'), value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: t('duplicates'), value: stats.duplicates, icon: Copy, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{t('byCategory')}</h3>
          <div className="space-y-3">
            {(Object.entries(CATEGORY_META) as [IssueCategory, typeof CATEGORY_META[IssueCategory]][]).map(([key, meta]) => {
              const count = stats.byCategory[key] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const Icon = (Icons as unknown as Record<string, LucideIcon>)[meta.icon] || Icons.AlertCircle;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-slate-600"><Icon size={14} className={meta.text} /> {meta.label}</span>
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${meta.bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{t('byStatus')}</h3>
          <div className="space-y-2">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const count = stats.byStatus[key] || 0;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color}`}>{meta.label}</span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock size={16} /> {t('priorityQueue')}</h3>
          {topIssues.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t('noOpenIssues')}</p>
          ) : (
            <div className="space-y-2">
              {topIssues.map((issue, idx) => (
                <button key={issue.id} onClick={() => onSelect(issue)} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                  <span className="text-sm text-slate-600 truncate flex-1">{issue.title || issue.ai_summary || 'Untitled'}</span>
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`w-2 h-2 rounded-sm ${n <= issue.severity ? 'bg-rose-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
