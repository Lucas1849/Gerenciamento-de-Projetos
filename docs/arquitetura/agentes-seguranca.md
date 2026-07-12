# Agentes de segurança — red team atacante + blue team corretor (estruturação)

Registro do desenho pedido pelo responsável em **11/07/2026**: estruturar um par de agentes de IA (Claude Code) para **endurecer a segurança** do piloto antes de um eventual hospedeiro público — um **agente atacante** (red team) que sonda o servidor onde a aplicação ficaria hospedada em busca de brechas, e um **agente corretor** (blue team) que recebe cada achado do atacante e aplica as correções necessárias, num laço até não sobrar brecha explorável. Complementa [agentes-claude-code.md](agentes-claude-code.md) (roster de agentes de *implementação*): este arquivo é o roster de agentes de *segurança* — quem faz o quê, com quais restrições e **sob quais regras de engajamento**.

> **STATUS: ESTRUTURAÇÃO DOCUMENTADA, NADA EXECUTADO.** Este documento define a arquitetura, os papéis, o protocolo de comunicação e as regras de engajamento dos agentes. **Nenhum agente é criado (`.claude/agents/*.md`) nem executado sem comando direto do responsável** — mesma regra de todas as fases do projeto. As especificações de agente abaixo são **propostas de configuração**, não agentes ativos. ADR correspondente: ADR-027 (proposto).

---

## Premissa e escopo de ameaça

O piloto é **deliberadamente sem autenticação** e projetado para **rodar local** (ver [roadmap.md](../features/roadmap.md) — auth real e migração para o Hub são a Fase 11, gatilhada por acesso ao banco de produção). O pedido do responsável introduz um **contexto novo**: *"o possível servidor onde essa aplicação ficará hospedada"*. Hospedar publicamente uma API sem auth muda radicalmente o modelo de ameaça.

**Regra de ouro do blue team:** as correções **não podem reintroduzir a Fase 11 por atalho** (não é papel desses agentes construir login/RBAC completo — isso é a integração com o Hub, com `nivel_acesso`). O foco é o endurecimento **compatível com o piloto**: controles de rede e transporte, limitação de taxa, robustez de entrada, cabeçalhos de segurança, redução de superfície e higiene de segredos/dependências — e, acima de tudo, **não expor a API sem um gate** (VPN, auth de borda/reverse-proxy, allowlist de IP, ou manter privado). Toda decisão que colida com um ADR existente vira **pergunta ao responsável**, não uma mudança silenciosa (mesma disciplina do [agentes-claude-code.md](agentes-claude-code.md)).

### Autorização (obrigatória, pré-condição de qualquer execução)
- Os agentes só operam contra **hosts que o responsável controla e autoriza explicitamente** — de preferência uma **cópia de staging/local**, nunca produção de terceiros. O provedor de hospedagem pode exigir **autorização prévia de teste de intrusão** — conferir os termos do provedor antes de qualquer varredura ativa.
- **Proibido**: qualquer alvo que não seja do responsável; ataques volumétricos/DoS reais contra infra compartilhada; exfiltração de dados além da prova mínima de conceito; persistir/commitar segredos ou dados pessoais coletados como evidência.
- Este é um exercício **defensivo autorizado** (red team do próprio sistema). Fora desse enquadramento, os agentes não rodam.

---

## Arquitetura: laço red → blue → re-teste

```
┌─────────────────┐   achados     ┌─────────────────┐
│  seguranca-red  │──(relatório)─▶│ seguranca-blue  │
│  (atacante /    │   estruturado │ (corretor /     │
│   pentester)    │◀─(re-teste)───│  defensor)      │
└────────┬────────┘   pede prova  └────────┬────────┘
         │            do fix                │
         │        ┌───────────────────┐     │
         └───────▶│ seguranca-        │◀────┘
                  │ orquestrador      │  dirige o laço, aplica
                  │ (coordenador)     │  as regras de engajamento,
                  └───────────────────┘  decide convergência/parada
```

O **orquestrador** é o "agente que se comunica com o atacante" do pedido: ele recebe o problema encontrado pelo red, encaminha ao blue, e **re-roda o red** para provar que a brecha fechou. O ciclo repete por severidade decrescente até convergir (nenhum achado alto/crítico aberto) ou esgotar o orçamento definido.

### Roster proposto

