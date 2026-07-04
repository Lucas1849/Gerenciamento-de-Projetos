"""Fixtures de teste: app com banco SQLite descartável (in-memory).

O banco real de desenvolvimento (backend/piloto_projetos.db) nunca é tocado:
- URL_DO_BANCO em app.database é relativa ao cwd, e main.py roda
  Base.metadata.create_all() no import — então mudamos o cwd para um
  diretório temporário ANTES de importar main, para que esse efeito
  colateral crie apenas um arquivo descartável.
- Os testes em si usam um engine in-memory injetado via override de get_db.
"""

import os
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Redireciona o efeito colateral do import de main (create_all no engine
# real, com caminho relativo ao cwd) para um diretório temporário.
_tmpdir = tempfile.mkdtemp(prefix="piloto_test_db_")
os.chdir(_tmpdir)

from main import app  # noqa: E402
from app.models.banco_de_dados import Base  # noqa: E402
from app.utils.db import get_db  # noqa: E402


@pytest.fixture()
def db_session():
    """Sessão sobre um SQLite in-memory novo por teste."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """TestClient com get_db apontando para o banco descartável."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
