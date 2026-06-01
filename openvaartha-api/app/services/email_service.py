import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from loguru import logger

from app.config import settings


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Logs instead of sending when SMTP is not configured."""
    if not settings.SMTP_HOST:
        logger.info("[email] SMTP not configured — would send email to {}", to)
        logger.info("[email] Subject: {}", subject)
        logger.info("[email] Body: {}…", html_body[:200])
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to], msg.as_string())
        logger.info("[email] Sent to {}", to)
        return True
    except Exception as exc:
        logger.error("[email] Failed to send to {}: {}", to, exc)
        return False


def build_password_reset_email(reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:32px">
<div style="max-width:480px;margin:auto;background:white;border-radius:8px;padding:32px">
<h2 style="margin:0 0 8px">Reset your password</h2>
<p style="color:#555;line-height:1.5">Click the button below to reset your password. This link expires in 1 hour.</p>
<a href="{reset_url}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#550000;color:white;text-decoration:none;border-radius:6px;font-weight:600">Reset password</a>
<p style="color:#999;font-size:12px">If you didn't request this, ignore this email.</p>
</div></body></html>"""
