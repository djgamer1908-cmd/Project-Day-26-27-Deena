export type IssueCategory = 'road' | 'garbage' | 'streetlight' | 'water' | 'drain' | 'other';
export type IssueStatus = 'submitted' | 'classified' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected';

export interface CivicIssue {
  id: string;
  title: string | null;
  description: string;
  photo_url: string | null;
  category: IssueCategory;
  severity: number;
  priority_score: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: IssueStatus;
  duplicate_of: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  category: IssueCategory;
  severity: number;
  summary: string;
  title: string;
  duplicate_of: string | null;
  duplicate_similarity: number;
}

export interface CampaignApplication {
  id: string;
  applicant_name: string;
  applicant_contact: string;
  applicant_email: string;
  organization_name: string;
  organization_contact: string;
  organization_email: string;
  organization_address: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const CATEGORY_META: Record<IssueCategory, { label: string; icon: string; color: string; bg: string; text: string }> = {
  road: { label: 'Road', icon: 'Road', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  garbage: { label: 'Garbage', icon: 'Trash2', color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  streetlight: { label: 'Streetlight', icon: 'Lightbulb', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  water: { label: 'Water', icon: 'Droplets', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  drain: { label: 'Drain', icon: 'Waves', color: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  other: { label: 'Other', icon: 'AlertCircle', color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const STATUS_META: Record<IssueStatus, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  classified: { label: 'Classified', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const STATUS_ORDER: IssueStatus[] = ['submitted', 'classified', 'acknowledged', 'in_progress', 'resolved', 'rejected'];
