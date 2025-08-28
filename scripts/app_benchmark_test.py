#!/usr/bin/env python3
"""
애플리케이션 벤치마크 테스트 스크립트
"""

import sys
import time
from models import Survey


def benchmark_survey_creation():
    """Survey 객체 생성 성능 테스트"""
    start = time.time()
    survey_data = {
        'name': 'Test User',
        'age': 30,
        'department': 'IT'
    }
    # Survey 객체 생성 시간 측정
    for _ in range(1000):
        survey = Survey(**survey_data)
    end = time.time()
    return end - start


def main():
    try:
        exec_time = benchmark_survey_creation()
        print(f'Survey creation benchmark: {exec_time:.3f}s for 1000 objects')
        if exec_time > 1.0:
            print('⚠️ Performance degradation detected')
            sys.exit(1)
        else:
            print('✅ Performance benchmark passed')
    except Exception as e:
        print(f'❌ Application benchmark test failed: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()