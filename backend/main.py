# Arquivo: backend/main.py

from fastapi import FastAPI, Depends
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

# Função auxiliar: Abre uma conexão com o banco de dados e fecha quando terminar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#Respectivo método HTTP para conversar Front com Back ---> Apenas para testes inicias com o Fast API
@app.get("/")
def ler_raiz():
    return {"mensagem": "Bem-vindo à API de Gestão de Projetos!"}

# --- NOVA ROTA: CADASTRAR TRABALHADOR ---
# Usamos @app.post porque estamos ENVIANDO dados para o servidor criar algo novo
@app.post("/trabalhadores/", response_model=schemas.TrabalhadorResposta)
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
@app.post("/projetos/", response_model=schemas.ProjetoResposta)
def criar_projeto(projeto: schemas.ProjetoCriar, db: Session = Depends(get_db)):
    """
    Cadastra um novo projeto e vincula o gerente e os consultores usando seus IDs.
    """
    novo_projeto = banco_de_dados.Projeto(
        nome=projeto.nome,
        descricao=projeto.descricao,
        status=projeto.status,
        gerente_id=projeto.gerente_id,
        consultor1_id=projeto.consultor1_id,
        consultor2_id=projeto.consultor2_id,
        consultor3_id=projeto.consultor3_id
    )
    
    db.add(novo_projeto)
    db.commit()
    db.refresh(novo_projeto)
    return novo_projeto

# ROTA PARA LISTAR TODOS OS PROJETOS
@app.get("/projetos/", response_model=list[schemas.ProjetoResposta])
def listar_projetos(db: Session = Depends(get_db)):
    """
    Busca no banco de dados e retorna uma lista com todos os projetos cadastrados.
    """
    # O db.query busca tudo que está na tabela Projeto
    projetos = db.query(banco_de_dados.Projeto).all()
    return projetos