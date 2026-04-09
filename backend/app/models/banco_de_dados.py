# Importamos as ferramentas necessárias do SQLAlchemy
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

# Quem faz a conexão entre as classes e a tabela do banco de dados
# Ele utiliza de conceitos como herança por meio de uma síntase Python simples

BancoDB = declarative_base()

# 1. Tabela de Trabalhadores
class Trabalhador(BancoDB):
    # __tablename__ é o nome da tabela que estou criando
    __tablename__ = "trabalhadores"

    #campos obrigatórios = nullable =  False
    #colunas são criadas diretamente com comando Python
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False) 
    cargo = Column(String, nullable=False)
    emailInstitucional = Column(String, nullable=False)
    
    # Relação: Um trabalhador pode ter várias tarefas no Kanban
    tarefas = relationship("TarefaKanban", back_populates="responsavel")

# 2. Tabela de Projetos
class Projeto(BancoDB):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    descricao = Column(String)
    status = Column(String, default="Em andamento") # Ex: Em andamento, Concluído
    
    # 1. Colunas de ID's (Chaves Estrangeiras - Foreing Keys)
    # Relaciona cada colaborador do projeto com seu respectivo ID na tabela
    gerente_id = Column(Integer, ForeignKey("trabalhadores.id"))
    consultor1_id = Column(Integer, ForeignKey("trabalhadores.id"))
    consultor2_id = Column(Integer, ForeignKey("trabalhadores.id"))
    consultor3_id = Column(Integer, ForeignKey("trabalhadores.id"))

    # 2. RELACIONAMENTOS
    # Pega os dados dos ID's relacionados
    gerente = relationship("Trabalhador", foreign_keys=[gerente_id])
    consultor1 = relationship("Trabalhador", foreign_keys=[consultor1_id])
    consultor2 = relationship("Trabalhador", foreign_keys=[consultor2_id])
    consultor3 = relationship("Trabalhador", foreign_keys=[consultor3_id])

    # Relação: Um projeto tem várias tarefas no seu Kanban
    tarefas = relationship("TarefaKanban", back_populates="projeto")

# 3. Tabela de Tarefas do Kanban
class TarefaKanban(BancoDB):
    __tablename__ = "tarefas_kanban"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descricao = Column(String)
    # A coluna do Kanban onde a tarefa está. Ex: "TODO", "DOING", "DONE"
    coluna_status = Column(String, default="TODO")
    
    # Chaves estrangeiras (ligam a tarefa ao projeto e ao trabalhador)
    projeto_id = Column(Integer, ForeignKey("projetos.id"))
    trabalhador_id = Column(Integer, ForeignKey("trabalhadores.id"))

    # Relações inversas para facilitar as buscas
    projeto = relationship("Projeto", back_populates="tarefas")
    responsavel = relationship("Trabalhador", back_populates="tarefas")