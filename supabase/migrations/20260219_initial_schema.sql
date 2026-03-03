-- AutoApply API Database Schema
-- Migration: Initial Schema Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOMERS TABLE
-- Stores customer account information
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    company_name TEXT,
    
    -- Subscription info
    stripe_customer_id TEXT UNIQUE,
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'free_trial')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
    
    -- Usage limits per tier
    monthly_quota INTEGER DEFAULT 500, -- API calls per month
    current_usage INTEGER DEFAULT 0,
    quota_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    is_founding_customer BOOLEAN DEFAULT false, -- Special pricing lock
    founding_customer_price DECIMAL(10,2), -- Locked-in price
    
    -- Contact preferences
    notification_email TEXT,
    webhook_url TEXT -- For usage alerts, etc.
);

-- Index for fast lookups
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;

-- ============================================================================
-- API KEYS TABLE
-- Stores generated API keys for authentication
-- ============================================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Key details
    key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "sk_live_")
    key_hash TEXT NOT NULL UNIQUE, -- Hashed full key for validation
    name TEXT, -- User-friendly name (e.g., "Production Key", "Staging Key")
    
    -- Permissions & limits
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    allowed_endpoints TEXT[], -- NULL = all endpoints allowed
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    is_test_mode BOOLEAN DEFAULT false, -- Test keys don't count toward quota
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    last_request_ip TEXT,
    
    CONSTRAINT unique_customer_key_name UNIQUE(customer_id, name)
);

-- Indexes
CREATE INDEX idx_api_keys_customer ON api_keys(customer_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Tracks Stripe subscription details
-- ============================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Stripe details
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT NOT NULL,
    stripe_product_id TEXT,
    
    -- Subscription details
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid')),
    
    -- Pricing
    amount DECIMAL(10,2) NOT NULL, -- Monthly amount in dollars
    currency TEXT DEFAULT 'usd',
    
    -- Dates
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Usage overage tracking
    overage_enabled BOOLEAN DEFAULT true,
    overage_rate DECIMAL(10,4) DEFAULT 0.15, -- Per additional API call
    overage_amount DECIMAL(10,2) DEFAULT 0.00
);

-- Indexes
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- API USAGE TABLE
-- Logs every API request for billing and analytics
-- ============================================================================
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint TEXT NOT NULL, -- e.g., "/api/v1/jobs/match"
    method TEXT NOT NULL, -- GET, POST, etc.
    status_code INTEGER NOT NULL, -- 200, 400, 500, etc.
    
    -- Timing & performance
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER, -- How long the request took
    
    -- Billing
    billable BOOLEAN DEFAULT true, -- Test mode requests = false
    cost DECIMAL(10,4) DEFAULT 0.00, -- Cost of this request
    
    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Error tracking
    error_code TEXT,
    error_message TEXT
);

-- Indexes for analytics and billing
CREATE INDEX idx_api_usage_customer ON api_usage(customer_id);
CREATE INDEX idx_api_usage_api_key ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(request_timestamp DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_billable ON api_usage(billable) WHERE billable = true;

-- Partitioning by month for performance (optional, can add later)
-- CREATE INDEX idx_api_usage_month ON api_usage(DATE_TRUNC('month', request_timestamp));

-- ============================================================================
-- RATE LIMITS TABLE
-- Tracks current rate limit windows
-- ============================================================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Window tracking
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
    
    -- Counts
    request_count INTEGER DEFAULT 0,
    limit_exceeded_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_key_window UNIQUE(api_key_id, window_type, window_start)
);

-- Indexes
CREATE INDEX idx_rate_limits_api_key ON rate_limits(api_key_id);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- ============================================================================
-- USAGE ALERTS TABLE
-- Track when customers approach limits
-- ============================================================================
CREATE TABLE usage_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('quota_warning', 'quota_exceeded', 'rate_limit_exceeded', 'payment_failed')),
    threshold_percentage INTEGER, -- e.g., 80 for 80% quota used
    
    -- Status
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    message TEXT,
    current_usage INTEGER,
    quota_limit INTEGER
);

-- Indexes
CREATE INDEX idx_usage_alerts_customer ON usage_alerts(customer_id);
CREATE INDEX idx_usage_alerts_triggered ON usage_alerts(triggered_at DESC);

