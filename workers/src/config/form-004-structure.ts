/**
 * Form 004: 산업재해 실태조사표
 * Industrial Accident Survey
 */

export const FORM_004_STRUCTURE = {
  formId: '004',
  formName: '산업재해 실태조사표',
  formNameEn: 'Industrial Accident Survey',
  version: '1.0.0',
  description: '산업재해 발생 현황 및 예방을 위한 실태조사',

  sections: [
    {
      sectionId: 'basic_info',
      sectionName: '기본 정보',
      fields: [
        { name: 'company_name', label: '회사명', type: 'text', required: true },
        { name: 'department', label: '부서명', type: 'text', required: true },
        { name: 'investigator_name', label: '조사자명', type: 'text', required: true },
        { name: 'investigation_date', label: '조사일자', type: 'date', required: true },
        { name: 'accident_date', label: '재해발생일자', type: 'date', required: true }
      ]
    },
    {
      sectionId: 'victim_info',
      sectionName: '피재자 정보',
      fields: [
        { name: 'victim_name', label: '피재자명', type: 'text', required: true },
        { name: 'victim_age', label: '연령', type: 'number', required: true, min: 18, max: 80 },
        {
          name: 'victim_gender',
          label: '성별',
          type: 'select',
          required: true,
          options: ['남', '여']
        },
        {
          name: 'employment_type',
          label: '고용형태',
          type: 'select',
          required: true,
          options: ['정규직', '계약직', '일용직', '파견근로자', '하청업체']
        },
        { name: 'work_experience', label: '근무경력(개월)', type: 'number', required: true, min: 0 },
        {
          name: 'training_status',
          label: '안전교육이수',
          type: 'select',
          required: true,
          options: ['완료', '부분완료', '미이수', '해당없음']
        }
      ]
    },
    {
      sectionId: 'accident_info',
      sectionName: '재해 발생 정보',
      fields: [
        {
          name: 'accident_type',
          label: '재해형태',
          type: 'select',
          required: true,
          options: ['추락', '전도', '충돌', '낙하비래', '붕괴도괴', '끼임', '절단베임', '화재폭발', '중독질식', '감전', '온도관련', '기타']
        },
        {
          name: 'injury_type',
          label: '상해종류',
          type: 'select',
          required: true,
          options: ['골절', '타박상', '열상', '화상', '중독', '질식', '감전상', '동상', '열사병', '기타']
        },
        {
          name: 'body_part',
          label: '부상부위',
          type: 'select',
          required: true,
          options: ['머리', '목', '가슴', '복부', '등허리', '팔', '손', '다리', '발', '전신', '기타']
        },
        { name: 'accident_location', label: '재해발생장소', type: 'text', required: true },
        { name: 'work_process', label: '작업공정', type: 'text', required: true },
        { name: 'accident_cause', label: '재해원인', type: 'textarea', required: true }
      ]
    },
    {
      sectionId: 'work_environment',
      sectionName: '작업환경',
      fields: [
        {
          name: 'weather_conditions',
          label: '기상상태',
          type: 'select',
          required: false,
          options: ['맑음', '흐림', '비', '눈', '바람', '기타']
        },
        {
          name: 'lighting_conditions',
          label: '조명상태',
          type: 'select',
          required: false,
          options: ['양호', '보통', '불량', '야간작업']
        },
        {
          name: 'safety_equipment',
          label: '안전설비상태',
          type: 'select',
          required: true,
          options: ['정상', '불량', '미설치', '해당없음']
        },
        {
          name: 'protective_equipment_used',
          label: '보호구착용',
          type: 'select',
          required: true,
          options: ['완전착용', '부분착용', '미착용', '해당없음']
        },
        {
          name: 'safety_procedures',
          label: '안전절차준수',
          type: 'select',
          required: true,
          options: ['완전준수', '부분준수', '미준수', '절차없음']
        }
      ]
    },
    {
      sectionId: 'cause_analysis',
      sectionName: '원인 분석',
      fields: [
        { name: 'immediate_cause', label: '직접원인', type: 'textarea', required: true },
        { name: 'basic_cause', label: '기본원인', type: 'textarea', required: true },
        { name: 'management_cause', label: '관리적원인', type: 'textarea', required: false },
        { name: 'human_factors', label: '인적요인', type: 'textarea', required: false },
        { name: 'equipment_factors', label: '물적요인', type: 'textarea', required: false },
        { name: 'environmental_factors', label: '환경적요인', type: 'textarea', required: false }
      ]
    },
    {
      sectionId: 'prevention_measures',
      sectionName: '예방대책',
      fields: [
        { name: 'immediate_measures', label: '즉시조치사항', type: 'textarea', required: true },
        { name: 'short_term_measures', label: '단기대책', type: 'textarea', required: true },
        { name: 'long_term_measures', label: '중장기대책', type: 'textarea', required: false },
        { name: 'education_measures', label: '교육대책', type: 'textarea', required: false },
        { name: 'equipment_improvements', label: '설비개선사항', type: 'textarea', required: false }
      ]
    }
  ]
};

export const FORM_004_VALIDATION_RULES = {
  requiredFields: [
    'company_name',
    'department',
    'investigator_name',
    'investigation_date',
    'accident_date',
    'victim_name',
    'victim_age',
    'victim_gender',
    'employment_type',
    'work_experience',
    'training_status',
    'accident_type',
    'injury_type',
    'body_part',
    'accident_location',
    'work_process',
    'accident_cause',
    'safety_equipment',
    'protective_equipment_used',
    'safety_procedures',
    'immediate_cause',
    'basic_cause',
    'immediate_measures',
    'short_term_measures'
  ],

  numericRanges: {
    victim_age: { min: 18, max: 80 },
    work_experience: { min: 0, max: 600 }
  },

  dateValidation: {
    accident_date: 'must_be_before_or_equal_investigation_date'
  }
};

export const ACCIDENT_TYPES = [
  { id: 'fall', name: '추락', nameEn: 'Fall' },
  { id: 'slip', name: '전도', nameEn: 'Slip' },
  { id: 'collision', name: '충돌', nameEn: 'Collision' },
  { id: 'falling_object', name: '낙하비래', nameEn: 'Falling Object' },
  { id: 'collapse', name: '붕괴도괴', nameEn: 'Collapse' },
  { id: 'caught', name: '끼임', nameEn: 'Caught In/Between' },
  { id: 'cut', name: '절단베임', nameEn: 'Cut/Laceration' },
  { id: 'fire_explosion', name: '화재폭발', nameEn: 'Fire/Explosion' },
  { id: 'poisoning', name: '중독질식', nameEn: 'Poisoning/Asphyxiation' },
  { id: 'electrocution', name: '감전', nameEn: 'Electrocution' },
  { id: 'temperature', name: '온도관련', nameEn: 'Temperature Related' },
  { id: 'other', name: '기타', nameEn: 'Other' }
];
