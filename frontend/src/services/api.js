// ─── Serviço de API Centralizado ────────────────────────────────────────────
// Todas as chamadas ao backend passam por este módulo.
// O endereço do servidor é configurável por ambiente (preparação da Fase 11):
// defina VITE_API_URL num .env do Vite; sem ela, usa o backend local.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

// ─── Helper interno ─────────────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    // Tenta extrair detalhes do erro retornado pelo FastAPI
    let detalhes;
    try {
      detalhes = await response.json();
    } catch {
      detalhes = await response.text();
    }
    const erro = new Error(
      typeof detalhes === 'string'
        ? detalhes
        : detalhes?.detail || `Erro ${response.status}`
    );
    erro.status = response.status;
    erro.detalhes = detalhes;
    throw erro;
  }

  // DELETEs de exclusão respondem 204 sem corpo.
  if (response.status === 204) return null;
  return response.json();
}

// ─── Trabalhadores (Equipe) ─────────────────────────────────────────────────

/** Retorna a lista de todos os colaboradores cadastrados. */
export function listarTrabalhadores() {
  return request('/trabalhadores/');
}

/** Cadastra um novo colaborador. */
export function criarTrabalhador({ nome, cargo, emailInstitucional }) {
  return request('/trabalhadores/', {
    method: 'POST',
    body: JSON.stringify({ nome, cargo, emailInstitucional }),
  });
}

// ─── Professores ────────────────────────────────────────────────────────────

/** Retorna a lista de professores orientadores. */
export function listarProfessores() {
  return request('/professores/');
}

/** Cadastra um novo professor orientador. */
export function criarProfessor({ nome, email }) {
  return request('/professores/', {
    method: 'POST',
    body: JSON.stringify({ nome, email: email || null }),
  });
}

// ─── Gestões ────────────────────────────────────────────────────────────────

/** Retorna a lista de gestões (ciclos semestrais). */
export function listarGestoes() {
  return request('/gestoes/');
}

/** Cadastra uma nova gestão. */
export function criarGestao({ nome, ativa = false }) {
  return request('/gestoes/', {
    method: 'POST',
    body: JSON.stringify({ nome, ativa }),
  });
}

// ─── Catálogo de Serviços ───────────────────────────────────────────────────

/** Retorna a lista de serviços do catálogo. */
export function listarServicos() {
  return request('/servicos/');
}

/** Retorna um serviço com suas etapas-template. */
export function obterServico(servicoId) {
  return request(`/servicos/${servicoId}`);
}

/** Cadastra um novo serviço no catálogo. */
export function criarServico({ nome, descricao }) {
  return request('/servicos/', {
    method: 'POST',
    body: JSON.stringify({ nome, descricao: descricao || null }),
  });
}

