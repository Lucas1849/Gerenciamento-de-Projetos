import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Carrega o .env do diretório backend/ (se existir); variáveis já definidas
# no ambiente têm precedência.
load_dotenv()

# Endereço do banco, configurável por ambiente (preparação da Fase 11).
# Piloto: SQLite local (default). Produção (HostGator/Hub): apontar
# DATABASE_URL para o MySQL/MariaDB, ex. "mysql://usuario:senha@localhost/db".
URL_DO_BANCO = os.getenv("DATABASE_URL", "sqlite:///./piloto_projetos.db")

# check_same_thread=False é necessário apenas para o SQLite com FastAPI;
# outros bancos não aceitam esse argumento.
_connect_args = (
    {"check_same_thread": False} if URL_DO_BANCO.startswith("sqlite") else {}
)

# O 'engine' faz a comunicação real com o banco de dados.
engine = create_engine(URL_DO_BANCO, connect_args=_connect_args)

# SessionLocal é a "sessão" de trabalho usada para salvar/buscar dados.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
