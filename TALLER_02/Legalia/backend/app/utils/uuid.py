import uuid

import uuid6


def uuid7_bytes():
    return uuid6.uuid7().bytes


def uuid_str_to_bytes(value):
    if value is None:
        return None
    if isinstance(value, (bytes, bytearray)):
        return bytes(value)
    if isinstance(value, memoryview):
        return value.tobytes()
    return uuid.UUID(str(value)).bytes


def uuid_bytes_to_str(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, memoryview):
        value = value.tobytes()
    return str(uuid.UUID(bytes=bytes(value)))
