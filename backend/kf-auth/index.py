"""
Auth + Admin Ketfox — авторизация через Telegram, профиль, бан/мут, загрузка изображений.
"""
import json
import os
import secrets
import base64
import uuid
import psycopg2
import boto3
from datetime import datetime, timedelta


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_user_by_token(token, cur):
    if not token:
        return None
    cur.execute(
        "SELECT u.id, u.role, u.is_banned, u.is_muted, u.display_name, u.avatar_url FROM kf_sessions s JOIN kf_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "role": row[1], "is_banned": row[2], "is_muted": row[3],
            "display_name": row[4], "avatar_url": row[5]}


def handler(event: dict, context) -> dict:
    """Авторизация через Telegram, управление профилем, бан/мут пользователей, загрузка изображений."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    token = (event.get("headers") or {}).get("X-Auth-Token", "")

    conn = get_conn()
    cur = conn.cursor()

    # POST /register
    if method == "POST" and path.endswith("/register"):
        body = json.loads(event.get("body") or "{}")
        tg_id = body.get("telegram_id")
        tg_username = body.get("telegram_username", "")
        display_name = body.get("display_name", tg_username)
        username = body.get("username", tg_username or f"user_{tg_id}")
        if not tg_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "telegram_id обязателен"})}
        cur.execute("SELECT id, role, is_banned, ban_reason FROM kf_users WHERE telegram_id = %s", (tg_id,))
        row = cur.fetchone()
        if row:
            user_id, role, is_banned, ban_reason = row
            if is_banned:
                conn.close()
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Аккаунт заблокирован", "reason": ban_reason})}
            tok = secrets.token_hex(32)
            cur.execute("INSERT INTO kf_sessions (user_id, token) VALUES (%s, %s)", (user_id, tok))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": tok, "user_id": user_id, "role": role, "new": False})}
        cur.execute("SELECT COUNT(*) FROM kf_users")
        count = cur.fetchone()[0]
        role = "admin" if count == 0 else "user"
        cur.execute(
            "INSERT INTO kf_users (username, display_name, telegram_id, telegram_username, role) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (username[:64], display_name[:128], tg_id, tg_username[:64], role)
        )
        user_id = cur.fetchone()[0]
        tok = secrets.token_hex(32)
        cur.execute("INSERT INTO kf_sessions (user_id, token) VALUES (%s, %s)", (user_id, tok))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": tok, "user_id": user_id, "role": role, "new": True})}

    # GET /me
    if method == "GET" and path.endswith("/me"):
        if not token:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет токена"})}
        cur.execute(
            """SELECT u.id, u.username, u.display_name, u.avatar_url, u.telegram_username,
                      u.role, u.is_banned, u.is_muted, u.ban_reason, u.mute_until, u.created_at
               FROM kf_sessions s JOIN kf_users u ON u.id = s.user_id
               WHERE s.token = %s AND s.expires_at > NOW()""",
            (token,)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "id": row[0], "username": row[1], "display_name": row[2], "avatar_url": row[3],
            "telegram_username": row[4], "role": row[5], "is_banned": row[6], "is_muted": row[7],
            "ban_reason": row[8], "mute_until": str(row[9]) if row[9] else None, "created_at": str(row[10])
        })}

    # POST /logout
    if method == "POST" and path.endswith("/logout"):
        if token:
            cur.execute("UPDATE kf_sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    user = get_user_by_token(token, cur)

    # GET /admin/users
    if method == "GET" and "users" in path:
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        cur.execute("SELECT id, username, display_name, avatar_url, telegram_username, role, is_banned, is_muted, ban_reason, mute_until, created_at FROM kf_users ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([
            {"id": r[0], "username": r[1], "display_name": r[2], "avatar_url": r[3], "telegram_username": r[4],
             "role": r[5], "is_banned": r[6], "is_muted": r[7], "ban_reason": r[8],
             "mute_until": str(r[9]) if r[9] else None, "created_at": str(r[10])} for r in rows
        ])}

    # POST /admin/ban
    if method == "POST" and path.endswith("/ban"):
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        body = json.loads(event.get("body") or "{}")
        tid = body.get("user_id")
        reason = body.get("reason", "Нарушение правил")
        cur.execute("UPDATE kf_users SET is_banned = TRUE, ban_reason = %s WHERE id = %s AND role != 'admin'", (reason, tid))
        cur.execute("INSERT INTO kf_notifications (user_id, message) VALUES (%s, %s)", (tid, f"Вы заблокированы. Причина: {reason}"))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # POST /admin/unban
    if method == "POST" and path.endswith("/unban"):
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        body = json.loads(event.get("body") or "{}")
        tid = body.get("user_id")
        cur.execute("UPDATE kf_users SET is_banned = FALSE, ban_reason = NULL WHERE id = %s", (tid,))
        cur.execute("INSERT INTO kf_notifications (user_id, message) VALUES (%s, %s)", (tid, "Ваша блокировка снята."))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # POST /admin/mute
    if method == "POST" and path.endswith("/mute"):
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        body = json.loads(event.get("body") or "{}")
        tid = body.get("user_id")
        hours = int(body.get("hours", 1))
        mute_until = datetime.utcnow() + timedelta(hours=hours)
        cur.execute("UPDATE kf_users SET is_muted = TRUE, mute_until = %s WHERE id = %s AND role != 'admin'", (mute_until, tid))
        cur.execute("INSERT INTO kf_notifications (user_id, message) VALUES (%s, %s)", (tid, f"Вы в муте на {hours} ч."))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # POST /admin/unmute
    if method == "POST" and path.endswith("/unmute"):
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        body = json.loads(event.get("body") or "{}")
        tid = body.get("user_id")
        cur.execute("UPDATE kf_users SET is_muted = FALSE, mute_until = NULL WHERE id = %s", (tid,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # POST /upload
    if method == "POST" and path.endswith("/upload"):
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Только для администратора"})}
        conn.close()
        body = json.loads(event.get("body") or "{}")
        image_data = body.get("image", "")
        ext = body.get("ext", "jpg")
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        raw = base64.b64decode(image_data)
        key = f"ketfox/posts/{uuid.uuid4().hex}.{ext}"
        s3 = boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
                          aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])
        ct = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=ct.get(ext, "image/jpeg"))
        url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": url})}

    conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
