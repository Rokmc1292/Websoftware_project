# run.py — Flask 서버 실행 진입점
# 터미널에서 `python run.py` 명령어를 실행하면 이 파일이 가장 먼저 실행됨

from app import create_app  # app 패키지의 create_app 함수를 가져옴 — Flask 앱 객체를 생성하는 팩토리 함수

# Flask 앱 객체 생성
# create_app() 함수 안에서 DB 연결, 블루프린트 등록 등 초기 설정이 모두 처리됨
app = create_app()

# __name__ == '__main__' : 이 파일이 직접 실행될 때만 서버를 시작
# (다른 파일에서 import될 때는 서버를 시작하지 않음)
if __name__ == '__main__':
    app.run(
        host='0.0.0.0',   # 모든 네트워크 인터페이스에서 접속 허용 (localhost와 같은 로컬 환경 포함)
        port=5000,         # 서버 포트 번호 — http://localhost:5000 으로 접속
        debug=True,        # 디버그 모드 — 코드 변경 시 서버 자동 재시작, 에러 상세 정보 표시
    )
