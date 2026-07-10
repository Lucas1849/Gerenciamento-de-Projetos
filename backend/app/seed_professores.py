"""Seed dos professores orientadores (Fase 21, ADR-023).

Popula Professor com o corpo docente da FAGEN, no mesmo espírito do catálogo
(ADR-005): as planilhas da área são a fonte, este script apenas carrega a
transcrição — Controle Aplicação.xlsx (nome/e-mail canônicos + alinhamento)
cruzada com a Pesquisa Projeto IES (interesses, interesse em orientar,
observações), crosswalk de grafias resolvido manualmente em 10/07/2026. A
pesquisa prevalece sobre o alinhamento da Controle (decisão do responsável,
09/07/2026).

O dataset real vive em app/dados/professores_seed.json, que é GITIGNORADO —
contém dados pessoais e o repositório é público. O formato está documentado
no professores_seed.exemplo.json commitado; o arquivo real é distribuído
fora do git (OneDrive da área).

Idempotente: professores já existentes (por nome) são pulados. Rodar de
`backend/` com:

    python -m app.seed_professores
"""

import json
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.banco_de_dados import Base, Professor

ARQUIVO_DADOS = Path(__file__).parent / "dados" / "professores_seed.json"


def carregar_dataset(caminho: Path = ARQUIVO_DADOS) -> list[dict]:
    """Lê o dataset transcrito; falha com instrução clara se ele não existir."""
    if not caminho.exists():
        raise FileNotFoundError(
            f"Dataset não encontrado: {caminho}\n"
            "O professores_seed.json real não é versionado (dados pessoais, "
            "repo público) — copie-o do OneDrive da área para app/dados/. "
            "O formato está em professores_seed.exemplo.json."
        )
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)["professores"]


def executar_seed(db: Session, professores: list[dict]) -> tuple[int, int]:
    """Insere os professores que ainda não existem (por nome). Retorna
    (criados, pulados)."""
    existentes = {nome for (nome,) in db.query(Professor.nome).all()}
    criados = pulados = 0
    for p in professores:
        if p["nome"] in existentes:
            pulados += 1
            continue
        db.add(Professor(
            nome=p["nome"],
            email=p.get("email"),
            servico_interesse=p.get("servico_interesse"),
            contato=p.get("contato"),
            observacoes=p.get("observacoes"),
            interesse_orientar=p.get("interesse_orientar"),
        ))
        criados += 1
    db.commit()
    return criados, pulados


def main() -> None:
    try:
        professores = carregar_dataset()
    except FileNotFoundError as erro:
        print(erro)
        sys.exit(1)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        criados, pulados = executar_seed(db, professores)
    finally:
        db.close()
    print(f"Seed de professores: {criados} criado(s), {pulados} pulado(s) (já existiam).")


if __name__ == "__main__":
    main()
