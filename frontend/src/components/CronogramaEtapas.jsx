import NavMes from './NavMes';
import { itensLinhaDoTempo, STATUS_LABEL } from './etapasUtils';
import { isoDe, diaDeISO, diasNoMes, ehFimDeSemana, formatarData } from './datasUtils';

// Visão "Cronograma": um CSS grid por mês (coluna de rótulos + 1 por dia),
// barras por gridColumn com clamp nos limites do mês; bloco = barra única
// (prazo/data compartilhados, ADR-009). Comparações por string ISO (UTC).
export default function CronogramaEtapas({ etapas, mes, aoMudarMes }) {
  const { ano, mes: m } = mes;
  const nDias = diasNoMes(ano, m);
  const dias = Array.from({ length: nDias }, (_, i) => i + 1);
  const template = { gridTemplateColumns: `minmax(160px, 200px) repeat(${nDias}, minmax(22px, 1fr))` };

  const itens = itensLinhaDoTempo(etapas);
  const semData = itens.filter(i => !i.inicio);
  const primeiroISO = isoDe(ano, m, 1);
  const ultimoISO = isoDe(ano, m, nDias);
  const noMes = itens.filter(i =>
    i.inicio && i.inicio <= ultimoISO && (i.fim ?? i.inicio) >= primeiroISO
  );

  return (
    <div>
      <NavMes mes={mes} aoMudar={aoMudarMes} />

      <div className="cronograma-wrapper">
        <div className="cronograma">
          <div className="crono-linha crono-header" style={template}>
            <div className="crono-rotulo" />
            {dias.map(d => (
              <div key={d} className={`crono-dia${ehFimDeSemana(ano, m, d) ? ' crono-dia--fds' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {noMes.length === 0 && (
            <p className="crono-vazio">Nenhuma etapa com datas neste mês.</p>
          )}

          {noMes.map(item => {
            const fim = item.fim ?? item.inicio;
            const colIni = item.inicio < primeiroISO ? 1 : diaDeISO(item.inicio);
            const colFim = fim > ultimoISO ? nDias : diaDeISO(fim);
            return (
              <div key={item.key} className="crono-linha" style={template}>
                <div className="crono-rotulo" title={item.nome}>{item.nome}</div>
                {dias.map(d => (
                  <div
                    key={d}
                    className={`crono-cel${ehFimDeSemana(ano, m, d) ? ' crono-cel--fds' : ''}`}
                    style={{ gridColumn: d + 1, gridRow: 1 }}
                  />
                ))}
                <div
                  className={`crono-barra crono-barra--${item.status}`}
                  style={{ gridColumn: `${colIni + 1} / ${colFim + 2}`, gridRow: 1 }}
                  title={`${item.nome} · ${STATUS_LABEL[item.status]} · ${formatarData(item.inicio)}${item.fim ? ` → ${formatarData(item.fim)}` : ''}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {semData.length > 0 && (
        <aside className="sem-data-aside">
          <span className="field-label">Sem data de início</span>
          <ul>
            {semData.map(i => <li key={i.key}>{i.nome}</li>)}
          </ul>
        </aside>
      )}
    </div>
  );
}
