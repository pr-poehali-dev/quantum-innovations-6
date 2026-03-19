"""
Посты Ketfox — список артов, создание/редактирование/удаление (только админ).
"""
import json
import os
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_user(token, cur):
    if not token:
        return None
    cur.execute(
        "SELECT u.id, u.role, u.is_banned FROM kf_sessions s JOIN kf_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "role": row[1], "is_banned": row[2]}


def handler(event: dict, context) -> dict:
    """Управление постами/артами: просмотр всеми, создание/редактирование/удаление только администратором."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    token = (event.get("headers") or {}).get("X-Auth-Token", "")

    conn = get_conn()
    cur = conn.cursor()

    # GET / — список постов
    if method == "GET" and (path.endswith("/") or path.endswith("/posts") or path == "/"):
        params = event.get("queryStringParameters") or {}
        limit = min(int(params.get("limit", 20)), 50)
        offset = int(params.get("offset", 0))
        for_sale = params.get("for_sale")

        query = """SELECT p.id, p.title, p.description, p.image_url, p.price, p.is_for_sale,
                          p.created_at, u.username, u.display_name, u.avatar_url
                   FROM kf_posts p JOIN kf_users u ON u.id = p.author_id"""
        if for_sale == "true":
            query += " WHERE p.is_for_sale = TRUE"
        query += " ORDER BY p.created_at DESC LIMIT %s OFFSET %s"
        cur.execute(query, (limit, offset))
        rows = cur.fetchall()
        posts = []
        for r in rows:
            posts.append({
                "id": r[0], "title": r[1], "description": r[2],
                "image_url": r[3], "price": float(r[4]) if r[4] else None,
                "is_for_sale": r[5], "created_at": str(r[6]),
                "author_username": r[7], "author_display_name": r[8], "author_avatar": r[9]
            })
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(posts)}

    # POST / — создать пост (только админ)
    if method == "POST":
        user = get_user(token, cur)
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Только для администратора"})}
        body = json.loads(event.get("body") or "{}")
        cur.execute(
            "INSERT INTO kf_posts (author_id, title, description, image_url, price, is_for_sale) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (user["id"], body.get("title", "")[:256], body.get("description"), body.get("image_url"), body.get("price"), body.get("is_for_sale", False))
        )
        post_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": post_id})}

    # PUT /{id} — редактировать пост (только админ)
    if method == "PUT":
        user = get_user(token, cur)
        if not user or user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Только для администратора"})}
        parts = path.rstrip("/").split("/")
        post_id = int(parts[-1])
        body = json.loads(event.get("body") or "{}")
        cur.execute(
            "UPDATE kf_posts SET title=%s, description=%s, image_url=%s, price=%s, is_for_sale=%s, updated_at=NOW() WHERE id=%s",
            (body.get("title", "")[:256], body.get("description"), body.get("image_url"), body.get("price"), body.get("is_for_sale", False), post_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