| Agente | Papel | Faz | **Não** faz | Ferramentas propostas | Modelo |
|---|---|---|---|---|---|
| `seguranca-red` | Red team / pentester (grey-box) | Enumera e sonda a app em execução; reproduz e evidencia cada brecha; escreve achados estruturados | **Não** corrige código; **não** ataca alvos fora do escopo; **não** roda payload destrutivo em produção | `Bash` (curl/httpie, `pip-audit`, `npm audit`, `nmap`/`nikto`/OWASP ZAP **contra host próprio**), `Read`/`Grep`/`Glob` (grey-box no fonte), `WebFetch` | opus |
| `seguranca-blue` | Blue team / corretor | Triagem dos achados; aplica correção mínima e consistente com os ADRs; roda a suíte; documenta o fix | **Não** adiciona auth/RBAC completo (isso é Fase 11); **não** muda comportamento de produto sem aval; **não** ignora achado sem justificativa | `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash` (rodar `pytest`/`lint`/`build`) | opus |
| `seguranca-orquestrador` | Coordenador do laço | Define escopo e regras de engajamento; roda red → passa ao blue → re-roda red; registra rodadas; decide parada | **Não** aplica correção nem ataca diretamente (delega); **não** avança sem autorização do responsável para o alvo | `Task`/`Agent` (dirige os dois), `Read`, `Write` (relatório de rodada) | opus |

Pode-se rodar o par sem um terceiro agente: o **próprio operador humano (ou a sessão principal do Claude Code)** faz o papel de orquestrador, alternando red e blue. O `seguranca-orquestrador` só se justifica se o laço for automatizado — e, mesmo assim, **com aprovação humana obrigatória** antes de qualquer mudança que altere acesso ou apague dado (ver protocolo).

---

## Protocolo de comunicação (formato de achado)

O red e o blue se comunicam por um **relatório estruturado de achados** — sem esse contrato compartilhado, o "atacante fala com o corretor" vira texto livre e o re-teste não fecha o laço. Formato proposto (JSON ou markdown com os mesmos campos), gravado num **local gitignorado** se contiver evidência sensível:

```jsonc
{
  "id": "SEC-001",
  "titulo": "CORS com wildcard permite qualquer origem",
  "severidade": "alta",              // critica | alta | media | baixa | info
  "categoria": "A05 Security Misconfiguration",  // referência OWASP Top 10
  "alvo": "GET /projetos/ (e toda a API)",
  "arquivo": "backend/main.py (CORS) / backend/.env",
  "repro": "curl -H 'Origin: https://evil.example' -I http://ALVO/projetos/ → Access-Control-Allow-Origin: *",
  "evidencia": "<trecho de resposta / captura — sem dados pessoais>",
  "impacto": "site malicioso lê a API do usuário no navegador dele",
  "recomendacao": "fixar FRONTEND_ORIGIN nas origens reais; nunca '*' em produção",
  "status": "aberto",                // aberto | em_correcao | corrigido | verificado | reaberto | aceito
  "fix_ref": null,                    // commit/diff quando o blue corrige
  "rodada": 1
}
```

**Ciclo de vida do achado:**
1. **red** cria o achado (`status: aberto`) com repro + evidência.
2. **orquestrador/humano** prioriza por severidade e encaminha ao **blue**.
3. **blue** corrige (`status: em_correcao → corrigido`, preenche `fix_ref`), rodando `pytest`/`lint`/`build` para não regredir.
4. **red** re-testa exatamente o repro: fecha (`verificado`) ou reabre (`reaberto`) se o fix não cobriu.
5. Achados sem correção viável no piloto são **`aceito`** com justificativa registrada (ex.: "sem auth é decisão de produto — mitigado por gate de rede; auth é Fase 11").

**Regras do protocolo:**
- Segredos, tokens e dados pessoais **nunca** entram na evidência em claro nem são commitados — o relatório com evidência sensível é gitignorado (precedente: `professores_seed.json`, `apoio-hub-columns.csv`).
- Toda mudança do blue que **altere acesso, apague/mova dados ou mude comportamento de produto** exige **aprovação humana explícita** antes de aplicar (categoria "ação irreversível").
- O blue não fecha achado sozinho — só o **red em re-teste** move para `verificado` (separação de papéis evita "corrigi e declarei resolvido").

---

## Superfície do piloto — o que o red deve cobrir (grey-box, ancorado no código)

Enumerado a partir do código real em 11/07/2026 (FastAPI + SQLite + React, sem auth). Serve de **checklist de partida** para o `seguranca-red`, não de lista fechada:

