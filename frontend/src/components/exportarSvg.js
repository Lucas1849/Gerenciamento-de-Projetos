// ─── Exportação genérica de página SVG → PNG (Fase 32, ADR-036) ────────────
// Extraído de `calendarioKickoffExport.js` (Fase 28, ADR-033): o MESMO SVG do
// preview é serializado, tem fontes/logo embutidos (recursos externos não
// rasterizam) e é desenhado num canvas na escala pedida → PNG. Copiar é por
// página (limite real da área de transferência — uma imagem por cópia);
// baixar é por página ou "tudo" num zip store-only (PNG já é comprimido, sem
// dependência nova). Genérico: usado pelo calendário de kick-off (Fase 28) e
// pelo cronograma de proposta (Fase 32) — cada chamador passa sua própria
// geometria/fontes/logo; este módulo não conhece nenhum tema.

function paraBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ── Fontes embutidas (@font-face data-URI) ──────────────────────────────────
// Busca o CSS do Google Fonts para a query pedida e troca cada url() pelo
// woff2 em base64. Cacheado por query. Falha (offline) devolve '' —
// degradação honesta para a fonte de sistema, não erro.
const _fontesCache = new Map();
export function embutirFontes(googleFontsQuery) {
  if (!googleFontsQuery) return Promise.resolve('');
  if (_fontesCache.has(googleFontsQuery)) return _fontesCache.get(googleFontsQuery);
  const url = `https://fonts.googleapis.com/css2?${googleFontsQuery}&display=swap`;
  const promessa = (async () => {
    try {
      const css = await fetch(url).then(r => r.text());
      const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m => m[1]);
      let out = css;
      for (const u of [...new Set(urls)]) {
        const buf = await fetch(u).then(r => r.arrayBuffer());
        out = out.split(u).join(`data:font/woff2;base64,${paraBase64(buf)}`);
      }
      return out;
    } catch {
      return '';
    }
  })();
  _fontesCache.set(googleFontsQuery, promessa);
  return promessa;
}

// ── Logo embutido (data-URI), opcional ──────────────────────────────────────
const _logoCache = new Map();
function logoDataUri(url) {
  if (!url) return Promise.resolve(null);
  if (_logoCache.has(url)) return _logoCache.get(url);
  const promessa = fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => `data:image/svg+xml;base64,${paraBase64(buf)}`)
    .catch(() => null);
  _logoCache.set(url, promessa);
  return promessa;
}

// ── SVG → PNG blob ──────────────────────────────────────────────────────────
export async function svgParaPngBlob(svgEl, { largura, altura, escala = 2, fontsQuery, logoUrl } = {}) {
  const [estiloFontes, logo] = await Promise.all([embutirFontes(fontsQuery), logoDataUri(logoUrl)]);

  const clone = svgEl.cloneNode(true);
  if (estiloFontes) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = estiloFontes;
    clone.insertBefore(style, clone.firstChild);
  }
  if (logo) {
    clone.querySelectorAll('image').forEach(img => {
      img.setAttribute('href', logo);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', logo);
    });
  }
  clone.setAttribute('width', largura);
  clone.setAttribute('height', altura);

  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const img = new Image();
  img.decoding = 'sync';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Falha ao rasterizar o SVG'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falhou'))), 'image/png');
  });
}

// ── Copiar / baixar ─────────────────────────────────────────────────────────
export async function copiarPng(blob) {
  // Uma imagem por cópia — limitação da área de transferência (ADR-033).
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Cópia de imagem indisponível neste navegador (use HTTPS).');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Zip store-only (sem dependência) ────────────────────────────────────────
// PNG já é comprimido → método 0 (store). Escreve local file headers + central
// directory + CRC32. Suficiente para o "Baixar todos" (ADR-033).
const _crcTabela = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = _crcTabela[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const a of arrs) { out.set(a, p); p += a.length; }
  return out;
}

export async function zipStore(arquivos) {
  // arquivos: [{ nome, blob }]
  const enc = new TextEncoder();
  const entradas = [];
  for (const { nome, blob } of arquivos) {
    const dados = new Uint8Array(await blob.arrayBuffer());
    entradas.push({ nome: enc.encode(nome), dados, crc: crc32(dados) });
  }

  const partes = [];
  const central = [];
  let offset = 0;

  const u16 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

  for (const e of entradas) {
    const header = concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.dados.length), u32(e.dados.length),
      u16(e.nome.length), u16(0), e.nome
    );
    partes.push(header, e.dados);
    central.push(concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.dados.length), u32(e.dados.length),
      u16(e.nome.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), e.nome
    ));
    offset += header.length + e.dados.length;
  }

  const centralBytes = concat(...central);
  const fim = concat(
    u32(0x06054b50), u16(0), u16(0), u16(entradas.length), u16(entradas.length),
    u32(centralBytes.length), u32(offset), u16(0)
  );
  return new Blob([...partes, centralBytes, fim], { type: 'application/zip' });
}
