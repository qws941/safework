/**
 * 001 근골격계 자각증상 조사표 - 완벽한 HWP 원본 데이터 구조
 * 빠진 항목 없이 모든 필드 포함
 */

export interface Form001Structure {
  formId: string;
  formTitle: string;
  formVersion: string;
  sections: Form001Section[];
}

export interface Form001Section {
  sectionId: string;
  sectionTitle: string;
  sectionNumber: number;
  fields: Form001Field[];
}

export interface Form001Field {
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
  subFields?: Form001SubField[];
}

export interface Form001SubField {
  subFieldId: string;
  subFieldLabel: string;
  fieldType: 'text' | 'number' | 'radio' | 'checkbox' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
  maxLength?: number;
}

/**
 * 완벽한 001 폼 구조 - HWP 원본 기준
 */
export const FORM_001_COMPLETE_STRUCTURE: Form001Structure = {
  formId: '001',
  formTitle: '근골격계 자각증상 조사표 (Musculoskeletal Symptom Survey)',
  formVersion: '2.0-cloudflare-native',
  sections: [
    // ========== 섹션 1: 기본 정보 ==========
    {
      sectionId: 'basic_info',
      sectionTitle: '기본 정보',
      sectionNumber: 1,
      fields: [
        {
          fieldId: 'name',
          fieldLabel: '성명',
          fieldType: 'text',
          required: true,
          placeholder: '홍길동'
        },
        {
          fieldId: 'employee_number',
          fieldLabel: '사번',
          fieldType: 'text',
          required: false,
          placeholder: 'EMP-12345'
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
          fieldId: 'department',
          fieldLabel: '부서',
          fieldType: 'text',
          required: true,
          placeholder: '생산1팀'
        },
        {
          fieldId: 'position',
          fieldLabel: '직위',
          fieldType: 'text',
          required: false,
          placeholder: '대리'
        }
      ]
    },

    // ========== 섹션 2: 근무 정보 ==========
    {
      sectionId: 'work_info',
      sectionTitle: '근무 정보',
      sectionNumber: 2,
      fields: [
        {
          fieldId: 'work_years',
          fieldLabel: '현 작업 근무 연수',
          fieldType: 'number',
          required: true,
          validation: {
            min: 0,
            max: 50
          },
          placeholder: '5'
        },
        {
          fieldId: 'work_months',
          fieldLabel: '현 작업 근무 개월',
          fieldType: 'number',
          required: true,
          validation: {
            min: 0,
            max: 11
          },
          placeholder: '6'
        },
        {
          fieldId: 'daily_work_hours',
          fieldLabel: '1일 평균 작업시간',
          fieldType: 'number',
          required: true,
          validation: {
            min: 1,
            max: 24
          },
          placeholder: '8'
        },
        {
          fieldId: 'work_type',
          fieldLabel: '작업 형태',
          fieldType: 'checkbox',
          required: false,
          options: [
            '반복 작업',
            '중량물 취급',
            '부적절한 자세',
            '진동 노출',
            '정밀 작업',
            '장시간 서있기',
            '장시간 앉아있기'
          ]
        }
      ]
    },

    // ========== 섹션 3: 현재 증상 유무 ==========
    {
      sectionId: 'current_symptom',
      sectionTitle: '현재 근골격계 증상 유무',
      sectionNumber: 3,
      fields: [
        {
          fieldId: 'has_symptoms',
          fieldLabel: '지난 1년 동안 목, 어깨, 팔/팔꿈치, 손/손목/손가락, 허리, 다리/발 등에 통증이나 불편함을 느낀 적이 있습니까?',
          fieldType: 'radio',
          required: true,
          options: ['예', '아니오']
        }
      ]
    },

    // ========== 섹션 4: 신체 부위별 증상 상세 평가 ==========
    {
      sectionId: 'body_parts_evaluation',
      sectionTitle: '신체 부위별 증상 상세 평가',
      sectionNumber: 4,
      fields: [
        {
          fieldId: 'body_parts',
          fieldLabel: '증상이 있는 신체 부위를 선택해주세요',
          fieldType: 'bodypart',
          required: true,
          options: ['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'],
          subFields: [
            // 각 신체 부위 선택 시 아래 하위 질문들이 표시됨
            {
              subFieldId: 'side',
              subFieldLabel: '증상 부위 (좌/우/양쪽)',
              fieldType: 'radio',
              required: true,
              options: ['왼쪽', '오른쪽', '양쪽']
            },
            {
              subFieldId: 'duration',
              subFieldLabel: '증상 지속 기간',
              fieldType: 'radio',
              required: true,
              options: [
                '1주일 미만',
                '1주일 ~ 1개월',
                '1개월 ~ 6개월',
                '6개월 이상'
              ]
            },
            {
              subFieldId: 'frequency',
              subFieldLabel: '증상 발생 빈도',
              fieldType: 'radio',
              required: true,
              options: [
                '한달에 1-3일',
                '한달에 4-7일',
                '주 1-2회',
                '주 3-4회',
                '매일'
              ]
            },
            {
              subFieldId: 'severity',
              subFieldLabel: '통증 정도 (0-10점)',
              fieldType: 'radio',
              required: true,
              options: [
                '1점 (매우 약함)',
                '2점',
                '3점 (약함)',
                '4점',
                '5점 (보통)',
                '6점',
                '7점 (중간 정도)',
                '8점',
                '9점 (심한 통증)',
                '10점 (매우 심한 통증)'
              ]
            },
            {
              subFieldId: 'last_week_pain',
              subFieldLabel: '지난 1주일간 통증이 있었습니까?',
              fieldType: 'radio',
              required: true,
              options: ['예', '아니오']
            },
            {
              subFieldId: 'work_interference',
              subFieldLabel: '일상생활이나 작업에 지장을 주었습니까?',
              fieldType: 'radio',
              required: true,
              options: ['예', '아니오']
            },
            {
              subFieldId: 'consequences',
              subFieldLabel: '통증으로 인한 결과 (중복 선택 가능)',
              fieldType: 'checkbox',
              required: false,
              options: [
                '병가',
                '작업 전환',
                '의료기관 방문',
                '약물 복용',
                '물리치료',
                '특별한 조치 없음',
                '기타'
              ]
            },
            {
              subFieldId: 'consequence_other',
              subFieldLabel: '기타 (구체적으로 기술)',
              fieldType: 'textarea',
              required: false,
              placeholder: '기타 통증으로 인한 결과를 자유롭게 기술해주세요.'
            }
          ]
        }
      ]
    },

    // ========== 섹션 5: 통증 발생 원인 및 작업 환경 ==========
    {
      sectionId: 'pain_causes',
      sectionTitle: '통증 발생 원인 및 작업 환경',
      sectionNumber: 5,
      fields: [
        {
          fieldId: 'pain_timing',
          fieldLabel: '통증 발생 시기',
          fieldType: 'radio',
          required: false,
          options: [
            '작업 중',
            '작업 후',
            '아침 기상 시',
            '밤 수면 중',
            '특정 동작 시',
            '항상'
          ]
        },
        {
          fieldId: 'pain_trigger',
          fieldLabel: '통증 유발 동작',
          fieldType: 'checkbox',
          required: false,
          options: [
            '물건 들어올리기',
            '물건 내려놓기',
            '밀고 당기기',
            '반복적인 손목 사용',
            '고개 숙이기',
            '팔 들어올리기',
            '허리 굽히기',
            '장시간 서있기',
            '장시간 앉아있기',
            '계단 오르내리기'
          ]
        },
        {
          fieldId: 'work_posture',
          fieldLabel: '주요 작업 자세',
          fieldType: 'checkbox',
          required: false,
          options: [
            '서서 작업',
            '앉아서 작업',
            '쪼그려 앉아 작업',
            '무릎 꿇고 작업',
            '허리 굽혀 작업',
            '팔 들어 작업',
            '고개 숙여 작업',
            '비틀어서 작업'
          ]
        },
        {
          fieldId: 'heavy_lifting_frequency',
          fieldLabel: '중량물 취급 빈도',
          fieldType: 'radio',
          required: false,
          options: [
            '거의 없음',
            '가끔 (주 1-2회)',
            '보통 (주 3-4회)',
            '자주 (매일)',
            '매우 자주 (하루 여러 번)'
          ]
        },
        {
          fieldId: 'heavy_lifting_weight',
          fieldLabel: '취급 중량물 무게',
          fieldType: 'radio',
          required: false,
          options: [
            '5kg 미만',
            '5-10kg',
            '10-20kg',
            '20-30kg',
            '30kg 이상'
          ]
        }
      ]
    },

    // ========== 섹션 6: 과거 병력 및 치료 이력 ==========
    {
      sectionId: 'medical_history',
      sectionTitle: '과거 병력 및 치료 이력',
      sectionNumber: 6,
      fields: [
        {
          fieldId: 'previous_musculo_disease',
          fieldLabel: '과거 근골격계 질환 진단 이력',
          fieldType: 'radio',
          required: false,
          options: ['있음', '없음']
        },
        {
          fieldId: 'previous_disease_type',
          fieldLabel: '과거 진단받은 질환 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '목 디스크 (경추 추간판 탈출증)',
            '어깨 질환 (회전근개 파열, 오십견 등)',
            '손목터널증후군',
            '테니스 엘보 / 골프 엘보',
            '허리 디스크 (요추 추간판 탈출증)',
            '척추관 협착증',
            '무릎 관절염',
            '족저근막염',
            '기타'
          ]
        },
        {
          fieldId: 'previous_disease_other',
          fieldLabel: '기타 질환 (구체적으로 기술)',
          fieldType: 'textarea',
          required: false,
          placeholder: '기타 근골격계 질환을 자유롭게 기술해주세요.'
        },
        {
          fieldId: 'current_treatment',
          fieldLabel: '현재 치료 중인 근골격계 질환',
          fieldType: 'radio',
          required: false,
          options: ['있음', '없음']
        },
        {
          fieldId: 'treatment_method',
          fieldLabel: '치료 방법 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '약물 치료',
            '물리 치료',
            '주사 치료',
            '한방 치료',
            '수술 치료',
            '운동 치료',
            '기타'
          ]
        }
      ]
    },

    // ========== 섹션 7: 생활 습관 및 운동 ==========
    {
      sectionId: 'lifestyle',
      sectionTitle: '생활 습관 및 운동',
      sectionNumber: 7,
      fields: [
        {
          fieldId: 'exercise_frequency',
          fieldLabel: '규칙적인 운동 빈도',
          fieldType: 'radio',
          required: false,
          options: [
            '전혀 하지 않음',
            '월 1-2회',
            '주 1-2회',
            '주 3-4회',
            '주 5회 이상'
          ]
        },
        {
          fieldId: 'exercise_type',
          fieldLabel: '주로 하는 운동 종류 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '걷기/조깅',
            '수영',
            '자전거',
            '헬스/웨이트 트레이닝',
            '요가/필라테스',
            '구기 종목 (축구, 농구 등)',
            '등산',
            '기타'
          ]
        },
        {
          fieldId: 'smoking_status',
          fieldLabel: '흡연 여부',
          fieldType: 'radio',
          required: false,
          options: ['비흡연', '과거 흡연', '현재 흡연']
        },
        {
          fieldId: 'smoking_amount',
          fieldLabel: '하루 흡연량 (현재 흡연자만)',
          fieldType: 'radio',
          required: false,
          options: [
            '반 갑 미만',
            '반 갑 ~ 1갑',
            '1갑 ~ 2갑',
            '2갑 이상'
          ]
        },
        {
          fieldId: 'sleep_hours',
          fieldLabel: '하루 평균 수면 시간',
          fieldType: 'radio',
          required: false,
          options: [
            '4시간 미만',
            '4-5시간',
            '5-6시간',
            '6-7시간',
            '7-8시간',
            '8시간 이상'
          ]
        },
        {
          fieldId: 'sleep_quality',
          fieldLabel: '수면의 질',
          fieldType: 'radio',
          required: false,
          options: [
            '매우 나쁨',
            '나쁨',
            '보통',
            '좋음',
            '매우 좋음'
          ]
        },
        {
          fieldId: 'stress_level',
          fieldLabel: '업무 스트레스 수준',
          fieldType: 'radio',
          required: false,
          options: [
            '매우 낮음',
            '낮음',
            '보통',
            '높음',
            '매우 높음'
          ]
        }
      ]
    },

    // ========== 섹션 8: 작업 환경 개선 요청 ==========
    {
      sectionId: 'improvement_requests',
      sectionTitle: '작업 환경 개선 요청 사항',
      sectionNumber: 8,
      fields: [
        {
          fieldId: 'workplace_issues',
          fieldLabel: '현재 작업장의 문제점 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '작업대 높이 부적절',
            '의자 불편함',
            '조명 부족',
            '소음 문제',
            '온도/습도 부적절',
            '작업 공간 협소',
            '보조 도구 부족',
            '휴게 시간 부족',
            '작업 속도 과다',
            '기타'
          ]
        },
        {
          fieldId: 'improvement_suggestions',
          fieldLabel: '작업 환경 개선 건의 사항',
          fieldType: 'textarea',
          required: false,
          placeholder: '작업 환경 개선을 위한 구체적인 건의 사항을 자유롭게 작성해주세요.\n예: 작업대 높이 조절, 의자 교체, 보조 도구 지급 등'
        },
        {
          fieldId: 'ergonomic_tools_needed',
          fieldLabel: '필요한 인체공학적 도구 (중복 선택 가능)',
          fieldType: 'checkbox',
          required: false,
          options: [
            '손목 받침대',
            '발판',
            '요추 지지 쿠션',
            '목 베개',
            '모니터 받침대',
            '인체공학 마우스',
            '인체공학 키보드',
            '높이 조절 책상',
            '인체공학 의자',
            '기타'
          ]
        }
      ]
    },

    // ========== 섹션 9: 추가 의견 ==========
    {
      sectionId: 'additional_comments',
      sectionTitle: '추가 의견',
      sectionNumber: 9,
      fields: [
        {
          fieldId: 'additional_comments',
          fieldLabel: '기타 의견 및 건의 사항',
          fieldType: 'textarea',
          required: false,
          placeholder: '조사표에 포함되지 않은 내용이나 추가로 전달하고 싶은 의견이 있으시면 자유롭게 작성해주세요.'
        },
        {
          fieldId: 'survey_difficulty',
          fieldLabel: '본 조사표 작성의 난이도',
          fieldType: 'radio',
          required: false,
          options: [
            '매우 쉬움',
            '쉬움',
            '보통',
            '어려움',
            '매우 어려움'
          ]
        },
        {
          fieldId: 'survey_time',
          fieldLabel: '조사표 작성 소요 시간',
          fieldType: 'radio',
          required: false,
          options: [
            '5분 미만',
            '5-10분',
            '10-15분',
            '15-20분',
            '20분 이상'
          ]
        }
      ]
    }
  ]
};

