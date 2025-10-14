/**
 * Form 001 Data Analysis Routes
 * Form 002: NIOSH Lifting Equation & Workload Analysis
 * Form 003: Musculoskeletal Disease Prevention Program Analysis
 */

import { Hono } from 'hono';
import { Env } from '../index';

export const analysisRoutes = new Hono<{ Bindings: Env }>();

/**
 * Form 002: NIOSH Lifting Equation Analysis
 * GET /api/analysis/002/niosh
 *
 * Analyzes Form 001 data to calculate workload and risk factors
 * using NIOSH Lifting Equation methodology
 */
analysisRoutes.get('/002/niosh', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    // Get all Form 001 submissions with symptoms and workload data
    const surveys = await db.prepare(`
      SELECT
        id,
        name,
        department,
        age,
        gender,
        work_years,
        work_months,
        has_symptoms,
        responses,
        data,
        symptoms_data,
        submission_date
      FROM surveys
      WHERE form_type = '001_musculoskeletal_symptom_survey'
      AND has_symptoms = 1
      ORDER BY submission_date DESC
      LIMIT 100
    `).all();

    // Analyze workload factors from Form 001 data
    const analysisResults = surveys.results.map((survey: any) => {
      let responses = {};
      try {
        responses = JSON.parse(survey.responses || '{}');
      } catch {
        responses = {};
      }

      // Extract workload factors from responses
      const workType = (responses as any).work_type || [];
      const heavyLiftingFreq = (responses as any).heavy_lifting_frequency || '';
      const heavyLiftingWeight = (responses as any).heavy_lifting_weight || '';
      const workPosture = (responses as any).work_posture || [];
      const painTrigger = (responses as any).pain_trigger || [];

      // Calculate risk score (0-100)
      let riskScore = 0;

      // Frequency factor (0-30 points)
      const freqScore = {
        '거의 없음': 0,
        '가끔 (주 1-2회)': 5,
        '보통 (주 3-4회)': 15,
        '자주 (매일)': 25,
        '매우 자주 (하루 여러 번)': 30
      };
      riskScore += freqScore[heavyLiftingFreq as keyof typeof freqScore] || 0;

      // Weight factor (0-30 points)
      const weightScore = {
        '5kg 미만': 0,
        '5-10kg': 5,
        '10-20kg': 15,
        '20-30kg': 25,
        '30kg 이상': 30
      };
      riskScore += weightScore[heavyLiftingWeight as keyof typeof weightScore] || 0;

      // Posture risk factor (0-20 points)
      const badPostures = ['허리 굽혀 작업', '쪼그려 앉아 작업', '비틀어서 작업', '무릎 꿇고 작업'];
      const postureCount = workPosture.filter((p: string) => badPostures.includes(p)).length;
      riskScore += Math.min(postureCount * 5, 20);

      // Repetitive work factor (0-20 points)
      if (Array.isArray(workType) && workType.includes('반복 작업')) {
        riskScore += 10;
      }
      if (Array.isArray(workType) && workType.includes('중량물 취급')) {
        riskScore += 10;
      }

      // Determine risk level
      let riskLevel = 'low';
      let riskColor = '#10b981'; // green
      if (riskScore >= 70) {
        riskLevel = 'very_high';
        riskColor = '#dc2626'; // red
      } else if (riskScore >= 50) {
        riskLevel = 'high';
        riskColor = '#f59e0b'; // orange
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
        riskColor = '#eab308'; // yellow
      }

      return {
        surveyId: survey.id,
        name: survey.name,
        department: survey.department,
        age: survey.age,
        gender: survey.gender,
        workExperience: `${survey.work_years}년 ${survey.work_months}개월`,
        riskScore,
        riskLevel,
        riskColor,
        factors: {
          heavyLifting: {
            frequency: heavyLiftingFreq,
            weight: heavyLiftingWeight,
            score: (freqScore[heavyLiftingFreq as keyof typeof freqScore] || 0) +
                   (weightScore[heavyLiftingWeight as keyof typeof weightScore] || 0)
          },
          posture: {
            types: workPosture,
            score: Math.min(postureCount * 5, 20)
          },
          workType: {
            types: workType,
            isRepetitive: Array.isArray(workType) && workType.includes('반복 작업'),
            isHeavyLoad: Array.isArray(workType) && workType.includes('중량물 취급')
          },
          painTriggers: painTrigger
        },
        submissionDate: survey.submission_date
      };
    });

    // Calculate aggregate statistics
    const totalWorkers = analysisResults.length;
    const highRiskCount = analysisResults.filter(r => r.riskLevel === 'high' || r.riskLevel === 'very_high').length;
    const avgRiskScore = totalWorkers > 0
      ? analysisResults.reduce((sum, r) => sum + r.riskScore, 0) / totalWorkers
      : 0;

    // Department-wise risk analysis
    const deptRiskMap: Record<string, { count: number, totalScore: number, highRisk: number }> = {};
    analysisResults.forEach(r => {
      if (!deptRiskMap[r.department]) {
        deptRiskMap[r.department] = { count: 0, totalScore: 0, highRisk: 0 };
      }
      deptRiskMap[r.department].count++;
      deptRiskMap[r.department].totalScore += r.riskScore;
      if (r.riskLevel === 'high' || r.riskLevel === 'very_high') {
        deptRiskMap[r.department].highRisk++;
      }
    });

    const departmentAnalysis = Object.entries(deptRiskMap).map(([dept, data]) => ({
      department: dept,
      workerCount: data.count,
      avgRiskScore: Math.round(data.totalScore / data.count),
      highRiskCount: data.highRisk,
      highRiskPercent: Math.round((data.highRisk / data.count) * 100)
    })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

    return c.json({
      success: true,
      analysis: {
        metadata: {
          title: 'NIOSH 리프팅 방정식 기반 작업 부담 분석',
          description: 'Form 001 데이터를 기반으로 중량물 취급 및 작업 자세 위험도 분석',
          totalWorkers,
          highRiskCount,
          highRiskPercent: totalWorkers > 0 ? Math.round((highRiskCount / totalWorkers) * 100) : 0,
          avgRiskScore: Math.round(avgRiskScore),
          analysisDate: new Date().toISOString()
        },
        workers: analysisResults,
        departmentAnalysis,
        recommendations: generateRecommendations(analysisResults)
      }
    });
  } catch (error) {
    console.error('NIOSH analysis error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, 500);
  }
});

