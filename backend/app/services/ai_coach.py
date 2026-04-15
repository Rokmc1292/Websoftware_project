# ai_coach.py — Claude AI API 호출 로직
# 운동 세션 데이터를 Claude AI에게 전달하고 분석·조언 텍스트를 받아 반환
# 이 파일은 순수하게 AI API 통신만 담당 — 라우트 코드와 분리해 유지보수 편의성 향상

from flask import current_app

# anthropic : Anthropic 공식 Python SDK — Claude API를 쉽게 사용하도록 도와주는 라이브러리
# 'pip install anthropic' 으로 설치
import anthropic


def _get_client_and_model():
    """
    환경변수에서 API 키와 모델명을 읽어 Anthropic 클라이언트를 반환
    반환값: (client, model) 또는 오류 시 (None, 오류_메시지_문자열)
    """
    api_key = (current_app.config.get('TAE_ANTHROPIC_API_KEY') or '').strip()
    if not api_key:
        return None, 'AI 분석을 사용하려면 TAE_ANTHROPIC_API_KEY 환경변수를 설정해주세요.'

    model = (current_app.config.get('TAE_ANTHROPIC_MODEL') or '').strip()
    if not model:
        return None, 'AI 분석을 사용하려면 TAE_ANTHROPIC_MODEL 환경변수를 설정해주세요.'

    client = anthropic.Anthropic(api_key=api_key)
    return client, model


def _build_profile_context(user_profile):
    """
    사용자 프로필 딕셔너리를 프롬프트용 텍스트로 변환
    user_profile: {username, height_cm, weight_kg, skeletal_muscle_kg, body_fat_kg, profile_note, ...}
    반환값: 프롬프트에 삽입할 프로필 문자열 (없으면 빈 문자열)
    """
    if not user_profile:
        return ''

    parts = []

    # 사용자 닉네임
    if user_profile.get('username'):
        parts.append(f"이름(닉네임): {user_profile['username']}")

    # 신체 계측 정보 — MyPage에서 입력한 수치
    if user_profile.get('height_cm') is not None:
        parts.append(f"키: {user_profile['height_cm']}cm")
    if user_profile.get('weight_kg') is not None:
        parts.append(f"체중: {user_profile['weight_kg']}kg")
    if user_profile.get('skeletal_muscle_kg') is not None:
        parts.append(f"골격근량: {user_profile['skeletal_muscle_kg']}kg")
    if user_profile.get('body_fat_kg') is not None:
        parts.append(f"체지방량: {user_profile['body_fat_kg']}kg")

    # 개인 맞춤 메모 — MyPage "개인 맞춤 정보" 란에 사용자가 직접 작성한 내용
    if user_profile.get('profile_note') and user_profile['profile_note'].strip():
        parts.append(f"개인 메모: {user_profile['profile_note'].strip()}")

    if not parts:
        return ''

    return '\n\n[사용자 신체 정보 — 아래 정보를 바탕으로 개인 맞춤 피드백을 제공해주세요]\n' + '\n'.join(parts)


