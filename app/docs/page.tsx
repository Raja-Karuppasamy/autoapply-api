export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-6">AutoApply API Documentation</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <p className="mb-4">
            Welcome to the AutoApply API! Our AI-powered job matching API helps platforms 
            provide intelligent job recommendations to their users.
          </p>
          
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="text-sm">https://api.autoapply.com/v1</code>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Authentication</h3>
            <p className="text-sm mb-2">Include your API key in the Authorization header:</p>
            <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Endpoints</h2>
          
          <div className="border-l-4 border-blue-500 pl-4 mb-6">
            <h3 className="text-xl font-semibold mb-2">POST /jobs/match</h3>
            <p className="text-gray-600 mb-4">Analyze how well a resume matches a job description</p>
            
            <h4 className="font-semibold mb-2">Request Body:</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto mb-4">
{`{
  "resume": "Your resume text...",
  "job_description": "Job description text..."
}`}
            </pre>
            
            <h4 className="font-semibold mb-2">Response:</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
{`{
  "success": true,
  "data": {
    "match_score": 92,
    "recommendation": "highly_recommended",
    "qualifications_met": [...],
    "qualifications_missing": [...],
    "analysis": "...",
    "key_strengths": [...],
    "areas_to_improve": [...]
  }
}`}
            </pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Rate Limits</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Starter:</strong> 10 requests/minute, 200/hour</li>
            <li><strong>Professional:</strong> 30 requests/minute, 1,000/hour</li>
            <li><strong>Enterprise:</strong> 100 requests/minute, 5,000/hour</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
          <p>Contact us at <a href="mailto:support@autoapply.com" className="text-blue-600">support@autoapply.com</a></p>
        </section>
      </div>
    </div>
  );
}