/**
 * Form 003: Musculoskeletal Questionnaire Summary (근골격계 증상조사 질문지 요약)
 * GET /api/analysis/003/questionnaire-summary
 *
 * Generates comprehensive summary report from Form 001 survey responses
 * Including: basic demographics, pain by body part, work interference rates
 */
analysisRoutes.get('/003/questionnaire-summary', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    // Get all Form 001 submissions
    const surveys = await db.prepare(`
      SELECT *
      FROM surveys
      WHERE form_type = '001_musculoskeletal_symptom_survey'
      ORDER BY submission_date DESC
    `).all();

    const totalCount = surveys.results.length;

    // 1. Basic Demographics Statistics
    const genderStats = { male: 0, female: 0, unknown: 0 };
    const ageStats = { '20대': 0, '30대': 0, '40대': 0, '50대': 0, '60대 이상': 0 };
    const maritalStats = { married: 0, single: 0 };

    // 2. Pain by Body Part (통증 부위별 응답 현황)
    const bodyPartPain = {
      neck: { none: 0, sometimes: 0, often: 0, always: 0 },
      shoulder: { none: 0, sometimes: 0, often: 0, always: 0 },
      arm: { none: 0, sometimes: 0, often: 0, always: 0 },
      hand: { none: 0, sometimes: 0, often: 0, always: 0 },
      waist: { none: 0, sometimes: 0, often: 0, always: 0 },
      leg: { none: 0, sometimes: 0, often: 0, always: 0 }
    };

    // 3. Work Interference Stats (통증으로 인한 업무 지장도)
    const workInterference = {
      none: 0,
      interfered: 0
    };

    surveys.results.forEach((survey: any) => {
      // Gender
      const gender = survey.gender?.toLowerCase();
      if (gender === '남' || gender === 'male' || gender === '남성') genderStats.male++;
      else if (gender === '여' || gender === 'female' || gender === '여성') genderStats.female++;
      else genderStats.unknown++;

      // Age
      const age = survey.age || 0;
      if (age >= 20 && age < 30) ageStats['20대']++;
      else if (age >= 30 && age < 40) ageStats['30대']++;
      else if (age >= 40 && age < 50) ageStats['40대']++;
      else if (age >= 50 && age < 60) ageStats['50대']++;
      else if (age >= 60) ageStats['60대 이상']++;

      // Parse symptoms data
      let symptomsData = {};
      try {
        symptomsData = JSON.parse(survey.symptoms_data || '{}');
      } catch {
        // Ignore
      }

      const bodyParts = (symptomsData as any).body_parts || {};

      // Body part pain analysis
      Object.entries(bodyPartPain).forEach(([partKey, stats]) => {
        const partData = bodyParts[partKey];
        if (partData && typeof partData === 'object') {
          const frequency = partData.frequency || '';
          if (frequency.includes('없음')) stats.none++;
          else if (frequency.includes('가끔')) stats.sometimes++;
          else if (frequency.includes('자주')) stats.often++;
          else if (frequency.includes('항상')) stats.always++;

          // Work interference check
          const interference = partData.work_interference || '';
          if (interference && !interference.includes('없음')) {
            workInterference.interfered++;
          } else if (interference) {
            workInterference.none++;
          }
        } else {
          stats.none++;
        }
      });
    });

    // Calculate percentages
    const genderPercentages = {
      male: totalCount > 0 ? Math.round((genderStats.male / totalCount) * 100 * 10) / 10 : 0,
      female: totalCount > 0 ? Math.round((genderStats.female / totalCount) * 100 * 10) / 10 : 0,
      unknown: totalCount > 0 ? Math.round((genderStats.unknown / totalCount) * 100 * 10) / 10 : 0
    };

    const agePercentages = Object.fromEntries(
      Object.entries(ageStats).map(([key, value]) => [
        key,
        totalCount > 0 ? Math.round((value / totalCount) * 100 * 10) / 10 : 0
      ])
    );

    const bodyPartResponseRates = Object.fromEntries(
      Object.entries(bodyPartPain).map(([key, stats]) => {
        const total = stats.none + stats.sometimes + stats.often + stats.always;
        return [
          key,
          {
            ...stats,
            responseRate: totalCount > 0 ? Math.round((total / totalCount) * 100 * 10) / 10 : 0
          }
        ];
      })
    );

    const workInterferenceRate = workInterference.none + workInterference.interfered > 0
      ? Math.round((workInterference.interfered / (workInterference.none + workInterference.interfered)) * 100 * 10) / 10
      : 0;

    return c.json({
      success: true,
      summary: {
        metadata: {
          title: '근골격계 증상조사 질문지 요약',
          generatedAt: new Date().toISOString(),
          totalResponses: totalCount,
          description: 'Form 001 설문조사 응답 데이터 종합 요약'
        },
        section1_demographics: {
          title: '1. 기본 정보 통계',
          gender: {
            male: { count: genderStats.male, percentage: genderPercentages.male },
            female: { count: genderStats.female, percentage: genderPercentages.female },
            unknown: { count: genderStats.unknown, percentage: genderPercentages.unknown }
          },
          age: Object.entries(ageStats).map(([range, count]) => ({
            ageRange: range,
            count,
            percentage: agePercentages[range]
          }))
        },
        section2_body_part_pain: {
          title: '2. 통증 부위별 응답 현황',
          bodyParts: [
            { name: '목', key: 'neck', ...bodyPartResponseRates.neck },
            { name: '어깨', key: 'shoulder', ...bodyPartResponseRates.shoulder },
            { name: '팔/팔꿈치', key: 'arm', ...bodyPartResponseRates.arm },
            { name: '손목/손', key: 'hand', ...bodyPartResponseRates.hand },
            { name: '허리', key: 'waist', ...bodyPartResponseRates.waist },
            { name: '다리/발', key: 'leg', ...bodyPartResponseRates.leg }
          ]
        },
        section3_work_interference: {
          title: '3. 통증으로 인한 업무 지장도',
          noInterference: workInterference.none,
          withInterference: workInterference.interfered,
          interferenceRate: workInterferenceRate
        }
      }
    });
  } catch (error) {
    console.error('Questionnaire summary error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Summary generation failed'
    }, 500);
  }
});

