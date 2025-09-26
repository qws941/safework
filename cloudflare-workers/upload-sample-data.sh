#!/bin/bash

# SafeWork Data Migration to Cloudflare Workers KV
# This script uploads sample industrial safety data to KV namespaces

echo "🚀 Starting SafeWork data migration to Cloudflare Workers KV..."

# Survey data
echo "📋 Uploading survey data..."

# Survey 1 - 김철수 근골격계 증상
echo '{"id":"survey_001_20240101","form_type":"001_musculoskeletal_symptom_survey","responses":{"name":"김철수","age":35,"gender":"male","department":"제조팀","work_years":8,"daily_work_hours":"8_to_10","body_parts":["shoulder","back","hand"],"has_pain":"yes","pain_intensity":6,"symptom_description":"작업 후 어깨와 허리에 지속적인 통증이 있음","work_satisfaction":"neutral","improvement_needed":"작업대 높이 조절 및 휴식 공간 개선 필요"},"submitted_at":"2024-01-01T09:30:00Z","ip_address":"192.168.1.100"}' > /tmp/survey1.json
npx wrangler kv key put "survey_001_20240101" --path=/tmp/survey1.json --namespace-id="81ca01654d204124aad62280cebe410e"

# Survey 2 - 박영희 근골격계 증상
echo '{"id":"survey_002_20240102","form_type":"001_musculoskeletal_symptom_survey","responses":{"name":"박영희","age":28,"gender":"female","department":"포장팀","work_years":3,"daily_work_hours":"8_to_10","body_parts":["neck","hand"],"has_pain":"yes","pain_intensity":4,"symptom_description":"장시간 반복작업으로 인한 목과 손목 피로","work_satisfaction":"satisfied","improvement_needed":"작업 순환제 도입"},"submitted_at":"2024-01-02T14:15:00Z","ip_address":"192.168.1.101"}' > /tmp/survey2.json
npx wrangler kv key put "survey_002_20240102" --path=/tmp/survey2.json --namespace-id="81ca01654d204124aad62280cebe410e"

# Survey 3 - 위험성 평가
echo '{"id":"survey_003_20240103","form_type":"002_workplace_risk_assessment","responses":{"assessment_date":"2024-01-03","workplace_name":"1층 생산라인","assessor":"안전관리자 이민수","risk_factors":"기계 부품 교체 시 끼임 위험, 소음 노출, 화학물질 취급","risk_level":"medium","improvement_measures":"안전보호구 착용 의무화, 정기 안전교육 실시, 환기시설 개선"},"submitted_at":"2024-01-03T11:00:00Z","ip_address":"192.168.1.102"}' > /tmp/survey3.json
npx wrangler kv key put "survey_003_20240103" --path=/tmp/survey3.json --namespace-id="81ca01654d204124aad62280cebe410e"

# Survey 4 - 최동훈 중증 증상
echo '{"id":"survey_004_20240104","form_type":"001_musculoskeletal_symptom_survey","responses":{"name":"최동훈","age":42,"gender":"male","department":"운반팀","work_years":15,"daily_work_hours":"10_to_12","body_parts":["back","leg"],"has_pain":"yes","pain_intensity":8,"symptom_description":"중량물 운반으로 인한 허리디스크 및 다리 부종","work_satisfaction":"dissatisfied","improvement_needed":"중량물 운반 보조장비 도입, 작업시간 단축 필요"},"submitted_at":"2024-01-04T16:45:00Z","ip_address":"192.168.1.103"}' > /tmp/survey4.json
npx wrangler kv key put "survey_004_20240104" --path=/tmp/survey4.json --namespace-id="81ca01654d204124aad62280cebe410e"

# Survey 5 - 높은 위험도 평가
echo '{"id":"survey_005_20240105","form_type":"002_workplace_risk_assessment","responses":{"assessment_date":"2024-01-05","workplace_name":"2층 조립라인","assessor":"현장관리자 한석희","risk_factors":"전기 노출, 날카로운 부품 취급, 높은 곳 작업","risk_level":"high","improvement_measures":"전기 차단장치 설치, 보호장갑 지급, 안전 발판 설치"},"submitted_at":"2024-01-05T08:30:00Z","ip_address":"192.168.1.104"}' > /tmp/survey5.json
npx wrangler kv key put "survey_005_20240105" --path=/tmp/survey5.json --namespace-id="81ca01654d204124aad62280cebe410e"

