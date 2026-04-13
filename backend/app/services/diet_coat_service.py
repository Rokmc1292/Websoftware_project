import json
import os
import re

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None


DEFAULT_IMAGE_MODEL = 'gemini-1.5-flash'
DEFAULT_COACH_MODEL = 'gemini-1.5-flash'


def _extract_json(text):
    raw = (text or '').strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'{.*}', raw, re.DOTALL)
        if not match:
            return {}
        return json.loads(match.group(0))


def _build_client():
    if genai is None:
        raise RuntimeError('google-generativeai 패키지가 설치되지 않았습니다.')
    api_key = (os.getenv('GOOGLE_AI_API_KEY') or '').strip()
    if not api_key:
        raise ValueError('GOOGLE_AI_API_KEY가 설정되지 않았습니다.')
    genai.configure(api_key=api_key)


def _normalize_items(items):
    normalized = []
    for item in items or []:
        name = str(item.get('name', '')).strip()
        if not name:
            continue
        normalized.append({
            'name': name,
            'calories': max(0, int(float(item.get('calories', 0) or 0))),
            'protein': max(0, float(item.get('protein', 0) or 0)),
            'carbs': max(0, float(item.get('carbs', 0) or 0)),
            'fat': max(0, float(item.get('fat', 0) or 0)),
        })
    return normalized


def analyze_food_image(image_bytes, mime_type='image/jpeg', filename='upload.jpg'):
    _build_client()
    model_name = (os.getenv('GOOGLE_AI_IMAGE_MODEL') or DEFAULT_IMAGE_MODEL).strip()
    model = genai.GenerativeModel(model_name=model_name)
    prompt = (
        '음식 사진을 보고 음식 목록과 영양 정보를 추정해 JSON만 반환하세요. '
        '스키마: {"items":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}]}. '
        '중요: items[].name은 반드시 한국어 음식명으로 작성하세요(영문 금지, 예: chicken breast -> 닭가슴살). '
        '단위는 g, 칼로리는 kcal, 확실하지 않으면 보수적으로 추정하세요.'
    )
    response = model.generate_content(
        [
            {'mime_type': mime_type, 'data': image_bytes},
            f'파일명: {filename}\n{prompt}',
        ],
        generation_config={'response_mime_type': 'application/json'}
    )
    data = _extract_json(getattr(response, 'text', ''))
    return {'items': _normalize_items(data.get('items', []))}


def generate_diet_coach_feedback(payload):
    _build_client()
    model_name = (os.getenv('GOOGLE_AI_COACH_MODEL') or DEFAULT_COACH_MODEL).strip()
    model = genai.GenerativeModel(model_name=model_name)
    prompt = (
        '다음 식단 데이터를 보고 한국어 코칭 메시지를 작성하세요. JSON만 반환하세요. '
        '스키마: {"feedback":"string"}. '
        '조건: 220자 이내, 한 줄 총평 + 불릿 2개(각 줄 앞에 •), 과장 금지.'
    )
    response = model.generate_content(
        f'{prompt}\n\n입력 데이터:\n{json.dumps(payload, ensure_ascii=False)}',
        generation_config={'response_mime_type': 'application/json'}
    )
    data = _extract_json(getattr(response, 'text', ''))
    feedback = str(data.get('feedback', '')).strip()
    if not feedback:
        feedback = 'AI 코치 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.'
    return {'feedback': feedback}