/**
 * Helper: Generate recommendations based on NIOSH analysis
 */
function generateRecommendations(workers: any[]): string[] {
  const recommendations: string[] = [];
  const highRiskCount = workers.filter(w => w.riskLevel === 'high' || w.riskLevel === 'very_high').length;

  if (highRiskCount > workers.length * 0.3) {
    recommendations.push('⚠️ 고위험군 근로자가 30% 이상입니다. 전사적 작업환경 개선이 시급합니다.');
  }

  const postureIssues = workers.filter(w =>
    w.factors.posture.types.some((p: string) =>
      ['허리 굽혀 작업', '쪼그려 앉아 작업', '비틀어서 작업'].includes(p)
    )
  ).length;

  if (postureIssues > workers.length * 0.5) {
    recommendations.push('🔧 부적절한 작업 자세가 빈번합니다. 작업대 높이 조절 및 인체공학적 보조도구 지급을 권장합니다.');
  }

  const heavyLifters = workers.filter(w =>
    w.factors.heavyLifting.frequency === '자주 (매일)' ||
    w.factors.heavyLifting.frequency === '매우 자주 (하루 여러 번)'
  ).length;

  if (heavyLifters > workers.length * 0.4) {
    recommendations.push('💪 중량물 취급 빈도가 높은 근로자가 많습니다. 운반 보조장비 도입 및 2인 1조 작업을 권장합니다.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ 전반적인 작업환경이 양호합니다. 현재 수준을 유지하시기 바랍니다.');
  }

  return recommendations;
}

