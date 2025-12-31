export type UserRole = 'buyer' | 'expert' | 'admin';

export type VettingStatus = 'pending' | 'approved' | 'rejected' | 'info_requested' | 'verified';

export type ProjectStatus = 'draft' | 'open' | 'active' | 'completed' | 'archived';

export type ContractStatus = 'pending' | 'active' | 'declined' | 'paused' | 'completed' | 'disputed';

export type TRLLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Domain =
  | 'ai_ml'
  | 'robotics'
  | 'climate_tech'
  | 'biotech'
  | 'quantum'
  | 'space_tech'
  | 'advanced_materials'
  | 'energy'
  | 'infrastructure';

export type RiskCategory = 'technical' | 'regulatory' | 'scale' | 'market';

export type EngagementType = 'advisory' | 'architecture_review' | 'hands_on_execution';

export type ValueTag =
  | 'decision_made'
  | 'risk_avoided'
  | 'path_clarified'
  | 'knowledge_transferred'
  | 'problem_solved';

export type IPOwnership = 'buyer_owns' | 'shared' | 'expert_owns';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
  last_logout?: string | null;
}

export interface Profile extends User {
  avatar_url?: string;
  bio?: string;
  location?: string;
  rating?: number;
  vetting_status?: VettingStatus;
  hourly_rate_advisory?: number;
  total_hours?: number;
  review_count?: number;
  domains?: Domain[];
  company?: string;
  project_count?: number;
}

export interface Expert extends User {
  avatar_url?: string;
  bio: string;
  location: string;
  name: string;
  role: 'expert';
  domains: Domain[];
  experience_summary: string;
  hourly_rate_advisory: number;
  hourly_rate_architecture: number;
  hourly_rate_execution: number;
  availability: AvailabilitySlot[];
  vetting_status: VettingStatus;
  vetting_level?: 'general' | 'advanced' | 'deep_tech_verified';
  patents?: string[];
  papers?: string[];
  products?: string[];
  total_hours: number;
  rating: number;
  review_count: number;
}

export interface Buyer extends User {
  role: 'buyer';
  company?: string;
  project_count: number;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Project {
  id: string;
  buyer_id: string;
  expert_id?: string;
  title: string;
  domain: Domain;
  description: string;
  trl_level: TRLLevel;
  risk_categories: RiskCategory[];
  expected_outcome: string;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  buyer_name?: string; 
  buyer?: { first_name: string; last_name: string }; 
  proposal_count?: number;
}

export interface Proposal {
  id: string;
  project_id: string;
  expert_id: string;
  expert_name: string;
  expert_avatar?: string;
  quote_amount: number;
  duration_days: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Contract {
  id: string;
  project_id: string;
  buyer_id: string;
  expert_id: string;
  hourly_rate: number;
  weekly_hour_cap: number;
  start_date: string;
  end_date?: string;
  ip_ownership: IPOwnership;
  nda_signed: boolean;
  total_hours_logged: number;
  total_amount: number;
  escrow_balance: number;
  engagement_type: EngagementType;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  project?: { title: string }; 
  expert?: { first_name: string; last_name: string }; 
}

export interface HourLog {
  id: string;
  contract_id: string;
  expert_id: string;
  log_date: string;
  hours_worked: number;
  description: string;
  value_tags: {
    decision_made?: string;
    risk_avoided?: string;
    path_clarified?: string;
    knowledge_transferred?: string;
    problem_solved?: string;
  };
  status: 'submitted' | 'approved' | 'rejected' | 'pending';
  rejection_reason?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments: any[];
  created_at: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Invoice {
  id: string;
  contract_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  total_amount: number;
  status: 'pending' | 'paid';
  pdf_url?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  contract_id: string;
  raised_by: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  created_at: string;
}