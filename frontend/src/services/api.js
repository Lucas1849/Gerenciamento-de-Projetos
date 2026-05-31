// ─── Serviço de API Centralizado ────────────────────────────────────────────
// Todas as chamadas ao backend passam por este módulo.
// Para trocar o endereço do servidor, basta alterar a constante BASE_URL.

const BASE_URL = 'http://127.0.0.1:8000';

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

// ─── Projetos ───────────────────────────────────────────────────────────────

/** Retorna a lista de todos os projetos cadastrados. */
export function listarProjetos() {
  return request('/projetos/');
}

/** Cadastra um novo projeto. */
export function criarProjeto(dados) {
  return request('/projetos/', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

// ─── Tarefas (Kanban) ───────────────────────────────────────────────────────

/** Retorna todas as tarefas de um projeto específico. */
export function listarTarefasDoProjeto(projetoId) {
  return request(`/projetos/${projetoId}/tarefas`);
}

/** Cria uma nova tarefa vinculada a um projeto. */
export function criarTarefa(dados) {
  return request('/tarefas/', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

/** Atualiza o status (coluna) de uma tarefa existente. */
export function atualizarStatusTarefa(tarefaId, coluna_status) {
  return request(`/tarefas/${tarefaId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ coluna_status }),
  });
}
