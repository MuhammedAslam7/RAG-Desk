# backend/app/services/email.py
"""Transactional email via the Brevo (formerly Sendinblue) REST API.

Every function degrades gracefully: when BREVO_API_KEY is unset (local dev)
the email is logged instead of sent, so the app still works end to end.
"""
import html
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


# --------------------------------------------------------------------------
# Low-level send
# --------------------------------------------------------------------------

def _branded_html(title: str, body_html: str) -> str:
    """Standard HTML shell with the product brand, matching the app's dark
    aesthetic. `body_html` is the inner content (heading, paragraph, button)."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#171717;border:1px solid #262626;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.5px;color:#a3a3a3;">
                <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:8px;background:linear-gradient(135deg,#6d5ae6,#8b5cf6);color:#fff;font-size:12px;margin-right:8px;">RD</span>
                RAG Desk
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#fafafa;">{html.escape(title)}</h1>
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#737373;">
                You're receiving this because you have an account with RAG Desk.<br />
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _button_html(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">'
        "<tr><td>"
        f'<a href="{html.escape(href, quote=True)}" style="display:inline-block;padding:12px 24px;border-radius:10px;'
        'background:#7c5cf0;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">'
        f"{html.escape(label)}</a></td></tr></table>"
    )


async def send_transactional_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: str | None = None,
) -> bool:
    """Send a single transactional email through Brevo. Returns False when the
    provider is not configured (dev mode) so callers can log/skip."""
    if not settings.BREVO_API_KEY:
        logger.info("[mail] BREVO_API_KEY not set — skipping '%s' -> %s", subject, to_email)
        return False

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                BREVO_API_URL,
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "accept": "application/json",
                    "content-type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
        logger.info("[mail] sent '%s' -> %s", subject, to_email)
        return True
    except httpx.HTTPError as exc:
        logger.error("[mail] failed to send '%s' -> %s: %s", subject, to_email, exc)
        return False


# --------------------------------------------------------------------------
# Product emails
# --------------------------------------------------------------------------

async def send_verification_email(to_email: str, name: str | None, token: str) -> bool:
    link = f"{settings.FRONTEND_ORIGIN}/verify-email?token={token}"
    body = (
        "<p style='margin:0 0 8px;font-size:14px;line-height:1.7;color:#d4d4d4;'>"
        f"Hi {html.escape(name or 'there')},<br />"
        "Welcome to RAG Desk! Please confirm your email address to activate your account.</p>"
        + _button_html(link, "Verify email")
        + "<p style='margin:0;font-size:12px;color:#737373;'>"
        "This link expires in 24 hours. If the button doesn't work, copy this URL:"
        f"<br />{html.escape(link)}</p>"
    )
    return await send_transactional_email(
        to_email, "Verify your email", _branded_html("Confirm your email", body), name
    )


async def send_password_reset_email(to_email: str, name: str | None, token: str) -> bool:
    link = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
    body = (
        "<p style='margin:0 0 8px;font-size:14px;line-height:1.7;color:#d4d4d4;'>"
        f"Hi {html.escape(name or 'there')},<br />"
        "We received a request to reset your password. Click below to choose a new one. "
        "If you didn't request this, you can safely ignore this email.</p>"
        + _button_html(link, "Reset password")
        + "<p style='margin:0;font-size:12px;color:#737373;'>"
        "This link expires in 1 hour. If the button doesn't work, copy this URL:"
        f"<br />{html.escape(link)}</p>"
    )
    return await send_transactional_email(
        to_email, "Reset your password", _branded_html("Reset your password", body), name
    )


async def send_team_invite_email(
    to_email: str, invitee_name: str | None, org_name: str, role: str, link: str
) -> bool:
    body = (
        "<p style='margin:0 0 8px;font-size:14px;line-height:1.7;color:#d4d4d4;'>"
        f"Hi {html.escape(invitee_name or 'there')},<br />"
        f"You've been invited to join <strong style='color:#fafafa;'>{html.escape(org_name)}</strong> "
        f"on RAG Desk as <strong style='color:#fafafa;'>{html.escape(role)}</strong>.</p>"
        + _button_html(link, "Accept invitation")
        + "<p style='margin:0;font-size:12px;color:#737373;'>"
        "This invitation expires in 7 days. If the button doesn't work, copy this URL:"
        f"<br />{html.escape(link)}</p>"
    )
    return await send_transactional_email(
        to_email,
        f"You've been invited to {org_name}",
        _branded_html(f"Join {org_name} on RAG Desk", body),
        invitee_name,
    )
