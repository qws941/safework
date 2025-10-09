/**
 * Form 003: 근골격계질환 예방관리 프로그램 조사표
 * Musculoskeletal Disease Prevention Management Program Survey
 */

export const FORM_003_STRUCTURE = {
  formId: '003',
  formName: '근골격계질환 예방관리 프로그램 조사표',
  formNameEn: 'Musculoskeletal Disease Prevention Program Survey',
  version: '1.0.0',
  description: '근골격계 질환 예방을 위한 건강 상태 조사',

  sections: [
    {
      sectionId: 'basic_info',
      sectionName: '기본 정보',
      fields: [
        { name: 'name', label: '성명', type: 'text', required: true },
        { name: 'age', label: '나이', type: 'number', required: true, min: 18, max: 100 },
        { name: 'gender', label: '성별', type: 'select', required: true, options: ['남성', '여성'] },
        { name: 'department', label: '부서/팀', type: 'text', required: false },
        { name: 'position', label: '직위/직책', type: 'text', required: false }
      ]
    },
    {
      sectionId: 'body_parts',
      sectionName: '신체 부위별 통증 조사',
      bodyParts: [
        {
          id: 'neck',
          name: '목',
          nameEn: 'Neck',
          fields: [
            { name: 'neck_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'neck_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'neck_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'neck_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'neck_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        },
        {
          id: 'shoulder',
          name: '어깨',
          nameEn: 'Shoulder',
          fields: [
            { name: 'shoulder_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'shoulder_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'shoulder_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'shoulder_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'shoulder_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        },
        {
          id: 'arm',
          name: '팔/팔꿈치',
          nameEn: 'Arm/Elbow',
          fields: [
            { name: 'arm_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'arm_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'arm_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'arm_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'arm_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        },
        {
          id: 'hand',
          name: '손/손목',
          nameEn: 'Hand/Wrist',
          fields: [
            { name: 'hand_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'hand_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'hand_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'hand_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'hand_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        },
        {
          id: 'waist',
          name: '허리',
          nameEn: 'Waist/Lower Back',
          fields: [
            { name: 'waist_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'waist_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'waist_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'waist_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'waist_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        },
        {
          id: 'leg',
          name: '다리/발',
          nameEn: 'Leg/Foot',
          fields: [
            { name: 'leg_pain', label: '통증 여부', type: 'checkbox' },
            { name: 'leg_duration', label: '지속기간', type: 'select', options: ['1일미만', '1-7일', '1주일이상', '1-4주', '1-6개월', '6개월이상'] },
            { name: 'leg_intensity', label: '통증강도', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { name: 'leg_frequency', label: '발생빈도', type: 'select', options: ['월1회미만', '월1-3회', '주1-2회', '주3-4회', '매일'] },
            { name: 'leg_interference', label: '일상생활 지장', type: 'select', options: ['없음', '약간', '보통', '심함', '매우심함'] }
          ]
        }
      ]
    }
  ]
};

export const FORM_003_VALIDATION_RULES = {
  requiredFields: ['name', 'age', 'gender'],

  numericRanges: {
    age: { min: 18, max: 100 },
    neck_intensity: { min: 1, max: 10 },
    shoulder_intensity: { min: 1, max: 10 },
    arm_intensity: { min: 1, max: 10 },
    hand_intensity: { min: 1, max: 10 },
    waist_intensity: { min: 1, max: 10 },
    leg_intensity: { min: 1, max: 10 }
  },

  conditionalRequired: {
    when: { field: 'neck_pain', value: '예' },
    fields: ['neck_duration', 'neck_intensity', 'neck_frequency', 'neck_interference']
  }
};

export const BODY_PARTS_LIST = [
  { id: 'neck', name: '목', nameEn: 'Neck' },
  { id: 'shoulder', name: '어깨', nameEn: 'Shoulder' },
  { id: 'arm', name: '팔/팔꿈치', nameEn: 'Arm/Elbow' },
  { id: 'hand', name: '손/손목', nameEn: 'Hand/Wrist' },
  { id: 'waist', name: '허리', nameEn: 'Waist/Lower Back' },
  { id: 'leg', name: '다리/발', nameEn: 'Leg/Foot' }
];
