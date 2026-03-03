// Test API Endpoint
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse } from '@/types/api.types';

export const POST = withAuth(async (request: NextRequest, context) => {
  // This endpoint is protected by authentication
  // context.customer and context.apiKey are available
  
  return Response.json(
    createSuccessResponse({
      message: 'Authentication successful!',
      customer: {
        email: context.customer.email,
        tier: context.customer.subscription_tier,
      },
      usage: {
        current: context.customer.current_usage,
        quota: context.customer.monthly_quota,
        remaining: context.customer.monthly_quota - context.customer.current_usage,
      },
    })
  );
});