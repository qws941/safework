#!/usr/bin/env python3
"""
데이터베이스 성능 테스트 스크립트
"""

import time
import pymysql
from sqlalchemy import create_engine, text


def main():
    try:
        # DB 연결 테스트
        engine = create_engine('mysql+pymysql://root:test123@localhost:3306/safework_test')

        # 간단한 성능 테스트
        start_time = time.time()
        with engine.connect() as conn:
            for i in range(100):
                result = conn.execute(text('SELECT 1'))
        connection_time = time.time() - start_time

        print(f'Database connection performance: {connection_time:.3f}s for 100 queries')
        if connection_time > 5.0:
            print('⚠️ Database performance warning')
        else:
            print('✅ Database performance OK')
            
    except Exception as e:
        print(f'❌ Database performance test failed: {e}')


if __name__ == '__main__':
    main()