def analyze_workout(session_data, user_profile=None):
    """
    운동 세션 데이터를 Claude API에 전달해 분석 결과 텍스트를 반환
    MyPage에서 저장한 개인 맞춤정보(신체 계측값, 메모)를 함께 전달해 맞춤 피드백을 생성

    매개변수 session_data (딕셔너리):
        {
            'session_date': '2024-06-01',   # 운동 날짜 (문자열)
            'title': '등·이두 데이',          # 세션 제목 (없으면 None)
            'duration_min': 60,              # 총 운동 시간(분) (없으면 None)
            'sets': [                        # 세트 목록
                {
                    'exercise_name': '벤치프레스',
                    'set_number': 1,
                    'weight_kg': 60.0,
                    'reps': 10,
                    'duration_sec': None
                },
                ...
            ]
        }

    매개변수 user_profile (딕셔너리, 선택):
        {
            'username': '홍길동',
            'height_cm': 175.0,
            'weight_kg': 70.0,
            'skeletal_muscle_kg': 32.0,
            'body_fat_kg': 14.0,
            'profile_note': '무릎이 약해서 스쿼트 시 주의 필요'
        }

    반환값: Claude AI의 운동 분석 텍스트 (문자열)
    오류 발생 시: 오류 메시지 문자열 반환 (예외를 밖으로 전파하지 않음)
    """

    try:
        # ─────────────────────────────────────────────
        # 1단계: Anthropic 클라이언트 생성
        # ─────────────────────────────────────────────

        client, model = _get_client_and_model()
        if client is None:
            # model 변수에 오류 메시지가 담겨있음
            return model

        # ─────────────────────────────────────────────
        # 2단계: 운동 데이터를 읽기 쉬운 텍스트로 변환
        # ─────────────────────────────────────────────

        # session_data의 sets 리스트에서 종목별로 세트를 묶음
        # exercise_groups = { '벤치프레스': [set1, set2], '스쿼트': [set1], ... }
        exercise_groups = {}

        for s in session_data.get('sets', []):
            name = s['exercise_name']
            if name not in exercise_groups:
                exercise_groups[name] = []
            exercise_groups[name].append(s)

        # 종목별로 세트 정보를 읽기 쉬운 텍스트로 조합
        exercises_text = ''

        for exercise_name, sets in exercise_groups.items():
            set_details = []

            for s in sets:
                if s.get('weight_kg') and s.get('reps'):
                    # 중량 + 횟수가 모두 있는 경우 (일반적인 웨이트 트레이닝)
                    set_details.append(
                        f"{s['set_number']}세트 {s['weight_kg']}kg×{s['reps']}회"
                    )
                elif s.get('reps'):
                    # 횟수는 있지만 중량이 없는 경우 (맨몸 운동)
                    set_details.append(
                        f"{s['set_number']}세트 {s['reps']}회(맨몸)"
                    )
                elif s.get('duration_sec'):
                    # 시간 기반 운동인 경우 (플랭크, 월시트 등)
                    set_details.append(
                        f"{s['set_number']}세트 {s['duration_sec']}초"
                    )

            exercises_text += f"\n- {exercise_name}: {', '.join(set_details)}"

        # ─────────────────────────────────────────────
        # 3단계: 개인 맞춤 프로필 컨텍스트 생성 (MyPage 데이터 활용)
        # ─────────────────────────────────────────────

        profile_context = _build_profile_context(user_profile)

        # ─────────────────────────────────────────────
        # 4단계: Claude에게 보낼 프롬프트(지시문) 작성
        # ─────────────────────────────────────────────

        prompt = f"""아래는 오늘의 운동 기록입니다. 이 기록을 분석하고 한국어로 피드백을 주세요.{profile_context}

운동 날짜: {session_data.get('session_date', '오늘')}
세션 제목: {session_data.get('title') or '무제'}
총 운동 시간: {session_data.get('duration_min') or '미기록'}분
운동 목록:{exercises_text if exercises_text else ' (기록 없음)'}

아래 형식으로 간결하게 작성해주세요:
1. 오늘 운동 총평 (1~2문장, 사용자 신체 정보가 있다면 체성분·체중 기준으로 맞춤 평가)
2. 잘한 점 또는 개선할 점 (bullet point 2~3개, 각 줄 앞에 • 기호 사용)
3. 다음 운동을 위한 구체적인 조언 (1문장, 신체 정보·개인 메모가 있다면 반영)

500자 이내로 작성해주세요."""

        # ─────────────────────────────────────────────
        # 5단계: Claude API 호출
        # ─────────────────────────────────────────────

        message = client.messages.create(
            model=model,
            max_tokens=600,
            messages=[{'role': 'user', 'content': prompt}]  # type: ignore[arg-type]
        )

        # ─────────────────────────────────────────────
        # 6단계: 응답에서 텍스트만 추출해 반환
        # ─────────────────────────────────────────────

        return message.content[0].text

    except anthropic.AuthenticationError:
        return 'API 키가 올바르지 않습니다. TAE_ANTHROPIC_API_KEY를 확인해주세요.'

    except anthropic.RateLimitError:
        return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'

    except Exception as error:
        return f'AI 분석 중 오류가 발생했습니다: {str(error)}'


