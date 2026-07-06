import { useState, useEffect, useCallback } from 'react';
import { SquareKanban, Table2, ChartGantt, CalendarDays } from 'lucide-react';
import KanbanEtapas from './KanbanEtapas';
import TabelaEtapas from './TabelaEtapas';
import CronogramaEtapas from './CronogramaEtapas';
import CalendarioEtapas from './CalendarioEtapas';
import ModalEditarEtapa from './ModalEditarEtapa';
import { mesDeISO, hojeISO } from './datasUtils';
import {
  listarEtapasDoProjeto,
  listarTrabalhadores,
  atualizarStatusEtapa,
  adicionarConsultorEtapa,
  removerConsultorEtapa,
} from '../services/api';

const VISOES = [
  { id: 'kanban',     rotulo: 'Por status', Icone: SquareKanban },
  { id: 'tabela',     rotulo: 'Tabela',     Icone: Table2 },
  { id: 'cronograma', rotulo: 'Cronograma', Icone: ChartGantt },
  { id: 'calendario', rotulo: 'Calendário', Icone: CalendarDays },
];

// Container da aba Etapas: busca etapas + colaboradores uma vez e concentra os
// handlers compartilhados pelas quatro visões. A visão ativa não persiste entre
// navegações (useState local — trade-off registrado no ADR-010).
export default function EtapasProjeto({ projetoId, toast }) {
  const [etapas, setEtapas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [visao, setVisao] = useState('kanban');
  // Mês exibido, compartilhado entre Cronograma e Calendário.
  const [mesExibido, setMesExibido] = useState(mesDeISO(hojeISO()));
  // Ids da etapa/bloco em edição no modal (Fase 12); os membros são derivados
  // de `etapas` a cada render para o modal não segurar snapshot desatualizado.
  const [edicaoIds, setEdicaoIds] = useState(null);

  const recarregar = useCallback(() => {
    return listarEtapasDoProjeto(projetoId)
      .then(novas => { setEtapas(novas); return novas; })
      .catch(() => { toast.error('Erro ao carregar as etapas do projeto.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  useEffect(() => {
    if (!projetoId) return;
    recarregar().then(novas => {
      if (!novas) return;
      // Mês inicial = mês do menor data_inicio (fallback: mês atual).
      const inicios = novas.map(e => e.data_inicio).filter(Boolean).sort();
      if (inicios.length > 0) setMesExibido(mesDeISO(inicios[0]));
    });
    listarTrabalhadores()
      .then(setColaboradores)
      .catch(() => toast.error('Erro ao carregar a equipe.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const moverEtapa = (etapaId, novoStatus) => {
    atualizarStatusEtapa(etapaId, novoStatus)
      .then(etapaAtualizada => {
        setEtapas(prev => prev.map(e => (e.id === etapaId ? etapaAtualizada : e)));
      })
      .catch(() => toast.error('Erro ao mover a etapa.'));
  };

  const adicionarConsultor = (etapaId, trabalhadorId) => {
    adicionarConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor adicionado à etapa.');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao adicionar consultor.'));
  };

  const removerConsultor = (etapaId, trabalhadorId) => {
    removerConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor removido da etapa.');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao remover consultor.'));
  };

  // Abre o modal de edição para a etapa avulsa ou para todo o bloco (Fase 12).
  const abrirEdicao = (membros) => setEdicaoIds(membros.map(m => m.id));

  const membrosEdicao = edicaoIds
    ? etapas.filter(e => edicaoIds.includes(e.id))
    : [];

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700 }}>
          Etapas do Projeto
        </h2>
      </div>

      <div className="subnav" role="tablist" aria-label="Visualização das etapas">
        {VISOES.map(v => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={visao === v.id}
            className={`subnav-pill${visao === v.id ? ' active' : ''}`}
            onClick={() => setVisao(v.id)}
          >
            <v.Icone size={15} />
            {v.rotulo}
          </button>
        ))}
      </div>

      {visao === 'kanban' && (
        <KanbanEtapas
          projetoId={projetoId}
          etapas={etapas}
          colaboradores={colaboradores}
          toast={toast}
          aoMover={moverEtapa}
          aoAdicionar={adicionarConsultor}
          aoRemover={removerConsultor}
          aoEditar={abrirEdicao}
          recarregar={recarregar}
        />
      )}
      {visao === 'tabela' && (
        <TabelaEtapas etapas={etapas} aoMover={moverEtapa} aoEditar={abrirEdicao} />
      )}
      {visao === 'cronograma' && (
        <CronogramaEtapas etapas={etapas} mes={mesExibido} aoMudarMes={setMesExibido} />
      )}
      {visao === 'calendario' && (
        <CalendarioEtapas etapas={etapas} mes={mesExibido} aoMudarMes={setMesExibido} />
      )}

      {edicaoIds && membrosEdicao.length > 0 && (
        <ModalEditarEtapa
          projetoId={projetoId}
          membros={membrosEdicao}
          etapas={etapas}
          toast={toast}
          aoFechar={() => setEdicaoIds(null)}
          aoSalvo={() => { setEdicaoIds(null); recarregar(); }}
        />
      )}
    </div>
  );
}
