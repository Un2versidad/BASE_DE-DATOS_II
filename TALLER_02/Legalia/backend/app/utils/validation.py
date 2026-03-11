import datetime
import re


USERNAME_RE = re.compile(r"^[a-zA-Z0-9._-]{3,50}$")


def sanitize_text(value):
    if value is None:
        return ""
    text = str(value).strip()
    text = " ".join(text.split())
    return text


def has_unsafe_chars(value):
    return "<" in value or ">" in value


def validate_username(value):
    value = sanitize_text(value)
    if not USERNAME_RE.match(value):
        return "username must be 3-50 chars and only letters, numbers, . _ -"
    return None


def validate_password(value):
    if value is None:
        return "password is required"
    length = len(value)
    if length < 8 or length > 72:
        return "password must be 8-72 characters"
    return None


def validate_name(value, field="name", min_len=2, max_len=100):
    value = sanitize_text(value)
    if not value:
        return f"{field} is required"
    if len(value) < min_len or len(value) > max_len:
        return f"{field} must be {min_len}-{max_len} characters"
    if has_unsafe_chars(value):
        return f"{field} contains invalid characters"
    return None


def validate_date(value):
    if not value:
        return "fecha is required"
    try:
        datetime.date.fromisoformat(value)
    except ValueError:
        return "fecha must be YYYY-MM-DD"
    return None
