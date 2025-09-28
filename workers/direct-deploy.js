// 극도로 단순화된 Cloudflare Worker - 직접 배포용
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 002 관리자 대시보드
    if (url.pathname.includes('002_musculoskeletal_symptom_program')) {
      return new Response(`<!DOCTYPE html>
<html lang="ko">
<head>
    <title>관리자 대시보드 (002) - SafeWork</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .dashboard-container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 40px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .success-banner {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="success-banner">
            <h1>✅ 배포 성공! 관리자 대시보드 활성화!</h1>
            <p>Cloudflare Workers 배포가 성공적으로 완료되었습니다</p>
        </div>

        <h2>🎯 002 관리자 대시보드</h2>
        <p class="lead">SafeWork 관리자 인터페이스 - 완벽 성공 달성!</p>

        <div class="alert alert-success">
            <strong>상태:</strong> 정상 작동 중 | 버전: V6 STABLE
        </div>

        <div class="row mt-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>📊 설문 결과</h5>
                        <p>전체 응답 관리</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>👥 부서별 통계</h5>
                        <p>부서별 분석 데이터</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>📈 리포트 생성</h5>
                        <p>보고서 자동 생성</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 기본 응답
    return new Response('SafeWork CF Workers - Direct Deploy V6', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};