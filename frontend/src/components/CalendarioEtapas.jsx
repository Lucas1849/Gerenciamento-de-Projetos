import NavMes from './NavMes';
import { itensLinhaDoTempo } from './etapasUtils';
import { gradeCalendario, mesDeISO, hojeISO } from './datasUtils';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MAX_CHIPS = 3;

// Visão "Calendário": grade de 7 colunas com chips pontuais em data_inicio (▸)
// e data_fim (✔) — sem spans multi-semana (trade-off registrado no ADR-010).
export default function CalendarioEtapas({ etapas, mes, aoMudarMes }) {
  const hoje = hojeISO();

  // Mapa iso → chips do dia (início e fim de cada etapa avulsa/bloco).
  const chipsPorDia = new Map();
  const adicionar = (iso, chip) => {
    if (!iso) return;
    const { ano, mes: m } = mesDeISO(iso);
    if (ano !== mes.ano || m !== mes.mes) return;
    if (!chipsPorDia.has(iso)) chipsPorDia.set(iso, []);
    chipsPorDia.get(iso).push(chip);
  };
  itensLinhaDoTempo(etapas).forEach(item => {
    adicionar(item.inicio, { key: `${item.key}-ini`, texto: `▸ ${item.nome}`, status: item.status });
    if (item.fim && item.fim !== item.inicio) {
      adicionar(item.fim, { key: `${item.key}-fim`, texto: `✔ ${item.nome}`, status: item.status });
    }
  });

  return (
    <div>
      <NavMes mes={mes} aoMudar={aoMudarMes} />

      <div className="calendario">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="cal-dia-semana">{d}</div>
        ))}
        {gradeCalendario(mes.ano, mes.mes).flat().map((celula, i) =>
          celula === null ? (
            <div key={`vazia-${i}`} className="cal-celula cal-celula--fora" />
          ) : (
            <div key={celula.iso} className={`cal-celula${celula.iso === hoje ? ' cal-celula--hoje' : ''}`}>
              <span className="cal-numero">{celula.dia}</span>
              {(chipsPorDia.get(celula.iso) ?? []).slice(0, MAX_CHIPS).map(chip => (
                <span key={chip.key} className={`cal-chip cal-chip--${chip.status}`} title={chip.texto}>
                  {chip.texto}
                </span>
              ))}
              {(chipsPorDia.get(celula.iso)?.length ?? 0) > MAX_CHIPS && (
                <span className="cal-mais">+{chipsPorDia.get(celula.iso).length - MAX_CHIPS}</span>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
