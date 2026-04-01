# workout.py — 운동 기록 데이터 모델
# MySQL의 'workout_sessions' 테이블과 'workout_sets' 테이블에 각각 대응하는 Python 클래스
# SQLAlchemy ORM을 사용해 Python 객체로 DB를 조작함

# datetime : 날짜와 시간을 다루는 Python 표준 모듈
from datetime import datetime

# db : app/__init__.py에서 만든 SQLAlchemy 객체 — DB 연결 및 모델 등록에 사용
# '..' : 현재 폴더(models)의 한 단계 위 폴더(app)를 의미
from .. import db


# =============================================================================
# WorkoutSession 모델 — workout_sessions 테이블과 1:1 대응
# =============================================================================
# 운동한 날짜 하나를 "세션(session)"이라고 부름
# 예: "2024-06-01에 한 운동" 전체가 하나의 세션
# 한 세션 안에 여러 종목(workout_sets)이 포함됨
class WorkoutSession(db.Model):
    """
    운동 세션 모델
    db.Model을 상속받아 SQLAlchemy가 이 클래스를 DB 테이블로 관리
    """

    # __tablename__ : MySQL에서 이 클래스와 연결될 실제 테이블 이름
    __tablename__ = 'workout_sessions'

    # ─────────────────────────────────────────────
    # 컬럼 정의 — 테이블의 각 열(column)에 해당
    # ─────────────────────────────────────────────

    # id : 기본 키 — 각 세션을 고유하게 식별하는 자동 증가 숫자
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # user_id : 이 세션을 소유한 사용자의 ID
    # ForeignKey : users 테이블의 id를 참조 — 존재하지 않는 user_id는 저장 불가
    # ondelete='CASCADE' : users 테이블에서 사용자 삭제 시 해당 세션도 자동 삭제
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False  # 반드시 값이 있어야 함 — 주인 없는 세션은 존재할 수 없음
    )

    # session_date : 운동한 날짜 (시간 없이 날짜만 저장, 예: 2024-06-01)
    session_date = db.Column(db.Date, nullable=False)

    # title : 세션 제목 (선택 입력, 예: '등·이두 데이', '풀바디')
    # nullable=True 이므로 DEFAULT NULL — 제목 없이 저장해도 됨
    title = db.Column(db.String(100), nullable=True)

    # memo : 운동 일지, 메모 (선택 입력, 자유 텍스트)
    # Text : VARCHAR보다 훨씬 긴 텍스트를 저장할 수 있는 타입
    memo = db.Column(db.Text, nullable=True)

    # duration_min : 총 운동 시간(분 단위, 선택 입력)
    # SmallInteger : -32,768 ~ 32,767 범위 정수 — 분 단위 운동 시간 저장에 충분
    duration_min = db.Column(db.SmallInteger, nullable=True)

    # ai_feedback : Claude AI가 이 세션을 분석한 결과 텍스트
    # 운동 기록 저장 후 AI 분석 요청 시 여기에 저장됨
    ai_feedback = db.Column(db.Text, nullable=True)

    # is_favorite : 즐겨찾기(루틴 저장) 여부
    # Boolean : True/False 값만 저장 — SQLite에서는 0/1, MySQL에서는 TINYINT(1)로 저장됨
    # default=False : 새 세션 생성 시 기본값은 즐겨찾기 아님
    is_favorite = db.Column(db.Boolean, nullable=False, default=False)

    # created_at : 이 세션 기록이 생성된 일시
    # default=datetime.utcnow : 새 행 삽입 시 자동으로 현재 UTC 시간이 저장됨
    # 괄호 없이 함수 참조(datetime.utcnow)를 전달해야 매번 현재 시간이 찍힘
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # updated_at : 마지막으로 수정된 일시
    # onupdate=datetime.utcnow : 행이 수정될 때마다 자동으로 현재 시간으로 갱신
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # ─────────────────────────────────────────────
    # 관계(Relationship) 정의
    # ─────────────────────────────────────────────

    # sets : 이 세션에 속한 모든 WorkoutSet 객체들의 리스트
    # relationship : SQLAlchemy가 자동으로 JOIN 쿼리를 생성해 관련 데이터를 불러옴
    # backref='session' : WorkoutSet 객체에서 .session으로 부모 세션에 접근 가능
    # lazy=True : session.sets를 실제로 사용할 때 DB 조회 (미리 다 불러오지 않음)
    # cascade='all, delete-orphan' : 세션 삭제 시 관련 세트들도 함께 삭제
    # order_by : id 오름차순 정렬 → 사용자가 입력한 순서(작성 순서)대로 조회
    #            이 설정이 없으면 DB가 임의 순서로 반환해 가나다순처럼 보일 수 있음
    sets = db.relationship(
        'WorkoutSet',
        backref='session',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='WorkoutSet.id'  # id 오름차순 = 삽입 순서 = 사용자 작성 순서
    )

    # ─────────────────────────────────────────────
    # 메서드 정의
    # ─────────────────────────────────────────────

    def to_dict(self):
        """
        WorkoutSession 객체를 JSON으로 변환하기 쉬운 딕셔너리 형태로 반환
        API 응답으로 클라이언트(React)에 데이터를 전달할 때 사용
        """
        return {
            'id': self.id,  # 세션 고유 ID
            'user_id': self.user_id,  # 소유 사용자 ID
            # isoformat() : 날짜를 "2024-06-01" 형식의 문자열로 변환
            'session_date': self.session_date.isoformat(),
            'title': self.title,  # 세션 제목 (없으면 None)
            'memo': self.memo,  # 메모 (없으면 None)
            'duration_min': self.duration_min,  # 운동 시간(분) (없으면 None)
            'ai_feedback': self.ai_feedback,  # AI 분석 결과 (없으면 None)
            'created_at': self.created_at.isoformat(),  # 생성 일시 문자열
            # 관련된 모든 세트를 리스트로 변환 — 각 세트도 to_dict()로 변환
            'sets': [s.to_dict() for s in self.sets],
        }

    def __repr__(self):
        """
        객체를 출력·디버깅할 때 나타나는 표현식
        예: print(session) → <WorkoutSession id=1 date=2024-06-01>
        """
        return f'<WorkoutSession id={self.id} date={self.session_date}>'


