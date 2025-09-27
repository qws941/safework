"""
Database Integration Tests for SafeWork
======================================

Tests database operations, CRUD functionality, transactions,
data integrity, and migration compatibility.
"""

import pytest
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta
import json

# KST timezone
KST = timezone(timedelta(hours=9))


@pytest.mark.database
class TestDatabaseConnection:
    """Test database connectivity and basic operations"""
    
    def test_database_connection(self, db_engine):
        """Test basic database connection"""
        with db_engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            assert result.fetchone()[0] == 1
    
    def test_database_version(self, db_engine):
        """Test PostgreSQL version compatibility"""
        with db_engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version_info = result.fetchone()[0]
            
            # Should be PostgreSQL 15+
            assert "PostgreSQL" in version_info
            
    def test_database_timezone(self, db_engine):
        """Test database timezone configuration"""
        with db_engine.connect() as conn:
            result = conn.execute(text("SHOW timezone"))
            timezone_setting = result.fetchone()[0]
            
            # Should be properly configured
            assert timezone_setting is not None
    
    def test_database_encoding(self, db_engine):
        """Test database encoding for Korean support"""
        with db_engine.connect() as conn:
            result = conn.execute(text("SHOW server_encoding"))
            encoding = result.fetchone()[0]
            
            # Should support UTF-8 for Korean text
            assert encoding.upper() in ['UTF8', 'UTF-8']


