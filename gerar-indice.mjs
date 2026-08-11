#!/usr/bin/env node
/**
 * gerar-indice.js
 * Varre a pasta "disciplinas/" e gera o index.html do portal de materiais.
 *
 * Convenção de pastas:
 *   disciplinas/
 *     Lógica de Programação/
 *       _disciplina.json            (opcional: titulo, descricao, carga)
 *       Módulo 01 - Introdução/
 *         apostila.pdf
 *         slides.pdf
 *       Módulo 02 - Variáveis/
 *         ...
 *
 * Uso:  node gerar-indice.js
 */

import {
  readdirSync,
  statSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join, extname, basename } from "node:path";

/* ------------------------------------------------------------------ */
/* CONFIGURAÇÃO                                                        */
/* ------------------------------------------------------------------ */

const CONFIG = {
  escola: "E.E.E.P. Lúcia Helena Viana Ribeiro",
  rede: "SEDUC-CE · Eixo Informação e Comunicação",
  professor: "Prof. Francisco Ericson Cornélio da Costa",
  cidade: "Horizonte, Ceará",

  // Troque pelos hexes exatos que você já usa nos scripts do pptxgenjs.
  cores: {
    tinta: "#12263A", // texto principal
    papel: "#F7F8FA", // fundo
    cartao: "#FFFFFF", // fundo dos blocos
    marca: "#0B4F8A", // cor institucional principal
    apoio: "#1B9A6B", // destaque secundário
    linha: "#DDE3EA", // bordas
  },

  pastaRaiz: "disciplinas",
  saida: "index.html",

  // Extensões publicadas. Qualquer outra coisa é ignorada.
  extensoes: [".pdf", ".pptx", ".docx", ".xlsx", ".zip", ".md", ".txt", ".csv"],

  // Trava de segurança: arquivos com estes termos NÃO são publicados.
  bloqueio: [/gabarito/i, /professor/i, /respostas?/i, /docente/i, /_priv/i],
};

/* ------------------------------------------------------------------ */

const bloqueados = [];

const ordenar = (a, b) =>
  a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });

const pastas = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."),
    )
    .map((d) => d.name)
    .sort(ordenar);

