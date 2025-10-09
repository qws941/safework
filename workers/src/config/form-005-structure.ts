/**
 * Form 005: 유해요인 기본조사표
 * Basic Hazard Factor Survey
 */

export const FORM_005_STRUCTURE = {
  formId: '005',
  formName: '유해요인 기본조사표',
  formNameEn: 'Basic Hazard Factor Survey',
  version: '1.0.0',
  description: '작업환경 유해요인 기본조사 및 위험성 평가',

  sections: [
    {
      sectionId: 'basic_info',
      sectionName: '기본 정보',
      fields: [
        { name: 'company_name', label: '회사명', type: 'text', required: true },
        { name: 'workplace_name', label: '사업장명', type: 'text', required: true },
        { name: 'department', label: '부서명', type: 'text', required: true },
        { name: 'investigator_name', label: '조사자명', type: 'text', required: true },
        { name: 'investigation_date', label: '조사일자', type: 'date', required: true }
      ]
    },
    {
      sectionId: 'work_process',
      sectionName: '작업공정',
      fields: [
        { name: 'process_name', label: '공정명', type: 'text', required: true },
        { name: 'work_description', label: '작업내용', type: 'textarea', required: true },
        { name: 'equipment_used', label: '사용장비', type: 'textarea', required: false },
        { name: 'materials_used', label: '사용물질', type: 'textarea', required: false },
        { name: 'work_methods', label: '작업방법', type: 'textarea', required: false }
      ]
    },
    {
      sectionId: 'physical_hazards',
      sectionName: '물리적 유해요인',
      fields: [
        {
          name: 'noise_level',
          label: '소음수준',
          type: 'select',
          required: true,
          options: ['85dB미만', '85-90dB', '90-95dB', '95dB이상']
        },
        {
          name: 'vibration',
          label: '진동',
          type: 'select',
          required: true,
          options: ['없음', '전신진동', '국소진동', '복합진동']
        },
        {
          name: 'temperature',
          label: '온도',
          type: 'select',
          required: true,
          options: ['적정', '고온(28도이상)', '저온(18도미만)', '변동']
        },
        {
          name: 'humidity',
          label: '습도',
          type: 'select',
          required: false,
          options: ['적정', '고습', '저습', '변동']
        },
        {
          name: 'lighting',
          label: '조명',
          type: 'select',
          required: true,
          options: ['충분', '보통', '부족', '눈부심']
        },
        {
          name: 'radiation',
          label: '방사선',
          type: 'select',
          required: false,
          options: ['해당없음', '이온화방사선', '비이온화방사선', '자외선', '적외선']
        }
      ]
    },
    {
      sectionId: 'chemical_hazards',
      sectionName: '화학적 유해요인',
      fields: [
        { name: 'chemical_substances', label: '화학물질', type: 'textarea', required: false },
        {
          name: 'exposure_route',
          label: '노출경로',
          type: 'select',
          required: false,
          options: ['흡입', '피부접촉', '경구', '복합']
        },
        {
          name: 'concentration_level',
          label: '농도수준',
          type: 'select',
          required: false,
          options: ['노출기준미만', '노출기준근접', '노출기준초과', '측정필요']
        },
        {
          name: 'exposure_duration',
          label: '노출시간',
          type: 'select',
          required: false,
          options: ['1시간미만', '1-4시간', '4-8시간', '8시간이상']
        },
        {
          name: 'ventilation_status',
          label: '환기상태',
          type: 'select',
          required: false,
          options: ['양호', '보통', '불량', '없음']
        }
      ]
    },
    {
      sectionId: 'ergonomic_hazards',
      sectionName: '인간공학적 유해요인',
      fields: [
        {
          name: 'work_posture',
          label: '작업자세',
          type: 'select',
          required: true,
          options: ['양호', '부적절한자세', '장시간동일자세', '반복작업']
        },
        {
          name: 'repetitive_motion',
          label: '반복동작',
          type: 'select',
          required: true,
          options: ['없음', '분당10회미만', '분당10-20회', '분당20회이상']
        },
        {
          name: 'manual_handling',
          label: '중량물취급',
          type: 'select',
          required: true,
          options: ['5kg미만', '5-18kg', '18-25kg', '25kg이상']
        },
        {
          name: 'display_work',
          label: 'VDT작업',
          type: 'select',
          required: false,
          options: ['해당없음', '2시간미만', '2-4시간', '4시간이상']
        },
        {
          name: 'workspace_design',
          label: '작업공간설계',
          type: 'select',
          required: false,
          options: ['적정', '협소', '작업대높이부적절', '접근성불량']
        }
      ]
    },
    {
      sectionId: 'psychosocial_hazards',
      sectionName: '심리사회적 유해요인',
      fields: [
        {
          name: 'work_stress',
          label: '업무스트레스',
          type: 'select',
          required: true,
          options: ['낮음', '보통', '높음', '매우높음']
        },
        {
          name: 'job_demands',
          label: '업무요구도',
          type: 'select',
          required: true,
          options: ['낮음', '보통', '높음', '매우높음']
        },
        {
          name: 'work_control',
          label: '업무자율성',
          type: 'select',
          required: false,
          options: ['높음', '보통', '낮음', '매우낮음']
        },
        {
          name: 'social_support',
          label: '사회적지지',
          type: 'select',
          required: false,
          options: ['충분', '보통', '부족', '매우부족']
        },
        {
          name: 'work_schedule_stress',
          label: '근무일정스트레스',
          type: 'select',
          required: false,
          options: ['낮음', '보통', '높음', '매우높음']
        }
      ]
    },
    {
      sectionId: 'risk_assessment',
      sectionName: '위험성 평가',
      fields: [
        {
          name: 'hazard_severity',
          label: '유해성정도',
          type: 'select',
          required: true,
          options: ['경미', '보통', '중대', '치명적']
        },
        {
          name: 'exposure_probability',
          label: '노출가능성',
          type: 'select',
          required: true,
          options: ['낮음', '보통', '높음', '매우높음']
        },
        {
          name: 'risk_level',
          label: '위험수준',
          type: 'select',
          required: true,
          options: ['허용가능', '관심', '주의', '경고', '위험']
        },
        { name: 'control_measures', label: '통제방안', type: 'textarea', required: true },
        { name: 'monitoring_plan', label: '모니터링계획', type: 'textarea', required: false }
      ]
    }
  ]
};