# Survey 6 - 정수민 품질관리
echo '{"id":"survey_006_20240106","form_type":"001_musculoskeletal_symptom_survey","responses":{"name":"정수민","age":31,"gender":"female","department":"품질관리팀","work_years":5,"daily_work_hours":"8_to_10","body_parts":["neck","shoulder"],"has_pain":"yes","pain_intensity":5,"symptom_description":"현미경 검사 업무로 인한 목과 어깨 경직","work_satisfaction":"neutral","improvement_needed":"검사 장비 높이 조절, 정기적 스트레칭 시간 확보"},"submitted_at":"2024-01-06T13:20:00Z","ip_address":"192.168.1.105"}' > /tmp/survey6.json
npx wrangler kv key put "survey_006_20240106" --path=/tmp/survey6.json --namespace-id="81ca01654d204124aad62280cebe410e"

echo "👥 Uploading user data..."

# Users
echo '{"id":"user_admin_001","username":"admin","password":"safework2024","email":"admin@safework.com","role":"administrator","department":"안전관리팀","createdAt":"2024-01-01T00:00:00Z"}' > /tmp/user_admin.json
npx wrangler kv key put "user_admin" --path=/tmp/user_admin.json --namespace-id="6c43ba0c4ecd4a9e80079777ac52b3d9"

echo '{"id":"user_manager_001","username":"safety_manager","password":"manager2024","email":"manager@safework.com","role":"manager","department":"안전관리팀","createdAt":"2024-01-01T00:00:00Z"}' > /tmp/user_manager.json
npx wrangler kv key put "user_safety_manager" --path=/tmp/user_manager.json --namespace-id="6c43ba0c4ecd4a9e80079777ac52b3d9"

echo "📄 Uploading document metadata..."

# Documents
echo '{"id":"doc_001_20240101","title":"근골격계질환 예방 가이드라인","description":"산업현장 근골격계질환 예방을 위한 종합 가이드라인","filename":"musculoskeletal_prevention_guide.pdf","size":2048000,"type":"application/pdf","category":"guidelines","uploadedAt":"2024-01-01T00:00:00Z"}' > /tmp/doc1.json
npx wrangler kv key put "doc_001_20240101" --path=/tmp/doc1.json --namespace-id="42e4c9d21d2042cb8ea471a64f5adca6"

echo '{"id":"doc_002_20240102","title":"작업장 위험성 평가 체크리스트","description":"정기 작업장 위험성 평가를 위한 표준 체크리스트","filename":"risk_assessment_checklist.xlsx","size":512000,"type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","category":"forms","uploadedAt":"2024-01-02T00:00:00Z"}' > /tmp/doc2.json
npx wrangler kv key put "doc_002_20240102" --path=/tmp/doc2.json --namespace-id="42e4c9d21d2042cb8ea471a64f5adca6"

echo '{"id":"doc_003_20240103","title":"산업안전보건법 개정안 요약","description":"2024년 산업안전보건법 개정사항 요약본","filename":"osh_law_amendments_2024.pdf","size":1024000,"type":"application/pdf","category":"legal","uploadedAt":"2024-01-03T00:00:00Z"}' > /tmp/doc3.json
npx wrangler kv key put "doc_003_20240103" --path=/tmp/doc3.json --namespace-id="42e4c9d21d2042cb8ea471a64f5adca6"

echo "🧹 Cleaning up temporary files..."
rm -f /tmp/survey*.json /tmp/user*.json /tmp/doc*.json

echo "✅ Data migration completed successfully!"
echo "📊 Uploaded data:"
echo "   - 6 industrial safety surveys (근골격계 증상 & 위험성 평가)"
echo "   - 2 user accounts (admin, safety_manager)"
echo "   - 3 safety documents"
echo ""
echo "🌍 Test the data at: https://safework.qwer941a.workers.dev/api/surveys"