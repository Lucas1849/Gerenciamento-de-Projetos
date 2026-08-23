# Hardening pré-produção — ajustes finais antes de hospedar

Este documento reúne os riscos de segurança levantados na sondagem de
**12/07/2026** (feita no papel do agente `seguranca-red` desenhado no
[ADR-027](decisoes.md) — vale registrar que **os agentes red/blue não chegaram
a ser criados**; o desenho está em [agentes-seguranca.md](agentes-seguranca.md))
e os passos concretos para colocar o piloto em produção com segurança.

> **Contexto que muda o modelo de ameaça.** O piloto foi construído para
> **rodar local, sem autenticação** — auth real é a Fase 11 (integração com o
> Apoio Hub, ver [roadmap](../features/roadmap.md)). Hospedar a API publicamente
> **antes** da Fase 11 expõe uma superfície sem controle de acesso. Enquanto a
> Fase 11 não chega, o controle central é o **gate de rede** (item 1 abaixo).

## Estado dos achados

| # | Achado | Severidade | Status |
|---|---|---|---|
| 1 | DoS pelos laços de calendário sem teto | Crítico | ✅ **Corrigido** em 12/07/2026 (`MAX_DIAS_UTEIS`, ver abaixo) |
| 2 | Sem autenticação + endpoints destrutivos públicos | Crítico (ao hospedar) | ⚠️ Aberto — mitigar por gate de rede até a Fase 11 |
| 3 | CORS `*` combinado com `allow_credentials=True` | Médio | ⚠️ Aberto — configurar `FRONTEND_ORIGIN` |
| 4 | Swagger `/docs` e artefatos sensíveis expostos | Médio | ⚠️ Aberto — desligar em produção / proteger arquivos |
| 5 | Endpoints de cálculo do **Hub publicado** respondem sem autenticação | Baixo | ℹ️ Observado em 23/08/2026 — **limitado**, ver abaixo |

O achado **1 já foi corrigido no código** (teto `MAX_DIAS_UTEIS = 2000` em
`app/utils/calendario.py`, aplicado nas rotas de `/calendario`, nos schemas de
entrada de dias úteis e reforçado no núcleo; regressão em
`backend/tests/test_seguranca.py`). Os itens **2, 3 e 4 dependem da
configuração de deploy** e estão detalhados abaixo como checklist de execução.

---

## 5. Endpoints de cálculo do Apoio Hub publicado respondem sem sessão (observação, 23/08/2026)

**O que foi observado.** Durante a auditoria de paridade do calendário (registrada em
[gaps-publicacao-hostgator.md](gaps-publicacao-hostgator.md)), o endpoint
`https://apoioconsultoriajunior.com.br/ApoioHub/api/proj_calendario_data_fim.php`
respondeu normalmente a um `GET` feito de um navegador **sem nenhuma sessão no Hub**.
O arquivo (`api/proj_calendario_data_fim.php`) de fato não chama `proj_exigir_editor()`
nem verifica sessão — é um endpoint de cálculo puro, sem acesso a dados.

**Por que a severidade é baixa, e não alta:**

- **Não vaza dado.** O endpoint recebe uma data e um número e devolve outra data. Não toca
  em projeto, etapa, membro ou qualquer registro — só na lib de calendário.
- **O vetor de DoS está capado.** `PROJ_MAX_DIAS_UTEIS = 2000` na lib do Hub é a transcrição
  do mesmo teto que corrigiu o achado 1 deste documento no piloto (12/07/2026). Sem ele,
  esses laços dia-a-dia seriam exatamente o problema já conhecido — **com** ele, o custo por
  requisição é limitado.
- É coerente com a política declarada do Hub, em que **leitura é aberta à empresa inteira**
  por design (`proj_auth_lib.php` exige editor só na escrita).

**O que fica registrado como melhoria, não como correção urgente:** endpoints de cálculo
públicos não precisam vazar nada para merecerem, ainda assim, o mesmo tratamento dos demais
— exigir sessão (não necessariamente `podeEditar`) alinharia a superfície do Hub com a
política de "leitura aberta **à empresa**", que não é o mesmo que "aberta à internet".
Decisão do mantenedor do Hub; não bloqueia a Fase 29.

> **Nota de escopo:** este documento trata do **piloto**. Este achado é do **Hub publicado** e
> entra aqui porque é o único lugar do repo que consolida postura de segurança — a ação, se
> houver, é do lado do Hub.

---

## 2. Sem autenticação + endpoints destrutivos públicos (o risco nº 1 ao hospedar)

**O quê.** A API não tem nenhuma autenticação — é decisão de produto do piloto.
Vários endpoints são destrutivos e irreversíveis sem qualquer barreira:

- `DELETE /projetos/{id}` — cascade: apaga etapas, atribuições de consultores e
  todo o histórico do projeto (`cascade="all, delete-orphan"`, ADR-012).
- `DELETE /gestoes/{id}` — remove a gestão (409 só se ainda houver projetos).
- `DELETE /professores/{id}` — remove o professor orientador.
- `POST`/`PUT`/`PATCH` em todo o domínio — qualquer um cria e altera dados.

No momento em que a porta ficar acessível publicamente, **qualquer pessoa na
internet lê, altera e apaga todos os dados**. Não é um bug de código: é a
consequência de expor um sistema deliberadamente sem auth.

