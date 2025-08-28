"""Test database models functionality."""

import pytest
from datetime import datetime
from models import db, User, Survey, SurveyStatistics, AuditLog


class TestUser:
    """Test User model functionality."""
    
    def test_create_user(self, app):
        """Test user creation."""
        with app.app_context():
            user = User(
                username='newuser',
                email='newuser@test.com',
                is_admin=False
            )
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.username == 'newuser'
            assert user.email == 'newuser@test.com'
            assert user.is_admin is False
            assert user.password_hash is not None
            assert user.password_hash != 'testpassword'  # Should be hashed
    
    def test_password_hashing(self, app, regular_user):
        """Test password hashing and verification."""
        with app.app_context():
            # Test password verification
            assert regular_user.check_password('testpass123')
            assert not regular_user.check_password('wrongpassword')
    
    def test_user_representation(self, app, regular_user):
        """Test user string representation."""
        with app.app_context():
            assert str(regular_user) == '<User testuser>'
    
    def test_user_authentication_methods(self, app, regular_user):
        """Test user authentication helper methods."""
        with app.app_context():
            assert regular_user.is_authenticated
            assert regular_user.is_active
            assert not regular_user.is_anonymous
            assert regular_user.get_id() == str(regular_user.id)


class TestSurvey:
    """Test Survey model functionality."""
    
    def test_create_survey(self, app, regular_user):
        """Test survey creation."""
        with app.app_context():
            survey = Survey(
                user_id=regular_user.id,
                name='홍길동',
                age=30,
                department='IT부서',
                work_name='소프트웨어 개발자',
                work_years=5,
                work_hours_per_day=8,
                neck_data={'side': '양쪽', 'severity': '약한통증'}
            )
            
            db.session.add(survey)
            db.session.commit()
            
            assert survey.id is not None
            assert survey.name == '홍길동'
            assert survey.department == 'IT부서'
            assert survey.work_years == 5
            assert survey.created_at is not None
            assert isinstance(survey.neck_data, dict)
    
    def test_survey_user_relationship(self, app, regular_user):
        """Test survey-user relationship."""
        with app.app_context():
            survey = Survey(
                user_id=regular_user.id,
                name='테스트 참가자',
                age=25,
                department='테스트부서',
                work_name='테스터',
                work_years=1,
                work_hours_per_day=8
            )
            
            db.session.add(survey)
            db.session.commit()
            
            # Test relationship - query fresh user to avoid session issues
            fresh_user = User.query.get(regular_user.id)
            assert survey.user == fresh_user
            assert survey in fresh_user.surveys
    
    def test_survey_representation(self, app, regular_user):
        """Test survey string representation."""
        with app.app_context():
            survey = Survey(
                user_id=regular_user.id,
                name='테스트',
                age=28,
                department='부서',
                work_name='직책',
                work_years=1,
                work_hours_per_day=8
            )
            db.session.add(survey)
            db.session.commit()
            
            expected = f'<Survey 테스트 - {survey.submission_date}>'
            assert str(survey) == expected


class TestSurveyStatistics:
    """Test SurveyStatistics model functionality."""
    
    def test_create_statistics(self, app):
        """Test statistics creation."""
        with app.app_context():
            from datetime import date
            stats = SurveyStatistics(
                stat_date=date.today(),
                total_submissions=100,
                department_stats={'IT': 30, 'HR': 20, 'Sales': 50},
                neck_count=60,
                waist_count=40
            )
            
            db.session.add(stats)
            db.session.commit()
            
            assert stats.id is not None
            assert stats.total_submissions == 100
            assert isinstance(stats.department_stats, dict)
            assert stats.neck_count == 60
            assert stats.created_at is not None


class TestAuditLog:
    """Test AuditLog model functionality."""
    
    def test_create_audit_log(self, app, admin_user):
        """Test audit log creation."""
        with app.app_context():
            log = AuditLog(
                user_id=admin_user.id,
                action='login',
                target_type='user',
                target_id=admin_user.id,
                details={'ip': '127.0.0.1', 'user_agent': 'test'},
                ip_address='127.0.0.1',
                user_agent='TestAgent/1.0'
            )
            
            db.session.add(log)
            db.session.commit()
            
            assert log.id is not None
            assert log.user_id == admin_user.id
            assert log.action == 'login'
            assert log.created_at is not None
            assert isinstance(log.details, dict)
    
    def test_audit_log_user_relationship(self, app, admin_user):
        """Test audit log-user relationship."""
        with app.app_context():
            log = AuditLog(
                user_id=admin_user.id,
                action='test_action',
                target_type='test',
                ip_address='127.0.0.1',
                user_agent='test'
            )
            
            db.session.add(log)
            db.session.commit()
            
            # Test relationship - query fresh user to avoid session issues  
            fresh_admin = User.query.get(admin_user.id)
            assert log.user == fresh_admin
            assert log in fresh_admin.audit_logs