# Importamos as ferramentas necessárias do SQLAlchemy
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

# Criamos uma "Base" que todos os nossos modelos vão usar
Base = declarative_base()

# 1. Tabela de Trabalhadores
class Trabalhador(Base):
    __tablename__ = "trabalhadores" # Nome da tabela no banco

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False) # nullable=False significa que é obrigatório
    cargo = Column(String, nullable=False)
    
    # Relação: Um trabalhador pode ter várias tarefas no Kanban
    tarefas = relationship("TarefaKanban", back_populates="responsavel")

# 2. Tabela de Projetos
class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    descricao = Column(String)
    status = Column(String, default="Em andamento") # Ex: Em andamento, Concluído
    
    # Relação: Um projeto tem várias tarefas no seu Kanban
    tarefas = relationship("TarefaKanban", back_populates="projeto")

# 3. Tabela de Tarefas do Kanban
class TarefaKanban(Base):
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