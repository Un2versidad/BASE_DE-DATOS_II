from argon2 import PasswordHasher


_hasher = PasswordHasher()


def hash_password(password):
    return _hasher.hash(password)


def verify_password(password_hash, password):
    return _hasher.verify(password_hash, password)
