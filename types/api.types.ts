// API Types for AutoApply API
// Authentication, requests, and responses

import { Customer, ApiKey } from './database.types';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface AuthContext {
  customer: Customer;
  apiKey: ApiKey;
  isValid: boolean;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  windowType: 'minute' | 'hour';
  resetAt: Date;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  monthlyQuota: number;
  remaining: number;
  percentageUsed: number;
}

// ============================================================================
// API REQUESTS
// ============================================================================

export interface ApiRequest {
  headers: Headers;
  method: string;
  url: string;
  body?: any;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId?: string;
  timestamp: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
  usage?: {
    requestsUsed: number;
    requestsRemaining: number;
    quotaResetDate: string;
  };
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ApiErrorCode {
  // Authentication errors
  MISSING_API_KEY = 'missing_api_key',
  INVALID_API_KEY = 'invalid_api_key',
  API_KEY_EXPIRED = 'api_key_expired',
  API_KEY_INACTIVE = 'api_key_inactive',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Quota errors
  QUOTA_EXCEEDED = 'quota_exceeded',
  
  // Subscription errors
  SUBSCRIPTION_INACTIVE = 'subscription_inactive',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  PAYMENT_REQUIRED = 'payment_required',
  
  // Request errors
  INVALID_REQUEST = 'invalid_request',
  VALIDATION_ERROR = 'validation_error',
  
  // Server errors
  INTERNAL_ERROR = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createSuccessResponse<T>(
  data: T,
  usage?: {
    requestsUsed: number;
    requestsRemaining: number;
    quotaResetDate: string;
  }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    usage,
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}