def generate_coach_advice(user_profile, recent_sessions):
    """
    사용자 프로필과 최근 운동 기록을 바탕으로 맞춤형 AI 코치 조언을 생성
    MyPage에 저장된 신체 정보(키, 체중, 골격근량, 체지방량, 개인 메모)를 활용

    매개변수 user_profile (딕셔너리):
        {
            'username': '홍길동',
            'height_cm': 175.0,
            'weight_kg': 70.0,
            'skeletal_muscle_kg': 32.0,
            'body_fat_kg': 14.0,
            'profile_note': '무릎이 약해서 스쿼트 시 주의 필요'
        }

    매개변수 recent_sessions (리스트): 최근 운동 세션 딕셔너리 목록 (최대 10개)

    반환값: Claude AI의 맞춤 코칭 조언 텍스트 (문자열)
    """

    try:
        # ─────────────────────────────────────────────
        # 1단계: Anthropic 클라이언트 생성
        # ─────────────────────────────────────────────

        client, model = _get_client_and_model()
        if client is None:
            return model

        # ─────────────────────────────────────────────
        # 2단계: 개인 프로필 컨텍스트 구성 (MyPage 데이터)
        # ─────────────────────────────────────────────

        profile_context = _build_profile_context(user_profile)

        # ─────────────────────────────────────────────
        # 3단계: 최근 운동 이력 텍스트 구성
        # ─────────────────────────────────────────────

        if recent_sessions:
            sessions_text = ''
            for session in recent_sessions[:7]:  # 최근 7개 세션만 사용
                # 세션에서 종목 이름 목록 추출 (중복 제거)
                exercise_names = list(dict.fromkeys(
                    s['exercise_name'] for s in session.get('sets', [])
                ))
                date_str = session.get('session_date', '날짜 미상')
                title_str = session.get('title') or '운동'
                names_str = ', '.join(exercise_names) if exercise_names else '기록 없음'
                sessions_text += f"\n- {date_str} [{title_str}]: {names_str}"
        else:
            sessions_text = '\n- 최근 운동 기록 없음'

        # ─────────────────────────────────────────────
        # 4단계: 맞춤 코칭 프롬프트 작성
        # ─────────────────────────────────────────────

        prompt = f"""당신은 전문 퍼스널 트레이너 AI 코치입니다. 아래 사용자 정보와 최근 운동 이력을 바탕으로 맞춤형 운동 코칭 조언을 한국어로 작성해주세요.{profile_context}

[최근 운동 이력]{sessions_text}

아래 형식으로 작성해주세요:
1. 현재 체성분 분석 및 운동 목표 제안 (신체 정보가 있을 경우 BMI·근육량·체지방률 기준 평가 포함, 1~2문장)
2. 최근 운동 패턴 평가 및 개선점 (bullet point 2~3개, 각 줄 앞에 • 기호 사용)
3. 이번 주 추천 운동 계획 (bullet point 2~3개, 각 줄 앞에 → 기호 사용)
4. 개인 메모 반영 조언 (개인 메모가 있을 경우 해당 내용을 반영한 1문장 조언, 없으면 생략)

600자 이내로 작성해주세요."""

        # ─────────────────────────────────────────────
        # 5단계: Claude API 호출
        # ─────────────────────────────────────────────

        message = client.messages.create(
            model=model,
            max_tokens=700,
            messages=[{'role': 'user', 'content': prompt}]  # type: ignore[arg-type]
        )

        return message.content[0].text

    except anthropic.AuthenticationError:
        return 'API 키가 올바르지 않습니다. TAE_ANTHROPIC_API_KEY를 확인해주세요.'

    except anthropic.RateLimitError:
        return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'

    except Exception as error:
        return f'AI 코치 조언 생성 중 오류가 발생했습니다: {str(error)}'
