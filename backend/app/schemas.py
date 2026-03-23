# Arquivo: backend/app/schemas.py

from pydantic import BaseModel

# 1. Molde para RECEBER dados (O que o frontend vai nos enviar)
class TrabalhadorCriar(BaseModel):
    nome: str
    cargo: str

# 2. Molde para DEVOLVER dados (O que o backend responde após salvar, incluindo o ID)
class TrabalhadorResposta(BaseModel):
    id: int
    nome: str
    cargo: str

    class Config:
        from_attributes = True # Isso ajuda o FastAPI a converter os dados do banco para enviar ao frontend