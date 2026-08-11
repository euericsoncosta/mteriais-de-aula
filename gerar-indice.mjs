#!/usr/bin/env node
/**
 * gerar-indice.mjs  (v2)
 *
 * Varre "disciplinas/", normaliza os nomes de pastas e arquivos para URLs
 * seguras (sem acento, sem espaço, minúsculas) e gera o index.html.
 *
 * O nome bonito continua aparecendo na tela: a primeira vez que um item é
 * renomeado, o título original fica guardado em _nomes.json.
 *
 * Rodar duas vezes não muda nada. É seguro repetir.
 *
 * Uso:  node gerar-indice.mjs
 */

import { readdirSync, statSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

/* ------------------------------------------------------------------ */
/* CONFIGURAÇÃO                                                        */
/* ------------------------------------------------------------------ */

const CONFIG = {
  escola: 'E.E.E.P. Lúcia Helena Viana Ribeiro',
  rede: 'SEDUC-CE · Eixo Informação e Comunicação',
  professor: 'Prof. Francisco Ericson Cornélio da Costa',
  cidade: 'Horizonte, Ceará',

  // Troque pelos hexes exatos da paleta que você usa no pptxgenjs.
  cores: {
    tinta: '#12263A',
    papel: '#F7F8FA',
    cartao: '#FFFFFF',
    marca: '#0B4F8A',
    apoio: '#1B9A6B',
    linha: '#DDE3EA',
  },

  pastaRaiz: 'disciplinas',
  saida: 'index.html',
  registro: '_nomes.json',

  extensoes: ['.pdf', '.pptx', '.docx', '.xlsx', '.zip', '.md', '.txt', '.csv'],

  // Arquivos com estes termos no nome NUNCA são publicados nem renomeados.
  bloqueio: [/gabarito/i, /professor/i, /respostas?/i, /docente/i, /_priv/i],
};

/* ------------------------------------------------------------------ */
/* NOMES                                                               */
/* ------------------------------------------------------------------ */

const nomes = existsSync(CONFIG.registro)
  ? JSON.parse(readFileSync(CONFIG.registro, 'utf8'))
  : {};

const bloqueados = [];
const renomeados = [];

function paraSlug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

/**
 * Renomeia no disco, se necessário, e devolve o nome final.
 * Guarda o título original em _nomes.json na primeira vez.
 */
function normalizar(pai, nome, ehPasta) {
  const ext = ehPasta ? '' : extname(nome).toLowerCase();
  const titulo = ehPasta ? nome : basename(nome, extname(nome));
  let alvo = paraSlug(titulo) + ext;

  if (alvo !== nome) {
    let n = 2;
    while (existsSync(join(pai, alvo))) alvo = `${paraSlug(titulo)}-${n++}${ext}`;
    renameSync(join(pai, nome), join(pai, alvo));
    renomeados.push(`${join(pai, nome)}  ->  ${alvo}`);
  }

  const chave = join(pai, alvo);
  if (!nomes[chave]) nomes[chave] = titulo;
  return alvo;
}

const tituloDe = (caminho, alternativo) => nomes[caminho] || alternativo;

const ordenar = (a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });

/* ------------------------------------------------------------------ */
/* LEITURA                                                             */
/* ------------------------------------------------------------------ */

const subpastas = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name);

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function lerArquivos(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .filter((d) => CONFIG.extensoes.includes(extname(d.name).toLowerCase()))
    .filter((d) => {
      const proibido = CONFIG.bloqueio.some((re) => re.test(d.name));
      if (proibido) bloqueados.push(join(dir, d.name));
      return !proibido;
    })
    .map((d) => {
      const arquivo = normalizar(dir, d.name, false);
      const caminho = join(dir, arquivo);
      return {
        titulo: tituloDe(caminho, basename(arquivo, extname(arquivo))),
        tipo: extname(arquivo).slice(1),
        href: caminho,
        tamanho: formatarTamanho(statSync(caminho).size),
      };
    })
    .sort((a, b) => ordenar(a.titulo, b.titulo));
}

function lerMeta(dir) {
  const p = join(dir, '_disciplina.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    console.warn(`  ! _disciplina.json invalido em ${dir}, ignorado`);
    return {};
  }
}

