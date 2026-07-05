# Modelo de dados alvo da Fase 1 — ver docs/features/modelo-dados.md e
# docs/arquitetura/decisoes.md (ADR-001 a ADR-007).
#
# Sem Alembic (ADR-001): mudanças de schema aplicam-se apagando
# piloto_projetos.db e deixando Base.metadata.create_all() recriar no boot.

from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

# Base declarativa que liga as classes ORM às tabelas do banco.
Base = declarative_base()
# Alias de compatibilidade com o nome usado no código legado.
BancoDB = Base


# 1. Trabalhador — colaborador da empresa júnior (diretor, gerente, consultor).
class Trabalhador(Base):
    __tablename__ = "trabalhadores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cargo = Column(String, nullable=False)
    emailInstitucional = Column(String, nullable=False)


# 2. Professor — orientador externo à empresa júnior (ADR-004).
class Professor(Base):
    __tablename__ = "professores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, nullable=True)


# 3. Gestao — semestre/ciclo de gestão (ex. "2026.1"), agrupa projetos.
class Gestao(Base):
    __tablename__ = "gestoes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False)
    ativa = Column(Boolean, default=False, nullable=False)

    projetos = relationship("Projeto", back_populates="gestao")


# 4. Servico — catálogo dos serviços da cartela.
# Nasce VAZIO nesta fase (ADR-005); seed é trabalho da Fase 2.
class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False)
    descricao = Column(String, nullable=True)

    etapas_template = relationship(
        "EtapaTemplate", back_populates="servico", order_by="EtapaTemplate.ordem"
    )
    projetos = relationship("Projeto", back_populates="servico")


# 5. EtapaTemplate — molde de etapa por serviço.
# Nasce VAZIO nesta fase (ADR-005).
class EtapaTemplate(Base):
    __tablename__ = "etapas_template"

    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    ordem = Column(Integer, nullable=False)
    nome = Column(String, nullable=False)
    descricao_padrao = Column(String, nullable=True)
    dias_uteis_esperados_padrao = Column(Integer, nullable=True)

    servico = relationship("Servico", back_populates="etapas_template")


# 6. Projeto (reescrito) — ver tabela de campos em modelo-dados.md.
class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    descricao = Column(String, nullable=True)
    objetivo = Column(String, nullable=True)
    nome_contratante = Column(String, nullable=True)
    # Texto livre separado por vírgula (mantido como está).
    agregados_contratante = Column(String, nullable=True)

    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    gestao_id = Column(Integer, ForeignKey("gestoes.id"), nullable=False)

    # Kanban da galeria (ADR-003); independente de Etapa.status.
    # kickoff | andamento | finalizacao | ajustes | concluido
    fase = Column(String, nullable=False, default="kickoff")
    # Marco contratual independente da fase (ADR-007).
    tap_assinado = Column(Boolean, nullable=False, default=False)

    gerente_id = Column(Integer, ForeignKey("trabalhadores.id"), nullable=False)
    diretor_id = Column(Integer, ForeignKey("trabalhadores.id"), nullable=False)
    professor_orientador_id = Column(
        Integer, ForeignKey("professores.id"), nullable=True
    )

    servico = relationship("Servico", back_populates="projetos")
    gestao = relationship("Gestao", back_populates="projetos")
    gerente = relationship("Trabalhador", foreign_keys=[gerente_id])
    diretor = relationship("Trabalhador", foreign_keys=[diretor_id])
    professor_orientador = relationship(
        "Professor", foreign_keys=[professor_orientador_id]
    )

    etapas = relationship(
        "Etapa", back_populates="projeto", order_by="Etapa.ordem"
    )


# 7. Etapa (substitui TarefaKanban) — etapa real de um projeto.
class Etapa(Base):
    __tablename__ = "etapas"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    # Nulo = etapa adicionada manualmente, fora do template.
    etapa_template_id = Column(
        Integer, ForeignKey("etapas_template.id"), nullable=True
    )
    ordem = Column(Integer, nullable=False)  # substitui depende_de_id (ADR-006)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    dias_uteis_esperados = Column(Integer, nullable=True)
    # Data de início prevista; a data final é derivada (data_inicio + dias
    # úteis, feriados nacionais via workalendar) e nunca é armazenada.
    data_inicio = Column(Date, nullable=True)
    # Chave de bloco de entrega (uuid compartilhado entre etapas do mesmo
    # bloco), não um rótulo humano — ver ADR-008.
    bloco_entrega = Column(String, nullable=True)
    # Kanban interno (ADR-003): nao_iniciada | em_andamento | concluida
    status = Column(String, nullable=False, default="nao_iniciada")

    projeto = relationship("Projeto", back_populates="etapas")
    etapa_template = relationship("EtapaTemplate")
    consultores = relationship("EtapaConsultor", back_populates="etapa")


# 8. EtapaConsultor — associação N:N entre Etapa e Trabalhador (ADR-002).
# Soft-delete only: remoção preenche data_saida, nunca apaga a linha.
class EtapaConsultor(Base):
    __tablename__ = "etapa_consultores"

    id = Column(Integer, primary_key=True, index=True)
    etapa_id = Column(Integer, ForeignKey("etapas.id"), nullable=False)
    trabalhador_id = Column(Integer, ForeignKey("trabalhadores.id"), nullable=False)
    data_entrada = Column(Date, nullable=False)
    # NULL = ainda ativo na etapa.
    data_saida = Column(Date, nullable=True)

    etapa = relationship("Etapa", back_populates="consultores")
    trabalhador = relationship("Trabalhador")
