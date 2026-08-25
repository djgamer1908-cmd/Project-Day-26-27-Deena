import { useEffect, useState } from 'react';
import { Loader2, Inbox, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CivicIssue, IssueCategory, IssueStatus } from '@/lib/types';
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import IssueCard from './IssueCard';

interface IssueFeedProps {
  onSelect: (issue: CivicIssue) => void;
  refreshKey: number;
}

export default function IssueFeed({ onSelect, refreshKey }: IssueFeedProps) {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<IssueCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase.from('civic_issues').select('*').order('priority_score', { ascending: false }).order('created_at', { ascending: false });
      if (filterCat !== 'all') query = query.eq('category', filterCat);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (search.trim()) query = query.ilike('description', `%${search.trim()}%`);
      const { data, error } = await query.limit(100);
      if (!cancelled && !error) setIssues(data as CivicIssue[]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey, filterCat, filterStatus, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchIssues')}
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as IssueCategory | 'all')}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none bg-white"
        >
          <option value="all">{t('allCategories')}</option>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as IssueStatus | 'all')}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none bg-white"
        >
          <option value="all">{t('allStatuses')}</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <Inbox size={40} />
          <p className="text-sm">{t('noIssuesFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => onSelect(issue)} />
          ))}
        </div>
      )}
    </div>
  );
}
