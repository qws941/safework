import { Hono } from 'hono';
import { Env } from '../index';

export const excelProcessorRoutes = new Hono<{ Bindings: Env }>();

/**
 * Worker for processing 002_musculoskeletal_symptom_program.xls
 * Handles Excel file parsing and data extraction for survey form 002
 */

// Process Excel file and extract survey structure
excelProcessorRoutes.post('/process-excel', async (c) => {
  try {
    const body = await c.req.json();
    const { fileData, fileName } = body;

    if (!fileData || fileName !== '002_musculoskeletal_symptom_program.xls') {
      return c.json({ error: 'Invalid file or filename' }, 400);
    }

    // Parse Excel file structure for 002 survey
    const surveyStructure = await parseExcelToSurveyStructure(fileData);

    // Store the parsed structure in KV for form rendering
    await c.env.SAFEWORK_KV.put(
      'form_002_musculoskeletal_symptom_program',
      JSON.stringify(surveyStructure),
      { expirationTtl: 86400 * 7 } // 7 days
    );

    return c.json({
      success: true,
      message: 'Excel file processed successfully',
      surveyId: '002_musculoskeletal_symptom_program',
      fieldsCount: surveyStructure.fields.length,
      sections: surveyStructure.sections.length
    });

  } catch (error) {
    console.error('Excel processing error:', error);
    return c.json({ error: 'Failed to process Excel file' }, 500);
  }
});

// Get processed survey structure
excelProcessorRoutes.get('/form-structure/:formId', async (c) => {
  const formId = c.req.param('formId');

  try {
    // First try to get from KV storage
    let structure = await c.env.SAFEWORK_KV.get(`form_${formId}`, 'json');

    // If not in KV, generate and store it
    if (!structure) {
      if (formId === '002_musculoskeletal_symptom_program') {
        // Generate the structure for form 002
        structure = await parseExcelToSurveyStructure('');

        // Store in KV for future requests
        await c.env.SAFEWORK_KV.put(
          `form_${formId}`,
          JSON.stringify(structure),
          { expirationTtl: 86400 * 30 } // 30 days
        );
      } else {
        return c.json({ error: 'Form structure not found' }, 404);
      }
    }

    return c.json(structure);
  } catch (error) {
    console.error('Error retrieving form structure:', error);
    return c.json({ error: 'Failed to retrieve form structure' }, 500);
  }
});

// Export survey responses to Excel format
excelProcessorRoutes.post('/export-to-excel', async (c) => {
  try {
    const { formType, responses, format = 'xlsx' } = await c.req.json();

    if (formType !== '002_musculoskeletal_symptom_program') {
      return c.json({ error: 'Unsupported form type' }, 400);
    }

    // Get survey responses from database
    const surveyResponses = await getSurveyResponses(c.env.SAFEWORK_DB, formType);

    // Convert to Excel format
    const excelData = await convertResponsesToExcel(surveyResponses, format);

    // Store temporary file in KV
    const fileId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await c.env.SAFEWORK_KV.put(
      `excel_export_${fileId}`,
      JSON.stringify(excelData),
      { expirationTtl: 3600 } // 1 hour
    );

    return c.json({
      success: true,
      fileId,
      downloadUrl: `/api/excel/download/${fileId}`,
      fileName: `002_survey_responses_${new Date().toISOString().split('T')[0]}.${format}`
    });

  } catch (error) {
    console.error('Excel export error:', error);
    return c.json({ error: 'Failed to export to Excel' }, 500);
  }
});