-- ============================================================================
-- AUDIT LOG TABLE
-- Track important account changes
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL, -- e.g., "api_key_created", "subscription_upgraded", "quota_reset"
    event_data JSONB, -- Flexible storage for event details
    
    -- Actor
    actor_type TEXT, -- "customer", "admin", "system"
    actor_id TEXT,
    
    -- Metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT
);

-- Indexes
CREATE INDEX idx_audit_logs_customer ON audit_logs(customer_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
    UPDATE customers
    SET current_usage = 0,
        quota_reset_date = quota_reset_date + INTERVAL '1 month'
    WHERE quota_reset_date <= NOW()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_customer_usage(p_customer_id UUID, p_increment INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
    UPDATE customers
    SET current_usage = current_usage + p_increment,
        last_active_at = NOW()
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if customer is within quota
CREATE OR REPLACE FUNCTION check_quota(p_customer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_usage INTEGER;
    v_monthly_quota INTEGER;
    v_subscription_status TEXT;
BEGIN
    SELECT current_usage, monthly_quota, subscription_status
    INTO v_current_usage, v_monthly_quota, v_subscription_status
    FROM customers
    WHERE id = p_customer_id;
    
    -- Allow if on paid plan and within quota, or if trialing
    RETURN (v_subscription_status IN ('active', 'trialing') AND v_current_usage < v_monthly_quota);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all customer-facing tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own data
CREATE POLICY customers_policy ON customers
    FOR ALL
    USING (auth.uid()::text = id::text);

CREATE POLICY api_keys_policy ON api_keys
    FOR ALL
    USING (customer_id::text = auth.uid()::text);

CREATE POLICY subscriptions_policy ON subscriptions
    FOR ALL
    USING (customer_id::text = auth.uid()::text);

CREATE POLICY api_usage_policy ON api_usage
    FOR SELECT
    USING (customer_id::text = auth.uid()::text);

CREATE POLICY usage_alerts_policy ON usage_alerts
    FOR ALL
    USING (customer_id::text = auth.uid()::text);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily usage summary view
CREATE VIEW daily_usage_summary AS
SELECT 
    customer_id,
    DATE(request_timestamp) as usage_date,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
    AVG(response_time_ms) as avg_response_time_ms,
    SUM(cost) as total_cost
FROM api_usage
WHERE billable = true
GROUP BY customer_id, DATE(request_timestamp);

-- Customer usage overview
CREATE VIEW customer_usage_overview AS
SELECT 
    c.id,
    c.email,
    c.company_name,
    c.subscription_tier,
    c.monthly_quota,
    c.current_usage,
    ROUND((c.current_usage::DECIMAL / c.monthly_quota::DECIMAL) * 100, 2) as usage_percentage,
    c.quota_reset_date,
    COUNT(DISTINCT ak.id) as active_api_keys,
    c.last_active_at
FROM customers c
LEFT JOIN api_keys ak ON ak.customer_id = c.id AND ak.is_active = true
WHERE c.is_active = true
GROUP BY c.id;

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert tier configurations (for reference)
CREATE TABLE IF NOT EXISTS tier_config (
    tier TEXT PRIMARY KEY,
    monthly_quota INTEGER NOT NULL,
    rate_limit_per_minute INTEGER NOT NULL,
    rate_limit_per_hour INTEGER NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    overage_rate DECIMAL(10,4) NOT NULL
);

INSERT INTO tier_config VALUES
    ('starter', 500, 10, 200, 99.00, 0.20),
    ('professional', 2000, 30, 1000, 299.00, 0.15),
    ('enterprise', 10000, 100, 5000, 999.00, 0.10),
    ('free_trial', 50, 5, 50, 0.00, 0.00)
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE customers IS 'Stores customer account information and subscription details';
COMMENT ON TABLE api_keys IS 'Generated API keys for authentication and request tracking';
COMMENT ON TABLE subscriptions IS 'Stripe subscription details and billing information';
COMMENT ON TABLE api_usage IS 'Logs every API request for billing and analytics';
COMMENT ON TABLE rate_limits IS 'Tracks rate limit windows for each API key';
COMMENT ON TABLE usage_alerts IS 'Alerts when customers approach usage limits';
COMMENT ON TABLE audit_logs IS 'Audit trail of important account changes';

-- Migration complete
