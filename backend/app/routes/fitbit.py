import base64
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import requests
from flask import Blueprint, current_app, jsonify, redirect, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models.fitbit_token import FitbitToken

fitbit_bp = Blueprint("fitbit", __name__, url_prefix="/api/fitbit")

FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize"
FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token"
FITBIT_SLEEP_BY_DATE_URL = "https://api.fitbit.com/1.2/user/-/sleep/date/{date}.json"


def _get_current_user_id():
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        identity = identity.get("id")
    if identity is None:
        raise ValueError("JWT identity is missing")
    return int(identity)


def build_basic_auth_header(client_id, client_secret):
    raw = f"{client_id}:{client_secret}"
    encoded = base64.b64encode(raw.encode("utf-8")).decode("utf-8")
    return f"Basic {encoded}"


def token_to_expires_at(expires_in):
    return datetime.utcnow() + timedelta(seconds=int(expires_in or 0))


def parse_fitbit_datetime(dt_string):
    if not dt_string:
        return None

    formats = [
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(dt_string, fmt)
        except ValueError:
            pass

    return None


def extract_sleep_record_from_fitbit(payload):
    sleeps = payload.get("sleep", [])
    if not sleeps:
        return None

    target = next((item for item in sleeps if item.get("isMainSleep")), sleeps[0])

    start_time = parse_fitbit_datetime(target.get("startTime"))
    end_time = parse_fitbit_datetime(target.get("endTime"))

    if not start_time or not end_time:
        return None

    duration_ms = target.get("duration", 0) or 0
    duration_minutes = int(duration_ms / 1000 / 60)

    return {
        "bedHour": start_time.hour,
        "bedMinute": start_time.minute,
        "wakeHour": end_time.hour,
        "wakeMinute": end_time.minute,
        "totalSleepMinutes": duration_minutes,
        "minutesAsleep": int(target.get("minutesAsleep", 0) or 0),
        "minutesAwake": int(target.get("minutesAwake", 0) or 0),
        "awakeCount": int(target.get("awakeCount", 0) or 0),
        "efficiency": int(target.get("efficiency", 0) or 0),
        "source": "fitbit",
    }


def refresh_fitbit_token(token_row):
    client_id = current_app.config["FITBIT_CLIENT_ID"]
    client_secret = current_app.config["FITBIT_CLIENT_SECRET"]

    headers = {
        "Authorization": build_basic_auth_header(client_id, client_secret),
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {
        "grant_type": "refresh_token",
        "refresh_token": token_row.refresh_token,
    }

    response = requests.post(FITBIT_TOKEN_URL, headers=headers, data=data, timeout=20)

    if response.status_code != 200:
        raise Exception(f"Fitbit token refresh failed: {response.text}")

    token_data = response.json()

    token_row.access_token = token_data["access_token"]
    token_row.refresh_token = token_data["refresh_token"]
    token_row.scope = token_data.get("scope")
    token_row.token_type = token_data.get("token_type")
    token_row.fitbit_user_id = token_data.get("user_id")
    token_row.expires_at = token_to_expires_at(token_data.get("expires_in"))

    db.session.commit()
    return token_row


def get_valid_token_row(user_id):
    token_row = FitbitToken.query.filter_by(user_id=user_id).first()
    if not token_row:
        return None

    if token_row.is_expired():
        token_row = refresh_fitbit_token(token_row)

    return token_row


@fitbit_bp.route("/connect", methods=["GET"])
@jwt_required()
def connect_fitbit():
    client_id = current_app.config["FITBIT_CLIENT_ID"]
    redirect_uri = current_app.config["FITBIT_REDIRECT_URI"]

    if not client_id or not redirect_uri:
        return jsonify({
            "success": False,
            "message": "Fitbit 환경변수가 설정되지 않았습니다."
        }), 500

    user_id = _get_current_user_id()
    random_state = secrets.token_urlsafe(24)

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "sleep profile",
        "state": f"{user_id}:{random_state}",
    }

    auth_url = f"{FITBIT_AUTH_URL}?{urlencode(params)}"

    return jsonify({
        "success": True,
        "authUrl": auth_url
    })


@fitbit_bp.route("/callback", methods=["GET"])
def fitbit_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    frontend_url = current_app.config["FRONTEND_URL"]

    if error or not code or not state:
        return redirect(f"{frontend_url}/sleep?fitbit=error")

    try:
        user_id_str, _ = state.split(":", 1)
        user_id = int(user_id_str)
    except Exception:
        return redirect(f"{frontend_url}/sleep?fitbit=error")

    client_id = current_app.config["FITBIT_CLIENT_ID"]
    client_secret = current_app.config["FITBIT_CLIENT_SECRET"]
    redirect_uri = current_app.config["FITBIT_REDIRECT_URI"]

    headers = {
        "Authorization": build_basic_auth_header(client_id, client_secret),
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {
        "client_id": client_id,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
        "code": code,
    }

    response = requests.post(FITBIT_TOKEN_URL, headers=headers, data=data, timeout=20)

    if response.status_code != 200:
        print("Fitbit token exchange error:", response.text)
        return redirect(f"{frontend_url}/sleep?fitbit=error")

    token_data = response.json()

    token_row = FitbitToken.query.filter_by(user_id=user_id).first()

    if token_row:
        token_row.fitbit_user_id = token_data.get("user_id")
        token_row.access_token = token_data["access_token"]
        token_row.refresh_token = token_data["refresh_token"]
        token_row.scope = token_data.get("scope")
        token_row.token_type = token_data.get("token_type")
        token_row.expires_at = token_to_expires_at(token_data.get("expires_in"))
    else:
        token_row = FitbitToken(
            user_id=user_id,
            fitbit_user_id=token_data.get("user_id"),
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            scope=token_data.get("scope"),
            token_type=token_data.get("token_type"),
            expires_at=token_to_expires_at(token_data.get("expires_in")),
        )
        db.session.add(token_row)

    db.session.commit()

    return redirect(f"{frontend_url}/sleep?fitbit=connected")


@fitbit_bp.route("/status", methods=["GET"])
@jwt_required()
def fitbit_status():
    user_id = _get_current_user_id()
    token_row = FitbitToken.query.filter_by(user_id=user_id).first()

    return jsonify({
        "success": True,
        "connected": token_row is not None
    })


@fitbit_bp.route("/sleep/<date>", methods=["GET"])
@jwt_required()
def fitbit_sleep_by_date(date):
    user_id = _get_current_user_id()
    token_row = get_valid_token_row(user_id)

    if not token_row:
        return jsonify({
            "success": False,
            "message": "Fitbit 계정이 연동되어 있지 않습니다."
        }), 404

    headers = {
        "Authorization": f"Bearer {token_row.access_token}"
    }

    url = FITBIT_SLEEP_BY_DATE_URL.format(date=date)
    response = requests.get(url, headers=headers, timeout=20)

    if response.status_code != 200:
        return jsonify({
            "success": False,
            "message": "Fitbit 수면 데이터를 가져오지 못했습니다.",
            "detail": response.text
        }), response.status_code

    payload = response.json()
    record = extract_sleep_record_from_fitbit(payload)

    return jsonify({
        "success": True,
        "record": record
    })