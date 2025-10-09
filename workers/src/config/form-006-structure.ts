/**
 * Form 006: 고령근로자 작업투입 승인요청서
 * Elderly Worker Assignment Approval Request Form
 */

export const FORM_006_STRUCTURE = {
  formId: '006',
  formName: '고령근로자 작업투입 승인요청서',
  formNameEn: 'Elderly Worker Assignment Approval Request Form',
  version: '1.0.0',
  description: '고령근로자 작업 배치 및 안전관리 승인',

  sections: [
    {
      sectionId: 'basic_info',
      sectionName: '기본 정보',
      fields: [
        { name: 'request_date', label: '요청일자', type: 'date', required: true },
        { name: 'company_name', label: '회사명', type: 'text', required: true },
        { name: 'department', label: '부서명', type: 'text', required: true },
        { name: 'manager_name', label: '담당관리자', type: 'text', required: true },
        { name: 'contact_number', label: '연락처', type: 'tel', required: true }
      ]
    },
    {
      sectionId: 'worker_info',
      sectionName: '근로자 정보',
      fields: [
        { name: 'worker_name', label: '근로자명', type: 'text', required: true },
        { name: 'worker_age', label: '연령', type: 'number', required: true, min: 50, max: 100 },
        {
          name: 'worker_gender',
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
          options: ['정규직', '계약직', '일용직', '파견근로자']
        },
        { name: 'start_date', label: '작업시작예정일', type: 'date', required: true },
        { name: 'previous_experience', label: '이전근무경력', type: 'textarea', required: false }
      ]
    },
    {
      sectionId: 'health_status',
      sectionName: '건강상태',
      fields: [
        { name: 'health_checkup_date', label: '건강검진일자', type: 'date', required: true },
        {
          name: 'health_status',
          label: '건강상태',
          type: 'select',
          required: true,
          options: ['양호', '보통', '주의', '부적합']
        },
        { name: 'chronic_diseases', label: '만성질환', type: 'textarea', required: false },
        { name: 'medication_status', label: '복용약물', type: 'textarea', required: false },
        { name: 'physical_limitations', label: '신체적제한사항', type: 'textarea', required: false },
        { name: 'doctor_opinion', label: '의사소견', type: 'textarea', required: false }
      ]
    },
    {
      sectionId: 'work_assignment',
      sectionName: '작업배정',
      fields: [
        { name: 'assigned_work', label: '배정작업', type: 'textarea', required: true },
        { name: 'work_location', label: '작업장소', type: 'text', required: true },
        {
          name: 'work_schedule',
          label: '근무일정',
          type: 'select',
          required: true,
          options: ['주간', '야간', '교대', '단시간']
        },
        {
          name: 'physical_demands',
          label: '육체적부담',
          type: 'select',
          required: true,
          options: ['가벼움', '보통', '무거움', '적응필요']
        },
        { name: 'hazard_factors', label: '위험요인', type: 'textarea', required: true },
        { name: 'safety_measures', label: '안전조치사항', type: 'textarea', required: true }
      ]
    },
    {
      sectionId: 'safety_management',
      sectionName: '안전관리',
      fields: [
        {
          name: 'safety_education',
          label: '안전교육',
          type: 'select',
          required: true,
          options: ['완료', '계획', '진행중', '미실시']
        },
        { name: 'supervisor_assignment', label: '지정감독자', type: 'text', required: true },
        {
          name: 'regular_monitoring',
          label: '정기모니터링',
          type: 'select',
          required: true,
          options: ['일일', '주간', '월간', '분기']
        },
        { name: 'protective_equipment', label: '보호구지급', type: 'textarea', required: true },
        { name: 'emergency_procedures', label: '비상시절차', type: 'textarea', required: true }
      ]
    },
    {
      sectionId: 'approval',
      sectionName: '승인',
      fields: [
        {
          name: 'approval_status',
          label: '승인상태',
          type: 'select',
          required: false,
          options: ['승인', '조건부승인', '반려', '검토중']
        },
        {
          name: 'review_period',
          label: '재검토주기',
          type: 'select',
          required: false,
          options: ['1개월', '3개월', '6개월', '1년']
        },
        { name: 'approved_by', label: '승인자', type: 'text', required: false },
        { name: 'approval_date', label: '승인일자', type: 'date', required: false },
        { name: 'approval_conditions', label: '승인조건', type: 'textarea', required: false },
        { name: 'comments', label: '특이사항', type: 'textarea', required: false }
      ]
    }
  ]
};

export const FORM_006_VALIDATION_RULES = {
  requiredFields: [
    'request_date',
    'company_name',
    'department',
    'manager_name',
    'contact_number',
    'worker_name',
    'worker_age',
    'worker_gender',
    'employment_type',
    'start_date',
    'health_checkup_date',
    'health_status',
    'assigned_work',
    'work_location',
    'work_schedule',
    'physical_demands',
    'hazard_factors',
    'safety_measures',
    'safety_education',
    'supervisor_assignment',
    'regular_monitoring',
    'protective_equipment',
    'emergency_procedures'
  ],

  numericRanges: {
    worker_age: { min: 50, max: 100 }
  },

  dateValidation: {
    health_checkup_date: 'within_two_years',
    start_date: 'must_be_today_or_future'
  }
};

export const EMPLOYMENT_TYPES = [
  { id: 'regular', name: '정규직', nameEn: 'Regular' },
  { id: 'contract', name: '계약직', nameEn: 'Contract' },
  { id: 'daily', name: '일용직', nameEn: 'Daily' },
  { id: 'dispatch', name: '파견근로자', nameEn: 'Dispatch Worker' }
];

export const HEALTH_STATUS_TYPES = [
  { id: 'good', name: '양호', nameEn: 'Good' },
  { id: 'fair', name: '보통', nameEn: 'Fair' },
  { id: 'caution', name: '주의', nameEn: 'Caution' },
  { id: 'unfit', name: '부적합', nameEn: 'Unfit' }
];

export const APPROVAL_STATUS_TYPES = [
  { id: 'approved', name: '승인', nameEn: 'Approved' },
  { id: 'conditional', name: '조건부승인', nameEn: 'Conditionally Approved' },
  { id: 'rejected', name: '반려', nameEn: 'Rejected' },
  { id: 'pending', name: '검토중', nameEn: 'Under Review' }
];
