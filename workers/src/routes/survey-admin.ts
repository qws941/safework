import { Hono } from 'hono';
import { Env } from '../index';

export const surveyAdminRoutes = new Hono<{ Bindings: Env }>();

// Get survey statistics
surveyAdminRoutes.get('/stats', async (c) => {
  try {
    const env = c.env as { SAFEWORK_KV?: KVNamespace };

    if (!env.SAFEWORK_KV) {
      return c.json({ success: false, message: 'KV storage not configured' });
    }

    // Get all surveys
    const list = await env.SAFEWORK_KV.list({ limit: 1000 });

    // Initialize statistics
    const stats = {
      total_surveys: list.keys.length,
      by_form_type: {} as Record<string, number>,
      by_date: {} as Record<string, number>,
      symptoms_by_body_part: {} as Record<string, number>,
      severity_distribution: {} as Record<string, number>,
      demographics: {
        by_gender: {} as Record<string, number>,
        by_age_group: {} as Record<string, number>,
        by_company: {} as Record<string, number>
      },
      recent_submissions: [] as any[]
    };

    // Process each survey
    for (const key of list.keys.slice(0, 100)) { // Limit to 100 for performance
      try {
        const data = await env.SAFEWORK_KV.get(key.name);
        if (data) {
          const survey = JSON.parse(data);

          // Count by form type
          const formType = survey.form_type || 'unknown';
          stats.by_form_type[formType] = (stats.by_form_type[formType] || 0) + 1;

          // Count by date
          if (survey.timestamp) {
            const date = new Date(survey.timestamp).toISOString().split('T')[0];
            stats.by_date[date] = (stats.by_date[date] || 0) + 1;
          }

          // For 001 surveys, analyze symptoms
          if (formType === '001_musculoskeletal' && survey.data) {
            const surveyData = survey.data;

            // Demographics
            if (surveyData.personal_info) {
              const { gender, age, company } = surveyData.personal_info;
              if (gender) stats.demographics.by_gender[gender] = (stats.demographics.by_gender[gender] || 0) + 1;
              if (age) {
                const ageGroup = age < 30 ? '20-29' : age < 40 ? '30-39' : age < 50 ? '40-49' : '50+';
                stats.demographics.by_age_group[ageGroup] = (stats.demographics.by_age_group[ageGroup] || 0) + 1;
              }
            }

            if (surveyData.work_info?.company) {
              const company = surveyData.work_info.company;
              stats.demographics.by_company[company] = (stats.demographics.by_company[company] || 0) + 1;
            }

            // Symptoms analysis
            if (surveyData.symptoms) {
              for (const [bodyPart, symptomData] of Object.entries(surveyData.symptoms)) {
                if (typeof symptomData === 'object' && symptomData !== null) {
                  const symptom = symptomData as any;
                  if (symptom.pain === '있음') {
                    stats.symptoms_by_body_part[bodyPart] = (stats.symptoms_by_body_part[bodyPart] || 0) + 1;
                    if (symptom.severity) {
                      stats.severity_distribution[symptom.severity] = (stats.severity_distribution[symptom.severity] || 0) + 1;
                    }
                  }
                }
              }
            }
          }

          // Add to recent submissions
          if (stats.recent_submissions.length < 10) {
            stats.recent_submissions.push({
              id: key.name,
              form_type: formType,
              timestamp: survey.timestamp || survey.submitted_at,
              name: survey.data?.personal_info?.name || 'Anonymous'
            });
          }
        }
      } catch (e) {
        console.error('Error processing survey:', key.name, e);
      }
    }

    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({
      success: false,
      error: '통계 조회 중 오류가 발생했습니다'
    }, 500);
  }
});

