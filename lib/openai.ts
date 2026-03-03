// OpenAI Integration for Job Matching
import OpenAI from 'openai';
import { JobMatchRequest, JobMatchResponse } from '@/types/jobs.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeJobMatch(request: JobMatchRequest): Promise<JobMatchResponse> {
  const { resume, job_description } = request;
  
  const prompt = `You are an expert ATS (Applicant Tracking System) and recruiter. Analyze how well this resume matches the job description.

JOB DESCRIPTION:
${job_description}

RESUME:
${resume}

Provide a detailed analysis in JSON format with these fields:
- match_score: number from 0-100
- recommendation: "highly_recommended" | "recommended" | "possible" | "not_recommended"
- qualifications_met: array of strings (skills/requirements they have)
- qualifications_missing: array of strings (skills/requirements they lack)
- analysis: 2-3 sentence overall summary
- key_strengths: array of top 3-5 strengths
- areas_to_improve: array of areas to work on
- estimated_interview_likelihood: "high" | "medium" | "low"

Rules:
- 80-100 score = highly_recommended
- 60-79 = recommended  
- 40-59 = possible
- 0-39 = not_recommended
- Be honest but constructive
- Return ONLY valid JSON`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert recruiter. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) throw new Error('No response from OpenAI');
    
    return JSON.parse(responseText) as JobMatchResponse;
  } catch (error) {
    console.error('Error analyzing job match:', error);
    throw error;
  }
}

export function validateJobMatchRequest(data: any): { valid: boolean; error?: string } {
  if (!data.resume || typeof data.resume !== 'string') {
    return { valid: false, error: 'Resume is required and must be a string' };
  }
  if (!data.job_description || typeof data.job_description !== 'string') {
    return { valid: false, error: 'Job description is required and must be a string' };
  }
  if (data.resume.length < 50) {
    return { valid: false, error: 'Resume too short (minimum 50 characters)' };
  }
  if (data.job_description.length < 50) {
    return { valid: false, error: 'Job description too short (minimum 50 characters)' };
  }
  if (data.resume.length > 10000) {
    return { valid: false, error: 'Resume too long (maximum 10,000 characters)' };
  }
  if (data.job_description.length > 5000) {
    return { valid: false, error: 'Job description too long (maximum 5,000 characters)' };
  }
  return { valid: true };
}