**Ajuste para produção (enquanto a Fase 11 não implementa auth real):**

1. **Não expor a API diretamente.** Colocá-la atrás de um reverse proxy
   (nginx/Caddy/Apache) e **nunca** publicar a porta do uvicorn (8000)
   diretamente.
2. **Gate de rede na borda.** Escolher pelo menos um:
   - **HTTP Basic Auth no proxy** cobrindo todas as rotas (uma credencial
     compartilhada da área já reduz drasticamente a superfície);
   - **Allowlist de IP** (só a rede/VPN da empresa);
   - **VPN** — a API só responde dentro da rede interna.
3. **Bind interno.** Rodar o uvicorn em `127.0.0.1` (só o proxy alcança), nunca
   `0.0.0.0` sem o gate acima.
4. **Registrar a pendência.** A ausência de auth/RBAC é explicitamente da
   **Fase 11** (Hub `nivel_acesso`); este documento é o paliativo até lá. O
   ADR-027 restringe o escopo do "blue" a esse endurecimento de borda — **não**
   a construir a auth (que é a Fase 11).

---

## 3. CORS `*` com `allow_credentials=True`

**O quê.** Em `backend/main.py`, `FRONTEND_ORIGIN` tem default `"*"` e o
middleware usa `allow_credentials=True`:

```python
_origens = [o.strip() for o in os.getenv("FRONTEND_ORIGIN", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=_origens,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```

Wildcard de origem **combinado com credenciais** é uma configuração que o
próprio spec de CORS proíbe (o navegador rejeita requisições credenciadas com
`Access-Control-Allow-Origin: *`). Além de não funcionar como esperado, se
alguém "consertar" refletindo a origem sem restringir, abre compartilhamento
credenciado cross-origin para qualquer site.

**Ajuste para produção:**

1. **Definir `FRONTEND_ORIGIN`** no `.env` de produção com o(s) domínio(s)
   reais do frontend/Hub, separados por vírgula — **nunca** `*`:
   ```
   FRONTEND_ORIGIN=https://hub.apoioconsultoria.com
   ```
2. **Falhar ruidosamente** se ficar em `*` com credenciais: como melhoria de
   código, considerar desligar `allow_credentials` quando a origem for `*`
   (ou recusar subir com essa combinação). O piloto local pode seguir com `*`
   sem credenciais.
3. Restringir `allow_methods`/`allow_headers` ao necessário quando o cliente
   for conhecido (opcional; menor prioridade que a origem).

---

## 4. Swagger `/docs` e artefatos sensíveis expostos

**O quê.**

- O FastAPI serve `/docs`, `/redoc` e `/openapi.json` por padrão, revelando
  **toda a superfície da API** (rotas, parâmetros, schemas) a um visitante não
  autenticado — um mapa pronto para o atacante.
- `piloto_projetos.db` (SQLite com todos os dados) e `.env` (segredos, futura
  `DATABASE_URL` com senha do MySQL) moram em `backend/`. Se o proxy ou o
  servidor de arquivos servir esse diretório por engano, vazam o banco inteiro
  e as credenciais.

**Ajuste para produção:**

1. **Desligar a documentação interativa** (ou protegê-la pelo mesmo gate do
   item 2):
   ```python
   import os
   producao = os.getenv("AMBIENTE") == "producao"
   app = FastAPI(
       title="API de Gestão de Projetos",
       docs_url=None if producao else "/docs",
       redoc_url=None if producao else "/redoc",
       openapi_url=None if producao else "/openapi.json",
   )
   ```
2. **Garantir que só a aplicação é servida.** O reverse proxy deve apontar
   exclusivamente para o uvicorn — nunca servir `backend/` como diretório
   estático. Conferir que `.db`, `.env`, `.env.example` e código-fonte não são
   alcançáveis por URL.
3. **`.env` fora do webroot e no `.gitignore`** (já está no gitignore; conferir
   no deploy). Segredos de produção nunca commitados.
4. **Backups do `.db`** (ou do MySQL, na Fase 11) fora da pasta pública.

---

## Checklist rápido de deploy

- [x] **(1)** Teto `MAX_DIAS_UTEIS` nos laços de calendário — corrigido no código.
- [ ] **(2)** Reverse proxy + gate de rede (Basic Auth / IP allowlist / VPN); uvicorn em `127.0.0.1`.
- [ ] **(3)** `FRONTEND_ORIGIN` = domínio real (nunca `*`) no `.env` de produção.
- [ ] **(4)** `/docs`, `/redoc`, `/openapi.json` desligados em produção; `.db`/`.env` inacessíveis por URL.
- [ ] Rodar `pytest` (inclui `test_seguranca.py`) antes de subir.
- [ ] Registrar que auth/RBAC completo continua sendo a **Fase 11** (gate de rede é paliativo).

> **Nota sobre o achado 1 na primeira subida:** ao ligar os feriados municipais
> (Fase 23) e o teto de dias úteis, projetos com valores fora da faixa passam a
> ser rejeitados na edição. Nenhum dado existente do piloto está fora do teto
> (o catálogo usa prazos pequenos), mas vale conferir após o deploy.
