/**
 * SafeWork 002 Admin Dashboard Template
 * 근골격계질환 증상조사표 (완전판) 관리 대시보드
 */

export const admin002DashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeWork 002 관리자 대시보드</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background-color: #f8f9fa; }
    .card { box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }
    .stat-card { border-left: 4px solid; }
    .stat-card.primary { border-color: #0d6efd; }
    .stat-card.success { border-color: #198754; }
    .stat-card.warning { border-color: #ffc107; }
    .stat-card.danger { border-color: #dc3545; }
    .pain-badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark bg-primary">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">📊 SafeWork 002 관리자 대시보드</span>
      <span class="text-white">근골격계질환 증상조사표</span>
    </div>
  </nav>

  <div class="container-fluid mt-4">
    <!-- 통계 카드 -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card stat-card primary">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">총 제출</h6>
            <h2 class="card-title" id="stat-total">0</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card success">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">오늘 제출</h6>
            <h2 class="card-title" id="stat-today">0</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card warning">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">평균 연령</h6>
            <h2 class="card-title" id="stat-age">0</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card danger">
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">통증 환자</h6>
            <h2 class="card-title" id="stat-pain">0</h2>
          </div>
        </div>
      </div>
    </div>

    <!-- 데이터 테이블 -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">제출 목록</h5>
        <button class="btn btn-success btn-sm" onclick="exportCSV()">📥 CSV 다운로드</button>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover" id="submissions-table">
            <thead>
              <tr>
                <th>제출ID</th>
                <th>이름</th>
                <th>나이</th>
                <th>성별</th>
                <th>부서</th>
                <th>통증부위</th>
                <th>제출일시</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody id="submissions-tbody">
              <tr>
                <td colspan="8" class="text-center">데이터를 불러오는 중...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- 상세보기 모달 -->
  <div class="modal fade" id="viewModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">상세 정보</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="view-modal-body">
          <!-- 동적 생성 -->
        </div>
      </div>
    </div>
  </div>

  <!-- 수정 모달 -->
  <div class="modal fade" id="editModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">데이터 수정</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="edit-modal-body">
          <!-- 동적 생성 -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
          <button type="button" class="btn btn-primary" onclick="saveEdit()">저장</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    let currentSubmissions = [];
    let currentEditId = null;

    // 페이지 로드 시 데이터 불러오기
    window.addEventListener('DOMContentLoaded', () => {
      loadSubmissions();
    });

    // 제출 목록 불러오기
    async function loadSubmissions() {
      try {
        const response = await fetch('/api/admin/002/submissions');
        const data = await response.json();

        if (data.success) {
          currentSubmissions = data.submissions;
          updateStatistics(data.statistics);
          renderTable(data.submissions);
        } else {
          alert('데이터 로드 실패: ' + data.error);
        }
      } catch (error) {
        console.error('Load error:', error);
        alert('데이터 로드 중 오류 발생');
      }
    }

    // 통계 업데이트
    function updateStatistics(stats) {
      document.getElementById('stat-total').textContent = stats.total || 0;
      document.getElementById('stat-today').textContent = stats.today || 0;
      document.getElementById('stat-age').textContent = (stats.avgAge || 0).toFixed(1);

      const totalPain = (stats.neckPain || 0) + (stats.shoulderPain || 0) + (stats.backPain || 0);
      document.getElementById('stat-pain').textContent = totalPain;
    }

    // 테이블 렌더링
    function renderTable(submissions) {
      const tbody = document.getElementById('submissions-tbody');

      if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">데이터가 없습니다</td></tr>';
        return;
      }

      tbody.innerHTML = submissions.map(sub => {
        const painParts = [];
        if (sub.neck_pain_exists === '있음') painParts.push('목');
        if (sub.shoulder_pain_exists === '있음') painParts.push('어깨');
        if (sub.elbow_pain_exists === '있음') painParts.push('팔꿈치');
        if (sub.wrist_pain_exists === '있음') painParts.push('손목');
        if (sub.back_pain_exists === '있음') painParts.push('허리');
        if (sub.leg_pain_exists === '있음') painParts.push('다리');

        const painBadges = painParts.length > 0
          ? painParts.map(p => \`<span class="badge bg-danger pain-badge me-1">\${p}</span>\`).join('')
          : '<span class="badge bg-success pain-badge">없음</span>';

        return \`
          <tr>
            <td><small>\${sub.submission_id}</small></td>
            <td>\${sub.name}</td>
            <td>\${sub.age}</td>
            <td>\${sub.gender}</td>
            <td>\${sub.department || '-'}</td>
            <td>\${painBadges}</td>
            <td><small>\${new Date(sub.submitted_at).toLocaleString('ko-KR')}</small></td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewSubmission('\${sub.submission_id}')">보기</button>
              <button class="btn btn-sm btn-warning" onclick="editSubmission('\${sub.submission_id}')">수정</button>
              <button class="btn btn-sm btn-danger" onclick="deleteSubmission('\${sub.submission_id}')">삭제</button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    // 상세보기
    async function viewSubmission(submissionId) {
      try {
        const response = await fetch(\`/api/admin/002/submission/\${submissionId}\`);
        const data = await response.json();

        if (data.success) {
          const sub = data.submission;
          const modalBody = document.getElementById('view-modal-body');

          modalBody.innerHTML = \`
            <div class="row">
              <div class="col-md-6">
                <h6>기본 정보</h6>
                <table class="table table-sm">
                  <tr><th>제출ID</th><td>\${sub.submission_id}</td></tr>
                  <tr><th>이름</th><td>\${sub.name}</td></tr>
                  <tr><th>나이</th><td>\${sub.age}</td></tr>
                  <tr><th>성별</th><td>\${sub.gender}</td></tr>
                  <tr><th>경력</th><td>\${sub.work_experience || '-'}년</td></tr>
                  <tr><th>결혼</th><td>\${sub.married || '-'}</td></tr>
                </table>

                <h6>작업 정보</h6>
                <table class="table table-sm">
                  <tr><th>부서</th><td>\${sub.department || '-'}</td></tr>
                  <tr><th>라인</th><td>\${sub.line || '-'}</td></tr>
                  <tr><th>작업</th><td>\${sub.work_type || '-'}</td></tr>
                  <tr><th>육체부담</th><td>\${sub.physical_burden || '-'}</td></tr>
                </table>
              </div>

              <div class="col-md-6">
                <h6>통증 평가</h6>
                <table class="table table-sm">
                  <tr>
                    <th>목</th>
                    <td>\${sub.neck_pain_exists || '-'}</td>
                    <td>\${sub.neck_pain_intensity || '-'}</td>
                  </tr>
                  <tr>
                    <th>어깨</th>
                    <td>\${sub.shoulder_pain_exists || '-'}</td>
                    <td>\${sub.shoulder_pain_intensity || '-'}</td>
                  </tr>
                  <tr>
                    <th>팔꿈치</th>
                    <td>\${sub.elbow_pain_exists || '-'}</td>
                    <td>\${sub.elbow_pain_intensity || '-'}</td>
                  </tr>
                  <tr>
                    <th>손목</th>
                    <td>\${sub.wrist_pain_exists || '-'}</td>
                    <td>\${sub.wrist_pain_intensity || '-'}</td>
                  </tr>
                  <tr>
                    <th>허리</th>
                    <td>\${sub.back_pain_exists || '-'}</td>
                    <td>\${sub.back_pain_intensity || '-'}</td>
                  </tr>
                  <tr>
                    <th>다리</th>
                    <td>\${sub.leg_pain_exists || '-'}</td>
                    <td>\${sub.leg_pain_intensity || '-'}</td>
                  </tr>
                </table>

                <h6>메타 정보</h6>
                <table class="table table-sm">
                  <tr><th>제출일시</th><td>\${new Date(sub.submitted_at).toLocaleString('ko-KR')}</td></tr>
                  <tr><th>국가</th><td>\${sub.country || '-'}</td></tr>
                  <tr><th>CF Ray</th><td><small>\${sub.cf_ray || '-'}</small></td></tr>
                </table>
              </div>
            </div>
          \`;

          const modal = new bootstrap.Modal(document.getElementById('viewModal'));
          modal.show();
        }
      } catch (error) {
        console.error('View error:', error);
        alert('상세 정보 로드 실패');
      }
    }

    // 수정
    async function editSubmission(submissionId) {
      try {
        const response = await fetch(\`/api/admin/002/submission/\${submissionId}\`);
        const data = await response.json();

        if (data.success) {
          const sub = data.submission;
          currentEditId = submissionId;

          const modalBody = document.getElementById('edit-modal-body');
          modalBody.innerHTML = \`
            <form id="editForm">
              <div class="row">
                <div class="col-md-6">
                  <h6>기본 정보</h6>
                  <div class="mb-3">
                    <label class="form-label">이름</label>
                    <input type="text" class="form-control" id="edit_name" value="\${sub.name}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">나이</label>
                    <input type="number" class="form-control" id="edit_age" value="\${sub.age}" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">성별</label>
                    <select class="form-select" id="edit_gender" required>
                      <option value="남" \${sub.gender === '남' ? 'selected' : ''}>남</option>
                      <option value="여" \${sub.gender === '여' ? 'selected' : ''}>여</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">경력(년)</label>
                    <input type="number" class="form-control" id="edit_work_experience" value="\${sub.work_experience || ''}">
                  </div>
                </div>

                <div class="col-md-6">
                  <h6>작업 정보</h6>
                  <div class="mb-3">
                    <label class="form-label">부서</label>
                    <input type="text" class="form-control" id="edit_department" value="\${sub.department || ''}">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">라인</label>
                    <input type="text" class="form-control" id="edit_line" value="\${sub.line || ''}">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">작업</label>
                    <input type="text" class="form-control" id="edit_work_type" value="\${sub.work_type || ''}">
                  </div>
                </div>
              </div>
            </form>
          \`;

          const modal = new bootstrap.Modal(document.getElementById('editModal'));
          modal.show();
        }
      } catch (error) {
        console.error('Edit error:', error);
        alert('수정 모드 로드 실패');
      }
    }

    // 저장
    async function saveEdit() {
      if (!currentEditId) return;

      const formData = {
        name: document.getElementById('edit_name').value,
        age: parseInt(document.getElementById('edit_age').value),
        gender: document.getElementById('edit_gender').value,
        work_experience: parseInt(document.getElementById('edit_work_experience').value) || null,
        department: document.getElementById('edit_department').value,
        line: document.getElementById('edit_line').value,
        work_type: document.getElementById('edit_work_type').value
      };

      try {
        const response = await fetch(\`/api/admin/002/submission/\${currentEditId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          alert('저장되었습니다');
          bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
          loadSubmissions();
        } else {
          alert('저장 실패: ' + data.error);
        }
      } catch (error) {
        console.error('Save error:', error);
        alert('저장 중 오류 발생');
      }
    }

    // 삭제
    async function deleteSubmission(submissionId) {
      if (!confirm('정말 삭제하시겠습니까?')) return;

      try {
        const response = await fetch(\`/api/admin/002/submission/\${submissionId}\`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          alert('삭제되었습니다');
          loadSubmissions();
        } else {
          alert('삭제 실패: ' + data.error);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류 발생');
      }
    }

    // CSV 다운로드
    function exportCSV() {
      window.location.href = '/api/admin/002/export/csv';
    }
  </script>
</body>
</html>
`;