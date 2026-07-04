"""Entrypoint fino da API: instância, CORS, create_all e routers por domínio."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import banco_de_dados
from app.routes import (
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # piloto sem autenticação; restringir em produção
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
