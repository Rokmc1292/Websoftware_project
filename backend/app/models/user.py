# user.py — 사용자(User) 데이터 모델
# MySQL의 'users' 테이블과 1:1로 대응하는 Python 클래스
# SQLAlchemy ORM을 사용해 Python 코드로 DB를 조작함

import bcrypt  # bcrypt — 비밀번호를 안전하게 암호화(해싱)하는 라이브러리
from datetime import datetime  # datetime — 날짜와 시간을 다루는 Python 표준 라이브러리
from .. import db  # 부모 패키지(app)의 __init__.py에서 db 객체를 가져옴 (..은 상위 폴더를 의미)


class User(db.Model):
    """
    사용자 모델 클래스
    db.Model을 상속받아 SQLAlchemy가 이 클래스를 DB 테이블로 관리
    """

    # __tablename__ : MySQL에서 이 클래스와 연결될 테이블 이름 지정
    # 지정하지 않으면 SQLAlchemy가 클래스명을 소문자로 변환해 자동 설정 (user)
    __tablename__ = 'users'

    # ─────────────────────────────────────────────
    # 컬럼(Column) 정의 — 테이블의 각 열(column)에 해당
    # ─────────────────────────────────────────────

    # id : 기본 키 (Primary Key) — 각 사용자를 고유하게 식별하는 숫자
    # Integer : 정수 타입, primary_key=True : 이 컬럼이 기본 키임을 선언
    # autoincrement=True : 새 행 삽입 시 자동으로 1씩 증가 (1, 2, 3, ...)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # username : 사용자 닉네임
    # String(50) : 최대 50자의 문자열
    # nullable=False : 반드시 값이 있어야 함 (NULL 허용 안 함)
    username = db.Column(db.String(50), nullable=False)

    # email : 이메일 주소
    # unique=True : 같은 이메일로 두 번 가입 불가 — DB 레벨에서 중복 방지
    # index=True : 이 컬럼에 인덱스를 생성 — 이메일로 검색할 때 속도 향상
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)

    # password_hash : bcrypt로 해싱된 비밀번호
    # 실제 비밀번호(평문)는 절대 DB에 저장하지 않음 — 해킹 당해도 비밀번호 노출 방지
    # 60자 고정 길이가 아닌 String(255) 사용 — bcrypt 버전 변경에 대비
    password_hash = db.Column(db.String(255), nullable=False)

    # created_at : 계정 생성 일시
    # DateTime : 날짜+시간 타입
    # default=datetime.utcnow : 새 행이 삽입될 때 자동으로 현재 UTC 시간이 저장됨
    # (utcnow는 함수 참조를 전달 — utcnow()처럼 괄호를 붙이면 앱 시작 시간이 기록되어 버림)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # ─────────────────────────────────────────────
    # 메서드(Method) 정의
    # ─────────────────────────────────────────────

    def set_password(self, plain_password):
        """
        평문 비밀번호를 bcrypt로 해싱해 password_hash에 저장
        회원가입 또는 비밀번호 변경 시 호출

        plain_password : 사용자가 입력한 원본 비밀번호 문자열
        """
        # plain_password.encode('utf-8') : bcrypt는 바이트(bytes) 타입을 입력받음 — 문자열을 변환
        # bcrypt.hashpw() : 입력값과 salt(무작위 값)를 결합해 해시값을 생성
        # bcrypt.gensalt() : 매번 다른 랜덤 salt를 생성 — 같은 비밀번호도 다른 해시가 됨
        password_bytes = plain_password.encode('utf-8')  # 문자열 → 바이트로 변환
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())  # 해시 생성
        # decode('utf-8') : bcrypt 결과(바이트)를 다시 문자열로 변환 — DB에 문자열로 저장
        self.password_hash = hashed.decode('utf-8')

    def check_password(self, plain_password):
        """
        입력된 평문 비밀번호가 저장된 해시와 일치하는지 확인
        로그인 시 호출 — True(일치)/False(불일치) 반환

        plain_password : 로그인 시 사용자가 입력한 비밀번호
        """
        password_bytes = plain_password.encode('utf-8')  # 입력 비밀번호를 바이트로 변환
        stored_hash_bytes = self.password_hash.encode('utf-8')  # 저장된 해시를 바이트로 변환
        # bcrypt.checkpw() : 입력값과 저장된 해시를 비교 — 내부적으로 salt를 추출해 재계산
        return bcrypt.checkpw(password_bytes, stored_hash_bytes)

    def to_dict(self):
        """
        User 객체를 JSON으로 변환하기 쉬운 딕셔너리 형태로 반환
        API 응답에서 사용자 정보를 클라이언트(React)에 전달할 때 사용
        password_hash는 절대 포함하지 않음 — 보안상 중요
        """
        return {
            'id': self.id,  # 사용자 고유 ID
            'username': self.username,  # 닉네임
            'email': self.email,  # 이메일
            'created_at': self.created_at.isoformat(),  # ISO 8601 형식 날짜 문자열 (예: "2024-01-15T09:30:00")
        }

    def __repr__(self):
        """
        객체를 출력하거나 디버깅할 때 나타나는 표현식 정의
        예: print(user) → <User id=1 email=test@email.com>
        """
        return f'<User id={self.id} email={self.email}>'
