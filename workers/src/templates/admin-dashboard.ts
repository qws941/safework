/**
 * SafeWork 관리자 대시보드 템플릿
 * D1 Database 기반 조사표 관리 시스템
 */

export const adminDashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork 관리자 대시보드</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --primary-color: #2563eb;
            --sidebar-width: 250px;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8f9fa;
        }

        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: var(--sidebar-width);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            overflow-y: auto;
        }

        .main-content {
            margin-left: var(--sidebar-width);
            padding: 30px;
        }

        .sidebar-brand {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }

        .sidebar-menu {
            list-style: none;
            padding: 0;
        }

        .sidebar-menu li {
            margin-bottom: 10px;
        }

        .sidebar-menu a {
            color: white;
            text-decoration: none;
            padding: 12px 15px;
            display: block;
            border-radius: 8px;
            transition: background 0.3s;
        }

        .sidebar-menu a:hover,
        .sidebar-menu a.active {
            background: rgba(255,255,255,0.2);
        }

        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--primary-color);
        }

        .stat-label {
            color: #6c757d;
            font-size: 0.9rem;
        }

        .table-container {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .badge-new {
            background: #10b981;
        }

        .action-btn {
            padding: 5px 10px;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="sidebar-brand">
            <i class="bi bi-shield-check"></i> SafeWork
        </div>
        <ul class="sidebar-menu">
            <li><a href="#" class="active"><i class="bi bi-speedometer2"></i> 대시보드</a></li>
            <li><a href="#submissions"><i class="bi bi-file-text"></i> 제출 목록</a></li>
            <li><a href="#analytics"><i class="bi bi-graph-up"></i> 통계 분석</a></li>
            <li><a href="#export"><i class="bi bi-download"></i> 데이터 내보내기</a></li>
            <li><a href="#settings"><i class="bi bi-gear"></i> 설정</a></li>
            <li><a href="/"><i class="bi bi-box-arrow-left"></i> 메인으로</a></li>
        </ul>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-clipboard-data"></i> 관리자 대시보드</h2>
            <button class="btn btn-primary" onclick="loadSubmissions()">
                <i class="bi bi-arrow-clockwise"></i> 새로고침
            </button>
        </div>

        <!-- Statistics Cards -->
        <div class="row mb-4" id="stats-container">
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number" id="total-submissions">-</div>
                    <div class="stat-label">전체 제출</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number text-success" id="today-submissions">-</div>
                    <div class="stat-label">오늘 제출</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number text-warning" id="symptoms-count">-</div>
                    <div class="stat-label">증상 보고</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number text-info" id="avg-age">-</div>
                    <div class="stat-label">평균 연령</div>
                </div>
            </div>
        </div>

        <!-- Submissions Table -->
        <div class="table-container">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5><i class="bi bi-list-ul"></i> 최근 제출 목록</h5>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="exportToExcel()">
                        <i class="bi bi-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="exportToCSV()">
                        <i class="bi bi-filetype-csv"></i> CSV
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover" id="submissions-table">
                    <thead>
                        <tr>
                            <th>제출 ID</th>
                            <th>이름</th>
                            <th>나이</th>
                            <th>성별</th>
                            <th>업체명</th>
                            <th>공정</th>
                            <th>역할</th>
                            <th>증상</th>
                            <th>제출일시</th>
                            <th>작업</th>
                        </tr>
                    </thead>
                    <tbody id="submissions-tbody">
                        <tr>
                            <td colspan="10" class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Load submissions data
        async function loadSubmissions() {
            try {
                const response = await fetch('/api/admin/submissions');
                const data = await response.json();

                if (data.success) {
                    updateStatistics(data.statistics);
                    renderSubmissionsTable(data.submissions);
                } else {
                    alert('데이터 로딩 실패: ' + data.error);
                }
            } catch (error) {
                console.error('Error loading submissions:', error);
                alert('데이터 로딩 중 오류 발생');
            }
        }

        function updateStatistics(stats) {
            document.getElementById('total-submissions').textContent = stats.total || 0;
            document.getElementById('today-submissions').textContent = stats.today || 0;
            document.getElementById('symptoms-count').textContent = stats.withSymptoms || 0;
            document.getElementById('avg-age').textContent = stats.avgAge ? stats.avgAge.toFixed(1) : '0';
        }

        function renderSubmissionsTable(submissions) {
            const tbody = document.getElementById('submissions-tbody');

            if (!submissions || submissions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center">제출된 데이터가 없습니다.</td></tr>';
                return;
            }

            tbody.innerHTML = submissions.map(sub => \`
                <tr>
                    <td><span class="badge bg-secondary">\${sub.submission_id.substring(0, 20)}...</span></td>
                    <td><strong>\${sub.name}</strong></td>
                    <td>\${sub.age}세</td>
                    <td>\${sub.gender}</td>
                    <td>\${sub.company || '-'}</td>
                    <td>\${sub.process || '-'}</td>
                    <td>\${sub.role || '-'}</td>
                    <td>\${sub.diagnosed === 'yes' ? '<span class="badge bg-warning">증상있음</span>' : '<span class="badge bg-success">정상</span>'}</td>
                    <td>\${new Date(sub.submitted_at).toLocaleString('ko-KR')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary action-btn" onclick="viewDetail('\${sub.submission_id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger action-btn" onclick="deleteSubmission('\${sub.submission_id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            \`).join('');
        }

        async function viewDetail(submissionId) {
            try {
                const response = await fetch(\`/api/admin/submission/\${submissionId}\`);
                const data = await response.json();

                if (data.success) {
                    const sub = data.submission;
                    const modalHtml = \`
                        <div class="modal fade" id="detailModal" tabindex="-1">
                            <div class="modal-dialog modal-lg">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">제출 상세 정보</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <h6>기본 정보</h6>
                                        <table class="table table-sm">
                                            <tr><th>제출 ID</th><td>\${sub.submission_id}</td></tr>
                                            <tr><th>이름</th><td>\${sub.name}</td></tr>
                                            <tr><th>나이</th><td>\${sub.age}세</td></tr>
                                            <tr><th>성별</th><td>\${sub.gender}</td></tr>
                                            <tr><th>업체명</th><td>\${sub.company || '-'}</td></tr>
                                            <tr><th>공정</th><td>\${sub.process || '-'}</td></tr>
                                            <tr><th>역할</th><td>\${sub.role || '-'}</td></tr>
                                            <tr><th>직위</th><td>\${sub.position || '-'}</td></tr>
                                            <tr><th>근무년수</th><td>\${sub.work_years || '-'}년</td></tr>
                                            <tr><th>결혼상태</th><td>\${sub.marriage_status || '-'}</td></tr>
                                            <tr><th>진단여부</th><td>\${sub.diagnosed === 'yes' ? '증상있음' : '정상'}</td></tr>
                                            <tr><th>진단상세</th><td>\${sub.diagnosed_details || '-'}</td></tr>
                                            <tr><th>제출일시</th><td>\${new Date(sub.submitted_at).toLocaleString('ko-KR')}</td></tr>
                                            <tr><th>버전</th><td>\${sub.form_version}</td></tr>
                                        </table>
                                        <h6 class="mt-3">작업 정보</h6>
                                        <table class="table table-sm">
                                            <tr><th>현재 작업</th><td>\${sub.current_work_details || '-'}</td></tr>
                                            <tr><th>작업 경력</th><td>\${sub.current_work_years || 0}년 \${sub.current_work_months || 0}개월</td></tr>
                                            <tr><th>일일 근무시간</th><td>\${sub.work_hours_per_day || '-'}시간</td></tr>
                                            <tr><th>휴게시간</th><td>\${sub.break_time_minutes || '-'}분</td></tr>
                                        </table>
                                    </div>
                                    <div class="modal-footer">
                                        <button class="btn btn-primary" onclick="editSubmission('\${sub.submission_id}')">
                                            <i class="bi bi-pencil"></i> 수정
                                        </button>
                                        <button class="btn btn-danger" onclick="deleteSubmission('\${sub.submission_id}')">
                                            <i class="bi bi-trash"></i> 삭제
                                        </button>
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;

                    // Remove existing modal
                    const existingModal = document.getElementById('detailModal');
                    if (existingModal) existingModal.remove();

                    // Add and show new modal
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
                    modal.show();
                } else {
                    alert('상세 정보 로딩 실패');
                }
            } catch (error) {
                console.error('Error loading detail:', error);
            }
        }

        async function editSubmission(submissionId) {
            try {
                const response = await fetch(\`/api/admin/submission/\${submissionId}\`);
                const data = await response.json();

                if (data.success) {
                    const sub = data.submission;
                    const editModalHtml = \`
                        <div class="modal fade" id="editModal" tabindex="-1">
                            <div class="modal-dialog modal-lg">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">데이터 수정</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <form id="editForm">
                                            <input type="hidden" id="edit_submission_id" value="\${sub.submission_id}">
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">이름 *</label>
                                                    <input type="text" class="form-control" id="edit_name" value="\${sub.name}" required>
                                                </div>
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">나이 *</label>
                                                    <input type="number" class="form-control" id="edit_age" value="\${sub.age}" required>
                                                </div>
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">성별 *</label>
                                                    <select class="form-select" id="edit_gender" required>
                                                        <option value="남" \${sub.gender === '남' ? 'selected' : ''}>남</option>
                                                        <option value="여" \${sub.gender === '여' ? 'selected' : ''}>여</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">업체명</label>
                                                    <input type="text" class="form-control" id="edit_company" value="\${sub.company || ''}">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">공정</label>
                                                    <input type="text" class="form-control" id="edit_process" value="\${sub.process || ''}">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">역할</label>
                                                    <input type="text" class="form-control" id="edit_role" value="\${sub.role || ''}">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">직위</label>
                                                    <input type="text" class="form-control" id="edit_position" value="\${sub.position || ''}">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">근무년수</label>
                                                    <input type="number" class="form-control" id="edit_work_years" value="\${sub.work_years || ''}">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">결혼상태</label>
                                                    <select class="form-select" id="edit_marriage_status">
                                                        <option value="">선택</option>
                                                        <option value="기혼" \${sub.marriage_status === '기혼' ? 'selected' : ''}>기혼</option>
                                                        <option value="미혼" \${sub.marriage_status === '미혼' ? 'selected' : ''}>미혼</option>
                                                    </select>
                                                </div>
                                                <div class="col-12 mb-3">
                                                    <label class="form-label">진단 여부</label>
                                                    <select class="form-select" id="edit_diagnosed">
                                                        <option value="">없음</option>
                                                        <option value="yes" \${sub.diagnosed === 'yes' ? 'selected' : ''}>증상있음</option>
                                                        <option value="no" \${sub.diagnosed === 'no' ? 'selected' : ''}>정상</option>
                                                    </select>
                                                </div>
                                                <div class="col-12 mb-3">
                                                    <label class="form-label">진단 상세</label>
                                                    <textarea class="form-control" id="edit_diagnosed_details" rows="3">\${sub.diagnosed_details || ''}</textarea>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                                        <button type="button" class="btn btn-primary" onclick="saveEdit()">
                                            <i class="bi bi-save"></i> 저장
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;

                    // Close detail modal
                    const detailModal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
                    if (detailModal) detailModal.hide();

                    // Remove existing edit modal
                    const existingModal = document.getElementById('editModal');
                    if (existingModal) existingModal.remove();

                    // Add and show edit modal
                    document.body.insertAdjacentHTML('beforeend', editModalHtml);
                    const modal = new bootstrap.Modal(document.getElementById('editModal'));
                    modal.show();
                }
            } catch (error) {
                console.error('Error loading edit form:', error);
            }
        }

        async function saveEdit() {
            const submissionId = document.getElementById('edit_submission_id').value;
            const formData = {
                name: document.getElementById('edit_name').value,
                age: parseInt(document.getElementById('edit_age').value),
                gender: document.getElementById('edit_gender').value,
                company: document.getElementById('edit_company').value,
                process: document.getElementById('edit_process').value,
                role: document.getElementById('edit_role').value,
                position: document.getElementById('edit_position').value,
                work_years: parseInt(document.getElementById('edit_work_years').value) || null,
                marriage_status: document.getElementById('edit_marriage_status').value,
                diagnosed: document.getElementById('edit_diagnosed').value,
                diagnosed_details: document.getElementById('edit_diagnosed_details').value
            };

            try {
                const response = await fetch(\`/api/admin/submission/\${submissionId}\`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    alert('수정 완료!');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
                    modal.hide();
                    loadSubmissions();
                } else {
                    alert('수정 실패: ' + data.error);
                }
            } catch (error) {
                console.error('Error saving:', error);
                alert('수정 중 오류 발생');
            }
        }

        async function deleteSubmission(submissionId) {
            if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

            try {
                const response = await fetch(\`/api/admin/submission/\${submissionId}\`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (data.success) {
                    alert('삭제 완료');

                    // Close all modals
                    const detailModal = document.getElementById('detailModal');
                    if (detailModal) {
                        const modal = bootstrap.Modal.getInstance(detailModal);
                        if (modal) modal.hide();
                    }

                    loadSubmissions();
                } else {
                    alert('삭제 실패: ' + data.error);
                }
            } catch (error) {
                console.error('Error deleting:', error);
                alert('삭제 중 오류 발생');
            }
        }

        function exportToExcel() {
            window.location.href = '/api/admin/export/excel';
        }

        function exportToCSV() {
            window.location.href = '/api/admin/export/csv';
        }

        // Load data on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadSubmissions();
        });
    </script>
</body>
</html>
`;