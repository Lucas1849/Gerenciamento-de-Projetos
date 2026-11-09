// Exportação do calendário de kick-off (Fase 28, ADR-033).
//
// O MESMO SVG do preview é serializado e rasterizado num canvas 2× (1440×810 →
// 2880×1620) → PNG. Copiar é por mês (limitação real da área de transferência:
// uma imagem por cópia — ADR-033); baixar é por mês ou tudo num zip store-only
// (PNG já é comprimido). Zero dependência nova.
//
// Fase 32 (ADR-036): a mecânica (fontes/logo embutidos, rasterização, copiar,
// baixar, zip) foi EXTRAÍDA para `exportarSvg.js` — genérica, sem conhecer
// nenhum tema — e reaproveitada pelo cronograma de proposta. Este arquivo só
// aplica a geometria/fontes/logo do calendário à função genérica, preservando
// a assinatura que `GeradorCalendarioKickoff.jsx` já usa.

import { GEO, LOGO_URL, FONTES } from './calendarioKickoffTema';
import {
  embutirFontes as _embutirFontes,
  svgParaPngBlob as _svgParaPngBlob,
  copiarPng,
  baixarBlob,
  zipStore,
} from './exportarSvg';

const ESCALA = 2; // 2× → 2880×1620, cobre o slide do Canva com folga
const FONTS_QUERY = `family=${FONTES.display}&family=Inter:ital,wght@0,400;0,700;1,400`;

export function embutirFontes() {
  return _embutirFontes(FONTS_QUERY);
}

export function svgParaPngBlob(svgEl) {
  return _svgParaPngBlob(svgEl, {
    largura: GEO.largura,
    altura: GEO.altura,
    escala: ESCALA,
    fontsQuery: FONTS_QUERY,
    logoUrl: LOGO_URL,
  });
}

export { copiarPng, baixarBlob, zipStore };
