-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_members_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT chat_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type = ANY (ARRAY['direct'::text, 'group'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  expert_id uuid NOT NULL,
  engagement_model USER-DEFINED NOT NULL,
  payment_terms jsonb NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::contract_status_enum,
  nda_signed_at timestamp without time zone,
  nda_signature_name text,
  nda_ip_address text,
  start_date date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  total_amount numeric DEFAULT 0,
  escrow_balance numeric DEFAULT 0,
  escrow_funded_total numeric DEFAULT 0,
  released_total numeric DEFAULT 0,
  nda_custom_content text,
  nda_status text DEFAULT 'draft'::text CHECK (nda_status = ANY (ARRAY['draft'::text, 'sent'::text, 'signed'::text])),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT contracts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.day_work_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  expert_id uuid NOT NULL,
  work_date date NOT NULL,
  total_hours numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewer_comment text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT day_work_summaries_pkey PRIMARY KEY (id),
  CONSTRAINT dws_contract_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);
CREATE TABLE public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  raised_by uuid NOT NULL,
  raised_by_type text NOT NULL CHECK (raised_by_type = ANY (ARRAY['buyer'::text, 'expert'::text])),
  reason text NOT NULL,
  description text,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_review'::text, 'resolved'::text, 'closed'::text])),
  evidence jsonb DEFAULT '{}'::jsonb,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);
CREATE TABLE public.expert_capability_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL UNIQUE,
  total_score integer CHECK (total_score >= 0 AND total_score <= 100),
  base_score integer CHECK (base_score >= 0 AND base_score <= 60),
  verification_score integer CHECK (verification_score >= 0 AND verification_score <= 20),
  projects_score integer CHECK (projects_score >= 0 AND projects_score <= 20),
  llm_adjustment integer CHECK (llm_adjustment >= '-10'::integer AND llm_adjustment <= 10),
  experience_level character varying CHECK (experience_level::text = ANY (ARRAY['junior'::character varying, 'mid'::character varying, 'senior'::character varying, 'expert'::character varying]::text[])),
  confidence character varying CHECK (confidence::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying]::text[])),
  verified_skills ARRAY,
  claimed_skills ARRAY,
  missing_proof ARRAY,
  red_flags ARRAY,
  ai_reasoning text,
  documents_analyzed jsonb,
  projects_analyzed jsonb,
  admin_reviewed boolean DEFAULT false,
  admin_notes text,
  admin_adjusted_level character varying,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  scored_at timestamp without time zone DEFAULT now(),
  scoring_version character varying DEFAULT 'v1.0'::character varying,
  CONSTRAINT expert_capability_scores_pkey PRIMARY KEY (id),
  CONSTRAINT expert_capability_scores_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.experts(id)
);
CREATE TABLE public.expert_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type = ANY (ARRAY['resume'::text, 'work'::text, 'publication'::text, 'credential'::text, 'other'::text])),
  title text,
  url text NOT NULL,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  sub_type text,
  CONSTRAINT expert_documents_pkey PRIMARY KEY (id),
  CONSTRAINT expert_documents_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.experts(id)
);
CREATE TABLE public.experts (
  id uuid NOT NULL,
  domains ARRAY NOT NULL,
  experience_summary text NOT NULL,
  total_hours integer DEFAULT 0,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  skills ARRAY DEFAULT '{}'::text[],
  expertise_areas ARRAY DEFAULT '{}'::text[],
  embedding_text text,
  embedding_updated_at timestamp with time zone,
  embedding USER-DEFINED,
  is_profile_complete boolean DEFAULT false,
  expert_status text NOT NULL DEFAULT 'incomplete'::text CHECK (expert_status = ANY (ARRAY['incomplete'::text, 'pending_review'::text, 'rookie'::text, 'verified'::text, 'rejected'::text])),
  admin_notes text,
  profile_reviewed_at timestamp with time zone,
  profile_updated_at timestamp with time zone DEFAULT now(),
  preferred_engagement_mode text NOT NULL DEFAULT 'daily'::text CHECK (preferred_engagement_mode = ANY (ARRAY['daily'::text, 'fixed'::text, 'sprint'::text])),
  avg_daily_rate numeric DEFAULT 0,
  avg_fixed_rate numeric DEFAULT 0,
  avg_sprint_rate numeric DEFAULT 0,
  languages ARRAY DEFAULT '{}'::text[],
  portfolio_url text,
  years_experience integer DEFAULT 0,
  response_time_hours integer DEFAULT 24,
  availability_status text DEFAULT 'open'::text CHECK (availability_status = ANY (ARRAY['open'::text, 'limited'::text, 'booked'::text])),
  timezone text,
  profile_video_url text,
  CONSTRAINT experts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  expert_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  amount numeric NOT NULL,
  total_hours numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])),
  week_start_date date,
  week_end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invoice_type text DEFAULT 'periodic'::text CHECK (invoice_type = ANY (ARRAY['periodic'::text, 'sprint'::text, 'final_fixed'::text])),
  source_type text,
  source_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_expert_id_fk FOREIGN KEY (expert_id) REFERENCES public.experts(id)
);
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.phone_otps (
  id bigint NOT NULL DEFAULT nextval('phone_otps_id_seq'::regclass),
  phone character varying NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT phone_otps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  first_name character varying,
  last_name character varying,
  role character varying DEFAULT 'user'::character varying CHECK (role::text = ANY (ARRAY['buyer'::text, 'expert'::text, 'admin'::text])),
  email_verified boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  last_login timestamp without time zone,
  last_logout timestamp without time zone,
  avatar_url text,
  is_banned boolean DEFAULT false,
  ban_reason text,
  phone character varying,
  phone_verified boolean DEFAULT false,
  banner_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  buyer_id uuid NOT NULL,
  expert_id uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  budget_min numeric,
  budget_max numeric,
  deadline date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  domain text,
  trl_level text,
  risk_categories ARRAY,
  expected_outcome text,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.experts(id)
);
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  expert_id uuid NOT NULL,
  quote_amount numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  duration_days integer,
  engagement_model USER-DEFINED NOT NULL,
  rate numeric NOT NULL,
  sprint_count integer,
  CONSTRAINT proposals_pkey PRIMARY KEY (id),
  CONSTRAINT proposals_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['harassment'::text, 'spam'::text, 'scam'::text, 'other'::text])),
  description text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])),
  resolution_note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT reports_reported_fk FOREIGN KEY (reported_id) REFERENCES auth.users(id)
);
CREATE TABLE public.work_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  checklist jsonb,
  problems_faced text,
  sprint_number integer,
  evidence jsonb,
  created_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'submitted'::text,
  log_date date,
  description text,
  value_tags jsonb DEFAULT '{}'::jsonb,
  buyer_comment text,
  CONSTRAINT work_logs_pkey PRIMARY KEY (id),
  CONSTRAINT work_logs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);