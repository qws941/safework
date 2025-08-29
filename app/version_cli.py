#!/usr/bin/env python3
"""
SafeWork 버전 관리 CLI 도구
"""
import sys
import argparse
from version_manager import VersionManager, get_version, get_version_info


def cmd_show(args):
    """현재 버전 정보 표시"""
    vm = VersionManager()
    
    if args.detailed:
        print("=== SafeWork 상세 버전 정보 ===")
        print(vm.export_version_json())
    else:
        print(f"SafeWork 버전: {get_version()}")


def cmd_update(args):
    """버전 업데이트"""
    vm = VersionManager()
    
    if args.version:
        # 수동 버전 설정
        vm.update_version_file(args.version)
        print(f"버전을 {args.version}로 업데이트했습니다.")
    else:
        # 자동 버전 생성
        new_version = vm.generate_semantic_version()
        vm.update_version_file(new_version)
        print(f"버전을 자동으로 {new_version}로 업데이트했습니다.")


def cmd_info(args):
    """Git 및 빌드 정보 표시"""
    vm = VersionManager()
    git_info = vm.get_git_info()
    
    print("=== Git 정보 ===")
    print(f"브랜치: {git_info['branch']}")
    print(f"커밋: {git_info['commit_short']} ({git_info['commit_hash']})")
    print(f"태그: {git_info['tag']}")
    print(f"커밋 날짜: {git_info['commit_date']}")
    print(f"커밋 메시지: {git_info['commit_message']}")


def cmd_bump(args):
    """버전 범프 (시맨틱 버전)"""
    vm = VersionManager()
    current_info = vm.get_full_version_info()
    current_version = current_info['version']
    
    # 간단한 버전 범프 로직
    if args.type == 'major':
        # v3.0.x -> v4.0.0
        new_version = "v4.0.0-manual"
    elif args.type == 'minor':
        # v3.0.x -> v3.1.0
        new_version = "v3.1.0-manual"
    elif args.type == 'patch':
        # v3.0.x -> v3.0.y+1
        new_version = "v3.0.1-manual"
    else:
        new_version = vm.generate_semantic_version()
    
    vm.update_version_file(new_version)
    print(f"버전 범프: {current_version} -> {new_version}")


def cmd_validate(args):
    """버전 정보 유효성 검증"""
    vm = VersionManager()
    info = vm.get_full_version_info()
    
    print("=== 버전 시스템 검증 ===")
    
    # VERSION 파일 체크
    file_version = vm.get_version_file_info()
    if file_version:
        print(f"✅ VERSION 파일: {file_version}")
    else:
        print("❌ VERSION 파일을 찾을 수 없습니다.")
    
    # Git 체크
    git_info = vm.get_git_info()
    if git_info['commit_hash'] != 'unknown':
        print(f"✅ Git 정보: {git_info['commit_short']}")
    else:
        print("⚠️  Git 정보를 가져올 수 없습니다.")
    
    # 버전 매니저 체크
    print(f"✅ 생성된 버전: {info['version']}")
    print(f"✅ 빌드 타입: {info['build_type']}")


def cmd_tag_create(args):
    """태그 생성 명령"""
    vm = VersionManager()
    
    result = vm.create_tag(args.name, args.message)
    if result:
        print(f"✅ 태그가 성공적으로 생성되었습니다.")
        
        # 생성된 태그 정보 표시
        git_info = vm.get_git_info()
        current_tag = git_info['tag']
        if current_tag != 'unknown':
            print(f"📌 태그: {current_tag}")
            
        if args.push:
            push_result = vm.push_tag(current_tag)
            if push_result:
                print(f"🚀 태그가 원격 저장소로 푸시되었습니다.")
            else:
                print(f"❌ 원격 푸시에 실패했습니다.")
    else:
        print(f"❌ 태그 생성에 실패했습니다.")


def cmd_tag_list(args):
    """태그 목록 명령"""
    vm = VersionManager()
    tags = vm.list_tags(args.limit)
    
    if tags:
        print(f"📋 최근 태그 목록 (최대 {args.limit}개):\n")
        for i, tag in enumerate(tags, 1):
            tag_info = vm.get_tag_info(tag)
            print(f"{i:2}. {tag}")
            print(f"    🔗 커밋: {tag_info['commit']}")
            print(f"    📅 날짜: {tag_info['date']}")
            if tag_info['message'] and tag_info['message'] != 'unknown':
                print(f"    💬 메시지: {tag_info['message']}")
            print()
    else:
        print("📋 태그가 없습니다.")


