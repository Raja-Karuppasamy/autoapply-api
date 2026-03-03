// Authentication Middleware
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './auth';
import { checkRateLimit } from './ratelimit';
import { checkCustomerQuota, incrementCustomerUsage, logApiUsage } from './supabase';
import { ApiErrorCode, HTTP_STATUS, createErrorResponse, AuthContext } from '@/types/api.types';

export type AuthenticatedHandler = (request: NextRequest, context: AuthContext) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    
    // Validate API key
    const authHeader = request.headers.get('authorization');
    const authContext = await validateApiKey(authHeader);
    
    if (!authContext.isValid) {
      return NextResponse.json(
        createErrorResponse(authContext.error as ApiErrorCode, 'Authentication failed'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }
    
    // Check rate limits
    const rateLimitResult = await checkRateLimit(
      authContext.apiKey.id,
      authContext.apiKey.rate_limit_per_minute,
      authContext.apiKey.rate_limit_per_hour
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded'),
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }
    
    // Check quota
    if (!authContext.apiKey.is_test_mode) {
      const hasQuota = await checkCustomerQuota(authContext.customer.id);
      if (!hasQuota) {
        return NextResponse.json(
          createErrorResponse(ApiErrorCode.QUOTA_EXCEEDED, 'Quota exceeded'),
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }
    }
    
    // Execute handler
    const response = await handler(request, authContext);
    
    // Log usage (async)
    const endpoint = new URL(request.url).pathname;
    logApiUsage({
      customer_id: authContext.customer.id,
      api_key_id: authContext.apiKey.id,
      endpoint,
      method: request.method,
      status_code: response.status,
      response_time_ms: Date.now() - startTime,
      billable: !authContext.apiKey.is_test_mode,
      cost: 0.20,
    }).catch(console.error);
    
    // Increment usage (async)
    if (!authContext.apiKey.is_test_mode) {
      incrementCustomerUsage(authContext.customer.id, 1).catch(console.error);
    }
    
    return response;
  };
}