function coletar() {
  if (!existsSync(CONFIG.pastaRaiz)) {
    console.error(`Pasta "${CONFIG.pastaRaiz}/" nao encontrada.`);
    process.exit(1);
  }

  const disciplinas = subpastas(CONFIG.pastaRaiz).map((original) => {
    const pasta = normalizar(CONFIG.pastaRaiz, original, true);
    const dir = join(CONFIG.pastaRaiz, pasta);
    const meta = lerMeta(dir);

    const modulos = subpastas(dir)
      .map((origMod) => {
        const sub = normalizar(dir, origMod, true);
        const dirMod = join(dir, sub);
        return { titulo: tituloDe(dirMod, sub), itens: lerArquivos(dirMod) };
      })
      .filter((m) => m.itens.length > 0)
      .sort((a, b) => ordenar(a.titulo, b.titulo));

    const soltos = lerArquivos(dir);
    if (soltos.length) modulos.unshift({ titulo: 'Materiais gerais', itens: soltos });

    return {
      titulo: meta.titulo || tituloDe(dir, pasta),
      descricao: meta.descricao || '',
      carga: meta.carga || '',
      modulos,
      total: modulos.reduce((n, m) => n + m.itens.length, 0),
    };
  });

  return disciplinas.filter((d) => d.total > 0).sort((a, b) => ordenar(a.titulo, b.titulo));
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(disciplinas) {
  const c = CONFIG.cores;
  const agora = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalArquivos = disciplinas.reduce((n, d) => n + d.total, 0);

  const blocos = disciplinas.map((d, i) => `
      <section class="disciplina" data-busca="${esc((d.titulo + ' ' + d.descricao).toLowerCase())}">
        <header class="disciplina-topo">
          <span class="ordem">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h2>${esc(d.titulo)}</h2>
            <p class="meta">${[d.carga, `${d.total} ${d.total === 1 ? 'arquivo' : 'arquivos'}`].filter(Boolean).map(esc).join(' &middot; ')}</p>
            ${d.descricao ? `<p class="descricao">${esc(d.descricao)}</p>` : ''}
          </div>
        </header>
        ${d.modulos.map((m) => `
        <details class="modulo" open>
          <summary>
            <span class="modulo-nome">${esc(m.titulo)}</span>
            <span class="contagem">${m.itens.length}</span>
          </summary>
          <ul class="arquivos">
            ${m.itens.map((f) => `
            <li data-busca="${esc((f.titulo + ' ' + m.titulo + ' ' + d.titulo).toLowerCase())}">
              <a href="${esc(f.href)}">
                <span class="tipo tipo-${esc(f.tipo)}">${esc(f.tipo)}</span>
                <span class="nome">${esc(f.titulo)}</span>
                <span class="tamanho">${esc(f.tamanho)}</span>
              </a>
            </li>`).join('')}
          </ul>
        </details>`).join('')}
      </section>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Materiais de aula &middot; ${esc(CONFIG.professor)}</title>
<meta name="description" content="Apostilas, slides e exercicios das disciplinas do Eixo Informacao e Comunicacao.">
<style>
  :root{
    --tinta:${c.tinta}; --papel:${c.papel}; --cartao:${c.cartao};
    --marca:${c.marca}; --apoio:${c.apoio}; --linha:${c.linha};
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    margin:0; background:var(--papel); color:var(--tinta);
    font-family:Calibri,Carlito,"Segoe UI",system-ui,-apple-system,sans-serif;
    font-size:17px; line-height:1.5;
  }
  .wrap{max-width:860px; margin:0 auto; padding:0 20px 72px}

  header.topo{background:var(--marca); color:#fff; padding:36px 0 30px; margin-bottom:28px}
  header.topo .wrap{padding-bottom:0}
  .rede{font-size:13px; letter-spacing:.09em; text-transform:uppercase; opacity:.85; margin:0}
  header.topo h1{font-size:30px; line-height:1.15; margin:10px 0 6px; font-weight:700}
  .assinatura{margin:0; font-size:15px; opacity:.92}

  .barra{display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:26px}
  #busca{
    flex:1 1 260px; padding:12px 14px; font:inherit; color:inherit;
    border:1px solid var(--linha); border-radius:8px; background:var(--cartao);
  }
  #busca:focus{outline:3px solid var(--apoio); outline-offset:1px; border-color:var(--apoio)}
  .resumo{font-size:14px; color:#5a6a7a}

  .disciplina{background:var(--cartao); border:1px solid var(--linha); border-radius:12px; padding:22px; margin-bottom:20px}
  .disciplina-topo{display:flex; gap:16px; align-items:flex-start; margin-bottom:14px}
  .ordem{
    flex:0 0 auto; font-size:14px; font-weight:700; color:var(--marca);
    border:2px solid var(--marca); border-radius:8px; padding:6px 9px; line-height:1;
  }
  .disciplina h2{font-size:21px; margin:0 0 3px}
  .meta{margin:0; font-size:13px; color:#5a6a7a; letter-spacing:.02em}
  .descricao{margin:6px 0 0; font-size:15px; color:#40515f}

  .modulo{border-top:1px solid var(--linha); padding:4px 0}
  .modulo summary{
    display:flex; justify-content:space-between; align-items:center; gap:12px;
    cursor:pointer; padding:11px 2px; font-weight:600; list-style:none;
  }
  .modulo summary::-webkit-details-marker{display:none}
  .modulo summary:focus-visible{outline:3px solid var(--apoio); outline-offset:2px; border-radius:6px}
  .modulo-nome::before{content:"\\25B8 "; color:var(--marca)}
  .modulo[open] .modulo-nome::before{content:"\\25BE "}
  .contagem{font-size:12px; font-weight:700; color:#5a6a7a; background:var(--papel); border-radius:999px; padding:3px 9px}

  ul.arquivos{list-style:none; margin:0 0 10px; padding:0}
  ul.arquivos a{
    display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit;
    padding:11px 10px; border-radius:8px; min-height:46px;
  }
  ul.arquivos a:hover{background:var(--papel)}
  ul.arquivos a:focus-visible{outline:3px solid var(--apoio); outline-offset:-2px}
  .tipo{
    flex:0 0 auto; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
    color:#fff; background:#7b8794; border-radius:5px; padding:4px 7px; min-width:48px; text-align:center;
  }
  .tipo-pdf{background:#B3261E}
  .tipo-pptx{background:#C24E1F}
  .tipo-docx{background:var(--marca)}
  .tipo-xlsx{background:var(--apoio)}
  .nome{flex:1 1 auto}
  .tamanho{flex:0 0 auto; font-size:13px; color:#5a6a7a}

  .vazio{display:none; padding:26px 4px; color:#5a6a7a}
  footer{border-top:1px solid var(--linha); margin-top:34px; padding-top:18px; font-size:13px; color:#5a6a7a}
  footer p{margin:3px 0}

  @media (max-width:560px){
    body{font-size:16px}
    header.topo h1{font-size:24px}
    .disciplina{padding:16px}
    .tamanho{display:none}
  }
  @media print{header.topo{background:none; color:var(--tinta)}}
</style>
</head>
<body>
<header class="topo">
  <div class="wrap">
    <p class="rede">${esc(CONFIG.rede)}</p>
    <h1>Materiais de aula</h1>
    <p class="assinatura">${esc(CONFIG.escola)} &middot; ${esc(CONFIG.professor)}</p>
  </div>
</header>

<main class="wrap">
  <div class="barra">
    <input id="busca" type="search" placeholder="Buscar por disciplina, modulo ou arquivo" aria-label="Buscar material">
    <p class="resumo">${disciplinas.length} ${disciplinas.length === 1 ? 'disciplina' : 'disciplinas'} &middot; ${totalArquivos} arquivos</p>
  </div>
${blocos}
  <p class="vazio" id="vazio">Nenhum material corresponde a essa busca. Tente outro termo.</p>
</main>

<footer class="wrap">
  <p>${esc(CONFIG.cidade)} &middot; Atualizado em ${esc(agora)}</p>
  <p>Material de uso didatico. Duvidas sobre os arquivos devem ser tratadas em sala.</p>
</footer>

<script>
(function(){
  var campo = document.getElementById('busca');
  var vazio = document.getElementById('vazio');
  var discs = Array.prototype.slice.call(document.querySelectorAll('.disciplina'));

  campo.addEventListener('input', function(){
    var termo = campo.value.trim().toLowerCase();
    var achou = false;

    discs.forEach(function(d){
      var casaDisc = !termo || d.dataset.busca.indexOf(termo) > -1;
      var visiveis = 0;

      d.querySelectorAll('li').forEach(function(li){
        var ok = casaDisc || li.dataset.busca.indexOf(termo) > -1;
        li.hidden = !ok;
        if (ok) visiveis++;
      });

      d.querySelectorAll('details').forEach(function(m){
        var n = m.querySelectorAll('li:not([hidden])').length;
        m.hidden = n === 0;
        if (termo && n > 0) m.open = true;
      });

      d.hidden = visiveis === 0;
      if (visiveis > 0) achou = true;
    });

    vazio.style.display = achou ? 'none' : 'block';
  });
})();
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* EXECUCAO                                                            */
/* ------------------------------------------------------------------ */

const disciplinas = coletar();

writeFileSync(CONFIG.saida, render(disciplinas), 'utf8');
writeFileSync(CONFIG.registro, JSON.stringify(nomes, null, 2), 'utf8');
writeFileSync('.nojekyll', '');

console.log(`\n[ok] ${CONFIG.saida} gerado`);
disciplinas.forEach((d) => console.log(`  - ${d.titulo}: ${d.modulos.length} modulo(s), ${d.total} arquivo(s)`));

if (renomeados.length) {
  console.log(`\n[renomeado] ${renomeados.length} item(ns) ajustado(s) para URL segura:`);
  renomeados.forEach((r) => console.log(`  - ${r}`));
}

if (bloqueados.length) {
  console.log(`\n[bloqueado] ${bloqueados.length} arquivo(s) NAO publicado(s):`);
  bloqueados.forEach((f) => console.log(`  - ${f}`));
  console.log('  Mova estes arquivos para o repositorio privado do professor.');
}
console.log('');
