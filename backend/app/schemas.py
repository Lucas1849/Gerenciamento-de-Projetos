from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from typing import Literal

# Valores permitidos nos campos de ciclo de vida (ADR-003 / ADR-007).
Fase = Literal["kickoff", "andamento", "finalizacao", "ajustes", "concluido"]
StatusEtapa = Literal["nao_iniciada", "em_andamento", "concluida"]


# ---------------------------------------------------------------------------
# Trabalhador
# ---------------------------------------------------------------------------
class TrabalhadorCriar(BaseModel):
    nome: str
    cargo: str
    emailInstitucional: str


class TrabalhadorResposta(BaseModel):
    id: int
    nome: str
    cargo: str
    emailInstitucional: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Professor
# ---------------------------------------------------------------------------
class ProfessorCriar(BaseModel):
    nome: str
    email: Optional[str] = None


class ProfessorResposta(BaseModel):
    id: int
    nome: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Gestao
# ---------------------------------------------------------------------------
class GestaoCriar(BaseModel):
    nome: str
    ativa: bool = False


class GestaoResposta(BaseModel):
    id: int
    nome: str
    ativa: bool

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# EtapaTemplate
# ---------------------------------------------------------------------------
class EtapaTemplateCriar(BaseModel):
    servico_id: int
    ordem: int
    nome: str
    descricao_padrao: Optional[str] = None
    dias_uteis_esperados_padrao: Optional[int] = None


class EtapaTemplateResposta(BaseModel):
    id: int
    servico_id: int
    ordem: int
    nome: str
    descricao_padrao: Optional[str] = None
    dias_uteis_esperados_padrao: Optional[int] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Servico
# ---------------------------------------------------------------------------
class ServicoCriar(BaseModel):
    nome: str
    descricao: Optional[str] = None


class ServicoResposta(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None

    class Config:
        from_attributes = True


class ServicoComEtapasResposta(ServicoResposta):
    etapas_template: List[EtapaTemplateResposta] = []


# ---------------------------------------------------------------------------
# EtapaConsultor
# ---------------------------------------------------------------------------
class EtapaConsultorCriar(BaseModel):
    trabalhador_id: int
    # Se omitida, o backend usa a data de hoje.
    data_entrada: Optional[date] = None


class EtapaConsultorResposta(BaseModel):
    id: int
    etapa_id: int
    trabalhador_id: int
    data_entrada: date
    data_saida: Optional[date] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Etapa
# ---------------------------------------------------------------------------
class EtapaCriar(BaseModel):
    # Etapa adicionada manualmente a um projeto existente.
    projeto_id: int
    ordem: int
    nome: str
    descricao: Optional[str] = None
    dias_uteis_esperados: Optional[int] = None
    data_inicio: Optional[date] = None
    bloco_entrega: Optional[str] = None
    etapa_template_id: Optional[int] = None


class EtapaProjetoCriar(BaseModel):
    """Etapa customizada dentro do payload de criação do projeto (ADR-008).

    A `ordem` não viaja no payload: o backend atribui ordem = índice + 1.
    Itens com o mesmo `bloco_grupo` são materializados como bloco de entrega
    (chave uuid compartilhada em `bloco_entrega`, prazo/data normalizados).
    """

    nome: str
    dias_uteis_esperados: Optional[int] = None
    data_inicio: Optional[date] = None
    # Nulo = etapa adicionada manualmente (fora do template).
    etapa_template_id: Optional[int] = None
    bloco_grupo: Optional[str] = None


class EtapaAtualizar(BaseModel):
    status: StatusEtapa


class EtapaResposta(BaseModel):
    id: int
    projeto_id: int
    etapa_template_id: Optional[int] = None
    ordem: int
    nome: str
    descricao: Optional[str] = None
    dias_uteis_esperados: Optional[int] = None
    data_inicio: Optional[date] = None
    # Derivada: data_inicio + dias úteis (nunca armazenada).
    data_fim: Optional[date] = None
    bloco_entrega: Optional[str] = None
    status: StatusEtapa
    # Equipe embutida: consultores ativos da etapa (data_saida IS NULL).
    consultores: List[TrabalhadorResposta] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Projeto
# ---------------------------------------------------------------------------
class ProjetoCriar(BaseModel):
    nome: str
    descricao: Optional[str] = None
    objetivo: Optional[str] = None
    nome_contratante: Optional[str] = None
    agregados_contratante: Optional[str] = None
    servico_id: int
    gestao_id: int
    fase: Fase = "kickoff"
    tap_assinado: bool = False
    gerente_id: int
    diretor_id: int
    professor_orientador_id: Optional[int] = None
    # Consultores atribuídos a todas as etapas geradas na criação.
    consultores_iniciais_ids: List[int] = []
    # Omitido/None ⇒ cópia literal dos templates do serviço (comportamento
    # padrão). Presente ⇒ criação customizada (ADR-008); lista vazia é inválida.
    etapas: Optional[List[EtapaProjetoCriar]] = Field(default=None, min_length=1)


class BlocoCriar(BaseModel):
    """Formação de bloco de entrega em projeto existente (ADR-009).

    As etapas recebem uma chave uuid compartilhada em `bloco_entrega` e o
    prazo/data informados (redundantes em cada membro; status permanece
    individual por etapa).
    """

    etapa_ids: List[int] = Field(min_length=2)
    dias_uteis_esperados: int
    data_inicio: Optional[date] = None


class ProjetoResposta(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    objetivo: Optional[str] = None
    nome_contratante: Optional[str] = None
    agregados_contratante: Optional[str] = None
    servico_id: int
    gestao_id: int
    fase: Fase
    tap_assinado: bool
    gerente_id: int
    diretor_id: int
    professor_orientador_id: Optional[int] = None

    class Config:
        from_attributes = True


class ProjetoAtualizar(BaseModel):
    fase: Optional[Fase] = None
    tap_assinado: Optional[bool] = None


class ProjetoListaResposta(ProjetoResposta):
    # Card da galeria (Kanban de fases): equipe derivada embutida para os avatares.
    equipe: List[TrabalhadorResposta] = []


class ProjetoDetalheResposta(ProjetoResposta):
    etapas: List[EtapaResposta] = []
    # Equipe derivada: união dos consultores ativos de todas as etapas.
    equipe: List[TrabalhadorResposta] = []
