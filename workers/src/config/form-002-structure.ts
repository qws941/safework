/**
 * Form 002: 근골격계부담작업 유해요인조사
 * Musculoskeletal Hazard Assessment Survey
 */

export interface Form002Structure {
  formId: string;
  formTitle: string;
  formVersion: string;
  sections: Form002Section[];
}

export interface Form002Section {
  sectionId: string;
  sectionTitle: string;
  sectionNumber: number;
  fields: Form002Field[];
}

export interface Form002Field {
  fieldId: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'radio' | 'checkbox' | 'select' | 'textarea' | 'bodypart';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  subFields?: Form002SubField[];
}

export interface Form002SubField {
  subFieldId: string;
  subFieldLabel: string;
  fieldType: 'text' | 'number' | 'radio' | 'checkbox' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
  maxLength?: number;
}

/**
 * Form 002 구조 - 근골격계부담작업 유해요인조사
 */
export const FORM_002_STRUCTURE: Form002Structure = {
  formId: '002',
  formTitle: '근골격계부담작업 유해요인조사 (Musculoskeletal Hazard Assessment)',
  formVersion: '1.0.0',
  sections: [
    // ========== 섹션 1: 기본 정보 ==========
    {
      sectionId: 'basic_info',
      sectionTitle: '기본 정보',
      sectionNumber: 1,
      fields: [
        {
          fieldId: 'number',
          fieldLabel: '번호',
          fieldType: 'text',
          required: false,
          placeholder: '001'
        },
        {
          fieldId: 'name',
          fieldLabel: '성명',
          fieldType: 'text',
          required: true,
          placeholder: '홍길동'
        },
        {
          fieldId: 'age',
          fieldLabel: '나이',
          fieldType: 'number',
          required: true,
          validation: {
            min: 18,
            max: 100
          },
          placeholder: '30'
        },
        {
          fieldId: 'gender',
          fieldLabel: '성별',
          fieldType: 'radio',
          required: true,
          options: ['남성', '여성']
        },
        {
          fieldId: 'work_experience',
          fieldLabel: '근무경력 (년)',
          fieldType: 'number',
          required: true,
          validation: {
            min: 0,
            max: 50
          },
          placeholder: '5'
        },
        {
          fieldId: 'married',
          fieldLabel: '결혼 여부',
          fieldType: 'radio',
          required: false,
          options: ['기혼', '미혼']
        },
        {
          fieldId: 'department',
          fieldLabel: '부서',
          fieldType: 'text',
          required: true,
          placeholder: '생산1팀'
        },
        {
          fieldId: 'line',
          fieldLabel: '라인/공정',
          fieldType: 'text',
          required: false,
          placeholder: '조립라인'
        },
        {
          fieldId: 'work_type',
          fieldLabel: '작업 유형',
          fieldType: 'text',
          required: false,
          placeholder: '조립 작업'
        }
      ]
    },

    // ========== 섹션 2: 근무 정보 상세 ==========
    {
      sectionId: 'work_details',
      sectionTitle: '근무 정보 상세',
      sectionNumber: 2,
      fields: [
        {
          fieldId: 'work_period',
          fieldLabel: '현 작업 근무 기간',
          fieldType: 'text',
          required: false,
          placeholder: '2년 6개월'
        },
        {
          fieldId: 'current_work_period',
          fieldLabel: '현 작업 근무 개월수',
          fieldType: 'number',
          required: false,
          validation: {
            min: 0,
            max: 600
          },
          placeholder: '30'
        },
        {
          fieldId: 'daily_work_hours',
          fieldLabel: '1일 평균 작업시간 (시간)',
          fieldType: 'number',
          required: false,
          validation: {
            min: 1,
            max: 24
          },
          placeholder: '8'
        },
        {
          fieldId: 'rest_time',
          fieldLabel: '휴게 시간 (분)',
          fieldType: 'number',
          required: false,
          validation: {
            min: 0,
            max: 480
          },
          placeholder: '60'
        },
        {
          fieldId: 'previous_work_period',
          fieldLabel: '이전 작업 근무 기간 (개월)',
          fieldType: 'number',
          required: false,
          validation: {
            min: 0,
            max: 600
          },
          placeholder: '24'
        },
        {
          fieldId: 'physical_burden',
          fieldLabel: '신체적 부담 정도',
          fieldType: 'radio',
          required: false,
          options: ['매우 낮음', '낮음', '보통', '높음', '매우 높음']
        }
      ]
    },

    // ========== 섹션 3: 신체 부위별 증상 조사 ==========
    {
      sectionId: 'body_symptoms',
      sectionTitle: '신체 부위별 증상 조사',
      sectionNumber: 3,
      fields: [
        {
          fieldId: 'body_parts',
          fieldLabel: '증상이 있는 신체 부위를 선택하고 각 부위별로 상세 정보를 입력해주세요',
          fieldType: 'bodypart',
          required: true,
          options: ['목', '어깨', '팔/팔꿈치', '손/손목', '허리', '다리/발'],
          subFields: [
            {
              subFieldId: 'pain_presence',
              subFieldLabel: '통증 유무',
              fieldType: 'radio',
              required: true,
              options: ['있음', '없음']
            },
            {
              subFieldId: 'pain_duration',
              subFieldLabel: '통증 지속 기간',
              fieldType: 'radio',
              required: true,
              options: ['1일 미만', '1-7일', '1주일 이상', '1-4주', '1-6개월', '6개월 이상']
            },
            {
              subFieldId: 'pain_intensity',
              subFieldLabel: '통증 강도 (1-10)',
              fieldType: 'select',
              required: true,
              options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
            },
            {
              subFieldId: 'pain_frequency',
              subFieldLabel: '통증 발생 빈도',
              fieldType: 'radio',
              required: true,
              options: ['월 1회 미만', '월 1-3회', '주 1-2회', '주 3-4회', '매일']
            },
            {
              subFieldId: 'daily_interference',
              subFieldLabel: '일상생활 지장 정도',
              fieldType: 'radio',
              required: true,
              options: ['없음', '약간', '보통', '심함', '매우 심함']
            },
            {
              subFieldId: 'medical_attention',
              subFieldLabel: '의료기관 방문 여부',
              fieldType: 'radio',
              required: true,
              options: ['예', '아니오']
            }
          ]
        }
      ]
    },

    // ========== 섹션 4: 작업 환경 유해요인 ==========
    {
      sectionId: 'hazard_factors',
      sectionTitle: '작업 환경 유해요인',
      sectionNumber: 4,
      fields: [
        {
          fieldId: 'repetitive_motion',
          fieldLabel: '반복 작업',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        },
        {
          fieldId: 'awkward_posture',
          fieldLabel: '부적절한 자세',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        },
        {
          fieldId: 'heavy_lifting',
          fieldLabel: '중량물 취급',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        },
        {
          fieldId: 'vibration_exposure',
          fieldLabel: '진동 노출',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        },
        {
          fieldId: 'contact_stress',
          fieldLabel: '접촉 스트레스',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        },
        {
          fieldId: 'static_posture',
          fieldLabel: '정적 자세 유지',
          fieldType: 'radio',
          required: false,
          options: ['예', '아니오']
        }
      ]
    },

    // ========== 섹션 5: 개선 요청 사항 ==========
    {
      sectionId: 'improvement_requests',
      sectionTitle: '개선 요청 사항',
      sectionNumber: 5,
      fields: [
        {
          fieldId: 'ergonomic_issues',
          fieldLabel: '인체공학적 문제점 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '작업대 높이 부적절',
            '의자 불편함',
            '작업 공간 협소',
            '조명 부족',
            '보조 도구 부족',
            '작업 속도 과다',
            '휴게 시간 부족',
            '기타'
          ]
        },
        {
          fieldId: 'improvement_suggestions',
          fieldLabel: '작업 환경 개선 건의 사항',
          fieldType: 'textarea',
          required: false,
          placeholder: '작업 환경 개선을 위한 구체적인 건의 사항을 자유롭게 작성해주세요.'
        },
        {
          fieldId: 'tools_needed',
          fieldLabel: '필요한 보조 도구 또는 장비',
          fieldType: 'textarea',
          required: false,
          placeholder: '작업 수행에 필요한 보조 도구나 장비를 작성해주세요.'
        }
      ]
    },

    // ========== 섹션 6: 추가 의견 ==========
    {
      sectionId: 'additional_info',
      sectionTitle: '추가 의견',
      sectionNumber: 6,
      fields: [
        {
          fieldId: 'additional_comments',
          fieldLabel: '기타 의견 및 건의 사항',
          fieldType: 'textarea',
          required: false,
          placeholder: '조사표에 포함되지 않은 내용이나 추가로 전달하고 싶은 의견이 있으시면 자유롭게 작성해주세요.'
        }
      ]
    }
  ]
};