- **Ausência de autenticação/autorização (A01 — a exposição central).** Toda rota é aberta; `DELETE /projetos/{id}` cascateia (apaga etapas/vínculos) e `DELETE /gestoes/{id}` sem qualquer authz — **IDOR/BOLA** por definição: qualquer um com o ID apaga/edita qualquer objeto. **Blue não resolve com auth (Fase 11)** — resolve com **gate de rede/borda** e registra o risco residual.
- **CORS wildcard (A05).** `FRONTEND_ORIGIN` default `*` (documentado no CLAUDE.md / `.env.example`). Fixar nas origens reais em produção.
- **DoS por laço não-limitado no calendário (A05/entrada não validada).** `GET /calendario/data-fim?dias_uteis=N` tem `Query(..., ge=0)` **sem limite superior** — `N` gigante faz `add_working_days` iterar muito; `GET /calendario/dias-uteis` com `data_fim` muito distante faz `contar_dias_uteis` **iterar dia a dia** sem teto. Fix barato: **limite superior** nos parâmetros (`le=...`) alinhado à janela de plausibilidade (ADR-010).
- **Cabeçalhos de segurança e transporte (A05).** Ausência de HSTS/CSP/`X-Content-Type-Options`/`X-Frame-Options`; garantir **HTTPS/TLS** na borda. Fix na camada de hospedagem/reverse-proxy + middleware FastAPI.
- **Sem rate limiting (A04/A05).** Nenhuma limitação de taxa — endpoints de escrita e os laços de calendário são amplificadores. Fix: rate limit no reverse-proxy ou middleware.
- **Superfície exposta indevidamente (A05).** `/docs` (Swagger) e `/openapi.json` abertos, o arquivo `piloto_projetos.db` servido por engano, `.env` acessível, stack traces vazando em erro 500. Red confere o que o host expõe; blue reduz.
- **Injeção (A03).** O ORM (SQLAlchemy) parametriza — risco baixo, mas o red confere se há **SQL cru/string interpolada** e testa injeção nos filtros. **XSS armazenado:** os links de etapa (`nome`/`url`) e campos de texto livre (`servico_interesse`, `observacoes`) são renderizados no frontend; o validador `^https?://` já bloqueia `javascript:` em URL (ADR-021), mas o red testa `nome` com HTML/JS e confere o escaping do React.
- **SSRF (A10).** URLs fornecidas pelo usuário (`documento_url` do termo, `url` de links, Documentos da área) são **armazenadas e abertas no navegador**, não buscadas pelo backend — risco de SSRF baixo hoje; o red confirma que nenhum endpoint faz fetch server-side dessas URLs.
- **Segredos e dependências (A02/A06).** Conferir que `.env` e os datasets gitignorados **não vazaram** no repo público (`git log`/histórico); `pip-audit` e `npm audit` para CVEs em dependências (fastapi, uvicorn, sqlalchemy, pydantic, workalendar, react, vite, @dnd-kit, lucide).
- **Logging/monitoramento (A09).** Sem trilha de acesso; registrar o mínimo para detectar abuso — sem logar dado pessoal.

O blue prioriza os fixes **baratos e sem colisão de produto** primeiro (CORS, limites de query, cabeçalhos, rate limit, audit de deps), e trata a **ausência de auth** como risco de arquitetura a mitigar por rede + documentar como pendência da Fase 11 — não como algo a "consertar" reescrevendo o modelo do piloto.

---

## Ordem de execução proposta (quando/se o responsável autorizar)

1. **Autorização e escopo** — responsável confirma o alvo (idealmente staging/local), o provedor autoriza teste, e o orquestrador registra as regras de engajamento por escrito.
2. **`seguranca-red` — passada de reconhecimento** (grey-box, com o fonte à mão): enumera superfície, roda a checklist acima, produz o relatório inicial de achados por severidade.
3. **`seguranca-blue` — correções por severidade decrescente**: aplica os fixes baratos/sem-colisão, rodando `pytest`/`lint`/`build` a cada um; abre pergunta ao responsável para qualquer fix que colida com ADR/produto (ausência de auth, mudança de comportamento).
4. **`seguranca-red` — re-teste**: reproduz cada achado corrigido; fecha (`verificado`) ou reabre.
5. **Repetir 3–4** até convergir (nenhum alto/crítico aberto) ou esgotar orçamento; achados sem fix viável no piloto ficam `aceito` com justificativa.
6. **Registro final**: sumário das rodadas, achados fechados/aceitos, e as pendências que escalam para a Fase 11 (auth/Hub). Atualizar [decisoes.md](decisoes.md) e [roadmap.md](../features/roadmap.md) com o que virar decisão.

## Regras que atravessam os dois agentes de segurança
- **Só contra alvo autorizado do responsável** — nunca terceiros, nunca produção compartilhada sem OK do provedor; preferir staging/local.
- **Não destrutivo por padrão** — sem DoS real, sem apagar/alterar dado sem aprovação humana explícita; provas de conceito mínimas.
- **Segredos e dados pessoais nunca vazam** — evidência sensível fica em local gitignorado; nada de segredo em commit, log ou relatório em claro.
- **Blue não vira Fase 11** — endurecimento compatível com o piloto; auth/RBAC completo é a integração com o Hub, decisão do responsável.
- **Colisão com ADR ou produto = pergunta, não mudança silenciosa** — mesma disciplina dos agentes de implementação (registrar em `decisoes.md`).
- **Separação de papéis** — quem corrige (blue) não declara resolvido; só o re-teste do red fecha o achado.
- **Nada roda sem comando direto do responsável** — este documento é a estruturação; a execução é uma fase autorizada à parte.
