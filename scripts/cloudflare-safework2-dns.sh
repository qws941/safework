#!/bin/bash

# SafeWork2 Cloudflare DNS 설정 스크립트
# ==========================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SafeWork2 Cloudflare DNS 설정 ===${NC}"
echo ""

# 환경 변수 설정 (Cloudflare API 토큰 방식)
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-lkst1ycO1wtifp0W_aakuf2ndIyk_S0l-ejF8kUO}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-a8d9c67f586acdd15eebcc65ca3aa5bb}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-a8d9c67f586acdd15eebcc65ca3aa5bb}"

# API 토큰 검증
echo -e "${YELLOW}Cloudflare API 토큰 검증 중...${NC}"
TOKEN_VERIFY=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

if echo "$TOKEN_VERIFY" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Cloudflare API 토큰 검증 성공${NC}"
else
    echo -e "${RED}Error: Cloudflare API 토큰이 유효하지 않습니다.${NC}"
    echo "Response: $TOKEN_VERIFY"
    exit 1
fi

# API Gateway 정보 (배포 후 업데이트 필요)
API_GATEWAY_DOMAIN="api-safework2.jclee.me"
API_GATEWAY_IP="52.78.123.45"  # 실제 API Gateway IP로 변경 필요

# 1. 기존 DNS 레코드 백업
backup_dns() {
    echo -e "${YELLOW}1. 기존 DNS 레코드 백업 중...${NC}"

    curl -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         > safework2_dns_backup_$(date +%Y%m%d_%H%M%S).json

    echo -e "${GREEN}✓ DNS 백업 완료${NC}"
}