/**
 * Form 004: Musculoskeletal Statistics Summary (근골격계 증상조사 통계 요약)
 * GET /api/analysis/004/statistics-summary
 *
 * Generates statistical analysis from Form 001 data including:
 * 1. Overall prevalence rate by body part with severity scores
 * 2. Gender-based prevalence
 * 3. Age group prevalence
 * 4. Work hours-based prevalence
 */
analysisRoutes.get('/004/statistics-summary', async (c) => {
  try {
    const db = c.env.PRIMARY_DB;

    // Get all Form 001 submissions
    const surveys = await db.prepare(`
      SELECT *
      FROM surveys
      WHERE form_type = '001_musculoskeletal_symptom_survey'
      ORDER BY submission_date DESC
    `).all();

    const totalCount = surveys.results.length;

    // Initialize statistics structures
    const bodyPartStats = {
      neck: { total: 0, withPain: 0, severitySum: 0 },
      shoulder: { total: 0, withPain: 0, severitySum: 0 },
      arm: { total: 0, withPain: 0, severitySum: 0 },
      hand: { total: 0, withPain: 0, severitySum: 0 },
      waist: { total: 0, withPain: 0, severitySum: 0 },
      leg: { total: 0, withPain: 0, severitySum: 0 }
    };

    const genderStats = {
      male: { total: 0, withPain: 0 },
      female: { total: 0, withPain: 0 }
    };

    const ageGroupStats = {
      '20대': { total: 0, withPain: 0 },
      '30대': { total: 0, withPain: 0 },
      '40대': { total: 0, withPain: 0 },
      '50대': { total: 0, withPain: 0 },
      '60대 이상': { total: 0, withPain: 0 }
    };

    const workHoursStats = {
      'under8': { total: 0, withPain: 0 },
      'exactly8': { total: 0, withPain: 0 },
      'hours9to10': { total: 0, withPain: 0 },
      'hours11to12': { total: 0, withPain: 0 },
      'over12': { total: 0, withPain: 0 }
    };

    // Process each survey
    surveys.results.forEach((survey: any) => {
      const hasPain = survey.has_symptoms === 1;

      // Gender statistics
      const gender = survey.gender?.toLowerCase();
      if (gender === '남' || gender === 'male' || gender === '남성') {
        genderStats.male.total++;
        if (hasPain) genderStats.male.withPain++;
      } else if (gender === '여' || gender === 'female' || gender === '여성') {
        genderStats.female.total++;
        if (hasPain) genderStats.female.withPain++;
      }

      // Age group statistics
      const age = survey.age || 0;
      let ageGroup = '20대';
      if (age >= 20 && age < 30) ageGroup = '20대';
      else if (age >= 30 && age < 40) ageGroup = '30대';
      else if (age >= 40 && age < 50) ageGroup = '40대';
      else if (age >= 50 && age < 60) ageGroup = '50대';
      else if (age >= 60) ageGroup = '60대 이상';

      if (ageGroupStats[ageGroup as keyof typeof ageGroupStats]) {
        ageGroupStats[ageGroup as keyof typeof ageGroupStats].total++;
        if (hasPain) ageGroupStats[ageGroup as keyof typeof ageGroupStats].withPain++;
      }

      // Work hours statistics
      let responses = {};
      try {
        responses = JSON.parse(survey.responses || '{}');
      } catch {
        // Ignore
      }

      const dailyHours = (responses as any).daily_work_hours || 0;
      if (dailyHours < 8) {
        workHoursStats.under8.total++;
        if (hasPain) workHoursStats.under8.withPain++;
      } else if (dailyHours === 8) {
        workHoursStats.exactly8.total++;
        if (hasPain) workHoursStats.exactly8.withPain++;
      } else if (dailyHours >= 9 && dailyHours <= 10) {
        workHoursStats.hours9to10.total++;
        if (hasPain) workHoursStats.hours9to10.withPain++;
      } else if (dailyHours >= 11 && dailyHours <= 12) {
        workHoursStats.hours11to12.total++;
        if (hasPain) workHoursStats.hours11to12.withPain++;
      } else if (dailyHours > 12) {
        workHoursStats.over12.total++;
        if (hasPain) workHoursStats.over12.withPain++;
      }

      // Body part statistics with severity
      let symptomsData = {};
      try {
        symptomsData = JSON.parse(survey.symptoms_data || '{}');
      } catch {
        // Ignore
      }

      const bodyParts = (symptomsData as any).body_parts || {};

      Object.keys(bodyPartStats).forEach(partKey => {
        bodyPartStats[partKey as keyof typeof bodyPartStats].total++;

        const partData = bodyParts[partKey];
        if (partData && typeof partData === 'object') {
          const frequency = partData.frequency || '';
          const hasPainInPart = !frequency.includes('없음') && frequency.length > 0;

          if (hasPainInPart) {
            bodyPartStats[partKey as keyof typeof bodyPartStats].withPain++;

            // Extract severity score (format: "7점 (중간 정도)" -> 7)
            const severityStr = partData.severity || '';
            const severityMatch = severityStr.match(/(\d+)점/);
            if (severityMatch) {
              const severity = parseInt(severityMatch[1]);
              // Convert 1-10 scale to 1-3 scale (가끔=1, 자주=2, 항상=3)
              let severityScore = 1;
              if (severity >= 7) severityScore = 3;
              else if (severity >= 4) severityScore = 2;
              bodyPartStats[partKey as keyof typeof bodyPartStats].severitySum += severityScore;
            }
          }
        }
      });
    });

    // Calculate prevalence rates and averages
    const bodyPartPrevalence = Object.entries(bodyPartStats).map(([part, data]) => {
      const prevalenceRate = data.total > 0 ? Math.round((data.withPain / data.total) * 100 * 10) / 10 : 0;
      const avgSeverity = data.withPain > 0 ? Math.round((data.severitySum / data.withPain) * 100) / 100 : 0;

      return {
        bodyPart: part,
        korean: {
          neck: '목',
          shoulder: '어깨',
          arm: '팔/팔꿈치',
          hand: '손목/손',
          waist: '허리',
          leg: '다리/발'
        }[part],
        totalResponses: data.total,
        withPain: data.withPain,
        prevalenceRate,
        avgSeverity
      };
    });

    const genderPrevalence = {
      male: {
        total: genderStats.male.total,
        withPain: genderStats.male.withPain,
        prevalenceRate: genderStats.male.total > 0
          ? Math.round((genderStats.male.withPain / genderStats.male.total) * 100 * 10) / 10
          : 0
      },
      female: {
        total: genderStats.female.total,
        withPain: genderStats.female.withPain,
        prevalenceRate: genderStats.female.total > 0
          ? Math.round((genderStats.female.withPain / genderStats.female.total) * 100 * 10) / 10
          : 0
      }
    };

    const ageGroupPrevalence = Object.entries(ageGroupStats).map(([group, data]) => ({
      ageGroup: group,
      total: data.total,
      withPain: data.withPain,
      prevalenceRate: data.total > 0 ? Math.round((data.withPain / data.total) * 100 * 10) / 10 : 0
    }));

    const workHoursPrevalence = [
      {
        hoursRange: '8시간 미만',
        ...workHoursStats.under8,
        prevalenceRate: workHoursStats.under8.total > 0
          ? Math.round((workHoursStats.under8.withPain / workHoursStats.under8.total) * 100 * 10) / 10
          : 0
      },
      {
        hoursRange: '8시간',
        ...workHoursStats.exactly8,
        prevalenceRate: workHoursStats.exactly8.total > 0
          ? Math.round((workHoursStats.exactly8.withPain / workHoursStats.exactly8.total) * 100 * 10) / 10
          : 0
      },
      {
        hoursRange: '9-10시간',
        ...workHoursStats.hours9to10,
        prevalenceRate: workHoursStats.hours9to10.total > 0
          ? Math.round((workHoursStats.hours9to10.withPain / workHoursStats.hours9to10.total) * 100 * 10) / 10
          : 0
      },
      {
        hoursRange: '11-12시간',
        ...workHoursStats.hours11to12,
        prevalenceRate: workHoursStats.hours11to12.total > 0
          ? Math.round((workHoursStats.hours11to12.withPain / workHoursStats.hours11to12.total) * 100 * 10) / 10
          : 0
      },
      {
        hoursRange: '12시간 초과',
        ...workHoursStats.over12,
        prevalenceRate: workHoursStats.over12.total > 0
          ? Math.round((workHoursStats.over12.withPain / workHoursStats.over12.total) * 100 * 10) / 10
          : 0
      }
    ];

    return c.json({
      success: true,
      statistics: {
        metadata: {
          title: '근골격계 증상조사 통계 요약',
          generatedAt: new Date().toISOString(),
          totalAnalyzed: totalCount,
          description: 'Form 001 데이터 기반 유병률 및 위험도 통계 분석'
        },
        section1_overall_prevalence: {
          title: '1. 전체 통증 유병률 (Prevalence Rate)',
          note: '* 심각도: 가끔=1, 자주=2, 항상=3의 평균값',
          bodyParts: bodyPartPrevalence
        },
        section2_gender_prevalence: {
          title: '2. 성별 통증 유병률',
          male: genderPrevalence.male,
          female: genderPrevalence.female
        },
        section3_age_prevalence: {
          title: '3. 연령대별 통증 유병률',
          ageGroups: ageGroupPrevalence
        },
        section4_work_hours_prevalence: {
          title: '4. 근무시간별 통증 유병률',
          workHours: workHoursPrevalence
        }
      }
    });
  } catch (error) {
    console.error('Statistics summary error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Statistics generation failed'
    }, 500);
  }
});
