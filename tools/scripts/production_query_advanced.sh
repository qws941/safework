#!/bin/bash

# SafeWork 운영환경 고도화된 조회 스크립트
# Portainer API 기반 실시간 데이터 조회 및 분석

set -e

# ===========================================
# 환경 설정
# ===========================================
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"
SAFEWORK_PROD_URL="https://safework.jclee.me"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ===========================================
# 유틸리티 함수
# ===========================================

print_header() {
    echo ""
    echo -e "${BLUE}================================================================================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
    echo ""
}

print_section() {
    echo -e "${CYAN}📊 $1${NC}"
    echo "----------------------------------------"
}

get_container_id() {
    local container_name="$1"
    curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r ".[] | select(.Names[] | contains(\"${container_name}\")) | .Id"
}

execute_sql_query() {
    local container_id="$1"
    local query="$2"
    local description="$3"

    echo -e "${YELLOW}🔍 $description${NC}"

    # Exec 생성
    local exec_response=$(curl -s -X POST \
        -H "X-API-Key: ${PORTAINER_TOKEN}" \
        -H "Content-Type: application/json" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${container_id}/exec" \
        -d "{
            \"Cmd\": [\"psql\", \"-U\", \"safework\", \"-d\", \"safework_db\", \"-c\", \"${query}\"],
            \"AttachStdout\": true,
            \"AttachStderr\": true
        }")

    local exec_id=$(echo "$exec_response" | jq -r '.Id')

    if [ "$exec_id" != "null" ] && [ -n "$exec_id" ]; then
        # Exec 실행
        curl -s -X POST \
            -H "X-API-Key: ${PORTAINER_TOKEN}" \
            -H "Content-Type: application/json" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/exec/${exec_id}/start" \
            -d '{"Detach": false, "Tty": false}' | \
            sed 's/\x00//g' | sed 's/\x01//g' | sed 's/\x02//g' | sed 's/\x08//g'
    else
        echo -e "${RED}❌ SQL 실행 실패: ${query}${NC}"
    fi
    echo ""
}

# ===========================================
# 메인 조회 함수들
# ===========================================

show_system_overview() {
    print_header "🚀 SafeWork 운영환경 시스템 개요"

    print_section "컨테이너 상태"
    curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) |
        "📦 " + .Names[0][1:] + " | 상태: " + .State + " | " + .Status'

    echo ""
    print_section "운영 URL 상태"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SAFEWORK_PROD_URL}/health" || echo "000")
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "${SAFEWORK_PROD_URL}/health" || echo "0")

    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "🌐 ${SAFEWORK_PROD_URL} | ${GREEN}✅ 정상 (HTTP ${HTTP_STATUS})${NC} | 응답시간: ${RESPONSE_TIME}초"
    else
        echo -e "🌐 ${SAFEWORK_PROD_URL} | ${RED}❌ 오류 (HTTP ${HTTP_STATUS})${NC}"
    fi

    echo ""
    print_section "시스템 리소스"
    local app_container_id=$(get_container_id "safework-app")
    if [ -n "$app_container_id" ]; then
        curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${app_container_id}/stats?stream=false" | \
            jq -r '"💻 CPU: " + (.cpu_stats.cpu_usage.total_usage // "N/A" | tostring) + " | 🧠 메모리: " + (.memory_stats.usage // "N/A" | tostring) + " bytes"'
    fi
}

