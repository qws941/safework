#!/usr/bin/env python3
"""
SafeWork Independent Container Structure Validation Script
독립 컨테이너 구조 및 Watchtower 호환성 검증
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Tuple

class SafeWorkStructureValidator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.errors = []
        self.warnings = []
        self.info = []
        
    def validate_all(self) -> Dict:
        """전체 구조 검증 실행"""
        print("🔍 SafeWork Independent Container Structure Validation")
        print("=" * 60)
        
        # 검증 항목들
        self.validate_root_directory()
        self.validate_service_containers()
        self.validate_dockerfiles()
        self.validate_github_workflows()
        self.validate_watchtower_compatibility()
        self.validate_security_compliance()
        
        return self.generate_report()
    
    def validate_root_directory(self):
        """Root 디렉토리 규칙 검증"""
        print("📁 Root Directory Validation...")
        
        allowed_files = {"CLAUDE.md", "README.md", ".gitignore"}
        allowed_dirs = {".github", "app", "mysql", "redis", "docs", "scripts", "config", "forms", "migrations", ".claude"}
        
        root_items = set(os.listdir(self.project_root))
        
        # 허용된 파일만 존재하는지 확인
        root_files = {item for item in root_items if os.path.isfile(self.project_root / item)}
        unauthorized_files = root_files - allowed_files
        
        if unauthorized_files:
            self.errors.append(f"Root directory contains unauthorized files: {unauthorized_files}")
        else:
            self.info.append("✅ Root directory file restrictions compliant")
            
        # 필수 파일 존재 확인
        for required_file in allowed_files:
            if required_file not in root_files:
                self.errors.append(f"Missing required root file: {required_file}")
                
        # 백업 파일 패턴 검사
        backup_patterns = ["backup", ".bak", "-v2", "-copy", "-old"]
        for item in root_items:
            if any(pattern in item.lower() for pattern in backup_patterns):
                self.errors.append(f"Backup file found in root: {item}")
    
    def validate_service_containers(self):
        """독립 서비스 컨테이너 구조 검증"""
        print("🐳 Service Container Structure Validation...")
        
        required_services = ["app", "mysql", "redis"]
        
        for service in required_services:
            service_path = self.project_root / service
            
            if not service_path.exists():
                self.errors.append(f"Missing service directory: {service}")
                continue
                
            # 각 서비스 필수 파일 확인
            required_files = ["Dockerfile", ".dockerignore"]
            
            for req_file in required_files:
                file_path = service_path / req_file
                if not file_path.exists():
                    self.errors.append(f"Missing {req_file} in {service} service")
                else:
                    self.info.append(f"✅ {service}/{req_file} exists")
    
    def validate_dockerfiles(self):
        """Dockerfile Watchtower 호환성 검증"""
        print("🏗️ Dockerfile Validation...")
        
        services = ["app", "mysql", "redis"]
        
        for service in services:
            dockerfile_path = self.project_root / service / "Dockerfile"
            
            if not dockerfile_path.exists():
                continue
                
            try:
                with open(dockerfile_path, 'r', encoding='utf-8') as f:
                    dockerfile_content = f.read()
                
                # Watchtower 라벨 확인
                if 'com.centurylinklabs.watchtower.enable="true"' in dockerfile_content:
                    self.info.append(f"✅ {service} has Watchtower label")
                else:
                    self.warnings.append(f"⚠️ {service} missing Watchtower label")
                
                # Health check 확인
                if 'HEALTHCHECK' in dockerfile_content:
                    self.info.append(f"✅ {service} has health check")
                else:
                    self.warnings.append(f"⚠️ {service} missing health check")
                
                # 비-root 사용자 확인
                if 'USER ' in dockerfile_content and 'USER root' not in dockerfile_content:
                    self.info.append(f"✅ {service} uses non-root user")
                else:
                    self.warnings.append(f"⚠️ {service} may be running as root")
                    
            except Exception as e:
                self.errors.append(f"Error reading {service}/Dockerfile: {e}")
    
    def validate_github_workflows(self):
        """GitHub Actions 워크플로우 검증"""
        print("⚙️ GitHub Workflows Validation...")
        
        workflows_path = self.project_root / ".github" / "workflows"
        
        if not workflows_path.exists():
            self.errors.append("Missing .github/workflows directory")
            return
            
        required_workflows = [
            "independent-build.yml",
            "operational-log-analysis.yml", 
            "claude.yml"
        ]
        
        existing_workflows = [f.name for f in workflows_path.glob("*.yml")]
        
        for workflow in required_workflows:
            if workflow in existing_workflows:
                self.info.append(f"✅ {workflow} exists")
                
                # independent-build.yml 매트릭스 빌드 검증
                if workflow == "independent-build.yml":
                    try:
                        with open(workflows_path / workflow, 'r', encoding='utf-8') as f:
                            workflow_content = yaml.safe_load(f)
                        
                        # 매트릭스 빌드 확인
                        jobs = workflow_content.get('jobs', {})
                        for job_name, job_config in jobs.items():
                            strategy = job_config.get('strategy', {})
                            matrix = strategy.get('matrix', {})
                            
                            if 'service' in matrix:
                                services = matrix['service']
                                if set(services) >= {'app', 'mysql', 'redis'}:
                                    self.info.append("✅ Matrix build includes all services")
                                else:
                                    self.warnings.append(f"⚠️ Matrix build missing services: {set(['app', 'mysql', 'redis']) - set(services)}")
                    except Exception as e:
                        self.warnings.append(f"⚠️ Could not validate {workflow}: {e}")
            else:
                self.warnings.append(f"⚠️ Missing workflow: {workflow}")
    
    def validate_watchtower_compatibility(self):
        """Watchtower 자동 업데이트 호환성 검증"""
        print("🔄 Watchtower Compatibility Validation...")
        
        # 각 서비스의 Watchtower 설정 검증
        services = ["app", "mysql", "redis"]
        watchtower_ready = []
        
        for service in services:
            dockerfile_path = self.project_root / service / "Dockerfile"
            
            if dockerfile_path.exists():
                try:
                    with open(dockerfile_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Watchtower 필수 요소 확인
                    watchtower_checks = {
                        'label': 'com.centurylinklabs.watchtower.enable="true"' in content,
                        'healthcheck': 'HEALTHCHECK' in content,
                        'expose_port': 'EXPOSE' in content
                    }
                    
                    if all(watchtower_checks.values()):
                        watchtower_ready.append(service)
                        self.info.append(f"✅ {service} is Watchtower ready")
                    else:
                        missing = [k for k, v in watchtower_checks.items() if not v]
                        self.warnings.append(f"⚠️ {service} missing Watchtower requirements: {missing}")
                        
                except Exception as e:
                    self.errors.append(f"Error validating {service} Watchtower compatibility: {e}")
        
        if len(watchtower_ready) == len(services):
            self.info.append("🚀 All services are Watchtower compatible")
    
    def validate_security_compliance(self):
        """보안 컴플라이언스 검증"""
        print("🔒 Security Compliance Validation...")
        
        # .gitignore 보안 패턴 확인
        gitignore_path = self.project_root / ".gitignore"
        
        if gitignore_path.exists():
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                gitignore_content = f.read()
            
            security_patterns = [
                "*.key", "*.pem", ".env", "secrets/", 
                "*backup*", "*.bak", "*-v2*"
            ]
            
            missing_patterns = []
            for pattern in security_patterns:
                if pattern not in gitignore_content:
                    missing_patterns.append(pattern)
            
            if missing_patterns:
                self.warnings.append(f"⚠️ .gitignore missing security patterns: {missing_patterns}")
            else:
                self.info.append("✅ .gitignore has comprehensive security patterns")
        
        # GitHub Secrets 사용 확인
        secrets_doc_path = self.project_root / "docs" / "github-secrets-setup.md"
        if secrets_doc_path.exists():
            self.info.append("✅ GitHub Secrets documentation exists")
        else:
            self.warnings.append("⚠️ GitHub Secrets documentation missing")
    
    def generate_report(self) -> Dict:
        """검증 결과 리포트 생성"""
        print("\n" + "=" * 60)
        print("📊 VALIDATION REPORT")
        print("=" * 60)
        
        # 요약 통계
        total_checks = len(self.errors) + len(self.warnings) + len(self.info)
        success_rate = (len(self.info) / total_checks * 100) if total_checks > 0 else 0
        
        print(f"Total Checks: {total_checks}")
        print(f"✅ Passed: {len(self.info)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Errors: {len(self.errors)}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # 에러 출력
        if self.errors:
            print("❌ ERRORS:")
            for error in self.errors:
                print(f"   • {error}")
            print()
        
        # 경고 출력
        if self.warnings:
            print("⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"   • {warning}")
            print()
        
        # 성공 항목 출력
        if self.info:
            print("✅ PASSED CHECKS:")
            for info in self.info:
                print(f"   • {info}")
            print()
        
        # 최종 판정
        if not self.errors:
            if not self.warnings:
                print("🎉 STRUCTURE VALIDATION PASSED - Ready for Independent Deployment!")
            else:
                print("✅ STRUCTURE VALIDATION PASSED - Minor warnings to address")
        else:
            print("❌ STRUCTURE VALIDATION FAILED - Critical issues must be fixed")
        
        return {
            "success": len(self.errors) == 0,
            "total_checks": total_checks,
            "passed": len(self.info),
            "warnings": len(self.warnings),
            "errors": len(self.errors),
            "success_rate": success_rate,
            "error_details": self.errors,
            "warning_details": self.warnings,
            "passed_details": self.info
        }

if __name__ == "__main__":
    validator = SafeWorkStructureValidator()
    report = validator.validate_all()
    
    # JSON 리포트 저장
    report_path = "docs/structure-validation-report.json"
    os.makedirs("docs", exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 Detailed report saved to: {report_path}")
    
    # 종료 코드 설정 (CI/CD에서 사용)
    exit(0 if report["success"] else 1)