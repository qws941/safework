#!/usr/bin/env python3
"""
PostgreSQL to D1 Data Synchronization Script
Migrates data from PostgreSQL to Cloudflare D1 database
"""

import os
import sys
import json
import subprocess
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

# Database configuration
POSTGRES_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'safework_db'),
    'user': os.getenv('DB_USER', 'safework'),
    'password': os.getenv('DB_PASSWORD', 'safework2024'),
    'port': os.getenv('DB_PORT', '5432'),
}

D1_DATABASE_ID = 'd1db1d92-f598-415e-910f-1af511bc182f'
D1_DATABASE_NAME = 'PRIMARY_DB'


def connect_postgres():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**POSTGRES_CONFIG)
        print(f"✅ Connected to PostgreSQL: {POSTGRES_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        sys.exit(1)


def execute_d1_command(sql_command):
    """Execute SQL command on D1 database"""
    try:
        # Write SQL to temp file
        temp_file = '/tmp/d1_sync_temp.sql'
        with open(temp_file, 'w') as f:
            f.write(sql_command)

        # Execute via wrangler
        cmd = [
            'wrangler', 'd1', 'execute', D1_DATABASE_NAME,
            '--file', temp_file,
            '--env', 'production'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd='/home/jclee/app/safework/workers'
        )

        # Clean up temp file
        os.remove(temp_file)

        if result.returncode != 0:
            raise Exception(f"D1 command failed: {result.stderr}")

        return result.stdout
    except Exception as e:
        print(f"❌ D1 execution error: {e}")
        raise


def sync_users(conn):
    """Sync users table"""
    print("\n📊 Syncing users table...")

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()

    print(f"   Found {len(users)} users")

    sql_commands = []
    for user in users:
        sql = f"""
        INSERT OR REPLACE INTO users (
            id, username, email, password_hash, is_admin, is_active,
            last_login, created_at, updated_at
        ) VALUES (
            {user['id']},
            '{user['username']}',
            '{user['email']}',
            '{user['password_hash']}',
            {1 if user['is_admin'] else 0},
            {1 if user['is_active'] else 0},
            {f"'{user['last_login']}'" if user['last_login'] else 'NULL'},
            '{user['created_at']}',
            '{user['updated_at']}'
        );
        """
        sql_commands.append(sql)

    if sql_commands:
        execute_d1_command('\n'.join(sql_commands))
        print(f"   ✅ Synced {len(users)} users")

    cursor.close()


def sync_companies(conn):
    """Sync companies table"""
    print("\n📊 Syncing companies table...")

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM companies ORDER BY id")
    companies = cursor.fetchall()

    print(f"   Found {len(companies)} companies")

    sql_commands = []
    for company in companies:
        sql = f"""
        INSERT OR REPLACE INTO companies (
            id, name, is_active, display_order, created_at, updated_at
        ) VALUES (
            {company['id']},
            '{company['name']}',
            {1 if company['is_active'] else 0},
            {company['display_order']},
            '{company['created_at']}',
            '{company['updated_at']}'
        );
        """
        sql_commands.append(sql)

    if sql_commands:
        execute_d1_command('\n'.join(sql_commands))
        print(f"   ✅ Synced {len(companies)} companies")

    cursor.close()


def sync_processes(conn):
    """Sync processes table"""
    print("\n📊 Syncing processes table...")

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM processes ORDER BY id")
    processes = cursor.fetchall()

    print(f"   Found {len(processes)} processes")

    sql_commands = []
    for process in processes:
        description = process.get('description', '')
        if description:
            description = description.replace("'", "''")  # Escape single quotes

        sql = f"""
        INSERT OR REPLACE INTO processes (
            id, name, description, is_active, display_order, created_at, updated_at
        ) VALUES (
            {process['id']},
            '{process['name']}',
            '{description}',
            {1 if process['is_active'] else 0},
            {process['display_order']},
            '{process['created_at']}',
            '{process['updated_at']}'
        );
        """
        sql_commands.append(sql)

    if sql_commands:
        execute_d1_command('\n'.join(sql_commands))
        print(f"   ✅ Synced {len(processes)} processes")

    cursor.close()


def sync_roles(conn):
    """Sync roles table"""
    print("\n📊 Syncing roles table...")

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM roles ORDER BY id")
    roles = cursor.fetchall()

    print(f"   Found {len(roles)} roles")

    sql_commands = []
    for role in roles:
        description = role.get('description', '')
        if description:
            description = description.replace("'", "''")

        sql = f"""
        INSERT OR REPLACE INTO roles (
            id, title, description, is_active, display_order, created_at, updated_at
        ) VALUES (
            {role['id']},
            '{role['title']}',
            '{description}',
            {1 if role['is_active'] else 0},
            {role['display_order']},
            '{role['created_at']}',
            '{role['updated_at']}'
        );
        """
        sql_commands.append(sql)

    if sql_commands:
        execute_d1_command('\n'.join(sql_commands))
        print(f"   ✅ Synced {len(roles)} roles")

    cursor.close()


def sync_surveys(conn, limit=1000):
    """Sync surveys table (with limit to avoid timeouts)"""
    print(f"\n📊 Syncing surveys table (limit {limit})...")

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(f"""
        SELECT * FROM surveys
        ORDER BY created_at DESC
        LIMIT {limit}
    """)
    surveys = cursor.fetchall()

    print(f"   Found {len(surveys)} surveys")

    # Batch process in chunks of 50
    batch_size = 50
    for i in range(0, len(surveys), batch_size):
        batch = surveys[i:i+batch_size]
        sql_commands = []

        for survey in batch:
            # Escape and serialize JSON fields
            responses = json.dumps(survey.get('responses')) if survey.get('responses') else 'NULL'
            data = json.dumps(survey.get('data')) if survey.get('data') else 'NULL'
            symptoms_data = json.dumps(survey.get('symptoms_data')) if survey.get('symptoms_data') else 'NULL'

            # Escape single quotes in strings
            name = survey.get('name', '').replace("'", "''") if survey.get('name') else ''
            department = survey.get('department', '').replace("'", "''") if survey.get('department') else ''

            sql = f"""
            INSERT OR REPLACE INTO surveys (
                id, user_id, form_type, name, department, position, employee_id,
                gender, age, years_of_service, employee_number, work_years, work_months,
                has_symptoms, status, responses, data, symptoms_data,
                company_id, process_id, role_id,
                submission_date, created_at, updated_at
            ) VALUES (
                {survey['id']},
                {survey['user_id']},
                '{survey['form_type']}',
                '{name}',
                '{department}',
                {f"'{survey['position']}'" if survey.get('position') else 'NULL'},
                {f"'{survey['employee_id']}'" if survey.get('employee_id') else 'NULL'},
                {f"'{survey['gender']}'" if survey.get('gender') else 'NULL'},
                {survey.get('age') if survey.get('age') else 'NULL'},
                {survey.get('years_of_service') if survey.get('years_of_service') else 'NULL'},
                {f"'{survey['employee_number']}'" if survey.get('employee_number') else 'NULL'},
                {survey.get('work_years') if survey.get('work_years') else 'NULL'},
                {survey.get('work_months') if survey.get('work_months') else 'NULL'},
                {1 if survey.get('has_symptoms') else 0},
                '{survey['status']}',
                {f"'{responses}'" if responses != 'NULL' else 'NULL'},
                {f"'{data}'" if data != 'NULL' else 'NULL'},
                {f"'{symptoms_data}'" if symptoms_data != 'NULL' else 'NULL'},
                {survey.get('company_id') if survey.get('company_id') else 'NULL'},
                {survey.get('process_id') if survey.get('process_id') else 'NULL'},
                {survey.get('role_id') if survey.get('role_id') else 'NULL'},
                '{survey['submission_date']}',
                '{survey['created_at']}',
                '{survey['updated_at']}'
            );
            """
            sql_commands.append(sql)

        if sql_commands:
            try:
                execute_d1_command('\n'.join(sql_commands))
                print(f"   ✅ Synced batch {i//batch_size + 1} ({len(batch)} surveys)")
            except Exception as e:
                print(f"   ⚠️ Failed batch {i//batch_size + 1}: {e}")

    cursor.close()
    print(f"   ✅ Completed syncing surveys")


def main():
    """Main synchronization function"""
    print("="*60)
    print("PostgreSQL to D1 Data Synchronization")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Connect to PostgreSQL
    conn = connect_postgres()

    try:
        # Sync master data first (required for foreign keys)
        sync_users(conn)
        sync_companies(conn)
        sync_processes(conn)
        sync_roles(conn)

        # Sync survey data
        sync_surveys(conn, limit=1000)  # Adjust limit as needed

        print("\n" + "="*60)
        print("✅ Synchronization completed successfully!")
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Synchronization failed: {e}")
        sys.exit(1)

    finally:
        conn.close()


if __name__ == "__main__":
    main()