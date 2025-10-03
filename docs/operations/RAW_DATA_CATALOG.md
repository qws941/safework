# SafeWork Raw Data Catalog - 002 Musculoskeletal Disorder Prevention Program

**Generated**: 2025-10-04
**Total Size**: 4.7GB
**Purpose**: Catalog of raw reference materials for 002 program enhancement

## Overview

This catalog organizes all raw data materials relevant to the **002 Musculoskeletal Disorder Prevention Program (근골격계 질환예방 프로그램)** for enhancement and digitization.

## 002 Program Core Materials

### 1. Prevention Program Documentation

**Location**: `raw_data/보건관리자 김선민/18.직무관련성질환예방 프로그램/3)근골격계 질환예방 프로그램/`

| File | Type | Size | Description |
|------|------|------|-------------|
| 06.근골격계 질환예방 프로그램(2020).hwp | Hangul | 88KB | Official 2020 prevention program document |
| H-9-2022_근골격계부담작업 유해요인조사 지침.pdf | PDF | 891KB | 2022 Hazard assessment guidelines |
| 근골격계.pdf | PDF | 916KB | Musculoskeletal disorder reference manual |

### 2. Educational Materials (34 Images)

**Location**: `raw_data/보건관리자 김선민/18.직무관련성질환예방 프로그램/3)근골격계 질환예방 프로그램/근골격계질환예방교육자료/`

**Total**: 43MB of educational images (JPG format)

- **건강 관리 - 근골격계 예방 (1-34).jpg**
  - Professional educational posters
  - Prevention techniques and exercises
  - Risk factors and symptoms
  - Workplace ergonomics guidance

**Enhancement Potential**:
- Digitize into interactive web-based educational content
- Convert to responsive HTML5 with AI-powered explanations
- Integrate with Workers AI for personalized guidance

### 3. Survey Forms (Existing System)

#### Current Implementation (data/)
- **002_musculoskeletal_symptom_program.xls** (1.8MB) - Excel-based survey
- **002_근골격계_증상조사표_분석_프로그램_사용안내.pdf** (1012KB) - User guide
- **002_complete_structure.json** (17KB) - Parsed form structure
- **002_correct_structure.json** (13KB) - Validated structure

#### Raw Form Templates (raw_data/보건서식/)
- **01.보건 교육 자료/근골격계+증상조사표.hwp** - Education version
- **02.건강/근골격계+증상조사표.hwp** - Health screening version

**Enhancement Potential**:
- Unified digital form with D1 database storage
- Real-time validation with Workers AI
- Mobile-responsive design for on-site surveys
- Automatic risk assessment and scoring

### 4. Hazard Assessment Forms

**Location**: `raw_data/보건관리자 김선민/18.직무관련성질환예방 프로그램/3)근골격계 질환예방 프로그램/4)근골격계/`

**Subdirectories**:
- `근골격계 유해요인 기본 조사표/` - Basic hazard assessment forms (empty)
- `근골격계질환 증상 조사표(설문지)/` - Symptom survey questionnaires (empty)

**Note**: These directories are placeholders for future form templates.

## Related Health Management Forms

### Location: `raw_data/보건서식/02.건강/`

| File | Type | Size | Purpose |
|------|------|------|---------|
| 건강관리 카드.hwp | Hangul | 28KB | Worker health management card |
| 건강상담일지 양식.xlsx | Excel | 13KB | Health consultation log |
| 건강심의 위원회 운영.hwp | Hangul | 64KB | Health committee operations |
| 뇌·심혈관질환 발병위험도 평가조사표(Rev.1).xlsx | Excel | 291KB | Cardiovascular risk assessment (003) |
| 보건관리자 시기별 업무정리.pdf | PDF | 98KB | Health manager task timeline |
| 유소견자 관리등급.hwp | Hangul | 80KB | Health issue grading system |

**Enhancement Potential**:
- Integrate health management card with 002 survey results
- Link consultation logs to survey submissions
- Unified health committee dashboard

## Additional Reference Materials

### Educational Resources
**Location**: `raw_data/보건관리자 김선민/17.건강장해 예방프로그램/`

- Hearing conservation program materials
- Noise management education content
- Health management infographics

### Safety Documentation
**Location**: `raw_data/보건서식/`

- **09.건설현장 안전관리 실무지침서(용량조정).xlsx** (941KB) - Construction safety manual
- **업무수행 체크리스트 및 서식.pdf** (9.0MB) - Task performance checklists