@pytest.mark.database
class TestTableStructure:
    """Test database table structure and constraints"""
    
    def test_required_tables_exist(self, db_engine):
        """Test that all required tables exist"""
        required_tables = [
            'users',
            'surveys',
            'audit_logs',
            'workers',
            'departments_extended',
            'health_check_plans',
            'health_check_results',
            'environment_measurements'
        ]
        
        with db_engine.connect() as conn:
            for table in required_tables:
                result = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """))
                exists = result.fetchone()[0]
                assert exists, f"Required table '{table}' does not exist"
    
    def test_users_table_structure(self, db_engine):
        """Test users table structure"""
        with db_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            column_names = [col[0] for col in columns]
            
            # Verify essential columns exist
            assert 'id' in column_names
            assert 'username' in column_names
            assert 'email' in column_names
            assert 'created_at' in column_names
    
    def test_surveys_table_structure(self, db_engine):
        """Test surveys table structure"""
        with db_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'surveys'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            column_names = [col[0] for col in columns]
            
            # Verify essential columns exist
            assert 'id' in column_names
            assert 'form_type' in column_names
            assert 'user_id' in column_names
            assert 'responses' in column_names
            assert 'submitted_at' in column_names
    
    def test_workers_table_structure(self, db_engine):
        """Test workers table structure"""
        with db_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'workers'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            column_names = [col[0] for col in columns]
            
            # Verify essential columns exist
            assert 'id' in column_names
            assert 'employee_id' in column_names
            assert 'name' in column_names
            assert 'department_id' in column_names
            assert 'status' in column_names


@pytest.mark.database
class TestCRUDOperations:
    """Test Create, Read, Update, Delete operations"""
    
    def test_insert_survey_record(self, db_session, sample_survey_data):
        """Test inserting a survey record"""
        # Insert test survey
        insert_query = text("""
            INSERT INTO surveys (form_type, user_id, responses, submitted_at)
            VALUES (:form_type, :user_id, :responses, :submitted_at)
            RETURNING id
        """)
        
        result = db_session.execute(insert_query, {
            'form_type': sample_survey_data['form_type'],
            'user_id': sample_survey_data['user_id'],
            'responses': json.dumps(sample_survey_data['responses']),
            'submitted_at': datetime.now(KST)
        })
        
        survey_id = result.fetchone()[0]
        db_session.commit()
        
        assert survey_id is not None
        assert isinstance(survey_id, int)
        
        # Verify record exists
        select_query = text("SELECT * FROM surveys WHERE id = :id")
        result = db_session.execute(select_query, {'id': survey_id})
        survey = result.fetchone()
        
        assert survey is not None
        assert survey.form_type == sample_survey_data['form_type']
    
    def test_insert_worker_record(self, db_session, sample_worker_data):
        """Test inserting a worker record"""
        # First ensure department exists
        dept_query = text("""
            INSERT INTO departments_extended (code, name, risk_level)
            VALUES ('TEST_DEPT', 'Test Department', 'LOW')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """)
        
        dept_result = db_session.execute(dept_query)
        dept_id = dept_result.fetchone()[0]
        db_session.commit()
        
        # Insert test worker
        insert_query = text("""
            INSERT INTO workers (
                employee_id, name, department_id, position, hire_date, 
                status, birth_date, gender, contact_phone, email
            )
            VALUES (
                :employee_id, :name, :department_id, :position, :hire_date,
                :status, :birth_date, :gender, :contact_phone, :email
            )
            RETURNING id
        """)
        
        sample_worker_data['department_id'] = dept_id
        result = db_session.execute(insert_query, sample_worker_data)
        
        worker_id = result.fetchone()[0]
        db_session.commit()
        
        assert worker_id is not None
        
        # Verify record exists
        select_query = text("SELECT * FROM workers WHERE id = :id")
        result = db_session.execute(select_query, {'id': worker_id})
        worker = result.fetchone()
        
        assert worker is not None
        assert worker.employee_id == sample_worker_data['employee_id']
    
    def test_update_worker_record(self, db_session, sample_worker_data):
        """Test updating a worker record"""
        # First insert a worker
        dept_query = text("""
            INSERT INTO departments_extended (code, name, risk_level)
            VALUES ('TEST_DEPT2', 'Test Department 2', 'LOW')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """)
        
        dept_result = db_session.execute(dept_query)
        dept_id = dept_result.fetchone()[0]
        
        sample_worker_data['department_id'] = dept_id
        sample_worker_data['employee_id'] = 'TEST002'
        
        insert_query = text("""
            INSERT INTO workers (
                employee_id, name, department_id, position, hire_date, 
                status, birth_date, gender, contact_phone, email
            )
            VALUES (
                :employee_id, :name, :department_id, :position, :hire_date,
                :status, :birth_date, :gender, :contact_phone, :email
            )
            RETURNING id
        """)
        
        result = db_session.execute(insert_query, sample_worker_data)
        worker_id = result.fetchone()[0]
        db_session.commit()
        
        # Update the worker
        update_query = text("""
            UPDATE workers 
            SET position = :new_position, email = :new_email
            WHERE id = :id
        """)
        
        db_session.execute(update_query, {
            'id': worker_id,
            'new_position': 'Senior Safety Officer',
            'new_email': 'senior.test@example.com'
        })
        db_session.commit()
        
        # Verify update
        select_query = text("SELECT position, email FROM workers WHERE id = :id")
        result = db_session.execute(select_query, {'id': worker_id})
        updated_worker = result.fetchone()
        
        assert updated_worker.position == 'Senior Safety Officer'
        assert updated_worker.email == 'senior.test@example.com'
    
    def test_delete_records(self, db_session):
        """Test deleting records with proper cleanup"""
        # Insert a test survey to delete
        insert_query = text("""
            INSERT INTO surveys (form_type, user_id, responses, submitted_at)
            VALUES ('test_form', 1, '{}', NOW())
            RETURNING id
        """)
        
        result = db_session.execute(insert_query)
        survey_id = result.fetchone()[0]
        db_session.commit()
        
        # Delete the survey
        delete_query = text("DELETE FROM surveys WHERE id = :id")
        result = db_session.execute(delete_query, {'id': survey_id})
        db_session.commit()
        
        assert result.rowcount == 1
        
        # Verify deletion
        select_query = text("SELECT id FROM surveys WHERE id = :id")
        result = db_session.execute(select_query, {'id': survey_id})
        deleted_record = result.fetchone()
        
        assert deleted_record is None


@pytest.mark.database
class TestDataIntegrity:
    """Test data integrity constraints and relationships"""
    
    def test_foreign_key_constraints(self, db_session):
        """Test foreign key constraints are enforced"""
        # Try to insert worker with non-existent department
        insert_query = text("""
            INSERT INTO workers (
                employee_id, name, department_id, position, status
            )
            VALUES ('INVALID001', 'Invalid Worker', 99999, 'Tester', 'ACTIVE')
        """)
        
        with pytest.raises(Exception):  # Should raise foreign key constraint error
            db_session.execute(insert_query)
            db_session.commit()
        
        db_session.rollback()
    
    def test_unique_constraints(self, db_session):
        """Test unique constraints are enforced"""
        # Insert a worker
        dept_query = text("""
            INSERT INTO departments_extended (code, name, risk_level)
            VALUES ('UNIQUE_TEST', 'Unique Test Dept', 'LOW')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """)
        
        dept_result = db_session.execute(dept_query)
        dept_id = dept_result.fetchone()[0]
        
        insert_query = text("""
            INSERT INTO workers (
                employee_id, name, department_id, position, status
            )
            VALUES ('UNIQUE001', 'Unique Worker', :dept_id, 'Tester', 'ACTIVE')
        """)
        
        db_session.execute(insert_query, {'dept_id': dept_id})
        db_session.commit()
        
        # Try to insert another worker with same employee_id
        with pytest.raises(Exception):  # Should raise unique constraint error
            db_session.execute(insert_query, {'dept_id': dept_id})
            db_session.commit()
        
        db_session.rollback()
    
    def test_json_data_integrity(self, db_session):
        """Test JSON data storage and retrieval integrity"""
        test_responses = {
            'section1': {
                'question1': 'answer1',
                'question2': ['option1', 'option2'],
                'korean_text': '한국어 텍스트 테스트'
            },
            'section2': {
                'numeric_value': 42,
                'boolean_value': True,
                'date_value': '2024-01-01'
            }
        }
        
        # Insert survey with complex JSON data
        insert_query = text("""
            INSERT INTO surveys (form_type, user_id, responses, submitted_at)
            VALUES ('json_test', 1, :responses, NOW())
            RETURNING id
        """)
        
        result = db_session.execute(insert_query, {
            'responses': json.dumps(test_responses)
        })
        survey_id = result.fetchone()[0]
        db_session.commit()
        
        # Retrieve and verify JSON data
        select_query = text("SELECT responses FROM surveys WHERE id = :id")
        result = db_session.execute(select_query, {'id': survey_id})
        retrieved_responses = result.fetchone()[0]
        
        # Parse JSON and compare
        parsed_responses = json.loads(retrieved_responses)
        assert parsed_responses == test_responses
        assert parsed_responses['section1']['korean_text'] == '한국어 텍스트 테스트'


@pytest.mark.database
class TestTransactionHandling:
    """Test database transaction handling"""
    
    def test_transaction_commit(self, db_session):
        """Test successful transaction commit"""
        # Start transaction and insert multiple records
        dept_query = text("""
            INSERT INTO departments_extended (code, name, risk_level)
            VALUES ('TRANS_TEST', 'Transaction Test', 'LOW')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """)
        
        dept_result = db_session.execute(dept_query)
        dept_id = dept_result.fetchone()[0]
        
        survey_query = text("""
            INSERT INTO surveys (form_type, user_id, responses, submitted_at)
            VALUES ('transaction_test', 1, '{"test": true}', NOW())
            RETURNING id
        """)
        
        survey_result = db_session.execute(survey_query)
        survey_id = survey_result.fetchone()[0]
        
        # Commit transaction
        db_session.commit()
        
        # Verify both records exist
        dept_check = db_session.execute(text("SELECT id FROM departments_extended WHERE id = :id"), {'id': dept_id})
        survey_check = db_session.execute(text("SELECT id FROM surveys WHERE id = :id"), {'id': survey_id})
        
        assert dept_check.fetchone() is not None
        assert survey_check.fetchone() is not None
    
    def test_transaction_rollback(self, db_session):
        """Test transaction rollback on error"""
        # Insert a valid record
        insert_query = text("""
            INSERT INTO surveys (form_type, user_id, responses, submitted_at)
            VALUES ('rollback_test', 1, '{"test": true}', NOW())
            RETURNING id
        """)
        
        result = db_session.execute(insert_query)
        survey_id = result.fetchone()[0]
        
        # Don't commit yet - simulate error condition
        try:
            # Try to insert invalid data that should cause error
            invalid_query = text("""
                INSERT INTO workers (employee_id, name, department_id, position, status)
                VALUES ('ROLLBACK001', 'Rollback Test', 99999, 'Tester', 'ACTIVE')
            """)
            
            db_session.execute(invalid_query)
            db_session.commit()
            
            # Should not reach here
            assert False, "Expected transaction to fail"
            
        except Exception:
            # Rollback the transaction
            db_session.rollback()
            
            # Verify the survey was not committed either
            select_query = text("SELECT id FROM surveys WHERE id = :id")
            result = db_session.execute(select_query, {'id': survey_id})
            rolled_back_record = result.fetchone()
            
            # Should be None due to rollback
            assert rolled_back_record is None


@pytest.mark.database
class TestDatabasePerformance:
    """Test database performance characteristics"""
    
    def test_survey_insertion_performance(self, db_session):
        """Test bulk survey insertion performance"""
        import time
        
        start_time = time.time()
        
        # Insert 100 survey records
        for i in range(100):
            insert_query = text("""
                INSERT INTO surveys (form_type, user_id, responses, submitted_at)
                VALUES (:form_type, 1, :responses, NOW())
            """)
            
            db_session.execute(insert_query, {
                'form_type': f'performance_test_{i}',
                'responses': json.dumps({'test_data': f'value_{i}', 'index': i})
            })
        
        db_session.commit()
        end_time = time.time()
        
        insertion_time = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert insertion_time < 10.0, f"Bulk insertion took {insertion_time} seconds"
        
        # Cleanup
        cleanup_query = text("DELETE FROM surveys WHERE form_type LIKE 'performance_test_%'")
        db_session.execute(cleanup_query)
        db_session.commit()
    
    def test_complex_query_performance(self, db_session):
        """Test complex query performance"""
        import time
        
        start_time = time.time()
        
        # Execute complex query with joins
        complex_query = text("""
            SELECT 
                s.id, s.form_type, s.submitted_at,
                u.username, u.email
            FROM surveys s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.submitted_at >= NOW() - INTERVAL '30 days'
            ORDER BY s.submitted_at DESC
            LIMIT 100
        """)
        
        result = db_session.execute(complex_query)
        records = result.fetchall()
        
        end_time = time.time()
        query_time = end_time - start_time
        
        # Should complete within reasonable time
        assert query_time < 5.0, f"Complex query took {query_time} seconds"
        
        # Verify results structure
        if records:
            assert len(records[0]) == 5  # Should have 5 columns