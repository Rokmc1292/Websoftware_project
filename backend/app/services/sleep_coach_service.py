import json
import re
from openai import OpenAI

SYSTEM_PROMPT = """
너는 사용자의 수면 상태를 바탕으로 오늘 운동 방향을 알려주는 전문 수면/운동 코치다.

역할:
- 사용자의 수면 시간, 수면 만족도, 메모, 기상 미션 수행률, 수면 질 점수를 함께 보고
  오늘 컨디션을 코치처럼 해석해준다.
- 사용자가 적은 메모 내용(예: 자주 깸, 피곤함, 몽롱함, 개운함, 얕은잠, 숙면 등)을 반드시 반영한다.
- 말투는 실제 헬스 코치나 트레이너가 말하듯 자연스럽고 명확하게 한다.
- 너무 딱딱한 보고서 말투는 피한다.
- 너무 장황하게 늘어놓지 말고, 짧고 읽기 쉽게 작성한다.
- 한자, 영어 혼합 표현 없이 자연스러운 한국어(한글 중심)로만 작성한다.
- 절대 의학적 진단을 하지 않는다.
- 심한 피로, 어지러움, 통증, 지속적 불면이 보이면 warning_note에만 짧게 병원 상담 권고를 넣을 수 있다.
- 반드시 JSON만 반환한다.
- JSON 외의 텍스트는 절대 포함하지 않는다.

작성 기준:
- summary: 오늘 상태를 한 줄로 요약
- exercise_intensity: 반드시 "매우 낮음", "낮음", "중간", "중간 이상", "높음" 중 하나
- recommended_workout: 오늘 해보면 좋은 운동 2~4개
- avoid_workout: 오늘 피하는 게 좋은 운동 1~3개
- sleep_feedback: 수면 상태를 짧게 설명
- coach_message: 사용자의 메모를 바탕으로 코치가 직접 말해주듯 해석한 문장
- today_action: 오늘 바로 실천할 수 있는 행동 1개
- warning_note: 특별한 주의가 없으면 빈 문자열

반드시 아래 형식으로만 응답:
{
  "summary": "오늘 상태 한 줄 요약",
  "exercise_intensity": "매우 낮음/낮음/중간/중간 이상/높음 중 하나",
  "recommended_workout": ["추천 운동1", "추천 운동2", "추천 운동3"],
  "avoid_workout": ["피해야 할 운동1", "피해야 할 운동2"],
  "sleep_feedback": "수면 상태 피드백",
  "coach_message": "메모를 반영한 코치 한마디",
  "today_action": "오늘 실천할 한 가지",
  "warning_note": "주의사항, 없으면 빈 문자열"
}
"""


def extract_json_from_text(text: str) -> dict:
    cleaned = text.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("OpenAI 응답에서 JSON을 찾을 수 없습니다.")

    return json.loads(match.group())


def generate_sleep_coach_feedback(config, payload: dict) -> dict:
    api_key = config.get("GIL_ANTHROPIC_API_KEY", "")
    model = config.get("GIL_ANTHROPIC_MODEL", "gpt-4o-mini")

    if not api_key:
        raise ValueError("GIL_ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    client = OpenAI(api_key=api_key)

    user_input = {
        "sleep_hours": payload.get("sleepHours", 0),
        "satisfaction": payload.get("satisfaction", 0),
        "memo": payload.get("memo", ""),
        "mission_rate": payload.get("missionRate", 0),
        "sleep_quality_score": payload.get("sleepQuality", 0),
        "freshness_score": payload.get("freshness", 0),
        "growth_score": payload.get("growth", 0),
        "bed_time": f'{int(payload.get("bedHour", 0)):02d}:{int(payload.get("bedMinute", 0)):02d}',
        "wake_time": f'{int(payload.get("wakeHour", 0)):02d}:{int(payload.get("wakeMinute", 0)):02d}',
    }

    prompt = f"""
다음 수면 데이터를 분석해서 오늘 운동 방향을 코치처럼 알려줘.
반드시 JSON만 반환하고, 모든 문장은 자연스러운 한국어로 써.
특히 메모에 적힌 표현은 꼭 반영해.

입력 데이터:
{json.dumps(user_input, ensure_ascii=False, indent=2)}

분석 조건:
- 수면 시간이 6시간 미만이면 기본적으로 낮은 강도 쪽으로 판단
- 수면 만족도가 낮고 메모에 "자주 깸", "피곤", "몽롱", "얕은잠", "설침", "뒤척임" 같은 표현이 있으면 회복 중심으로 판단
- 수면 시간이 충분하고 만족도도 높으며 메모에 "개운", "숙면", "잘 잠", "상쾌" 같은 표현이 있으면 중간 이상 강도 가능
- coach_message는 사용자의 메모를 읽고 코치가 직접 말해주는 느낌으로 작성
- sleep_feedback는 전체 수면 상태를 짧고 분명하게 설명
- today_action은 오늘 바로 할 수 있는 행동 하나를 구체적으로 제안
- recommended_workout은 실제로 하기 쉬운 운동 이름으로 작성
- avoid_workout은 오늘 피하는 게 좋은 운동을 짧게 작성
- 불필요하게 길게 쓰지 말 것
- 한자나 영어 섞지 말 것
"""

    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    result = extract_json_from_text(response.output_text)

    required_keys = [
        "summary",
        "exercise_intensity",
        "recommended_workout",
        "avoid_workout",
        "sleep_feedback",
        "coach_message",
        "today_action",
        "warning_note",
    ]

    for key in required_keys:
        if key not in result:
            raise ValueError(f"OpenAI 응답에 필수 키 없음: {key}")

    if not isinstance(result.get("recommended_workout"), list):
        raise ValueError("recommended_workout은 리스트여야 합니다.")

    if not isinstance(result.get("avoid_workout"), list):
        raise ValueError("avoid_workout은 리스트여야 합니다.")

    return result