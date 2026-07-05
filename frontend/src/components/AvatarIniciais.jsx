// ─── Avatar com iniciais ────────────────────────────────────────────────────
// Trabalhador/Professor não têm foto no modelo do piloto: o avatar é um círculo
// com as iniciais e cor determinística derivada do nome (mesma pessoa, mesma cor).

const PALETA = [
  ['#6C5CE7', '#8B7CF7'], // indigo (brand)
  ['#0EA5E9', '#38BDF8'], // azul
  ['#10B981', '#34D399'], // verde
  ['#F59E0B', '#FBBF24'], // âmbar
  ['#EF4444', '#F87171'], // vermelho
  ['#EC4899', '#F472B6'], // rosa
  ['#14B8A6', '#2DD4BF'], // teal
  ['#A855F7', '#C084FC'], // roxo
];

function hashNome(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function AvatarIniciais({ nome, tamanho = 36, title }) {
  const [corA, corB] = PALETA[hashNome(nome || '?') % PALETA.length];
  return (
    <span
      className="avatar-iniciais"
      title={title ?? nome}
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: Math.round(tamanho * 0.38),
        background: `linear-gradient(135deg, ${corA} 0%, ${corB} 100%)`,
      }}
    >
      {iniciais(nome || '?')}
    </span>
  );
}
