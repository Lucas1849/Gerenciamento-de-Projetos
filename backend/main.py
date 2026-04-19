from fastapi import FastAPI, Depends, HTTPException
#Parte fundamental para inicar a comunicação front e back
from fastapi.middleware.cors import CORSMiddleware 
from sqlalchemy.orm import Session
# Importamos nossas configurações e modelos
from app.database import engine, SessionLocal
from app.models import banco_de_dados
from app import schemas

# Cria as tabelas no banco de dados
banco_de_dados.BancoDB.metadata.create_all(bind=engine)

#Essa é a base da aplicação toda
app = FastAPI(
    title="API de Gestão de Projetos",
    description="Backend para o piloto do sistema de controle de projetos da consultoria."
)

# --- CONFIGURAÇÃO DO CORS ---
# Isso permite que o nosso frontend em React converse com o FastAPI sem ser bloqueado pelo navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, colocaríamos apenas o endereço real do site. Aqui "*" libera para testes.
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os verbos (GET, POST, PUT, etc)
    allow_headers=["*"], # Permite qualquer tipo de cabeçalho
)   

# Função auxiliar: Abre uma conexão com o banco de dados e fecha quando terminar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", tags=["Teste"])
def ler_raiz():
    return {"mensagem": "Bem-vindo à API de Gestão de Projetos!"}

# Usamos @app.post porque estamos ENVIANDO dados para o servidor criar algo novo
@app.post("/trabalhadores/", response_model=schemas.TrabalhadorResposta, tags=["Trabalhadores"])
def criar_trabalhador(trabalhador: schemas.TrabalhadorCriar, db: Session = Depends(get_db)):
    """
    Esta rota recebe os dados de um novo trabalhador e salva no banco de dados.
    """
    # 1. Transformamos o 'schema' recebido em um 'model' do banco de dados
    novo_trabalhador = banco_de_dados.Trabalhador(
        nome=trabalhador.nome, 
        cargo=trabalhador.cargo,
        emailInstitucional = trabalhador.emailInstitucional)
    
    # 2. Adicionamos o novo trabalhador na sessão do banco
    db.add(novo_trabalhador)
    
    # 3. Salvamos as alterações no banco de fato (commit)
    db.commit()
    
    # 4. Atualizamos a variável para pegar o ID que o banco gerou automaticamente
    db.refresh(novo_trabalhador)
    
    # 5. Devolvemos os dados do trabalhador criado com sucesso
    return novo_trabalhador

# ROTA PARA CADASTRAR PROJETO
@app.post("/projetos/", response_model=schemas.ProjetoResposta, tags=["Projetos"])
def criar_projeto(projeto: schemas.ProjetoCriar, db: Session = Depends(get_db)):
    """
    Cadastra um novo projeto e vincula o gerente e os consultores usando seus IDs.
    """
    novo_projeto = banco_de_dados.Projeto(
        nome=projeto.nome,
        descricao=projeto.descricao,
        status=projeto.status,
        # Campos personalizados
        tipo_servico=projeto.tipo_servico,
        objetivo=projeto.objetivo,
        nome_contratante=projeto.nome_contratante,
        agregados_contratante=projeto.agregados_contratante,
        kickoff_realizado=projeto.kickoff_realizado,
        tap_assinado=projeto.tap_assinado,
        # Equipe
        gerente_id=projeto.gerente_id,
        consultor1_id=projeto.consultor1_id,
        consultor2_id=projeto.consultor2_id,
        consultor3_id=projeto.consultor3_id
    )
    
    db.add(novo_projeto)
    db.commit()
    db.refresh(novo_projeto)
    return novo_projeto

#Visualizar trabalhadores cadastrados
@app.get("/trabalhadores/", response_model=list[schemas.TrabalhadorResposta], tags=["Trabalhadores"])
def listar_trabalhadores(db: Session = Depends(get_db)):
    """
    Retorna a lista de todos os colaboradores cadastrados para o frontend.
    """
    trabalhadores = db.query(banco_de_dados.Trabalhador).all()
    return trabalhadores

# ROTA PARA LISTAR TODOS OS PROJETOS
@app.get("/projetos/", response_model=list[schemas.ProjetoResposta], tags=["Projetos"])
def listar_projetos(db: Session = Depends(get_db)):
    """
    Busca no banco de dados e retorna uma lista com todos os projetos cadastrados.
    """
    # O db.query busca tudo que está na tabela Projeto
    projetos = db.query(banco_de_dados.Projeto).all()
    return projetos

# --- ROTAS DO KANBAN ---

# ROTA 1: CRIAR TAREFA
@app.post("/tarefas/", response_model=schemas.TarefaResposta,tags=["Tarefas"])
def criar_tarefa(tarefa: schemas.TarefaCriar, db: Session = Depends(get_db)):
    """
    Cria uma nova tarefa e a vincula a um projeto e a um responsável.
    Ela nasce automaticamente na coluna 'TODO'.
    """
    nova_tarefa = banco_de_dados.TarefaKanban(
        titulo = tarefa.titulo,
        descricao = tarefa.descricao,
        projeto_id = tarefa.projeto_id,
        trabalhador_id = tarefa.trabalhador_id,
        dias_uteis_esperados = tarefa.dias_uteis_esperados,
        bloco_entrega = tarefa.bloco_entrega,
        depende_de_id = tarefa.depende_de_id
    )
    
    db.add(nova_tarefa)
    db.commit()
    db.refresh(nova_tarefa)
    return nova_tarefa

# ROTA 2: ATUALIZAR STATUS DA TAREFA (MOVER NO KANBAN)
@app.put("/tarefas/{tarefa_id}/status", response_model=schemas.TarefaResposta, tags=["Tarefas"])
def atualizar_status_tarefa(tarefa_id: int, atualizacao: schemas.TarefaAtualizar, db: Session = Depends(get_db)):
    """
    Recebe o ID de uma tarefa na URL e o novo status no corpo (ex: 'DOING', 'DONE').
    Atualiza a coluna em que a tarefa se encontra.
    """
    # 1. O servidor procura a tarefa específica no banco de dados usando o ID
    tarefa_salva = db.query(banco_de_dados.TarefaKanban).filter(banco_de_dados.TarefaKanban.id == tarefa_id).first()

    # 2. Se a tarefa não existir, retornamos um erro claro
    if not tarefa_salva:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    # 3. Se existir, nós trocamos a coluna antiga pela nova que o frontend enviou
    tarefa_salva.coluna_status = atualizacao.coluna_status

    # 4. Salvamos as alterações
    db.commit()
    db.refresh(tarefa_salva)

    return tarefa_salva

# Rota 3 - Visualizar as tarefas de acordo com seu respectivo projeto
@app.get("/projetos/{projeto_id}/tarefas", response_model=list[schemas.TarefaResposta], tags=["Projetos"])
def listar_tarefas_do_projeto(projeto_id: int, db: Session = Depends(get_db)):
    """
    Recebe o ID do projeto pela URL e busca apenas as tarefas (post-its)
    que pertencem a ele.
    """
    # Usamos o .filter() para dizer ao SQLAlchemy: 
    # "Traga as tarefas ONDE a coluna projeto_id seja igual ao número que veio na URL"
    tarefas = db.query(banco_de_dados.TarefaKanban).filter(
        banco_de_dados.TarefaKanban.projeto_id == projeto_id
    ).all()
    
    return tarefas