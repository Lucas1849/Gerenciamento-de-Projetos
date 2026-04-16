from pydantic import BaseModel

# Molde para RECEBER dados (O que o frontend vai nos enviar)
class TrabalhadorCriar(BaseModel):
    nome: str
    cargo: str
    emailInstitucional: str

# Molde para DEVOLVER dados (O que o backend responde após salvar, incluindo o ID)
class TrabalhadorResposta(BaseModel):
    id: int
    nome: str
    cargo: str
    emailInstitucional: str

    class Config:
        from_attributes = True # Isso ajuda o FastAPI a converter os dados do banco para enviar ao frontend

# Molde para RECEBER dados do Projeto
class ProjetoCriar(BaseModel):
    nome: str
    descricao: str # Você pode colocar "= None" no final se quiser que a descrição seja opcional
    status: str = "Em andamento"
    # Novos campos
    tipo_servico: str
    objetivo: str
    nome_contratante: str
    agregados_contratante: str
    kickoff_realizado: str
    tap_assinado: str
    # Recebemos apenas os números (IDs) de quem vai trabalhar no projeto
    gerente_id: int
    consultor1_id: int
    consultor2_id: int
    consultor3_id: int

# Molde para DEVOLVER os dados do Projeto
class ProjetoResposta(BaseModel):
    id: int
    nome: str
    descricao: str
    status: str
    # Novos campos
    tipo_servico: str
    objetivo: str
    nome_contratante: str
    agregados_contratante: str
    kickoff_realizado: str
    tap_assinado: str
    #Equipe principal do projeto
    gerente_id: int
    consultor1_id: int
    consultor2_id: int
    consultor3_id: int

    class Config:
        from_attributes = True

# Molde para CRIAR uma nova tarefa (O Post-it novo)
class TarefaCriar(BaseModel):
    #A situação da tarefa não precisa ser exigida, pois está por defaul como "A fazer"
    titulo: str
    descricao: str
    projeto_id: int
    trabalhador_id: int
    dias_uteis_esperados: int = 1
    bloco_entrega: str = None
    depende_de_id: int = None

# Molde para ATUALIZAR a tarefa
# Quando formos mover a tarefa, o frontend só precisa nos enviar a nova coluna
class TarefaAtualizar(BaseModel):
    coluna_status: str

# Molde para DEVOLVER os dados da Tarefa
class TarefaResposta(BaseModel):
    id: int
    titulo: str
    descricao: str
    coluna_status: str
    projeto_id: int
    trabalhador_id: int
    dias_uteis_esperados: int
    bloco_entrega: str | None = None
    depende_de_id: str | None = None

    class Config:
        from_attributes = True