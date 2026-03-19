"""
Заказы Ketfox — создание заказов, управление статусами.
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
    """Заказы: создание заказа покупателем, просмотр своих заказов, управление статусом администратором."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    token = (event.get("headers") or {}).get("X-Auth-Token", "")

    conn = get_conn()
    cur = conn.cursor()
    user = get_user(token, cur)

    if not user:
        conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нужно авторизоваться"})}

    if user["is_banned"]:
        conn.close()
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы заблокированы"})}

    # GET / — список заказов (свои или все для админа)
    if method == "GET":
        if user["role"] == "admin":
            cur.execute(
                """SELECT o.id, o.title, o.description, o.budget, o.status, o.created_at,
                          u.username, u.display_name, o.post_id
                   FROM kf_orders o JOIN kf_users u ON u.id = o.buyer_id
                   ORDER BY o.created_at DESC LIMIT 100"""
            )
        else:
            cur.execute(
                """SELECT o.id, o.title, o.description, o.budget, o.status, o.created_at,
                          u.username, u.display_name, o.post_id
                   FROM kf_orders o JOIN kf_users u ON u.id = o.buyer_id
                   WHERE o.buyer_id = %s ORDER BY o.created_at DESC""",
                (user["id"],)
            )
        rows = cur.fetchall()
        conn.close()
        orders = []
        for r in rows:
            orders.append({
                "id": r[0], "title": r[1], "description": r[2],
                "budget": float(r[3]) if r[3] else None,
                "status": r[4], "created_at": str(r[5]),
                "buyer_username": r[6], "buyer_display_name": r[7], "post_id": r[8]
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(orders)}

    # POST / — создать заказ
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        title = (body.get("title") or "").strip()
        if not title:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите тему заказа"})}
        cur.execute(
            "INSERT INTO kf_orders (buyer_id, post_id, title, description, budget) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user["id"], body.get("post_id"), title[:256], body.get("description"), body.get("budget"))
        )
        order_id = cur.fetchone()[0]
        # Уведомление
        cur.execute(
            "INSERT INTO kf_notifications (user_id, message) SELECT id, %s FROM kf_users WHERE role = 'admin'",
            (f"Новый заказ от {user['id']}: {title}",)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": order_id})}

    # PUT /{id}/status — изменить статус (только админ)
    if method == "PUT":
        if user["role"] != "admin":
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Только для администратора"})}
        parts = path.rstrip("/").split("/")
        order_id = int(parts[-2]) if parts[-1] == "status" else int(parts[-1])
        body = json.loads(event.get("body") or "{}")
        status = body.get("status", "new")
        allowed = ["new", "in_progress", "done", "cancelled"]
        if status not in allowed:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный статус"})}
        cur.execute("UPDATE kf_orders SET status = %s, updated_at = NOW() WHERE id = %s", (status, order_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
