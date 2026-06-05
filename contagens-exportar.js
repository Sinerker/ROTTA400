/* =============================================
   contagens-exportar.js — exportação CSV + TXT
   ============================================= */

function normalizarCodigoExport(val) {
  const s = String(val || "").trim().replace(",", ".");
  if (!s || !/[Ee]/.test(s)) return s;
  try { return BigInt(Math.round(Number(s))).toString(); } catch { return s; }
}

async function openDBExport(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function exportarContagens() {
  const db = await openDBExport("InventarioDB");

  if (!db.objectStoreNames.contains("contagens")) {
    alert("Nenhuma contagem encontrada para exportar.");
    db.close();
    return;
  }

  // Pega lote ativo
  const loteNome = sessionStorage.getItem("loteAtivo");

  const tx = db.transaction(["contagens"], "readonly");
  const req = tx.objectStore("contagens").getAll();

  req.onsuccess = () => {
    let contagens = req.result || [];
    db.close();

    // Filtra pelo lote ativo se houver
    if (loteNome) {
      contagens = contagens.filter((r) => r.loteNome === loteNome);
    }

    if (contagens.length === 0) {
      alert("Nenhuma contagem registrada.");
      return;
    }

    const data = new Date().toISOString().split("T")[0];

    const cabecalho =
      "DATA;HORA;TIPO-CONTAGEM;SEQPRODUTO;CODACESSO;DESCCOMPLETA;QTDEMBALAGEM;QUANTIDADE;";

    const linhas = contagens.map((r) => {
      let dStr = "", hStr = "";
      if (r.dataHora) {
        const partes = r.dataHora.split("T");
        dStr = partes[0];
        hStr = (partes[1] || "").split(".")[0];
      }
      return [
        dStr, hStr,
        (r.tipoContagem || "").toUpperCase(),
        (r.seqproduto   || "").toString().toUpperCase(),
        normalizarCodigoExport(r.codacesso).toUpperCase(),
        (r.desccompleta || "").toString().toUpperCase(),
        (r.qtdeembalagem|| "").toString().toUpperCase(),
        (r.quantidade   || "").toString().toUpperCase(),
      ].join(";");
    });

    const csv = [cabecalho, ...linhas].join("\n");
    baixarArquivo(csv, `contagens_${data}.csv`, "text/csv;charset=utf-8;");
  };

  req.onerror = (e) => {
    db.close();
    console.error("Erro ao exportar:", e.target.error);
  };
}

function baixarArquivo(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("exportar-contagens")?.addEventListener("click", exportarContagens);
});