show_survey_statistics() {
    print_header "📊 설문 통계 및 현황"

    local postgres_container_id=$(get_container_id "safework-postgres")

    if [ -z "$postgres_container_id" ]; then
        echo -e "${RED}❌ PostgreSQL 컨테이너를 찾을 수 없습니다.${NC}"
        return 1
    fi

    # 전체 설문 통계
    execute_sql_query "$postgres_container_id" \
        "SELECT
            COUNT(*) as total_surveys,
            COUNT(CASE WHEN form_type = '001' THEN 1 END) as form_001_count,
            COUNT(CASE WHEN form_type = '002' THEN 1 END) as form_002_count,
            COUNT(CASE WHEN has_symptoms = true THEN 1 END) as with_symptoms,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as today_submissions
        FROM surveys;" \
        "전체 설문 통계"

    # 부서별 통계
    execute_sql_query "$postgres_container_id" \
        "SELECT
            department,
            COUNT(*) as count,
            ROUND(AVG(age), 1) as avg_age,
            COUNT(CASE WHEN has_symptoms = true THEN 1 END) as with_symptoms
        FROM surveys
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC
        LIMIT 10;" \
        "부서별 설문 현황 (TOP 10)"

    # 최근 제출 현황
    execute_sql_query "$postgres_container_id" \
        "SELECT
            id,
            name,
            form_type,
            department,
            position,
            has_symptoms,
            created_at AT TIME ZONE 'Asia/Seoul' as submitted_kst
        FROM surveys
        ORDER BY created_at DESC
        LIMIT 10;" \
        "최근 제출된 설문 (최신 10개)"
}

show_detailed_survey_data() {
    print_header "🔍 상세 설문 데이터 분석"

    local postgres_container_id=$(get_container_id "safework-postgres")

    if [ -z "$postgres_container_id" ]; then
        echo -e "${RED}❌ PostgreSQL 컨테이너를 찾을 수 없습니다.${NC}"
        return 1
    fi

    # 증상 있는 설문 상세 조회
    execute_sql_query "$postgres_container_id" \
        "SELECT
            s.id,
            s.name,
            s.form_type,
            s.age,
            s.gender,
            s.department,
            s.position,
            s.work_years,
            s.work_months,
            s.has_symptoms,
            SUBSTRING(s.responses::text, 1, 100) as response_preview,
            s.created_at AT TIME ZONE 'Asia/Seoul' as submitted_kst
        FROM surveys s
        WHERE s.has_symptoms = true
        ORDER BY s.created_at DESC
        LIMIT 5;" \
        "증상 보고 설문 상세 정보 (최신 5개)"

    # 연령대별 분포
    execute_sql_query "$postgres_container_id" \
        "SELECT
            CASE
                WHEN age < 30 THEN '20대'
                WHEN age < 40 THEN '30대'
                WHEN age < 50 THEN '40대'
                WHEN age < 60 THEN '50대'
                ELSE '60대 이상'
            END as age_group,
            COUNT(*) as count,
            COUNT(CASE WHEN has_symptoms = true THEN 1 END) as with_symptoms,
            ROUND(COUNT(CASE WHEN has_symptoms = true THEN 1 END) * 100.0 / COUNT(*), 1) as symptom_rate
        FROM surveys
        WHERE age IS NOT NULL
        GROUP BY age_group
        ORDER BY
            CASE age_group
                WHEN '20대' THEN 1
                WHEN '30대' THEN 2
                WHEN '40대' THEN 3
                WHEN '50대' THEN 4
                ELSE 5
            END;" \
        "연령대별 설문 현황 및 증상 발생률"
}

show_database_health() {
    print_header "🏥 데이터베이스 건강 상태"

    local postgres_container_id=$(get_container_id "safework-postgres")

    if [ -z "$postgres_container_id" ]; then
        echo -e "${RED}❌ PostgreSQL 컨테이너를 찾을 수 없습니다.${NC}"
        return 1
    fi

    # 테이블 크기 및 통계
    execute_sql_query "$postgres_container_id" \
        "SELECT
            schemaname,
            tablename,
            attname,
            n_distinct,
            most_common_vals
        FROM pg_stats
        WHERE schemaname = 'public' AND tablename = 'surveys'
        ORDER BY tablename, attname;" \
        "테이블 통계 정보"

    # 인덱스 상태
    execute_sql_query "$postgres_container_id" \
        "SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE tablename = 'surveys';" \
        "인덱스 현황"

    # 연결 상태
    execute_sql_query "$postgres_container_id" \
        "SELECT
            COUNT(*) as total_connections,
            COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
            COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
        FROM pg_stat_activity;" \
        "데이터베이스 연결 상태"
}

