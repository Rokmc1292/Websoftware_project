# sleep_coach_service.py — Claude AI를 이용한 수면 기반 운동 코치 서비스

import json
import re
from anthropic import Anthropic


SYSTEM_PROMPT = """
너는 사용자의 수면 상태를 바탕으로 운동 방향을 알려주는 전문 수면/운동 코치다.

규칙:
- 수면 시간, 수면 만족도, 메모의 특이사항을 종합 분석한다.
- 오늘의 운동 강도, 추천 운동, 피해야 할 운동, 수면 피드백을 제공한다.
- 말투는 친절하지만 실제 코치처럼 명확하고 실용적으로 한다.
- 절대 의학적 진단을 하지 않는다.
- 심한 피로, 어지러움, 통증, 지속적 불면이 보이면 병원 상담을 짧게 권고할 수 있다.
- 반드시 한국어로 답한다.
- 반드시 JSON만 반환한다.
- JSON 외의 텍스트는 절대 포함하지 않는다.

반드시 아래 형식으로만 응답:
{
  "summary": "오늘 상태 한 줄 요약",
  "exercise_intensity": "매우 낮음/낮음/중간/중간 이상/높음 중 하나",
  "recommended_workout": ["추천 운동1", "추천 운동2", "추천 운동3"],
  "avoid_workout": ["피해야 할 운동1", "피해야 할 운동2"],
  "sleep_feedback": "수면 상태 피드백",
  "coach_message": "코치 한마디",
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
        raise ValueError("Claude 응답에서 JSON을 찾을 수 없습니다.")

    return json.loads(match.group())


def generate_sleep_coach_feedback(config, payload: dict) -> dict:
    api_key = config.get("ANTHROPIC_API_KEY", "")
    model = config.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    client = Anthropic(api_key=api_key)

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
다음 수면 데이터를 분석해서 오늘의 운동 코칭 결과를 JSON으로만 반환해.

입력 데이터:
{json.dumps(user_input, ensure_ascii=False, indent=2)}

조건:
- 수면 시간이 6시간 미만이면 낮은 강도로 설정
- 수면 만족도가 낮고 "자주 깸", "피곤", "몽롱", "얕은잠" 등의 표현이 있으면 회복 중심 운동 추천
- 수면이 좋으면 중간 이상 강도 가능
- 추천 운동은 2~4개 구체적으로
- 피해야 할 운동도 명확히
- 코치처럼 현실적으로 말할 것
- 반드시 JSON만 반환
"""

    message = client.messages.create(
        model=model,
        max_tokens=1000,
        temperature=0.5,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    response_text = "".join(
        block.text for block in message.content if getattr(block, "type", "") == "text"
    )

    result = extract_json_from_text(response_text)

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
            raise ValueError(f"Claude 응답에 필수 키 없음: {key}")

    return result