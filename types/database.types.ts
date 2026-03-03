// AutoApply API - Database Types
// Generated from Supabase schema

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'free_trial';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | 'incomplete' | 'unpaid';
export type WindowType = 'minute' | 'hour' | 'day';
export type AlertType = 'quota_warning' | 'quota_exceeded' | 'rate_limit_exceeded' | 'payment_failed';

// ============================================================================
// CUSTOMER
// ============================================================================
export interface Customer {
  id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  
  // Subscription
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  
  // Usage
  monthly_quota: number;
  current_usage: number;
  quota_reset_date: string; // ISO timestamp
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  
  // Flags
  is_active: boolean;
  is_founding_customer: boolean;
  founding_customer_price: number | null;
  
  // Contact
  notification_email: string | null;
  webhook_url: string | null;
}

export interface CustomerInsert {
  id?: string;
  email: string;
  name?: string;
  company_name?: string;
  stripe_customer_id?: string;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  monthly_quota?: number;
  current_usage?: number;
  quota_reset_date?: string;
  is_active?: boolean;
  is_founding_customer?: boolean;
  founding_customer_price?: number;
  notification_email?: string;
  webhook_url?: string;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
}

export interface CustomerUpdate {
  name?: string;
  company_name?: string;
  subscription_tier?: SubscriptionTier;
  monthly_quota?: number;
  notification_email?: string;
  webhook_url?: string;
  is_active?: boolean;
}

// ============================================================================
// API KEY
// ============================================================================
export interface ApiKey {
  id: string;
  customer_id: string;
  
  // Key details
  key_prefix: string;
  key_hash: string;
  name: string | null;
  
  // Permissions & limits
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  allowed_endpoints: string[] | null;
  
  // Metadata
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  
  // Flags
  is_active: boolean;
  is_test_mode: boolean;
  
  // Usage
  total_requests: number;
  last_request_ip: string | null;
}

export interface ApiKeyInsert {
  customer_id: string;
  key_prefix: string;
  key_hash: string;
  name?: string;
  rate_limit_per_minute?: number;
  rate_limit_per_hour?: number;
  allowed_endpoints?: string[];
  is_test_mode?: boolean;
}

export interface ApiKeyUpdate {
  name?: string;
  is_active?: boolean;
  rate_limit_per_minute?: number;
  rate_limit_per_hour?: number;
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================
export interface Subscription {
  id: string;
  customer_id: string;
  
  // Stripe
  stripe_subscription_id: string;
  stripe_price_id: string;
  stripe_product_id: string | null;
  
  // Details
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  
  // Pricing
  amount: number;
  currency: string;
  
  // Dates
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Overages
  overage_enabled: boolean;
  overage_rate: number;
  overage_amount: number;
}

export interface SubscriptionInsert {
  customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  amount: number;
  current_period_start: string;
  current_period_end: string;
}

// ============================================================================
// API USAGE
// ============================================================================
export interface ApiUsage {
  id: string;
  customer_id: string;
  api_key_id: string;
  
  // Request
  endpoint: string;
  method: string;
  status_code: number;
  
  // Timing
  request_timestamp: string;
  response_time_ms: number | null;
  
  // Billing
  billable: boolean;
  cost: number;
  
  // Metadata
  ip_address: string | null;
  user_agent: string | null;
  request_size_bytes: number | null;
  response_size_bytes: number | null;
  
  // Errors
  error_code: string | null;
  error_message: string | null;
}

export interface ApiUsageInsert {
  customer_id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number;
  billable?: boolean;
  cost?: number;
  ip_address?: string;
  user_agent?: string;
  request_size_bytes?: number;
  response_size_bytes?: number;
  error_code?: string;
  error_message?: string;
}

// ============================================================================
// RATE LIMIT
// ============================================================================
export interface RateLimit {
  id: string;
  api_key_id: string;
  
  // Window
  window_start: string;
  window_type: WindowType;
  
