#!/usr/bin/env python3
"""
테스트용 서버 시작 스크립트
"""

from app import create_app

def main():
    app = create_app('testing')
    app.run(host='0.0.0.0', port=5000, debug=False)

if __name__ == '__main__':
    main()