// Job Matching Types

export interface JobMatchRequest {
  resume: string;
  job_description: string;
  job_title?: string;
  company_name?: string;
}

export interface JobMatchResponse {
  match_score: number; // 0-100
  recommendation: 'highly_recommended' | 'recommended' | 'possible' | 'not_recommended';
  qualifications_met: string[];
  qualifications_missing: string[];
  analysis: string;
  key_strengths: string[];
  areas_to_improve: string[];
  estimated_interview_likelihood: string;
}

export interface JobMatchAnalysis {
  technical_skills_match: number;
  experience_match: number;
  education_match: number;
  overall_fit: number;
  cultural_fit_indicators: string[];
}