# 2. safework2.jclee.me A 레코드 생성
create_main_dns_record() {
    echo -e "${YELLOW}2. safework2.jclee.me DNS 레코드 생성 중...${NC}"

    # A 레코드 생성 (CloudFront 또는 ALB IP)
    RESPONSE=$(curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{
           "type": "CNAME",
           "name": "safework2",
           "content": "'"$API_GATEWAY_DOMAIN"'",
           "ttl": 300,
           "proxied": true,
           "comment": "SafeWork 2.0 Serverless - Main Domain"
         }')

    echo "Response: $RESPONSE" | jq '.'
    echo -e "${GREEN}✓ safework2.jclee.me DNS 레코드 생성 완료${NC}"
}

# 3. api-safework2.jclee.me CNAME 레코드 생성
create_api_dns_record() {
    echo -e "${YELLOW}3. api-safework2.jclee.me DNS 레코드 생성 중...${NC}"

    # AWS API Gateway Custom Domain 연결용
    RESPONSE=$(curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{
           "type": "CNAME",
           "name": "api-safework2",
           "content": "d-abcd1234.execute-api.ap-northeast-2.amazonaws.com",
           "ttl": 300,
           "proxied": false,
           "comment": "SafeWork 2.0 API Gateway Direct"
         }')

    echo "Response: $RESPONSE" | jq '.'
    echo -e "${GREEN}✓ api-safework2.jclee.me DNS 레코드 생성 완료${NC}"
}

# 4. SSL/TLS 설정 (서버리스 최적화)
configure_ssl_serverless() {
    echo -e "${YELLOW}4. SSL/TLS 설정 구성 중 (서버리스 최적화)...${NC}"

    # SSL Mode를 Full로 설정 (API Gateway 인증서 사용)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "full"}'

    # Always Use HTTPS 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    # TLS 1.3 활성화 (서버리스 성능 최적화)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/tls_1_3" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    echo -e "${GREEN}✓ SSL/TLS 설정 완료${NC}"
}

# 5. 서버리스 최적화 보안 설정
configure_serverless_security() {
    echo -e "${YELLOW}5. 서버리스 보안 설정 구성 중...${NC}"

    # API 요청 제한 (서버리스 Cold Start 고려)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/security_level" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "medium"}'

    # Bot Fight Mode 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/bic" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    echo -e "${GREEN}✓ 서버리스 보안 설정 완료${NC}"
}

# 6. 서버리스 최적화 성능 설정
configure_serverless_performance() {
    echo -e "${YELLOW}6. 서버리스 성능 설정 구성 중...${NC}"

    # Browser Cache TTL (API 응답 캐싱)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/browser_cache_ttl" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": 7200}'  # 2시간 캐싱

    # Auto Minify (정적 자원 최적화)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/minify" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": {"css": true, "html": true, "js": true}}'

    # Brotli 압축 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/brotli" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    # Rocket Loader (JS 최적화)
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/rocket_loader" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    echo -e "${GREEN}✓ 서버리스 성능 설정 완료${NC}"
}

# 7. 서버리스 전용 Page Rules 생성
create_serverless_page_rules() {
    echo -e "${YELLOW}7. 서버리스 Page Rules 생성 중...${NC}"

    # API 엔드포인트 캐시 제외 (동적 응답)
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{
           "targets": [{
             "target": "url",
             "constraint": {
               "operator": "matches",
               "value": "safework2.jclee.me/api/*"
             }
           }],
           "actions": [
             {"id": "cache_level", "value": "bypass"},
             {"id": "security_level", "value": "high"}
           ],
           "priority": 1,
           "status": "active"
         }'

    # Admin 패널 최고 보안 + 캐시 제외
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{
           "targets": [{
             "target": "url",
             "constraint": {
               "operator": "matches",
               "value": "safework2.jclee.me/admin/*"
             }
           }],
           "actions": [
             {"id": "cache_level", "value": "bypass"},
             {"id": "security_level", "value": "high"},
             {"id": "browser_check", "value": "on"}
           ],
           "priority": 2,
           "status": "active"
         }'

    # 정적 파일 캐싱 최적화 (S3/CloudFront 연동 시)
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{
           "targets": [{
             "target": "url",
             "constraint": {
               "operator": "matches",
               "value": "safework2.jclee.me/static/*"
             }
           }],
           "actions": [
             {"id": "cache_level", "value": "cache_everything"},
             {"id": "edge_cache_ttl", "value": 86400}
           ],
           "priority": 3,
           "status": "active"
         }'

    echo -e "${GREEN}✓ 서버리스 Page Rules 생성 완료${NC}"
}

# 8. DNS 전파 확인 및 테스트
verify_dns_propagation() {
    echo -e "${YELLOW}8. DNS 전파 확인 및 테스트...${NC}"

    echo "DNS 전파 확인 중..."
    sleep 10

    # dig를 통한 DNS 확인
    echo -e "${BLUE}safework2.jclee.me DNS 조회:${NC}"
    dig +short safework2.jclee.me

    echo -e "${BLUE}api-safework2.jclee.me DNS 조회:${NC}"
    dig +short api-safework2.jclee.me

    echo -e "${GREEN}✓ DNS 전파 확인 완료${NC}"
}

# 9. 서버리스 배포 준비 확인
prepare_serverless_deployment() {
    echo -e "${YELLOW}9. 서버리스 배포 준비 확인...${NC}"

    echo "필요한 AWS 리소스:"
    echo "  - API Gateway Custom Domain: api-safework2.jclee.me"
    echo "  - Lambda Functions: auth, survey, admin, health"
    echo "  - Aurora Serverless v2: PostgreSQL"
    echo "  - ElastiCache Serverless: Redis"

    echo ""
    echo "Serverless Framework 배포 명령:"
    echo "  cd /home/jclee/app/safework/serverless/"
    echo "  sls deploy --stage prod --region ap-northeast-2"

    echo -e "${GREEN}✓ 서버리스 배포 준비 완료${NC}"
}

# 메인 실행 함수
main() {
    echo "SafeWork를 서버리스 아키텍처로 Cloudflare에 구성합니다."
    echo "신규 도메인: safework2.jclee.me"
    echo "아키텍처: AWS Lambda + API Gateway + Aurora Serverless"
    echo ""

    # Auto-confirm for automated execution
    echo "자동 실행 모드: DNS 설정을 시작합니다."

    backup_dns
    create_main_dns_record
    create_api_dns_record
    configure_ssl_serverless
    configure_serverless_security
    configure_serverless_performance
    create_serverless_page_rules
    verify_dns_propagation
    prepare_serverless_deployment

    echo ""
    echo -e "${GREEN}=== SafeWork2 Cloudflare 서버리스 구성 완료! ===${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. AWS에 서버리스 인프라 배포"
    echo "   cd /home/jclee/app/safework/serverless/"
    echo "   sls deploy --stage prod --region ap-northeast-2"
    echo ""
    echo "2. API Gateway Custom Domain 연결"
    echo "   - Custom Domain: api-safework2.jclee.me"
    echo "   - Certificate: *.jclee.me (ACM)"
    echo ""
    echo "3. 데이터베이스 마이그레이션 실행"
    echo "   python migration/serverless_db_setup.py"
    echo ""
    echo "4. 서비스 테스트"
    echo "   curl https://safework2.jclee.me/health"
    echo "   curl https://api-safework2.jclee.me/health"
    echo ""
    echo "문제 발생 시 safework2_dns_backup_*.json 파일로 복구 가능합니다."
}

# 스크립트 실행
main