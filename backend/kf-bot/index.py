"""
Ketfox Telegram Bot — webhook обработчик.
/start — приветствие и сохранение telegram_id пользователя
/code  — генерирует 6-значный код и возвращает его прямо в чат для входа на сайт
"""
import json
import os
import random
import string
import urllib.request
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def tg_send(chat_id, text, parse_mode="HTML"):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def make_code():
    return "".join(random.choices(string.digits, k=6))


def handler(event: dict, context) -> dict:
    """Webhook Telegram-бота Ketfox: сохраняет telegram_id при /start, выдаёт код при /code."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    message = body.get("message") or body.get("edited_message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    from_user = message.get("from") or {}
    tg_id = from_user.get("id")
    tg_username = (from_user.get("username") or "").lower().strip()
    first_name = from_user.get("first_name") or tg_username or "Гость"
    text = (message.get("text") or "").strip()

    if not chat_id or not tg_id:
        return {"statusCode": 200, "headers": CORS, "body": "ok"}

    conn = get_conn()
    cur = conn.cursor()

    # Сохраняем / обновляем telegram_id пользователя по username
    if tg_username:
        cur.execute(
            "UPDATE kf_users SET telegram_id = %s WHERE LOWER(telegram_username) = %s AND (telegram_id IS NULL OR telegram_id != %s)",
            (tg_id, tg_username, tg_id)
        )
        conn.commit()

    cmd = text.split()[0].lower() if text else ""

    # /start
    if cmd in ("/start", "/start@ketfoxbot"):
        tg_send(chat_id,
            f"👋 Привет, <b>{first_name}</b>!\n\n"
            "🦊 Добро пожаловать в <b>Ketfox</b> — галерею демонических артов.\n\n"
            "Чтобы войти на сайт:\n"
            "1. Введи команду /code\n"
            "2. Получи 6-значный код\n"
            "3. Введи его на сайте\n\n"
            "Всё просто 🔥"
        )
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": "ok"}

    # /code
    if cmd in ("/code", "/code@ketfoxbot"):
        if not tg_username:
            tg_send(chat_id,
                "⚠️ У тебя не задан username в Telegram.\n"
                "Задай его в настройках Telegram, затем попробуй снова."
            )
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": "ok"}

        code = make_code()
        # Сохраняем код по username
        cur.execute(
            "INSERT INTO kf_auth_codes (telegram_username, code) VALUES (%s, %s)",
            (tg_username, code)
        )
        # Сохраняем telegram_id — он точно известен сейчас
        cur.execute(
            """INSERT INTO kf_users (username, display_name, telegram_id, telegram_username, role)
               VALUES (%s, %s, %s, %s, 'user')
               ON CONFLICT (telegram_username) DO UPDATE SET telegram_id = EXCLUDED.telegram_id""",
            (tg_username, first_name, tg_id, tg_username)
        )
        conn.commit()
        conn.close()

        tg_send(chat_id,
            f"🔑 Твой код для входа в <b>Ketfox</b>:\n\n"
            f"<code>{code}</code>\n\n"
            f"⏱ Действителен <b>10 минут</b>.\n"
            f"Не передавай его никому!"
        )
        return {"statusCode": 200, "headers": CORS, "body": "ok"}

    # Любое другое сообщение
    tg_send(chat_id,
        "🦊 <b>Ketfox Bot</b>\n\n"
        "/start — начало работы\n"
        "/code — получить код для входа на сайт"
    )
    conn.close()
    return {"statusCode": 200, "headers": CORS, "body": "ok"}