function arquivos(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (d) => d.isFile() && !d.name.startsWith(".") && !d.name.startsWith("_"),
    )
    .filter((d) => CONFIG.extensoes.includes(extname(d.name).toLowerCase()))
    .filter((d) => {
      const proibido = CONFIG.bloqueio.some((re) => re.test(d.name));
      if (proibido) bloqueados.push(join(dir, d.name));
      return !proibido;
    })
    .map((d) => {
      const caminho = join(dir, d.name);
      const st = statSync(caminho);
      return {
        nome: basename(d.name, extname(d.name)),
        tipo: extname(d.name).slice(1).toLowerCase(),
        href: caminho.split("/").map(encodeURIComponent).join("/"),
        tamanho: formatarTamanho(st.size),
        data: st.mtime,
      };
    })
    .sort((a, b) => ordenar(a.nome, b.nome));
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function lerMeta(dir) {
  const p = join(dir, "_disciplina.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    console.warn(`  ! _disciplina.json inválido em ${dir}, ignorado`);
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* LEITURA                                                             */
/* ------------------------------------------------------------------ */

function coletar() {
  if (!existsSync(CONFIG.pastaRaiz)) {
    console.error(
      `Pasta "${CONFIG.pastaRaiz}/" não encontrada. Crie-a e coloque as disciplinas dentro.`,
    );
    process.exit(1);
  }

  return pastas(CONFIG.pastaRaiz)
    .map((nomeDisc) => {
      const dirDisc = join(CONFIG.pastaRaiz, nomeDisc);
      const meta = lerMeta(dirDisc);

      const modulos = pastas(dirDisc)
        .map((nomeMod) => ({
          nome: nomeMod,
          itens: arquivos(join(dirDisc, nomeMod)),
        }))
        .filter((m) => m.itens.length > 0);

      const soltos = arquivos(dirDisc);
      if (soltos.length)
        modulos.unshift({ nome: "Materiais gerais", itens: soltos });

      return {
        titulo: meta.titulo || nomeDisc,
        descricao: meta.descricao || "",
        carga: meta.carga || "",
        modulos,
        total: modulos.reduce((n, m) => n + m.itens.length, 0),
      };
    })
    .filter((d) => d.total > 0);
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function render(disciplinas) {
  const c = CONFIG.cores;
  const agora = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const totalArquivos = disciplinas.reduce((n, d) => n + d.total, 0);

  const blocos = disciplinas
    .map(
      (d, i) => `
      <section class="disciplina" data-busca="${esc((d.titulo + " " + d.descricao).toLowerCase())}">
        <header class="disciplina-topo">
          <span class="ordem">${String(i + 1).padStart(2, "0")}</span>
          <div>
            <h2>${esc(d.titulo)}</h2>
            <p class="meta">${[d.carga, `${d.total} ${d.total === 1 ? "arquivo" : "arquivos"}`].filter(Boolean).map(esc).join(" · ")}</p>
            ${d.descricao ? `<p class="descricao">${esc(d.descricao)}</p>` : ""}
          </div>
        </header>
        ${d.modulos
          .map(
            (m) => `
        <details class="modulo" open>
          <summary>
            <span class="modulo-nome">${esc(m.nome)}</span>
            <span class="contagem">${m.itens.length}</span>
          </summary>
          <ul class="arquivos">
            ${m.itens
              .map(
                (f) => `
            <li data-busca="${esc((f.nome + " " + m.nome + " " + d.titulo).toLowerCase())}">
              <a href="${f.href}" download>
                <span class="tipo tipo-${esc(f.tipo)}">${esc(f.tipo)}</span>
                <span class="nome">${esc(f.nome)}</span>
                <span class="tamanho">${esc(f.tamanho)}</span>
              </a>
            </li>`,
              )
              .join("")}
          </ul>
        </details>`,
          )
          .join("")}
      </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Materiais de aula · ${esc(CONFIG.professor)}</title>
<meta name="description" content="Apostilas, slides e exercícios das disciplinas do Eixo Informação e Comunicação.">
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
  .modulo-nome::before{content:"▸ "; color:var(--marca)}
  .modulo[open] .modulo-nome::before{content:"▾ "}
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
    <p class="assinatura">${esc(CONFIG.escola)} · ${esc(CONFIG.professor)}</p>
  </div>
</header>

<main class="wrap">
  <div class="barra">
    <input id="busca" type="search" placeholder="Buscar por disciplina, módulo ou arquivo" aria-label="Buscar material">
    <p class="resumo">${disciplinas.length} ${disciplinas.length === 1 ? "disciplina" : "disciplinas"} · ${totalArquivos} arquivos</p>
  </div>
${blocos}
  <p class="vazio" id="vazio">Nenhum material corresponde a essa busca. Tente outro termo.</p>
</main>

<footer class="wrap">
  <p>${esc(CONFIG.cidade)} · Atualizado em ${esc(agora)}</p>
  <p>Material de uso didático. Dúvidas sobre os arquivos devem ser tratadas em sala.</p>
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
/* EXECUÇÃO                                                            */
/* ------------------------------------------------------------------ */

const disciplinas = coletar();
writeFileSync(CONFIG.saida, render(disciplinas), "utf8");
writeFileSync(".nojekyll", "");

console.log(`\n✔ ${CONFIG.saida} gerado`);
disciplinas.forEach((d) => {
  console.log(
    `  · ${d.titulo}: ${d.modulos.length} módulo(s), ${d.total} arquivo(s)`,
  );
});

if (bloqueados.length) {
  console.log(
    `\n⚠ ${bloqueados.length} arquivo(s) NÃO publicado(s) pela trava de segurança:`,
  );
  bloqueados.forEach((f) => console.log(`  · ${f}`));
  console.log("  Mova estes arquivos para o repositório privado do professor.");
}
console.log("");
