from pydantic import BaseModel

# 1. Molde para RECEBER dados (O que o frontend vai nos enviar)
class TrabalhadorCriar(BaseModel):
    nome: str
    cargo: str
    emailInstitucional: str

# 2. Molde para DEVOLVER dados (O que o backend responde após salvar, incluindo o ID)
class TrabalhadorResposta(BaseModel):
    id: int
    nome: str
    cargo: str
    emailInstitucional: str

    class Config:
        from_attributes = True # Isso ajuda o FastAPI a converter os dados do banco para enviar ao frontend

# 1. Molde para RECEBER dados do Projeto
class ProjetoCriar(BaseModel):
    nome: str
    descricao: str # Você pode colocar "= None" no final se quiser que a descrição seja opcional
    status: str = "Em andamento"
    # Recebemos apenas os números (IDs) de quem vai trabalhar no projeto
    gerente_id: int
    consultor1_id: int
    consultor2_id: int
    consultor3_id: int

# 2. Molde para DEVOLVER os dados do Projeto
class ProjetoResposta(BaseModel):
    id: int
    nome: str
    descricao: str
    status: str
    gerente_id: int
    consultor1_id: int
    consultor2_id: int
    consultor3_id: int

    class Config:
        from_attributes = True