show_application_logs() {
    print_header "📋 애플리케이션 로그 분석"

    local app_container_id=$(get_container_id "safework-app")
    local postgres_container_id=$(get_container_id "safework-postgres")
    local redis_container_id=$(get_container_id "safework-redis")

    print_section "Flask 애플리케이션 로그 (최근 50줄)"
    if [ -n "$app_container_id" ]; then
        curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${app_container_id}/logs?stdout=true&stderr=true&tail=50&timestamps=true" | \
            head -50
    fi

    echo -e "\n${CYAN}----------------------------------------${NC}\n"

    print_section "PostgreSQL 로그 (최근 20줄)"
    if [ -n "$postgres_container_id" ]; then
        curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${postgres_container_id}/logs?stdout=true&stderr=true&tail=20&timestamps=true" | \
            head -20
    fi

    echo -e "\n${CYAN}----------------------------------------${NC}\n"

    print_section "Redis 로그 (최근 10줄)"
    if [ -n "$redis_container_id" ]; then
        curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${redis_container_id}/logs?stdout=true&stderr=true&tail=10&timestamps=true" | \
            head -10
    fi
}

show_realtime_monitoring() {
    print_header "⚡ 실시간 모니터링 대시보드"

    while true; do
        clear
        echo -e "${WHITE}SafeWork 실시간 모니터링 - $(date '+%Y-%m-%d %H:%M:%S KST')${NC}"
        echo -e "${BLUE}================================================================================================${NC}"

        # 시스템 상태
        print_section "시스템 상태"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SAFEWORK_PROD_URL}/health" || echo "000")
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "${SAFEWORK_PROD_URL}/health" || echo "0")

        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "🌐 웹서비스: ${GREEN}✅ 정상${NC} (응답: ${RESPONSE_TIME}초)"
        else
            echo -e "🌐 웹서비스: ${RED}❌ 오류 HTTP ${HTTP_STATUS}${NC}"
        fi

        # 컨테이너 상태
        local containers_status=$(curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
            jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0][1:] + "|" + .State')

        echo "$containers_status" | while IFS='|' read -r name state; do
            if [ "$state" = "running" ]; then
                echo -e "📦 $name: ${GREEN}✅ 실행중${NC}"
            else
                echo -e "📦 $name: ${RED}❌ $state${NC}"
            fi
        done

        # 실시간 통계
        local postgres_container_id=$(get_container_id "safework-postgres")
        if [ -n "$postgres_container_id" ]; then
            print_section "설문 현황 (실시간)"
            execute_sql_query "$postgres_container_id" \
                "SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
                    COUNT(CASE WHEN has_symptoms = true THEN 1 END) as with_symptoms
                FROM surveys;" \
                "📊 설문 통계"
        fi

        echo -e "\n${YELLOW}🔄 30초 후 자동 새로고침... (Ctrl+C로 중단)${NC}"
        sleep 30
    done
}

export_data_to_json() {
    print_header "💾 데이터 JSON 내보내기"

    local postgres_container_id=$(get_container_id "safework-postgres")
    local output_file="/tmp/safework_data_$(date +%Y%m%d_%H%M%S).json"

    if [ -z "$postgres_container_id" ]; then
        echo -e "${RED}❌ PostgreSQL 컨테이너를 찾을 수 없습니다.${NC}"
        return 1
    fi

    echo -e "${YELLOW}🔄 데이터를 JSON 형식으로 내보내는 중...${NC}"

    # JSON 형태로 데이터 추출
    local json_data=$(execute_sql_query "$postgres_container_id" \
        "SELECT json_agg(
            json_build_object(
                'id', id,
                'name', name,
                'form_type', form_type,
                'age', age,
                'gender', gender,
                'department', department,
                'position', position,
                'has_symptoms', has_symptoms,
                'responses', responses,
                'created_at', created_at
            )
        ) FROM surveys;" \
        "전체 설문 데이터 JSON 추출")

    echo "$json_data" > "$output_file"
    echo -e "${GREEN}✅ 데이터가 ${output_file} 파일로 저장되었습니다.${NC}"
    echo -e "${BLUE}📄 파일 크기: $(du -h "$output_file" | cut -f1)${NC}"
}