/**
 * 신체 부위 상세 정보 매핑
 */
export const BODY_PARTS_MAPPING = {
  neck: {
    ko: '목',
    icon: '🔴',
    description: '목, 경추 부위'
  },
  shoulder: {
    ko: '어깨',
    icon: '🟠',
    description: '어깨, 견갑골 부위'
  },
  arm: {
    ko: '팔/팔꿈치',
    icon: '🟡',
    description: '팔, 팔꿈치, 상완 부위'
  },
  hand: {
    ko: '손/손목/손가락',
    icon: '🟢',
    description: '손, 손목, 손가락 부위'
  },
  waist: {
    ko: '허리',
    icon: '🔵',
    description: '허리, 요추 부위'
  },
  leg: {
    ko: '다리/발',
    icon: '🟣',
    description: '다리, 무릎, 발, 발목 부위'
  }
};

/**
 * 폼 검증 규칙
 */
export const FORM_001_VALIDATION_RULES = {
  // 필수 필드 검증
  requiredFields: [
    'name',
    'age',
    'gender',
    'department',
    'work_years',
    'work_months',
    'daily_work_hours',
    'has_symptoms'
  ],

  // 조건부 필수 필드 (증상이 '예'인 경우)
  conditionalRequired: {
    when: { field: 'has_symptoms', value: '예' },
    fields: ['body_parts']
  },

  // 숫자 범위 검증
  numericRanges: {
    age: { min: 18, max: 100 },
    work_years: { min: 0, max: 50 },
    work_months: { min: 0, max: 11 },
    daily_work_hours: { min: 1, max: 24 }
  }
};