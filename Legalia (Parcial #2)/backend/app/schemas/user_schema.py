from ..utils.validation import sanitize_text, validate_password, validate_username


def validate_user_payload(data):
    errors = []
    if not isinstance(data, dict):
        return ["invalid payload"], None

    username = sanitize_text(data.get("username"))
    password = data.get("password")
    role_id = sanitize_text(data.get("role_id"))

    username_error = validate_username(username)
    if username_error:
        errors.append(username_error)

    password_error = validate_password(password)
    if password_error:
        errors.append(password_error)

    if not role_id:
        errors.append("role_id is required")

    if errors:
        return errors, None

    return errors, {"username": username, "password": password, "role_id": role_id}