// Get risk assessment
surveyAdminRoutes.get('/risk-assessment', async (c) => {
  try {
    const env = c.env as { SAFEWORK_KV?: KVNamespace };

    if (!env.SAFEWORK_KV) {
      return c.json({ success: false, message: 'KV storage not configured' });
    }

    const list = await env.SAFEWORK_KV.list({ limit: 1000 });
    const riskAssessment = {
      high_risk: [] as any[],
      medium_risk: [] as any[],
      low_risk: [] as any[],
      risk_by_department: {} as Record<string, any>
    };

    for (const key of list.keys) {
      try {
        const data = await env.SAFEWORK_KV.get(key.name);
        if (data) {
          const survey = JSON.parse(data);

          if (survey.form_type === '001_musculoskeletal' && survey.data) {
            const riskScore = calculateRiskScore(survey.data);
            const entry = {
              id: key.name,
              name: survey.data.personal_info?.name || 'Anonymous',
              company: survey.data.work_info?.company || 'Unknown',
              process: survey.data.work_info?.process || 'Unknown',
              score: riskScore,
              timestamp: survey.timestamp || survey.submitted_at
            };

            if (riskScore >= 70) {
              riskAssessment.high_risk.push(entry);
            } else if (riskScore >= 40) {
              riskAssessment.medium_risk.push(entry);
            } else {
              riskAssessment.low_risk.push(entry);
            }

            // Group by department
            const dept = survey.data.work_info?.process || 'Unknown';
            if (!riskAssessment.risk_by_department[dept]) {
              riskAssessment.risk_by_department[dept] = {
                total: 0,
                high_risk: 0,
                medium_risk: 0,
                low_risk: 0,
                avg_score: 0,
                scores: []
              };
            }

            const deptStats = riskAssessment.risk_by_department[dept];
            deptStats.total++;
            deptStats.scores.push(riskScore);
            if (riskScore >= 70) deptStats.high_risk++;
            else if (riskScore >= 40) deptStats.medium_risk++;
            else deptStats.low_risk++;
          }
        }
      } catch (e) {
        console.error('Error processing survey for risk:', key.name, e);
      }
    }

    // Calculate average scores
    for (const dept in riskAssessment.risk_by_department) {
      const deptStats = riskAssessment.risk_by_department[dept];
      if (deptStats.scores.length > 0) {
        deptStats.avg_score = Math.round(
          deptStats.scores.reduce((a: number, b: number) => a + b, 0) / deptStats.scores.length
        );
      }
      delete deptStats.scores; // Remove raw scores from response
    }

    // Sort high risk by score
    riskAssessment.high_risk.sort((a, b) => b.score - a.score);

    return c.json({
      success: true,
      risk_assessment: riskAssessment
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    return c.json({
      success: false,
      error: '위험도 평가 중 오류가 발생했습니다'
    }, 500);
  }
});

// Calculate risk score based on symptoms
function calculateRiskScore(data: any): number {
  let score = 0;

  // Physical burden (max 20 points)
  const burdenMap: Record<string, number> = {
    '매우힘듦': 20,
    '약간힘듦': 15,
    '견딜만함': 10,
    '전혀힘들지않음': 0
  };
  score += burdenMap[data.physical_burden] || 0;

  // Past accidents (max 10 points)
  if (data.past_accident === '예') {
    score += 10;
  }

  // Diagnosed diseases (max 10 points)
  if (data.diagnosed === 'yes') {
    score += 10;
  }

  // Symptoms (max 60 points)
  if (data.symptoms) {
    let symptomScore = 0;
    let bodyPartCount = 0;

    for (const [bodyPart, symptomData] of Object.entries(data.symptoms)) {
      if (typeof symptomData === 'object' && symptomData !== null) {
        const symptom = symptomData as any;
        if (symptom.pain === '있음') {
          bodyPartCount++;

          // Severity (max 5 points per body part)
          const severityMap: Record<string, number> = {
            '매우심함': 5,
            '심함': 4,
            '중간': 2,
            '약함': 1
          };
          symptomScore += severityMap[symptom.severity] || 0;

          // Frequency (max 3 points per body part)
          const frequencyMap: Record<string, number> = {
            '항상': 3,
            '자주': 2,
            '가끔': 1
          };
          symptomScore += frequencyMap[symptom.frequency] || 0;

          // Duration (max 2 points per body part)
          const durationMap: Record<string, number> = {
            '6개월이상': 2,
            '1개월-6개월': 1.5,
            '1주-1개월': 1,
            '1주미만': 0.5
          };
          symptomScore += durationMap[symptom.duration] || 0;
        }
      }
    }

    // Normalize to max 60 points
    score += Math.min(symptomScore, 60);
  }

  return Math.min(score, 100); // Cap at 100
}

// Export survey data to CSV
surveyAdminRoutes.get('/export/csv', async (c) => {
  try {
    const env = c.env as { SAFEWORK_KV?: KVNamespace };

    if (!env.SAFEWORK_KV) {
      return c.json({ success: false, message: 'KV storage not configured' });
    }

    const list = await env.SAFEWORK_KV.list({ limit: 1000 });
    const csvRows = [];

    // CSV Header
    csvRows.push([
      'ID', '제출일시', '이름', '나이', '성별', '결혼상태',
      '회사', '공정', '직위', '근무년수', '근무개월',
      '일일작업시간', '육체적부담', '과거사고', '진단질병',
      '증상유무', '목통증', '어깨통증', '팔통증', '손통증', '허리통증', '다리통증',
      '위험도점수'
    ].join(','));

    for (const key of list.keys) {
      try {
        const data = await env.SAFEWORK_KV.get(key.name);
        if (data) {
          const survey = JSON.parse(data);
          if (survey.form_type === '001_musculoskeletal' && survey.data) {
            const d = survey.data;
            const riskScore = calculateRiskScore(d);

            const row = [
              key.name,
              survey.timestamp || survey.submitted_at || '',
              d.personal_info?.name || '',
              d.personal_info?.age || '',
              d.personal_info?.gender || '',
              d.personal_info?.marriage_status || '',
              d.work_info?.company || '',
              d.work_info?.process || '',
              d.work_info?.role || '',
              d.work_info?.work_years || '',
              d.work_info?.work_months || '',
              d.work_info?.daily_work_hours || '',
              d.physical_burden || '',
              d.past_accident || '',
              d.diagnosed || '',
              d.has_symptoms || '',
              d.symptoms?.['목']?.pain || '없음',
              d.symptoms?.['어깨']?.pain || '없음',
              d.symptoms?.['팔/팔꿈치']?.pain || '없음',
              d.symptoms?.['손/손목/손가락']?.pain || '없음',
              d.symptoms?.['허리']?.pain || '없음',
              d.symptoms?.['다리/발']?.pain || '없음',
              riskScore
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');

            csvRows.push(row);
          }
        }
      } catch (e) {
        console.error('Error processing survey for CSV:', key.name, e);
      }
    }

    const csv = csvRows.join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="survey_data_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return c.json({
      success: false,
      error: 'CSV 내보내기 중 오류가 발생했습니다'
    }, 500);
  }
});

export default surveyAdminRoutes;