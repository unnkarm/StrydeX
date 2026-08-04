import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape


logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    """Raised when SMTP has not been configured correctly."""


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def send_password_reset_email(recipient: str, reset_link: str) -> None:
    """Send a password-reset message through the configured SMTP server."""
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", username).strip()
    from_name = os.getenv("SMTP_FROM_NAME", "StrydeX").strip()
    use_ssl = _env_bool("SMTP_USE_SSL", False)
    use_tls = _env_bool("SMTP_USE_TLS", not use_ssl)

    if not host or not from_email:
        raise EmailConfigurationError(
            "SMTP_HOST and SMTP_FROM_EMAIL (or SMTP_USERNAME) must be configured"
        )
    if bool(username) != bool(password):
        raise EmailConfigurationError(
            "SMTP_USERNAME and SMTP_PASSWORD must either both be set or both be omitted"
        )
    if use_ssl and use_tls:
        raise EmailConfigurationError(
            "SMTP_USE_SSL and SMTP_USE_TLS cannot both be enabled"
        )

    default_port = 465 if use_ssl else 587
    try:
        port = int(os.getenv("SMTP_PORT", str(default_port)))
    except ValueError as exc:
        raise EmailConfigurationError("SMTP_PORT must be a number") from exc

    message = EmailMessage()
    message["Subject"] = "Reset your StrydeX password"
    message["From"] = formataddr((from_name, from_email))
    message["To"] = recipient
    message.set_content(
        "We received a request to reset your StrydeX password.\n\n"
        f"Reset your password: {reset_link}\n\n"
        "This link expires in 15 minutes. If you did not request this, you can "
        "ignore this email."
    )
    escaped_reset_link = escape(reset_link, quote=True)
    message.add_alternative(
        f"""\
        <html>
          <body>
            <p>We received a request to reset your StrydeX password.</p>
            <p><a href="{escaped_reset_link}">Reset your password</a></p>
            <p>This link expires in 15 minutes. If you did not request this,
            you can ignore this email.</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    context = ssl.create_default_context()
    smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
    smtp_kwargs = {"host": host, "port": port, "timeout": 15}
    if use_ssl:
        smtp_kwargs["context"] = context

    with smtp_class(**smtp_kwargs) as smtp:
        if use_tls:
            smtp.starttls(context=context)
        if username:
            smtp.login(username, password)
        smtp.send_message(message)

    logger.info("Password reset email accepted by SMTP for %s", recipient)
