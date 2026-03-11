import datetime
import decimal

from .uuid import uuid_bytes_to_str


def to_jsonable(value):
    if isinstance(value, (bytes, bytearray, memoryview)):
        return uuid_bytes_to_str(value)
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def dict_to_jsonable(row):
    return {key: to_jsonable(value) for key, value in row.items()}