## Enhancement Strategy (고도화)

### Phase 1: Digital Transformation ✅ (Current)
- [x] Excel-based 002 survey form
- [x] D1 database storage
- [x] JSON structure parsing
- [x] Basic web interface

### Phase 2: Educational Content Integration (Proposed)
- [ ] Convert 34 educational JPGs to web-based content
- [ ] Interactive educational modules with Workers AI
- [ ] R2 storage for educational images
- [ ] Responsive image gallery with explanations

### Phase 3: Advanced Features (Proposed)
- [ ] AI-powered risk assessment using Workers AI
- [ ] Real-time symptom analysis and recommendations
- [ ] Integration with health management cards
- [ ] Mobile-first responsive design for on-site surveys
- [ ] QR code generation for easy survey access
- [ ] Automatic report generation with AI insights

### Phase 4: Comprehensive Health Management (Proposed)
- [ ] Unified health dashboard with 002 + 003 (cardiovascular)
- [ ] Health committee decision support system
- [ ] Longitudinal health tracking and trend analysis
- [ ] Predictive analytics for workplace health risks

## Technical Implementation Plan

### Current Architecture
- **Cloudflare Workers**: Edge computing with Hono.js
- **D1 Database**: Serverless SQLite for survey data
- **KV Storage**: Session and cache management
- **R2 Storage**: File and image storage (enabled)
- **Workers AI**: Llama 3 for AI features

### Proposed Enhancements

#### 1. Educational Content API
```
GET /api/education/musculoskeletal/images
GET /api/education/musculoskeletal/content/{id}
POST /api/education/progress (track user progress)
```

#### 2. Enhanced Survey API
```
GET /api/survey/002/form (existing)
POST /api/survey/002/submit (existing)
GET /api/survey/002/ai-analysis (NEW - AI-powered risk assessment)
GET /api/survey/002/recommendations (NEW - personalized guidance)
```

#### 3. Health Management Integration
```
GET /api/health/worker/{id}/card
GET /api/health/worker/{id}/history
POST /api/health/consultation
GET /api/health/committee/dashboard
```

## Data Migration Tasks

### Immediate (High Priority)
1. ✅ Catalog all 002 program materials
2. [ ] Upload 34 educational JPGs to R2 storage
3. [ ] Create educational content metadata in D1
4. [ ] Implement image serving API

### Short-term (Medium Priority)
1. [ ] Digitize 근골격계+증상조사표.hwp forms
2. [ ] Create unified survey form combining all variants
3. [ ] Implement AI-powered risk assessment
4. [ ] Mobile-responsive survey interface

### Long-term (Low Priority)
1. [ ] Integrate health management card system
2. [ ] Build health committee dashboard
3. [ ] Predictive analytics and trend analysis
4. [ ] Multi-language support (Korean/English)

## File Organization Recommendations

### Keep in raw_data/
- ✅ Educational JPGs (43MB) - Will be migrated to R2
- ✅ PDF guidelines and manuals - Reference materials
- ✅ Original Hangul documents - Source of truth

### Consider Archiving
- Empty placeholder directories
- Duplicate survey forms (after unification)
- Outdated 2020 program documents (after updating to 2024)

### Do Not Delete
- All educational materials (valuable content)
- Official guidelines (H-9-2022)
- Survey form templates (multiple versions for comparison)

## References

### Existing SafeWork Forms
- **001**: Musculoskeletal Symptom Survey (Individual workers)
- **002**: Musculoskeletal Symptom Program (Comprehensive assessment)
- **003**: Cardiovascular Risk Assessment
- **006**: Elderly Worker Approval Form

### Related Documentation
- `docs/architecture/D1-MIGRATION-COMPLETE.md` - Database architecture
- `docs/architecture/MIGRATION-SUCCESS-SUMMARY.md` - Migration status
- `workers/CLOUDFLARE-NATIVE.md` - Technical architecture
- `CLAUDE.md` - Development guide

## Next Steps

1. **Immediate**: Upload educational images to R2 storage
2. **Week 1**: Create educational content API
3. **Week 2**: Implement AI-powered risk assessment
4. **Week 3**: Build interactive educational module
5. **Month 2**: Unified health management dashboard

---

**Catalog Status**: ✅ Complete
**Enhancement Status**: 📋 Planning Phase
**Next Action**: Upload educational materials to R2 storage
