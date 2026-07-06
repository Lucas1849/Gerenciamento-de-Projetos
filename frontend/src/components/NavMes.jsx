import { ChevronLeft, ChevronRight } from 'lucide-react';
import { rotuloMes, mesAnterior, mesSeguinte, mesDeISO, hojeISO } from './datasUtils';

// Header ‹ mês › + "Hoje", compartilhado entre Cronograma e Calendário.
// O mês exibido vive no container (EtapasProjeto) para as duas visões andarem juntas.
export default function NavMes({ mes, aoMudar }) {
  return (
    <div className="nav-mes">
      <button type="button" className="nav-mes-btn" aria-label="Mês anterior" onClick={() => aoMudar(mesAnterior(mes))}>
        <ChevronLeft size={16} />
      </button>
      <span className="nav-mes-rotulo">{rotuloMes(mes.ano, mes.mes)}</span>
      <button type="button" className="nav-mes-btn" aria-label="Mês seguinte" onClick={() => aoMudar(mesSeguinte(mes))}>
        <ChevronRight size={16} />
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => aoMudar(mesDeISO(hojeISO()))}>
        Hoje
      </button>
    </div>
  );
}