/** Cadastra uma etapa-template vinculada a um serviço. */
export function criarEtapaTemplate(dados) {
  return request('/etapas-template/', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

// ─── Projetos ───────────────────────────────────────────────────────────────

/** Retorna a lista de todos os projetos cadastrados (com fase). */
export function listarProjetos() {
  return request('/projetos/');
}

/** Retorna o detalhe de um projeto (etapas + equipe derivada). */
export function obterProjeto(projetoId) {
  return request(`/projetos/${projetoId}`);
}

/** Cadastra um novo projeto (gera as etapas do template automaticamente). */
export function criarProjeto(dados) {
  return request('/projetos/', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

/** Atualiza fase e/ou tap_assinado de um projeto. */
export function atualizarProjeto(projetoId, dados) {
  return request(`/projetos/${projetoId}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

/** Exclui um projeto em cascata (etapas + histórico de equipe — Fase 9). */
export function excluirProjeto(projetoId) {
  return request(`/projetos/${projetoId}`, { method: 'DELETE' });
}

/** Exclui uma gestão vazia (409 se ainda tiver projetos — Fase 9). */
export function excluirGestao(gestaoId) {
  return request(`/gestoes/${gestaoId}`, { method: 'DELETE' });
}

/** Retorna as etapas de um projeto específico. */
export function listarEtapasDoProjeto(projetoId) {
  return request(`/projetos/${projetoId}/etapas`);
}

/** Forma um bloco de entrega com etapas existentes do projeto (ADR-009). */
export function criarBloco(projetoId, { etapaIds, diasUteis, dataInicio }) {
  return request(`/projetos/${projetoId}/blocos`, {
    method: 'POST',
    body: JSON.stringify({
      etapa_ids: etapaIds,
      dias_uteis_esperados: diasUteis,
      data_inicio: dataInicio || null,
    }),
  });
}

/** Estende um bloco existente com novas etapas (Fase 8): elas adotam o
 *  prazo/data do bloco e mantêm status individual. */
export function estenderBloco(projetoId, chave, etapaIds) {
  return request(`/projetos/${projetoId}/blocos/${chave}/etapas`, {
    method: 'POST',
    body: JSON.stringify({ etapa_ids: etapaIds }),
  });
}

/** Retira uma etapa específica do bloco (Fase 8); com 1 membro restante o
 *  bloco inteiro dissolve. */
export function removerEtapaDoBloco(projetoId, chave, etapaId) {
  return request(`/projetos/${projetoId}/blocos/${chave}/etapas/${etapaId}`, {
    method: 'DELETE',
  });
}

/** Desfaz um bloco de entrega (limpa a chave; membros mantêm prazo/data). */
export function desfazerBloco(projetoId, chave) {
  return request(`/projetos/${projetoId}/blocos/${chave}`, { method: 'DELETE' });
}

/** Reordena as etapas do projeto (Fase 12): lista completa de ids na nova
 *  ordem visual; o backend reatribui ordem = índice + 1. */
export function reordenarEtapas(projetoId, ordemIds) {
  return request(`/projetos/${projetoId}/etapas/ordem`, {
    method: 'PUT',
    body: JSON.stringify({ ordem: ordemIds }),
  });
}

// ─── Calendário ─────────────────────────────────────────────────────────────

/** Prévia da data final (data_inicio + dias úteis, feriados nacionais).
 *  O cálculo vive só no backend — o frontend nunca calcula datas localmente. */
export function calcularDataFim(dataInicio, diasUteis) {
  return request(`/calendario/data-fim?data_inicio=${dataInicio}&dias_uteis=${diasUteis}`);
}

/** Encadeia datas de início por dias úteis (Fase 12): um round-trip resolve a
 *  cascata inteira do editor — o frontend nunca calcula datas localmente. */
export function cascataDatas(dataInicio, diasLista) {
  return request('/calendario/cascata', {
    method: 'POST',
    body: JSON.stringify({ data_inicio: dataInicio, dias: diasLista }),
  });
}

/** Reverse-calendar (Fase 13): dias úteis entre duas datas, inverso exato de
 *  calcularDataFim. Usado ao redimensionar uma barra do cronograma. */
export function contarDiasUteis(dataInicio, dataFim) {
  return request(`/calendario/dias-uteis?data_inicio=${dataInicio}&data_fim=${dataFim}`);
}

// ─── Etapas ─────────────────────────────────────────────────────────────────

/** Edita campos da etapa pós-criação (Fase 12): aplica só os campos enviados;
 *  dias/data de membro de bloco propagam a todos os membros (ADR-009). */
export function atualizarEtapa(etapaId, dados) {
  return request(`/etapas/${etapaId}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

/** Atualiza o status (coluna) de uma etapa. */
export function atualizarStatusEtapa(etapaId, status) {
  return request(`/etapas/${etapaId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/** Cria uma dependência informativa (Fase 13): a etapa fica "bloqueada por"
 *  bloqueadaPorId (nada é reagendado — ADR-015). */
export function criarDependencia(etapaId, bloqueadaPorId) {
  return request(`/etapas/${etapaId}/dependencias`, {
    method: 'POST',
    body: JSON.stringify({ bloqueada_por_id: bloqueadaPorId }),
  });
}

/** Remove uma dependência informativa (Fase 13). */
export function removerDependencia(etapaId, bloqueadaPorId) {
  return request(`/etapas/${etapaId}/dependencias/${bloqueadaPorId}`, {
    method: 'DELETE',
  });
}

/** Vincula um consultor a uma etapa. */
export function adicionarConsultorEtapa(etapaId, trabalhadorId) {
  return request(`/etapas/${etapaId}/consultores`, {
    method: 'POST',
    body: JSON.stringify({ trabalhador_id: trabalhadorId }),
  });
}

/** Remove um consultor da etapa (soft-delete no backend: preenche data_saida). */
export function removerConsultorEtapa(etapaId, trabalhadorId) {
  return request(`/etapas/${etapaId}/consultores/${trabalhadorId}`, {
    method: 'DELETE',
  });
}