export const FORM_005_VALIDATION_RULES = {
  requiredFields: [
    'company_name',
    'workplace_name',
    'department',
    'investigator_name',
    'investigation_date',
    'process_name',
    'work_description',
    'noise_level',
    'vibration',
    'temperature',
    'lighting',
    'work_posture',
    'repetitive_motion',
    'manual_handling',
    'work_stress',
    'job_demands',
    'hazard_severity',
    'exposure_probability',
    'risk_level',
    'control_measures'
  ],

  riskMatrix: {
    '경미': {
      '낮음': '허용가능',
      '보통': '허용가능',
      '높음': '관심',
      '매우높음': '주의'
    },
    '보통': {
      '낮음': '허용가능',
      '보통': '관심',
      '높음': '주의',
      '매우높음': '경고'
    },
    '중대': {
      '낮음': '관심',
      '보통': '주의',
      '높음': '경고',
      '매우높음': '위험'
    },
    '치명적': {
      '낮음': '주의',
      '보통': '경고',
      '높음': '위험',
      '매우높음': '위험'
    }
  }
};

export const HAZARD_CATEGORIES = [
  { id: 'physical', name: '물리적 유해요인', nameEn: 'Physical Hazards' },
  { id: 'chemical', name: '화학적 유해요인', nameEn: 'Chemical Hazards' },
  { id: 'biological', name: '생물학적 유해요인', nameEn: 'Biological Hazards' },
  { id: 'ergonomic', name: '인간공학적 유해요인', nameEn: 'Ergonomic Hazards' },
  { id: 'psychosocial', name: '심리사회적 유해요인', nameEn: 'Psychosocial Hazards' }
];
