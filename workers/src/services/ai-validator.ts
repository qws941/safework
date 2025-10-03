/**
 * Workers AI Service
 * Cloudflare-native AI-powered form validation and health insights
 */

export interface AIValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  aiInsights?: string;
}

export interface HealthInsight {
  symptomAnalysis: string;
  riskAssessment: string;
  recommendations: string[];
  urgencyLevel: 'routine' | 'attention_needed' | 'urgent' | 'immediate';
}

export class AIValidatorService {
  constructor(private ai: Ai) {}

  /**
   * Validate survey submission using AI
   */
  async validateSurveySubmission(
    formType: string,
    data: Record<string, any>
  ): Promise<AIValidationResult> {
    try {
      const prompt = this.buildValidationPrompt(formType, data);

      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are a medical and occupational health expert validating survey submissions for a workplace safety system. Analyze the data and identify any issues, inconsistencies, or concerning patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const aiResponse = (response as any).response || '';

      // Parse AI response
      const validation = this.parseAIValidationResponse(aiResponse);

      return validation;
    } catch (error) {
      console.error('AI validation error:', error);
      // Fallback to basic validation
      return {
        isValid: true,
        confidence: 0.5,
        issues: [],
        suggestions: [],
        riskLevel: 'low',
      };
    }
  }

  /**
   * Generate health insights from symptoms data
   */
  async generateHealthInsights(
    symptomsData: Record<string, any>
  ): Promise<HealthInsight> {
    try {
      const prompt = `
Analyze the following musculoskeletal symptoms data and provide health insights:

Symptoms Data:
${JSON.stringify(symptomsData, null, 2)}

Provide:
1. Symptom analysis
2. Risk assessment
3. Recommendations (list of actions)
4. Urgency level (routine/attention_needed/urgent/immediate)

Format your response as JSON.
      `;

      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are an occupational health specialist. Analyze musculoskeletal symptoms and provide clear, actionable health insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const aiResponse = (response as any).response || '';

      // Parse AI response
      const insights = this.parseHealthInsights(aiResponse);

      return insights;
    } catch (error) {
      console.error('AI health insights error:', error);
      // Fallback
      return {
        symptomAnalysis: '증상 데이터를 분석할 수 없습니다.',
        riskAssessment: '위험도 평가를 수행할 수 없습니다.',
        recommendations: ['전문의와 상담하세요.'],
        urgencyLevel: 'routine',
      };
    }
  }

  /**
   * Detect anomalies in survey data
   */
  async detectAnomalies(
    formType: string,
    currentData: Record<string, any>,
    historicalData: Record<string, any>[]
  ): Promise<{ hasAnomalies: boolean; anomalies: string[] }> {
    try {
      const prompt = `
Compare current survey data with historical patterns and detect anomalies:

Current Data:
${JSON.stringify(currentData, null, 2)}

Historical Average:
${JSON.stringify(this.calculateHistoricalAverage(historicalData), null, 2)}

Identify any unusual patterns or anomalies.
      `;

      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst specializing in occupational health. Detect anomalies in survey data compared to historical patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const aiResponse = (response as any).response || '';

      // Parse anomalies
      const hasAnomalies = aiResponse.toLowerCase().includes('anomaly') ||
                          aiResponse.toLowerCase().includes('unusual');
      const anomalies = this.extractAnomalies(aiResponse);

      return { hasAnomalies, anomalies };
    } catch (error) {
      console.error('AI anomaly detection error:', error);
      return { hasAnomalies: false, anomalies: [] };
    }
  }

  /**
   * Generate summary report using AI
   */
  async generateSummaryReport(
    formType: string,
    data: Record<string, any>[],
    period: string
  ): Promise<string> {
    try {
      const prompt = `
Generate a comprehensive summary report for ${formType} surveys over ${period}:

Total Surveys: ${data.length}
Data Sample: ${JSON.stringify(data.slice(0, 5), null, 2)}

Provide:
1. Key findings
2. Trends and patterns
3. Risk areas
4. Recommendations

Write in Korean.
      `;

      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are a workplace safety analyst. Generate comprehensive, actionable reports in Korean.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return (response as any).response || '보고서를 생성할 수 없습니다.';
    } catch (error) {
      console.error('AI report generation error:', error);
      return '보고서 생성 중 오류가 발생했습니다.';
    }
  }

  // Private helper methods

  private buildValidationPrompt(formType: string, data: Record<string, any>): string {
    return `
Validate the following ${formType} survey submission:

${JSON.stringify(data, null, 2)}

Check for:
1. Data completeness
2. Logical consistency
3. Health risk indicators
4. Unusual patterns

Provide:
- Validation result (valid/invalid)
- Confidence level (0-1)
- Issues found
- Suggestions for improvement
- Risk level (low/medium/high/critical)
    `;
  }

  private parseAIValidationResponse(response: string): AIValidationResult {
    // Simple parsing logic - can be enhanced with structured output
    const isValid = !response.toLowerCase().includes('invalid') &&
                   !response.toLowerCase().includes('error');
    const hasHighRisk = response.toLowerCase().includes('high risk') ||
                       response.toLowerCase().includes('critical');

    return {
      isValid,
      confidence: 0.85,
      issues: this.extractIssues(response),
      suggestions: this.extractSuggestions(response),
      riskLevel: hasHighRisk ? 'high' : 'low',
      aiInsights: response,
    };
  }

  private parseHealthInsights(response: string): HealthInsight {
    // Try to parse JSON if available
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          symptomAnalysis: parsed.symptomAnalysis || parsed.symptom_analysis || '분석 결과 없음',
          riskAssessment: parsed.riskAssessment || parsed.risk_assessment || '위험도 평가 없음',
          recommendations: parsed.recommendations || ['전문의와 상담하세요'],
          urgencyLevel: parsed.urgencyLevel || parsed.urgency_level || 'routine',
        };
      }
    } catch (e) {
      // Fall through to text parsing
    }

    return {
      symptomAnalysis: response.substring(0, 200),
      riskAssessment: '상세 평가 필요',
      recommendations: ['전문의와 상담하세요'],
      urgencyLevel: 'routine',
    };
  }

  private extractIssues(text: string): string[] {
    const issues: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('issue') ||
          line.toLowerCase().includes('error') ||
          line.toLowerCase().includes('problem')) {
        issues.push(line.trim());
      }
    }

    return issues;
  }

  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('suggest') ||
          line.toLowerCase().includes('recommend') ||
          line.toLowerCase().includes('should')) {
        suggestions.push(line.trim());
      }
    }

    return suggestions;
  }

  private extractAnomalies(text: string): string[] {
    const anomalies: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('anomaly') ||
          line.toLowerCase().includes('unusual') ||
          line.toLowerCase().includes('outlier')) {
        anomalies.push(line.trim());
      }
    }

    return anomalies;
  }

  private calculateHistoricalAverage(data: Record<string, any>[]): Record<string, number> {
    if (data.length === 0) return {};

    const average: Record<string, number> = {};
    const keys = Object.keys(data[0] || {});

    for (const key of keys) {
      const values = data.map(d => d[key]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        average[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }

    return average;
  }
}