/**
 * 신체 부위 목록 (Form 002용)
 */
export const BODY_PARTS_002 = [
  {
    id: 'neck',
    name: '목',
    nameEn: 'Neck',
    icon: '🔴',
    description: '목, 경추 부위'
  },
  {
    id: 'shoulder',
    name: '어깨',
    nameEn: 'Shoulder',
    icon: '🟠',
    description: '어깨, 견갑골 부위'
  },
  {
    id: 'arm',
    name: '팔/팔꿈치',
    nameEn: 'Arm/Elbow',
    icon: '🟡',
    description: '팔, 팔꿈치, 상완 부위'
  },
  {
    id: 'hand',
    name: '손/손목',
    nameEn: 'Hand/Wrist',
    icon: '🟢',
    description: '손, 손목, 손가락 부위'
  },
  {
    id: 'waist',
    name: '허리',
    nameEn: 'Waist',
    icon: '🔵',
    description: '허리, 요추 부위'
  },
  {
    id: 'leg',
    name: '다리/발',
    nameEn: 'Leg/Foot',
    icon: '🟣',
    description: '다리, 무릎, 발, 발목 부위'
  }
];

/**
 * 폼 검증 규칙
 */
export const FORM_002_VALIDATION_RULES = {
  // 필수 필드 검증
  requiredFields: [
    'name',
    'age',
    'gender',
    'work_experience',
    'department',
    'body_parts'
  ],

  // 숫자 범위 검증
  numericRanges: {
    age: { min: 18, max: 100 },
    work_experience: { min: 0, max: 50 },
    current_work_period: { min: 0, max: 600 },
    daily_work_hours: { min: 1, max: 24 },
    rest_time: { min: 0, max: 480 },
    previous_work_period: { min: 0, max: 600 }
  },

  // 통증 강도 범위
  painIntensityRange: {
    min: 1,
    max: 10
  }
};

/**
 * 유해요인 카테고리
 */
export const HAZARD_FACTORS = [
  {
    id: 'repetitive_motion',
    name: '반복 작업',
    nameEn: 'Repetitive Motion',
    description: '동일한 동작의 반복적 수행'
  },
  {
    id: 'awkward_posture',
    name: '부적절한 자세',
    nameEn: 'Awkward Posture',
    description: '허리 굽힘, 팔 들기 등 부자연스러운 자세'
  },
  {
    id: 'heavy_lifting',
    name: '중량물 취급',
    nameEn: 'Heavy Lifting',
    description: '무거운 물건을 들거나 운반하는 작업'
  },
  {
    id: 'vibration_exposure',
    name: '진동 노출',
    nameEn: 'Vibration Exposure',
    description: '기계나 도구에서 발생하는 진동에 노출'
  },
  {
    id: 'contact_stress',
    name: '접촉 스트레스',
    nameEn: 'Contact Stress',
    description: '날카롭거나 딱딱한 물체와의 접촉'
  },
  {
    id: 'static_posture',
    name: '정적 자세 유지',
    nameEn: 'Static Posture',
    description: '장시간 동일 자세 유지'
  }
];
