#!/usr/bin/env python3
"""
문서화 커버리지 체크 스크립트
"""

import os
import ast
import glob


def check_docstring(node):
    return ast.get_docstring(node) is not None


def main():
    total_funcs = 0
    documented_funcs = 0

    for py_file in glob.glob('**/*.py', recursive=True):
        if '__pycache__' in py_file or 'migrations/' in py_file:
            continue
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read())
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    total_funcs += 1
                    if check_docstring(node):
                        documented_funcs += 1
        except:
            continue

    doc_coverage = (documented_funcs / total_funcs * 100) if total_funcs > 0 else 0
    print(f'Documentation Coverage: {doc_coverage:.1f}% ({documented_funcs}/{total_funcs})')
    
    with open('doc-coverage.txt', 'w') as f:
        f.write(f'{doc_coverage:.1f}')


if __name__ == '__main__':
    main()