# ===========================================
# 메인 메뉴
# ===========================================

show_menu() {
    echo -e "${WHITE}"
    echo "================================================================================================"
    echo "🚀 SafeWork 운영환경 고도화 조회 시스템"
    echo "================================================================================================"
    echo -e "${NC}"
    echo -e "${CYAN}1)${NC} 시스템 개요"
    echo -e "${CYAN}2)${NC} 설문 통계 및 현황"
    echo -e "${CYAN}3)${NC} 상세 설문 데이터 분석"
    echo -e "${CYAN}4)${NC} 데이터베이스 건강 상태"
    echo -e "${CYAN}5)${NC} 애플리케이션 로그 분석"
    echo -e "${CYAN}6)${NC} 실시간 모니터링 대시보드"
    echo -e "${CYAN}7)${NC} 데이터 JSON 내보내기"
    echo -e "${CYAN}8)${NC} 전체 보고서 생성"
    echo -e "${CYAN}0)${NC} 종료"
    echo ""
    echo -e "${YELLOW}선택하세요 (0-8): ${NC}"
}

generate_full_report() {
    print_header "📋 SafeWork 운영환경 전체 보고서"

    echo -e "${YELLOW}🔄 전체 보고서를 생성하는 중...${NC}"
    echo ""

    show_system_overview
    show_survey_statistics
    show_detailed_survey_data
    show_database_health

    print_header "✅ 보고서 생성 완료"
    echo -e "${GREEN}📊 SafeWork 운영환경 상태가 성공적으로 분석되었습니다.${NC}"
}

# ===========================================
# 메인 실행 로직
# ===========================================

main() {
    # 권한 체크
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl이 설치되지 않았습니다.${NC}"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq가 설치되지 않았습니다.${NC}"
        exit 1
    fi

    # 인자가 있으면 직접 실행
    case "${1:-}" in
        "system"|"sys")
            show_system_overview
            ;;
        "survey"|"surveys")
            show_survey_statistics
            ;;
        "detail"|"details")
            show_detailed_survey_data
            ;;
        "health"|"db")
            show_database_health
            ;;
        "logs"|"log")
            show_application_logs
            ;;
        "monitor"|"realtime")
            show_realtime_monitoring
            ;;
        "export"|"json")
            export_data_to_json
            ;;
        "report"|"full")
            generate_full_report
            ;;
        "help"|"-h"|"--help")
            echo "사용법: $0 [system|survey|detail|health|logs|monitor|export|report]"
            exit 0
            ;;
        *)
            # 대화형 메뉴
            while true; do
                show_menu
                read -r choice
                case $choice in
                    1)
                        show_system_overview
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    2)
                        show_survey_statistics
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    3)
                        show_detailed_survey_data
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    4)
                        show_database_health
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    5)
                        show_application_logs
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    6)
                        show_realtime_monitoring
                        ;;
                    7)
                        export_data_to_json
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    8)
                        generate_full_report
                        echo -e "\n${YELLOW}계속하려면 Enter를 누르세요...${NC}"
                        read -r
                        ;;
                    0)
                        echo -e "${GREEN}👋 SafeWork 조회 시스템을 종료합니다.${NC}"
                        exit 0
                        ;;
                    *)
                        echo -e "${RED}❌ 잘못된 선택입니다. 0-8 중에서 선택하세요.${NC}"
                        sleep 2
                        ;;
                esac
            done
            ;;
    esac
}

# 스크립트 실행
main "$@"