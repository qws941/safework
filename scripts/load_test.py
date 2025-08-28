from locust import HttpUser, task, between
import json
from faker import Faker

fake = Faker()

class SafeworkUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """테스트 시작 시 실행"""
        # 건강 상태 확인
        self.client.get("/health")
    
    @task(3)
    def view_homepage(self):
        """홈페이지 조회"""
        self.client.get("/")
    
    @task(2)
    def view_survey_form(self):
        """설문조사 폼 조회"""
        self.client.get("/survey/new")
    
    @task(1)
    def health_check(self):
        """헬스체크"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(1)
    def static_resources(self):
        """정적 리소스 로드"""
        self.client.get("/static/css/style.css", name="/static/css")
        self.client.get("/static/js/app.js", name="/static/js")