def cmd_tag_info(args):
    """태그 정보 명령"""
    vm = VersionManager()
    tag_info = vm.get_tag_info(args.tag_name)
    
    print(f"📌 태그: {tag_info['tag']}")
    print(f"🔗 커밋: {tag_info['commit']}")
    print(f"📅 날짜: {tag_info['date']}")
    if tag_info['message'] and tag_info['message'] != 'unknown':
        print(f"💬 메시지: {tag_info['message']}")


def cmd_tag_delete(args):
    """태그 삭제 명령"""
    vm = VersionManager()
    
    print(f"⚠️  태그 '{args.tag_name}'를 삭제하시겠습니까?")
    confirm = input("삭제하려면 'yes'를 입력하세요: ")
    
    if confirm.lower() == 'yes':
        result = vm.delete_tag(args.tag_name, args.remote)
        if result:
            print(f"✅ 태그 '{args.tag_name}'가 삭제되었습니다.")
        else:
            print(f"❌ 태그 삭제에 실패했습니다.")
    else:
        print("🚫 태그 삭제가 취소되었습니다.")


def main():
    parser = argparse.ArgumentParser(description='SafeWork 버전 관리 CLI')
    subparsers = parser.add_subparsers(dest='command', help='사용 가능한 명령어')
    
    # show 명령어
    show_parser = subparsers.add_parser('show', help='현재 버전 표시')
    show_parser.add_argument('--detailed', '-d', action='store_true', 
                           help='상세 정보 표시')
    show_parser.set_defaults(func=cmd_show)
    
    # update 명령어
    update_parser = subparsers.add_parser('update', help='버전 업데이트')
    update_parser.add_argument('--version', '-v', 
                             help='특정 버전으로 설정 (미지정 시 자동 생성)')
    update_parser.set_defaults(func=cmd_update)
    
    # info 명령어
    info_parser = subparsers.add_parser('info', help='Git 및 빌드 정보')
    info_parser.set_defaults(func=cmd_info)
    
    # bump 명령어
    bump_parser = subparsers.add_parser('bump', help='버전 범프')
    bump_parser.add_argument('type', choices=['major', 'minor', 'patch', 'auto'],
                           help='범프 유형')
    bump_parser.set_defaults(func=cmd_bump)
    
    # validate 명령어
    validate_parser = subparsers.add_parser('validate', help='버전 시스템 검증')
    validate_parser.set_defaults(func=cmd_validate)
    
    # tag 명령어
    tag_parser = subparsers.add_parser('tag', help='Git 태그 관리')
    tag_subparsers = tag_parser.add_subparsers(dest='tag_command', help='태그 명령어')
    
    # tag create
    tag_create = tag_subparsers.add_parser('create', help='새 태그 생성')
    tag_create.add_argument('--name', '-n', help='태그 이름 (미지정 시 자동 생성)')
    tag_create.add_argument('--message', '-m', help='태그 메시지')
    tag_create.add_argument('--push', action='store_true', help='생성 후 원격으로 푸시')
    tag_create.set_defaults(func=cmd_tag_create)
    
    # tag list
    tag_list = tag_subparsers.add_parser('list', help='태그 목록')
    tag_list.add_argument('--limit', '-l', type=int, default=10, help='표시할 태그 개수')
    tag_list.set_defaults(func=cmd_tag_list)
    
    # tag info
    tag_info = tag_subparsers.add_parser('info', help='특정 태그 정보')
    tag_info.add_argument('tag_name', help='태그 이름')
    tag_info.set_defaults(func=cmd_tag_info)
    
    # tag delete  
    tag_delete = tag_subparsers.add_parser('delete', help='태그 삭제')
    tag_delete.add_argument('tag_name', help='삭제할 태그 이름')
    tag_delete.add_argument('--remote', action='store_true', help='원격 태그도 삭제')
    tag_delete.set_defaults(func=cmd_tag_delete)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        return 1
    
    try:
        args.func(args)
        return 0
    except Exception as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())