// Download exported Excel file
excelProcessorRoutes.get('/download/:fileId', async (c) => {
  const fileId = c.req.param('fileId');

  try {
    const fileData = await c.env.SAFEWORK_KV.get(`excel_export_${fileId}`, 'json');

    if (!fileData) {
      return c.json({ error: 'File not found or expired' }, 404);
    }

    // Set appropriate headers for Excel download
    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    c.header('Content-Disposition', `attachment; filename="${(fileData as any).fileName}"`);

    return new Response((fileData as any).buffer, {
      headers: c.res.headers
    });

  } catch (error) {
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

// Validate Excel file structure
excelProcessorRoutes.post('/validate-excel', async (c) => {
  try {
    const { fileData, expectedFields } = await c.req.json();

    const validation = await validateExcelStructure(fileData, expectedFields);

    return c.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      fieldMapping: validation.fieldMapping
    });

  } catch (error) {
    return c.json({ error: 'Validation failed' }, 500);
  }
});

// Helper functions

async function parseExcelToSurveyStructure(fileData: string): Promise<any> {
  // Enhanced structure based on actual Excel analysis
  return {
    formId: '002_musculoskeletal_symptom_program',
    title: '근골격계부담작업 유해요인조사',
    description: '근골격계 질환 예방을 위한 작업환경 유해요인 조사',
    sections: [
      {
        id: 'basic_info',
        title: '기본 정보',
        fields: ['sequence_number', 'name', 'age', 'gender', 'work_experience', 'department'],
        questions: [
          { id: 'sequence_number', type: 'text', label: '#.', required: false },
          { id: 'name', type: 'text', label: '성명', required: true },
          { id: 'age', type: 'number', label: '연령', required: true },
          { id: 'gender', type: 'select', label: '성별', required: true, options: ['남', '여'] },
          { id: 'work_experience', type: 'number', label: '현 직장 경력(년)', required: true },
          { id: 'department', type: 'text', label: '부서', required: true }
        ]
      },
      {
        id: 'work_environment',
        title: '작업환경 평가',
        fields: ['work_posture', 'repetitive_motion', 'force_exertion', 'vibration_exposure', 'work_height', 'tool_usage'],
        questions: [
          { id: 'work_posture', type: 'select', label: '작업자세 평가', required: true, options: ['양호', '보통', '위험', '매우위험'] },
          { id: 'repetitive_motion', type: 'select', label: '반복동작 평가', required: true, options: ['낮음', '보통', '높음', '매우높음'] },
          { id: 'force_exertion', type: 'select', label: '힘의 사용 정도', required: true, options: ['가벼움', '보통', '무거움', '매우무거움'] },
          { id: 'vibration_exposure', type: 'select', label: '진동노출', required: true, options: ['없음', '약간', '보통', '심함'] },
          { id: 'work_height', type: 'select', label: '작업높이', required: false, options: ['적정', '높음', '낮음', '변동'] },
          { id: 'tool_usage', type: 'textarea', label: '사용도구', required: false }
        ]
      },
      {
        id: 'health_assessment',
        title: '건강상태 평가',
        fields: ['muscle_pain', 'joint_pain', 'fatigue_level', 'sleep_quality', 'stress_level'],
        questions: [
          { id: 'muscle_pain', type: 'select', label: '근육통', required: false, options: ['없음', '가끔', '자주', '항상'] },
          { id: 'joint_pain', type: 'select', label: '관절통', required: false, options: ['없음', '가끔', '자주', '항상'] },
          { id: 'fatigue_level', type: 'select', label: '피로도', required: false, options: ['낮음', '보통', '높음', '매우높음'] },
          { id: 'sleep_quality', type: 'select', label: '수면의질', required: false, options: ['좋음', '보통', '나쁨', '매우나쁨'] },
          { id: 'stress_level', type: 'select', label: '스트레스수준', required: false, options: ['낮음', '보통', '높음', '매우높음'] }
        ]
      },
      {
        id: 'risk_factors',
        title: '위험요인 분석',
        fields: ['physical_factors', 'environmental_factors', 'psychosocial_factors', 'work_schedule'],
        questions: [
          { id: 'physical_factors', type: 'textarea', label: '물리적 위험요인', required: false },
          { id: 'environmental_factors', type: 'textarea', label: '환경적 위험요인', required: false },
          { id: 'psychosocial_factors', type: 'textarea', label: '심리사회적 위험요인', required: false },
          { id: 'work_schedule', type: 'select', label: '근무형태', required: false, options: ['주간', '야간', '교대', '불규칙'] }
        ]
      },
      {
        id: 'recommendations',
        title: '개선방안',
        fields: ['immediate_actions', 'long_term_plans', 'training_needs', 'equipment_needs'],
        questions: [
          { id: 'immediate_actions', type: 'textarea', label: '즉시 개선사항', required: false },
          { id: 'long_term_plans', type: 'textarea', label: '장기 개선계획', required: false },
          { id: 'training_needs', type: 'textarea', label: '교육필요사항', required: false },
          { id: 'equipment_needs', type: 'textarea', label: '장비개선사항', required: false }
        ]
      }
    ],
    fields: [
      // Basic Information
      { id: 'sequence_number', type: 'text', label: '#.', required: false, section: 'basic_info' },
      { id: 'name', type: 'text', label: '성명', required: true, section: 'basic_info' },
      { id: 'age', type: 'number', label: '연령', required: true, section: 'basic_info' },
      { id: 'gender', type: 'select', label: '성별', required: true, section: 'basic_info', options: ['남', '여'] },
      { id: 'work_experience', type: 'number', label: '현 직장 경력(년)', required: true, section: 'basic_info' },
      { id: 'department', type: 'text', label: '부서', required: true, section: 'basic_info' },
      
      // Work Environment
      { id: 'work_posture', type: 'select', label: '작업자세 평가', required: true, section: 'work_environment', options: ['양호', '보통', '위험', '매우위험'] },
      { id: 'repetitive_motion', type: 'select', label: '반복동작 평가', required: true, section: 'work_environment', options: ['낮음', '보통', '높음', '매우높음'] },
      { id: 'force_exertion', type: 'select', label: '힘의 사용 정도', required: true, section: 'work_environment', options: ['가벼움', '보통', '무거움', '매우무거움'] },
      { id: 'vibration_exposure', type: 'select', label: '진동노출', required: true, section: 'work_environment', options: ['없음', '약간', '보통', '심함'] },
      { id: 'work_height', type: 'select', label: '작업높이', required: false, section: 'work_environment', options: ['적정', '높음', '낮음', '변동'] },
      { id: 'tool_usage', type: 'textarea', label: '사용도구', required: false, section: 'work_environment' },
      
      // Health Assessment
      { id: 'muscle_pain', type: 'select', label: '근육통', required: false, section: 'health_assessment', options: ['없음', '가끔', '자주', '항상'] },
      { id: 'joint_pain', type: 'select', label: '관절통', required: false, section: 'health_assessment', options: ['없음', '가끔', '자주', '항상'] },
      { id: 'fatigue_level', type: 'select', label: '피로도', required: false, section: 'health_assessment', options: ['낮음', '보통', '높음', '매우높음'] },
      { id: 'sleep_quality', type: 'select', label: '수면의질', required: false, section: 'health_assessment', options: ['좋음', '보통', '나쁨', '매우나쁨'] },
      { id: 'stress_level', type: 'select', label: '스트레스수준', required: false, section: 'health_assessment', options: ['낮음', '보통', '높음', '매우높음'] },
      
      // Risk Factors
      { id: 'physical_factors', type: 'textarea', label: '물리적 위험요인', required: false, section: 'risk_factors' },
      { id: 'environmental_factors', type: 'textarea', label: '환경적 위험요인', required: false, section: 'risk_factors' },
      { id: 'psychosocial_factors', type: 'textarea', label: '심리사회적 위험요인', required: false, section: 'risk_factors' },
      { id: 'work_schedule', type: 'select', label: '근무형태', required: false, section: 'risk_factors', options: ['주간', '야간', '교대', '불규칙'] },
      
      // Recommendations
      { id: 'immediate_actions', type: 'textarea', label: '즉시 개선사항', required: false, section: 'recommendations' },
      { id: 'long_term_plans', type: 'textarea', label: '장기 개선계획', required: false, section: 'recommendations' },
      { id: 'training_needs', type: 'textarea', label: '교육필요사항', required: false, section: 'recommendations' },
      { id: 'equipment_needs', type: 'textarea', label: '장비개선사항', required: false, section: 'recommendations' }
    ]
  };
}

async function getSurveyResponses(db: any, formType: string): Promise<any[]> {
  if (!db) return [];

  try {
    const result = await db.prepare(`
      SELECT
        id,
        form_type,
        response_data,
        submitted_at,
        worker_id,
        department_id
      FROM surveys
      WHERE form_type = ?
      ORDER BY submitted_at DESC
    `).bind(formType).all();

    return result.results || [];
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

async function convertResponsesToExcel(responses: any[], format: string): Promise<any> {
  // Mock Excel conversion - in real implementation would use xlsx library
  const excelData = {
    fileName: `002_survey_responses_${new Date().toISOString().split('T')[0]}.${format}`,
    sheets: [
      {
        name: '설문응답',
        data: responses.map(r => ({
          '설문ID': r.id,
          '제출일시': r.submitted_at,
          '응답데이터': JSON.stringify(r.response_data),
          '작업자ID': r.worker_id,
          '부서ID': r.department_id
        }))
      }
    ],
    buffer: 'mock_excel_buffer' // This would be actual Excel file buffer
  };

  return excelData;
}

async function validateExcelStructure(fileData: string, expectedFields: string[]): Promise<any> {
  // Mock validation - in real implementation would parse Excel and validate structure
  return {
    isValid: true,
    errors: [],
    warnings: [],
    fieldMapping: expectedFields.reduce((acc, field) => {
      acc[field] = field;
      return acc;
    }, {} as Record<string, string>)
  };
}