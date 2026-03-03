// API Key Authentication
// Validates API keys and checks permissions

import { createHash } from 'crypto';
import { getApiKeyByHash } from './supabase';
import { AuthContext, ApiErrorCode } from '@/types/api.types';

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Hash API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate API key and return authentication context
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<AuthContext> {
  const apiKey = extractApiKey(authHeader);
  
  if (!apiKey) {
    return {
      customer: null as any,
      apiKey: null as any,
      isValid: false,
      error: ApiErrorCode.MISSING_API_KEY,
    };
  }
  
  const keyHash = hashApiKey(apiKey);
  
  try {
    const result: any = await getApiKeyByHash(keyHash);
    
    if (!result) {
      return {
        customer: null as any,
        apiKey: null as any,
        isValid: false,
        error: ApiErrorCode.INVALID_API_KEY,
      };
    }
    
    if (!result.is_active) {
      return {
        customer: result.customers,
        apiKey: result,
        isValid: false,
        error: ApiErrorCode.API_KEY_INACTIVE,
      };
    }
    
    if (result.expires_at && new Date(result.expires_at) < new Date()) {
      return {
        customer: result.customers,
        apiKey: result,
        isValid: false,
        error: ApiErrorCode.API_KEY_EXPIRED,
      };
    }
    
    const customer = result.customers;
    if (customer.subscription_status !== 'active' && customer.subscription_status !== 'trialing') {
      return {
        customer,
        apiKey: result,
        isValid: false,
        error: ApiErrorCode.SUBSCRIPTION_INACTIVE,
      };
    }
    
    return {
      customer,
      apiKey: result,
      isValid: true,
    };
    
  } catch (error) {
    console.error('Error validating API key:', error);
    return {
      customer: null as any,
      apiKey: null as any,
      isValid: false,
      error: ApiErrorCode.INTERNAL_ERROR,
    };
  }
}

/**
 * Check if API key has permission for specific endpoint
 */
export function checkEndpointPermission(
  apiKey: any,
  endpoint: string
): boolean {
  if (!apiKey.allowed_endpoints || apiKey.allowed_endpoints.length === 0) {
    return true;
  }
  
  return apiKey.allowed_endpoints.some((pattern: string) => {
    if (pattern === '*') return true;
    if (pattern === endpoint) return true;
    if (pattern.endsWith('/*') && endpoint.startsWith(pattern.slice(0, -2))) {
      return true;
    }
    return false;
  });
}