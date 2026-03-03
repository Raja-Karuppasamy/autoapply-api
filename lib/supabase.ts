// Supabase Client Helper
// Provides typed database access

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// CUSTOMER HELPERS
// ============================================================================

export async function getCustomerByEmail(email: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createCustomer(customerData: any) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, updates: any) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function checkCustomerQuota(customerId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_quota', {
    p_customer_id: customerId,
  });
  
  if (error) throw error;
  return data;
}

export async function incrementCustomerUsage(customerId: string, increment: number = 1) {
  const { error } = await supabase.rpc('increment_customer_usage', {
    p_customer_id: customerId,
    p_increment: increment,
  });
  
  if (error) throw error;
}

// ============================================================================
// API KEY HELPERS
// ============================================================================

export async function getApiKeyByHash(keyHash: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, customers(*)')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getCustomerApiKeys(customerId: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createApiKey(keyData: any) {
  const { data, error } = await supabase
    .from('api_keys')
    .insert(keyData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateApiKeyLastUsed(keyId: string, ipAddress?: string) {
  const { error } = await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      last_request_ip: ipAddress,
    } as never)
    .eq('id', keyId);
  
  if (error) throw error;
}

export async function incrementApiKeyUsage(keyId: string) {
  const { error } = await supabase.rpc('increment', {
    table_name: 'api_keys',
    row_id: keyId,
    column_name: 'total_requests',
  });
  
  if (error) {
    const { data } = await supabase
      .from('api_keys')
      .select('total_requests')
      .eq('id', keyId)
      .single();
    
    if (data) {
      await supabase
        .from('api_keys')
        .update({ total_requests: data.total_requests + 1 } as never)
        .eq('id', keyId);
    }
  }
}

export async function deactivateApiKey(keyId: string) {
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false } as never)
    .eq('id', keyId);
  
  if (error) throw error;
}

// ============================================================================
// SUBSCRIPTION HELPERS
// ============================================================================

export async function getCustomerSubscription(customerId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createSubscription(subData: any) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSubscription(stripeSubId: string, updates: any) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates as never)
    .eq('stripe_subscription_id', stripeSubId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// API USAGE HELPERS
// ============================================================================

export async function logApiUsage(usageData: any) {
  const { error } = await supabase
    .from('api_usage')
    .insert(usageData);
  
  if (error) throw error;
}

export async function getCustomerUsageStats(customerId: string, startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('api_usage')
    .select('*')
    .eq('customer_id', customerId)
    .eq('billable', true);
  
  if (startDate) {
    query = query.gte('request_timestamp', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('request_timestamp', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getDailyUsageSummary(customerId: string, days: number = 30) {
  const { data, error } = await supabase
    .from('daily_usage_summary')
    .select('*')
    .eq('customer_id', customerId)
    .gte('usage_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('usage_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

export async function checkRateLimit(
  apiKeyId: string,
  windowType: 'minute' | 'hour',
  limit: number
): Promise<{ allowed: boolean; currentCount: number }> {
  const now = new Date();
  let windowStart: Date;
  
  if (windowType === 'minute') {
    windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  } else {
    windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  }
  
  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('api_key_id', apiKeyId)
    .eq('window_type', windowType)
    .eq('window_start', windowStart.toISOString())
    .single();
  
  if (!existingLimit) {
    await supabase
      .from('rate_limits')
      .insert({
        api_key_id: apiKeyId,
        window_type: windowType,
        window_start: windowStart.toISOString(),
        request_count: 1,
      });
    
    return { allowed: true, currentCount: 1 };
  }
  
  const currentCount = existingLimit.request_count + 1;
  const allowed = currentCount <= limit;
  
  await supabase
    .from('rate_limits')
    .update({
      request_count: currentCount,
      limit_exceeded_count: allowed ? existingLimit.limit_exceeded_count : existingLimit.limit_exceeded_count + 1,
    } as never)
    .eq('id', existingLimit.id);
  
  return { allowed, currentCount };
}

// ============================================================================
// USAGE ALERT HELPERS
// ============================================================================

export async function createUsageAlert(alertData: any) {
  const { error } = await supabase
    .from('usage_alerts')
    .insert(alertData);
  
  if (error) throw error;
}

export async function getCustomerAlerts(customerId: string, unacknowledgedOnly: boolean = false) {
  let query = supabase
    .from('usage_alerts')
    .select('*')
    .eq('customer_id', customerId)
    .order('triggered_at', { ascending: false });
  
  if (unacknowledgedOnly) {
    query = query.is('acknowledged_at', null);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

// ============================================================================
// AUDIT LOG HELPERS
// ============================================================================

export async function logAudit(auditData: any) {
  const { error } = await supabase
    .from('audit_logs')
    .insert(auditData);
  
  if (error) throw error;
}

// ============================================================================
// TIER CONFIG HELPERS
// ============================================================================

export async function getTierConfig(tier: string) {
  const { data, error } = await supabase
    .from('tier_config')
    .select('*')
    .eq('tier', tier)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAllTierConfigs() {
  const { data, error } = await supabase
    .from('tier_config')
    .select('*')
    .order('monthly_price', { ascending: true });
  
  if (error) throw error;
  return data;
}