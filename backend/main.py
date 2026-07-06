"""Entrypoint fino da API: instância, CORS, create_all e routers por domínio."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import banco_de_dados
from app.routes import (
    calendario,
    catalogo,
    colaboradores,
    etapas,
    gestoes,
    professores,
    projetos,
)

# Sem Alembic (ADR-001): o schema é criado/recriado no boot.
banco_de_dados.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API de Gestão de Projetos",
    description="Backend para o piloto do sistema de controle de projetos da consultoria.",
)

# CORS configurável por ambiente (preparação da Fase 11): piloto usa "*";
# em produção, FRONTEND_ORIGIN restringe ao domínio do Hub (lista separada
# por vírgula). O .env é carregado em app.database no import acima.
_origens = [o.strip() for o in os.getenv("FRONTEND_ORIGIN", "*").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origens,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(colaboradores.router)
app.include_router(professores.router)
app.include_router(gestoes.router)
app.include_router(catalogo.router)
app.include_router(projetos.router)
app.include_router(etapas.router)
app.include_router(calendario.router)
