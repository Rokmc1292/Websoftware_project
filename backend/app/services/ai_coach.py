# ai_coach.py — Claude AI API 호출 로직
# 운동 세션 데이터를 Claude AI에게 전달하고 분석·조언 텍스트를 받아 반환
# 이 파일은 순수하게 AI API 통신만 담당 — 라우트 코드와 분리해 유지보수 편의성 향상

import os  # os : 환경변수(ANTHROPIC_API_KEY)를 읽기 위한 Python 표준 모듈

# anthropic : Anthropic 공식 Python SDK — Claude API를 쉽게 사용하도록 도와주는 라이브러리
# 'pip install anthropic' 으로 설치
import anthropic


def analyze_workout(session_data):
    """
    운동 세션 데이터를 Claude API에 전달해 분석 결과 텍스트를 반환

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

    반환값: Claude AI의 운동 분석 텍스트 (문자열)
    오류 발생 시: 오류 메시지 문자열 반환 (예외를 밖으로 전파하지 않음)
    """

    try:
        # ─────────────────────────────────────────────
        # 1단계: Anthropic 클라이언트 생성
        # ─────────────────────────────────────────────

        # os.getenv('ANTHROPIC_API_KEY') : .env 파일에 저장된 API 키를 환경변수에서 읽음
        # api_key를 직접 코드에 쓰면 GitHub에 올릴 때 키가 노출되므로 반드시 환경변수로 관리
        api_key = os.getenv('ANTHROPIC_API_KEY')

        # API 키가 없으면 Claude를 호출할 수 없으므로 즉시 안내 메시지 반환
        if not api_key:
            # ANTHROPIC_API_KEY 환경변수 미설정 시 사용자에게 안내
            return 'AI 분석을 사용하려면 ANTHROPIC_API_KEY 환경변수를 설정해주세요.'

        # anthropic.Anthropic() : Anthropic API와 통신하는 클라이언트 객체 생성
        client = anthropic.Anthropic(api_key=api_key)

        # ─────────────────────────────────────────────
        # 2단계: 운동 데이터를 읽기 쉬운 텍스트로 변환
        # ─────────────────────────────────────────────

        # session_data의 sets 리스트에서 종목별로 세트를 묶음
        # exercise_groups = { '벤치프레스': [set1, set2], '스쿼트': [set1], ... }
        exercise_groups = {}  # 빈 딕셔너리로 시작

        # session_data.get('sets', []) : 'sets' 키가 없으면 빈 리스트 반환 (오류 방지)
        for s in session_data.get('sets', []):
            name = s['exercise_name']  # 종목 이름 추출

            # 이 종목이 딕셔너리에 없으면 빈 리스트로 초기화
            if name not in exercise_groups:
                exercise_groups[name] = []

            # 해당 종목의 세트 목록에 추가
            exercise_groups[name].append(s)

        # 종목별로 세트 정보를 읽기 쉬운 텍스트로 조합
        exercises_text = ''  # 최종 운동 목록 텍스트

        for exercise_name, sets in exercise_groups.items():
            # 각 종목의 세트 상세를 문자열 리스트로 만들어 나중에 ', '로 합침
            set_details = []

            for s in sets:
                if s.get('weight_kg') and s.get('reps'):
                    # 중량 + 횟수가 모두 있는 경우 (일반적인 웨이트 트레이닝)
                    # 예: "1세트 60.0kg×10회"
                    set_details.append(
                        f"{s['set_number']}세트 {s['weight_kg']}kg×{s['reps']}회"
                    )
                elif s.get('reps'):
                    # 횟수는 있지만 중량이 없는 경우 (맨몸 운동: 턱걸이, 푸시업 등)
                    # 예: "1세트 10회(맨몸)"
                    set_details.append(
                        f"{s['set_number']}세트 {s['reps']}회(맨몸)"
                    )
                elif s.get('duration_sec'):
                    # 시간 기반 운동인 경우 (플랭크, 월시트 등)
                    # 예: "1세트 60초"
                    set_details.append(
                        f"{s['set_number']}세트 {s['duration_sec']}초"
                    )

            # 종목 이름과 세트 상세를 합쳐서 exercises_text에 추가
            # 예: "\n- 벤치프레스: 1세트 60.0kg×10회, 2세트 65.0kg×8회"
            exercises_text += f"\n- {exercise_name}: {', '.join(set_details)}"

        # ─────────────────────────────────────────────
        # 3단계: Claude에게 보낼 프롬프트(지시문) 작성
        # ─────────────────────────────────────────────

        # 프롬프트 : AI에게 무엇을 해달라고 요청하는 텍스트
        # 아래 format에 실제 데이터를 채워 넣음 (f-string 사용)
        prompt = f"""아래는 오늘의 운동 기록입니다. 이 기록을 분석하고 한국어로 피드백을 주세요.

운동 날짜: {session_data.get('session_date', '오늘')}
세션 제목: {session_data.get('title') or '무제'}
총 운동 시간: {session_data.get('duration_min') or '미기록'}분
운동 목록:{exercises_text if exercises_text else ' (기록 없음)'}

아래 형식으로 간결하게 작성해주세요:
1. 오늘 운동 총평 (1~2문장)
2. 잘한 점 또는 개선할 점 (bullet point 2~3개, 각 줄 앞에 • 기호 사용)
3. 다음 운동을 위한 구체적인 조언 (1문장)

500자 이내로 작성해주세요."""

        # ─────────────────────────────────────────────
        # 4단계: Claude API 호출
        # ─────────────────────────────────────────────

        # client.messages.create() : Claude API에 메시지를 보내고 응답을 받는 함수
        message = client.messages.create(
            # model : 사용할 Claude 모델 이름
            # claude-haiku-4-5 : 빠르고 비용 효율적인 모델 — 짧은 분석에 적합
            model='claude-haiku-4-5-20251001',

            # max_tokens : 응답의 최대 토큰 수 (대략 1토큰 ≈ 0.75단어)
            # 600토큰이면 약 450자 분량 — 운동 피드백에 충분한 길이
            max_tokens=600,

            # messages : Claude에게 보내는 대화 내용
            # role='user' : 사용자가 보내는 메시지
            # content : 실제 메시지 텍스트
            messages=[
                {'role': 'user', 'content': prompt}
            ]
        )

        # ─────────────────────────────────────────────
        # 5단계: 응답에서 텍스트만 추출해 반환
        # ─────────────────────────────────────────────

        # message.content : 응답 콘텐츠 블록의 리스트
        # [0] : 첫 번째 (보통 유일한) 블록
        # .text : 텍스트 블록의 실제 텍스트 내용
        return message.content[0].text

    except anthropic.AuthenticationError:
        # AuthenticationError : API 키가 잘못되었을 때 발생
        return 'API 키가 올바르지 않습니다. ANTHROPIC_API_KEY를 확인해주세요.'

    except anthropic.RateLimitError:
        # RateLimitError : API 호출 한도를 초과했을 때 발생
        return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'

    except Exception as error:
        # 그 외 예상치 못한 모든 오류 — 오류 메시지를 반환해 서버가 멈추지 않도록 처리
        return f'AI 분석 중 오류가 발생했습니다: {str(error)}'
