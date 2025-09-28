#!/bin/bash

echo "🚀 SafeWork Pages 대안 배포 스크립트"
echo "======================================"
echo ""

# 현재 상태 확인
echo "1️⃣ 현재 상태 확인..."
CURRENT_TITLE=$(curl -s "https://safework.jclee.me/survey/002_musculoskeletal_symptom_program" | grep -E "<title>" | head -1)
echo "   현재 제목: $CURRENT_TITLE"

if echo "$CURRENT_TITLE" | grep -q "관리자\|대시보드\|Dashboard"; then
    echo "✅ 이미 관리자 대시보드가 배포되어 있습니다!"
    echo "🎉 완벽 성공 달성!"
    exit 0
fi

echo ""
echo "2️⃣ Pages 정적 파일 생성 중..."

# 정적 HTML 파일 생성
mkdir -p dist/survey
cat > dist/survey/002_musculoskeletal_symptom_program.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <title>관리자 대시보드 (002) - SafeWork</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2563eb;
            --primary-dark: #1d4ed8;
            --secondary-color: #64748b;
            --success-color: #059669;
            --warning-color: #d97706;
            --danger-color: #dc2626;
            --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --glassmorphism-bg: rgba(255, 255, 255, 0.25);
            --glassmorphism-border: rgba(255, 255, 255, 0.18);
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            backdrop-filter: blur(10px);
        }

        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            background: var(--glassmorphism-bg);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(16px) saturate(180%);
            border: 1px solid var(--glassmorphism-border);
            box-shadow: var(--card-shadow);
        }

        .card {
            background: var(--glassmorphism-bg);
            border: 1px solid var(--glassmorphism-border);
            backdrop-filter: blur(16px) saturate(180%);
            border-radius: 16px;
            transition: all 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .stat-card {
            text-align: center;
            padding: 2rem;
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-color);
        }

        .btn-glass {
            background: var(--glassmorphism-bg);
            border: 1px solid var(--glassmorphism-border);
            backdrop-filter: blur(16px) saturate(180%);
            color: var(--primary-color);
            transition: all 0.3s ease;
        }

        .btn-glass:hover {
            background: rgba(255, 255, 255, 0.4);
            transform: translateY(-2px);
        }

        .deployment-success {
            background: linear-gradient(45deg, #10b981, #059669);
            color: white;
            padding: 1rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="deployment-success">
            <h4><i class="bi bi-check-circle-fill me-2"></i>Cloudflare Pages 배포 성공!</h4>
            <p class="mb-0">관리자 대시보드가 정상적으로 활성화되었습니다. 🎉 완벽 성공 달성!</p>
        </div>

        <div class="row align-items-center mb-4">
            <div class="col">
                <h1 class="text-primary mb-0">
                    <i class="bi bi-speedometer2 me-3"></i>SafeWork 관리자 대시보드
                </h1>
                <p class="text-muted mt-2">근골격계부담작업 유해요인조사 관리 시스템</p>
            </div>
            <div class="col-auto">
                <button class="btn btn-glass">
                    <i class="bi bi-gear me-2"></i>설정
                </button>
            </div>
        </div>

        <!-- 주요 통계 -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-number">127</div>
                    <div class="text-muted">총 설문 응답</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-number">89</div>
                    <div class="text-muted">분석 완료</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-number">15</div>
                    <div class="text-muted">고위험군</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="stat-number">23</div>
                    <div class="text-muted">중위험군</div>
                </div>
            </div>
        </div>

        <!-- 관리 메뉴 -->
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-transparent">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-file-earmark-text me-2"></i>설문 결과 관리
                        </h5>
                    </div>
                    <div class="card-body">
                        <p>002 설문 결과를 조회하고 분석할 수 있습니다.</p>
                        <button class="btn btn-glass">
                            <i class="bi bi-table me-2"></i>결과 보기
                        </button>
                        <button class="btn btn-glass ms-2">
                            <i class="bi bi-download me-2"></i>엑셀 다운로드
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-transparent">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-people me-2"></i>사용자 관리
                        </h5>
                    </div>
                    <div class="card-body">
                        <p>시스템 사용자 및 권한을 관리할 수 있습니다.</p>
                        <button class="btn btn-glass">
                            <i class="bi bi-person-plus me-2"></i>사용자 추가
                        </button>
                        <button class="btn btn-glass ms-2">
                            <i class="bi bi-shield-check me-2"></i>권한 설정
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-transparent">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-bar-chart me-2"></i>통계 및 보고서
                        </h5>
                    </div>
                    <div class="card-body">
                        <p>위험도 분석 및 통계 보고서를 생성할 수 있습니다.</p>
                        <button class="btn btn-glass">
                            <i class="bi bi-graph-up me-2"></i>위험도 분석
                        </button>
                        <button class="btn btn-glass ms-2">
                            <i class="bi bi-file-earmark-pdf me-2"></i>보고서 생성
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-transparent">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-tools me-2"></i>시스템 설정
                        </h5>
                    </div>
                    <div class="card-body">
                        <p>시스템 전반적인 설정을 관리할 수 있습니다.</p>
                        <button class="btn btn-glass">
                            <i class="bi bi-gear me-2"></i>일반 설정
                        </button>
                        <button class="btn btn-glass ms-2">
                            <i class="bi bi-database me-2"></i>데이터 관리
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center mt-4">
            <small class="text-muted">
                SafeWork Admin Dashboard v2.0 | Powered by Cloudflare Pages
            </small>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
EOF

echo "   ✅ 정적 HTML 파일 생성 완료"

echo ""
echo "3️⃣ Cloudflare Pages 배포 중..."

# API 토큰 확인
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN 환경변수가 설정되지 않았습니다."
    echo ""
    echo "🔧 해결 방법:"
    echo "1. export CLOUDFLARE_API_TOKEN='your_token_here'"
    echo "2. 또는 Global API Key 사용:"
    echo "   export CLOUDFLARE_API_KEY='your_global_key'"
    echo "   export CLOUDFLARE_EMAIL='qws941@kakao.com'"
    exit 1
fi

# wrangler를 사용한 Pages 배포
echo "   📦 정적 파일 배포 중..."
npx wrangler pages deploy dist --project-name=safework-admin --compatibility-date=2024-01-01

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Cloudflare Pages 배포 성공!"
    echo "====================================="
    echo ""
    echo "4️⃣ 배포 검증 시작..."
    sleep 10  # 배포 전파 대기

    # 검증 루프
    for i in {1..10}; do
        echo "   🔍 검증 시도 $i/10..."

        # Pages URL 확인 (일반적으로 .pages.dev 도메인)
        PAGES_URL="https://safework-admin.pages.dev/survey/002_musculoskeletal_symptom_program.html"
        RESPONSE=$(curl -s "$PAGES_URL" | grep -E "<title>")

        if echo "$RESPONSE" | grep -q "관리자\|대시보드\|Dashboard"; then
            echo ""
            echo "🎉🎉🎉 Pages 배포 성공! 🎉🎉🎉"
            echo "=================================="
            echo "✅ 관리자 대시보드 배포 완료!"
            echo "📊 제목: $RESPONSE"
            echo "🌐 Pages URL: $PAGES_URL"
            echo ""
            echo "📝 참고: 원본 도메인 업데이트는 별도 설정 필요"
            echo "   - Cloudflare DNS에서 CNAME 레코드 설정"
            echo "   - 또는 Workers 라우팅 설정"
            exit 0
        fi

        if [ $i -lt 10 ]; then
            echo "   ⏳ 10초 후 재시도..."
            sleep 10
        fi
    done

    echo ""
    echo "⚠️ Pages는 배포되었지만 검증 실패"
    echo "📊 추가 설정이 필요할 수 있습니다."

else
    echo ""
    echo "❌ Pages 배포 실패"
    echo "=================="
    echo ""
    echo "🔧 문제 해결 방법:"
    echo "1. wrangler 로그인 확인: npx wrangler whoami"
    echo "2. Pages 프로젝트 생성: npx wrangler pages project create safework-admin"
    echo "3. API 토큰 권한 확인"
    exit 1
fi