# Arquivo: backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Definimos o endereço do banco de dados. 
# Para o piloto, usaremos o SQLite, que cria um arquivo chamado 'piloto_projetos.db' na sua pasta.
# No futuro, no HostGator, mudaremos apenas esta linha para algo como: "mysql://usuario:senha@localhost/nome_do_banco"
URL_DO_BANCO = "sqlite:///./piloto_projetos.db"

# 2. O 'engine' é o motor que faz a comunicação real com o banco de dados
engine = create_engine(
    URL_DO_BANCO, 
    # check_same_thread=False é uma configuração necessária apenas para o SQLite funcionar bem com o FastAPI
    connect_args={"check_same_thread": False} 
)

# 3. SessionLocal é a nossa "sessão" de trabalho. Toda vez que formos salvar ou buscar algo, usaremos uma sessão.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)