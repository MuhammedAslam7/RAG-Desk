from cuid2 import Cuid

_cuid = Cuid()


def cuid() -> str:
    """Drop-in for Prisma's default cuid ids."""
    return _cuid.generate()


    