  // Counts
  request_count: number;
  limit_exceeded_count: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface RateLimitInsert {
  api_key_id: string;
  window_start: string;
  window_type: WindowType;
  request_count?: number;
}

// ============================================================================
// USAGE ALERT
// ============================================================================
export interface UsageAlert {
  id: string;
  customer_id: string;
  
  // Alert
  alert_type: AlertType;
  threshold_percentage: number | null;
  
  // Status
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  
  // Details
  message: string | null;
  current_usage: number | null;
  quota_limit: number | null;
}

export interface UsageAlertInsert {
  customer_id: string;
  alert_type: AlertType;
  threshold_percentage?: number;
  message?: string;
  current_usage?: number;
  quota_limit?: number;
}

// ============================================================================
// AUDIT LOG
// ============================================================================
export interface AuditLog {
  id: string;
  customer_id: string | null;
  
  // Event
  event_type: string;
  event_data: Record<string, any> | null;
  
  // Actor
  actor_type: string | null;
  actor_id: string | null;
  
  // Metadata
  timestamp: string;
  ip_address: string | null;
}

export interface AuditLogInsert {
  customer_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  actor_type?: string;
  actor_id?: string;
  ip_address?: string;
}

// ============================================================================
// TIER CONFIG
// ============================================================================
export interface TierConfig {
  tier: SubscriptionTier;
  monthly_quota: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  monthly_price: number;
  overage_rate: number;
}

// ============================================================================
// VIEWS
// ============================================================================
export interface DailyUsageSummary {
  customer_id: string;
  usage_date: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  total_cost: number;
}

export interface CustomerUsageOverview {
  id: string;
  email: string;
  company_name: string | null;
  subscription_tier: SubscriptionTier;
  monthly_quota: number;
  current_usage: number;
  usage_percentage: number;
  quota_reset_date: string;
  active_api_keys: number;
  last_active_at: string | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Job Matching API
export interface JobMatchRequest {
  resume: string;
  job_description: string;
  job_title?: string;
}

export interface JobMatchResponse {
  match_score: number; // 0-100
  qualifications_met: string[];
  qualifications_missing: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'possible' | 'not_recommended';
  reasons: string[];
  estimated_fit: string;
}

// Application Generation API
export interface ApplicationGenerateRequest {
  resume: string;
  job_description: string;
  job_title: string;
  company_name?: string;
  tone?: 'professional' | 'enthusiastic' | 'concise';
  include_cover_letter?: boolean;
}

export interface ApplicationGenerateResponse {
  cover_letter?: string;
  tailored_resume_highlights: string[];
  key_talking_points: string[];
  application_summary: string;
  estimated_time_saved_minutes: number;
}

// API Error Response
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  request_id?: string;
}

// API Success Response Wrapper
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  request_id: string;
  timestamp: string;
  usage: {
    requests_used: number;
    requests_remaining: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      api_keys: {
        Row: ApiKey;
        Insert: ApiKeyInsert;
        Update: ApiKeyUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: Partial<Subscription>;
      };
      api_usage: {
        Row: ApiUsage;
        Insert: ApiUsageInsert;
        Update: never;
      };
      rate_limits: {
        Row: RateLimit;
        Insert: RateLimitInsert;
        Update: Partial<RateLimit>;
      };
      usage_alerts: {
        Row: UsageAlert;
        Insert: UsageAlertInsert;
        Update: Partial<UsageAlert>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: never;
      };
      tier_config: {
        Row: TierConfig;
        Insert: TierConfig;
        Update: Partial<TierConfig>;
      };
    };
    Views: {
      daily_usage_summary: {
        Row: DailyUsageSummary;
      };
      customer_usage_overview: {
        Row: CustomerUsageOverview;
      };
    };
    Functions: {
      reset_monthly_quotas: {
        Args: Record<string, never>;
        Returns: void;
      };
      increment_customer_usage: {
        Args: { p_customer_id: string; p_increment?: number };
        Returns: void;
      };
      check_quota: {
        Args: { p_customer_id: string };
        Returns: boolean;
      };
    };
  };
}
