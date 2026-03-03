// Rate Limiting
// Checks and enforces API rate limits

import { checkRateLimit as dbCheckRateLimit } from './supabase';
import { RateLimitResult, ApiErrorCode } from '@/types/api.types';

/**
 * Check rate limit for an API key
 * Enforces both per-minute and per-hour limits
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimitPerMinute: number,
  rateLimitPerHour: number
): Promise<{ allowed: boolean; error?: string; details?: RateLimitResult }> {
  
  try {
    // Check minute limit
    const minuteLimit = await dbCheckRateLimit(apiKeyId, 'minute', rateLimitPerMinute);
    
    if (!minuteLimit.allowed) {
      const resetAt = getWindowReset('minute');
      return {
        allowed: false,
        error: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        details: {
          allowed: false,
          currentCount: minuteLimit.currentCount,
          limit: rateLimitPerMinute,
          windowType: 'minute',
          resetAt,
        },
      };
    }
    
    // Check hour limit
    const hourLimit = await dbCheckRateLimit(apiKeyId, 'hour', rateLimitPerHour);
    
    if (!hourLimit.allowed) {
      const resetAt = getWindowReset('hour');
      return {
        allowed: false,
        error: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        details: {
          allowed: false,
          currentCount: hourLimit.currentCount,
          limit: rateLimitPerHour,
          windowType: 'hour',
          resetAt,
        },
      };
    }
    
    // Both limits passed
    return {
      allowed: true,
    };
    
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request (fail open)
    // In production, you might want to fail closed
    return { allowed: true };
  }
}

/**
 * Calculate when the current rate limit window resets
 */
function getWindowReset(windowType: 'minute' | 'hour'): Date {
  const now = new Date();
  const reset = new Date(now);
  
  if (windowType === 'minute') {
    // Reset at start of next minute
    reset.setSeconds(0, 0);
    reset.setMinutes(reset.getMinutes() + 1);
  } else {
    // Reset at start of next hour
    reset.setMinutes(0, 0, 0);
    reset.setHours(reset.getHours() + 1);
  }
  
  return reset;
}

/**
 * Get rate limit headers to include in response
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: Date
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
  };
}