// Job Matching API Endpoint
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { analyzeJobMatch, validateJobMatchRequest } from '@/lib/openai';
import { createSuccessResponse, createErrorResponse, ApiErrorCode, HTTP_STATUS } from '@/types/api.types';

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const validation = validateJobMatchRequest(body);
    if (!validation.valid) {
      return Response.json(
        createErrorResponse(ApiErrorCode.VALIDATION_ERROR, validation.error!),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Analyze the match using OpenAI
    const matchResult = await analyzeJobMatch({
      resume: body.resume,
      job_description: body.job_description,
      job_title: body.job_title,
      company_name: body.company_name,
    });
    
    // Return success response
    return Response.json(
      createSuccessResponse(matchResult, {
        requestsUsed: context.customer.current_usage + 1,
        requestsRemaining: context.customer.monthly_quota - context.customer.current_usage - 1,
        quotaResetDate: context.customer.quota_reset_date,
      })
    );
    
  } catch (error) {
    console.error('Job match error:', error);
    return Response.json(
      createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        'Failed to analyze job match'
      ),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});