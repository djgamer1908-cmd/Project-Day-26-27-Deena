import { MapPin, Clock, AlertTriangle, Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CivicIssue } from '@/lib/types';
import { CATEGORY_META, STATUS_META } from '@/lib/types';
import * as Icons from 'lucide-react';

interface IssueCardProps {
  issue: CivicIssue;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function IssueCard({ issue, onClick }: IssueCardProps) {
  const catMeta = CATEGORY_META[issue.category];
  const statusMeta = STATUS_META[issue.status];
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[catMeta.icon] || Icons.AlertCircle;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 group"
    >
      {issue.photo_url ? (
        <div className="relative h-40 overflow-hidden">
          <img src={issue.photo_url} alt={issue.title || 'Issue'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-2 left-2 flex gap-2">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${catMeta.bg} ${catMeta.text} backdrop-blur-sm`}>
              <Icon size={12} /> {catMeta.label}
            </span>
          </div>
        </div>
      ) : (
        <div className={`h-24 ${catMeta.bg} flex items-center justify-center`}>
          <Icon size={32} className={catMeta.text} />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{issue.title || issue.ai_summary || 'Untitled issue'}</h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${statusMeta.color}`}>{statusMeta.label}</span>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{issue.description}</p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(issue.created_at)}</span>
            {issue.address && <span className="flex items-center gap-1"><MapPin size={12} /> {issue.address}</span>}
          </div>
          <div className="flex items-center gap-2">
            {issue.duplicate_of && (
              <span className="flex items-center gap-1 text-amber-600 text-xs font-medium" title="Flagged as duplicate">
                <Copy size={12} /> Dup
              </span>
            )}
            <div className="flex gap-0.5" title={`Severity ${issue.severity}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`w-2.5 h-2.5 rounded-sm ${n <= issue.severity ? 'bg-rose-500' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
