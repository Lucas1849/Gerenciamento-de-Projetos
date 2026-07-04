"""Helpers compartilhados de acesso ao banco."""

from app.database import SessionLocal


def get_db():
    """Abre uma sessão do banco por request e garante o fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
