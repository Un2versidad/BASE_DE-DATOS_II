from ..utils.validation import sanitize_text, validate_date, validate_name


ALLOWED_ESTADOS = {"Pendiente", "En curso", "Cerrado"}


def validate_expediente_payload(data):
    errors = []
    if not isinstance(data, dict):
        return ["invalid payload"], None

    aseguradora_id = sanitize_text(data.get("aseguradora_id"))
    juzgado_id = sanitize_text(data.get("juzgado_id"))
    abogado = sanitize_text(data.get("abogado"))
    estado = sanitize_text(data.get("estado"))
    fecha = sanitize_text(data.get("fecha"))

    if not aseguradora_id:
        errors.append("aseguradora_id is required")
    if not juzgado_id:
        errors.append("juzgado_id is required")

    name_error = validate_name(abogado, field="abogado", min_len=2, max_len=100)
    if name_error:
        errors.append(name_error)

    if estado not in ALLOWED_ESTADOS:
        errors.append("estado must be Pendiente, En curso, or Cerrado")

    date_error = validate_date(fecha)
    if date_error:
        errors.append(date_error)

    if errors:
        return errors, None

    return errors, {
        "aseguradora_id": aseguradora_id,
        "juzgado_id": juzgado_id,
        "abogado": abogado,
        "estado": estado,
        "fecha": fecha,
    }