# =============================================================================
# WorkoutSet 모델 — workout_sets 테이블과 1:1 대응
# =============================================================================
# 한 세션 안에서 종목별로 각 세트를 기록
# 예: "벤치프레스 1세트 60kg 10회", "벤치프레스 2세트 65kg 8회"
class WorkoutSet(db.Model):
    """
    운동 세트 모델
    한 세션(WorkoutSession) 안의 개별 세트 기록을 저장
    """

    # __tablename__ : MySQL에서 이 클래스와 연결될 실제 테이블 이름
    __tablename__ = 'workout_sets'

    # ─────────────────────────────────────────────
    # 컬럼 정의
    # ─────────────────────────────────────────────

    # id : 기본 키 — 각 세트를 고유하게 식별하는 자동 증가 숫자
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # session_id : 이 세트가 속한 세션의 ID
    # ForeignKey : workout_sessions 테이블의 id를 참조
    # ondelete='CASCADE' : 세션 삭제 시 해당 세션의 모든 세트도 자동 삭제
    session_id = db.Column(
        db.Integer,
        db.ForeignKey('workout_sessions.id', ondelete='CASCADE'),
        nullable=False  # 어느 세션에 속하는지 반드시 지정해야 함
    )

    # exercise_name : 운동 종목 이름 (예: '벤치프레스', '데드리프트', '스쿼트')
    exercise_name = db.Column(db.String(100), nullable=False)

    # set_number : 세트 번호 (1세트, 2세트, 3세트...)
    # SmallInteger : 0~32,767 범위 — 세트 번호 저장에 충분
    set_number = db.Column(db.SmallInteger, nullable=False)

    # weight_kg : 중량 (킬로그램, 소수점 2자리까지)
    # Numeric(6, 2) : 최대 9999.99 kg까지 표현 가능
    # nullable=True : 맨몸 운동(턱걸이, 푸시업 등)은 중량 없이 저장 가능
    weight_kg = db.Column(db.Numeric(6, 2), nullable=True)

    # reps : 반복 횟수 (몇 회 했는지)
    # SmallInteger : 0~32,767 범위 — 횟수 저장에 충분
    # nullable=True : 시간 기반 운동(플랭크 등)은 횟수 없이 저장 가능
    reps = db.Column(db.SmallInteger, nullable=True)

    # duration_sec : 시간 기반 운동의 지속 시간 (초 단위)
    # 예: 플랭크 60초 → duration_sec=60
    # 중량·횟수 기반 운동과 시간 기반 운동 중 하나를 선택해 사용
    duration_sec = db.Column(db.SmallInteger, nullable=True)

    # rest_sec : 이 세트 후 휴식 시간 (초 단위, 선택 입력)
    rest_sec = db.Column(db.SmallInteger, nullable=True)

    # muscle_group : 이 운동의 주요 운동 부위 (예: '가슴', '등', '하체', '어깨', '팔', '코어')
    # nullable=True : 선택 입력 — 부위를 지정하지 않아도 저장 가능
    muscle_group = db.Column(db.String(50), nullable=True)

    # created_at : 이 세트 기록이 생성된 일시
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # updated_at : 마지막으로 수정된 일시
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # ─────────────────────────────────────────────
    # 메서드 정의
    # ─────────────────────────────────────────────

    def to_dict(self):
        """
        WorkoutSet 객체를 딕셔너리 형태로 반환
        API 응답으로 클라이언트(React)에 데이터를 전달할 때 사용
        """
        return {
            'id': self.id,  # 세트 고유 ID
            'session_id': self.session_id,  # 소속 세션 ID
            'exercise_name': self.exercise_name,  # 종목 이름
            'set_number': self.set_number,  # 세트 번호
            # float() : Decimal 타입을 JSON 직렬화 가능한 float으로 변환 (None이면 None 유지)
            'weight_kg': float(self.weight_kg) if self.weight_kg is not None else None,
            'reps': self.reps,  # 반복 횟수
            'duration_sec': self.duration_sec,  # 지속 시간(초)
            'rest_sec': self.rest_sec,  # 휴식 시간(초)
            'muscle_group': self.muscle_group,  # 운동 부위 (없으면 None)
        }

    def __repr__(self):
        """
        객체를 출력·디버깅할 때 나타나는 표현식
        예: <WorkoutSet id=1 exercise=벤치프레스 set=1>
        """
        return f'<WorkoutSet id={self.id} exercise={self.exercise_name} set={self.set_number}>'
