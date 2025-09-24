#!/bin/bash

# SafeWork Cloudflare Migration Script
# =====================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SafeWork Cloudflare Migration Tool ===${NC}"
echo ""

# 환경 변수 확인
if [ -z "$CLOUDFLARE_EMAIL" ] || [ -z "$CLOUDFLARE_API_KEY" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo -e "${RED}Error: Cloudflare 환경 변수가 설정되지 않았습니다.${NC}"
    echo "다음 변수들을 설정해주세요:"
    echo "  export CLOUDFLARE_EMAIL='your-email@example.com'"
    echo "  export CLOUDFLARE_API_KEY='your-api-key'"
    echo "  export CLOUDFLARE_ZONE_ID='your-zone-id'"
    exit 1
fi

# 1. 현재 DNS 레코드 백업
backup_dns() {
    echo -e "${YELLOW}1. 현재 DNS 레코드 백업 중...${NC}"

    curl -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         > dns_backup_$(date +%Y%m%d_%H%M%S).json

    echo -e "${GREEN}✓ DNS 백업 완료${NC}"
}

# 2. SafeWork A 레코드 생성/업데이트
create_dns_record() {
    echo -e "${YELLOW}2. SafeWork DNS 레코드 생성 중...${NC}"

    # A 레코드 생성
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{
           "type": "A",
           "name": "safework",
           "content": "221.153.20.249",
           "ttl": 1,
           "proxied": true,
           "comment": "SafeWork Production Server"
         }'

    echo -e "${GREEN}✓ DNS 레코드 생성 완료${NC}"
}

# 3. SSL/TLS 설정
configure_ssl() {
    echo -e "${YELLOW}3. SSL/TLS 설정 구성 중...${NC}"

    # SSL Mode를 Full (strict)로 설정
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "strict"}'

    # Always Use HTTPS 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    # TLS 1.3 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/tls_1_3" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    echo -e "${GREEN}✓ SSL/TLS 설정 완료${NC}"
}

# 4. 보안 설정
configure_security() {
    echo -e "${YELLOW}4. 보안 설정 구성 중...${NC}"

    # Browser Integrity Check 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/browser_check" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    # Security Level 설정
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/security_level" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "medium"}'

    echo -e "${GREEN}✓ 보안 설정 완료${NC}"
}

# 5. 캐싱 및 성능 설정
configure_performance() {
    echo -e "${YELLOW}5. 캐싱 및 성능 설정 구성 중...${NC}"

    # Browser Cache TTL
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/browser_cache_ttl" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": 14400}'

    # Auto Minify 설정
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/minify" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": {"css": true, "html": true, "js": true}}'

    # Brotli 압축 활성화
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/brotli" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{"value": "on"}'

    echo -e "${GREEN}✓ 성능 설정 완료${NC}"
}

# 6. Page Rules 생성
create_page_rules() {
    echo -e "${YELLOW}6. Page Rules 생성 중...${NC}"

    # Admin 패널 캐시 제외
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{
           "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "safework.jclee.me/admin/*"}}],
           "actions": [
             {"id": "cache_level", "value": "bypass"},
             {"id": "security_level", "value": "high"}
           ],
           "priority": 1,
           "status": "active"
         }'

    # API 엔드포인트 캐시 제외
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{
           "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "safework.jclee.me/api/*"}}],
           "actions": [
             {"id": "cache_level", "value": "bypass"}
           ],
           "priority": 2,
           "status": "active"
         }'

    echo -e "${GREEN}✓ Page Rules 생성 완료${NC}"
}

# 7. Origin Certificate 생성
generate_origin_cert() {
    echo -e "${YELLOW}7. Origin Certificate 생성 중...${NC}"

    RESPONSE=$(curl -X POST "https://api.cloudflare.com/client/v4/certificates" \
         -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
         -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
         -H "Content-Type: application/json" \
         --data '{
           "hosts": ["safework.jclee.me", "*.safework.jclee.me"],
           "requested_validity": 5475,
           "request_type": "origin-rsa",
           "csr": ""
         }')

    # 인증서를 파일로 저장
    echo "$RESPONSE" | jq -r '.result.certificate' > cloudflare_origin_cert.pem
    echo "$RESPONSE" | jq -r '.result.private_key' > cloudflare_origin_key.pem

    echo -e "${GREEN}✓ Origin Certificate 생성 완료${NC}"
    echo "  - Certificate: cloudflare_origin_cert.pem"
    echo "  - Private Key: cloudflare_origin_key.pem"
}

# 메인 실행 함수
main() {
    echo "SafeWork를 Cloudflare로 이관합니다."
    echo "대상 도메인: safework.jclee.me"
    echo ""

    read -p "계속하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "작업이 취소되었습니다."
        exit 1
    fi

    backup_dns
    create_dns_record
    configure_ssl
    configure_security
    configure_performance
    create_page_rules
    generate_origin_cert

    echo ""
    echo -e "${GREEN}=== Cloudflare 이관 완료! ===${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. Origin Certificate를 Traefik에 설치하세요"
    echo "2. DNS 전파 확인 (5-10분 소요)"
    echo "3. SSL 연결 테스트: curl -I https://safework.jclee.me"
    echo ""
    echo "문제 발생 시 dns_backup_*.json 파일로 복구 가능합니다."
}

# 스크립트 실행
main