// ===== ESTADO =====
let palets = JSON.parse(localStorage.getItem('gp_palets') || '[]');
let editingPaletId = null;
let editingPaqIndex = null;
let targetPaletId = null;
let deletingPaletId = null;

function save() {
  localStorage.setItem('gp_palets', JSON.stringify(palets));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ===== PANTALLAS =====
function cambiarScreen(name, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  btn.classList.add('active');

  const fab = document.getElementById('fab-btn');
  if (name === 'palets') {
    fab.style.display = 'flex';
    renderPalets();
  } else if (name === 'resumen') {
    fab.style.display = 'none';
    renderResumen();
  } else if (name === 'buscar') {
    fab.style.display = 'none';
    setTimeout(() => document.getElementById('search-input').focus(), 200);
  }
}

// ===== VENCIMIENTO HELPERS =====
function getVencInfo(vencimiento) {
  if (!vencimiento) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const venc = new Date(vencimiento + 'T00:00:00');
  const diff = Math.ceil((venc - today) / (1000*60*60*24));
  const label = venc.toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
  if (diff < 0) return { cls:'vencido', icon:'🔴', texto:`Vencido: ${label}` };
  if (diff <= 30) return { cls:'pronto', icon:'🟡', texto:`Vence en ${diff}d (${label})` };
  return { cls:'ok', icon:'🟢', texto:`Vence: ${label}` };
}

// ===== estructura para los palets=====
function renderPalets() {
  const list = document.getElementById('palets-list');
  const empty = document.getElementById('empty-palets');
  updateHeader();

  if (palets.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = palets.map(p => {
    const totalPkg = p.paquetes.reduce((a,b) => a + parseInt(b.cantidad), 0);
    const pkgsHtml = p.paquetes.map((pkg, i) => {
      const vencInfo = getVencInfo(pkg.vencimiento);
      return `
      <div class="pkg-row">
        <div class="pkg-info">
          <div class="pkg-name">${esc(pkg.nombre)}</div>
          <div class="pkg-qty">📦 ${pkg.cantidad} paquete${pkg.cantidad!=1?'s':''}</div>
          ${pkg.codigo ? `<div class="pkg-code">🔖 ${esc(pkg.codigo)}</div>` : ''}
          ${vencInfo ? `<div class="pkg-venc ${vencInfo.cls}">${vencInfo.icon} ${vencInfo.texto}</div>` : ''}
        </div>
        <button class="btn-icon edit" onclick="editarPaquete('${p.id}',${i})">✏️</button>
        <button class="btn-icon del" onclick="eliminarPaquete('${p.id}',${i})">🗑</button>
      </div>
    `}).join('');

    const hasVencido = p.paquetes.some(pkg => { const v = getVencInfo(pkg.vencimiento); return v && v.cls === 'vencido'; });
    const hasPronto = !hasVencido && p.paquetes.some(pkg => { const v = getVencInfo(pkg.vencimiento); return v && v.cls === 'pronto'; });
    return `
      <div class="palet-card ${hasVencido?'has-vencido':hasPronto?'has-pronto':''}" id="palet-${p.id}">
        <div class="palet-header" onclick="togglePalet('${p.id}')">
          <div>
            <div class="palet-name">${esc(p.nombre)}</div>
            <div class="palet-meta">${p.paquetes.length} tipo${p.paquetes.length!=1?'s':''} · ${totalPkg} paquete${totalPkg!=1?'s':''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge">${totalPkg}</span>
            <span class="chevron">▼</span>
          </div>
        </div>
        <div class="palet-body">
          ${pkgsHtml}
          <div class="action-row">
            <button class="btn btn-secondary" style="flex:1" onclick="abrirModalPaquete('${p.id}')">+ Paquete</button>
            <button class="btn btn-outline" onclick="editarNombrePalet('${p.id}')">✏️ Nombre</button>
            <button class="btn btn-danger" onclick="pedirEliminarPalet('${p.id}')">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function togglePalet(id) {
  const card = document.getElementById('palet-' + id);
  card.classList.toggle('open');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateHeader() {
  document.getElementById('total-palets-header').textContent = palets.length + ' palet' + (palets.length!=1?'s':'');
  const now = new Date();
  document.getElementById('header-date').textContent = now.toLocaleDateString('es-AR', {weekday:'short',day:'numeric',month:'short'});
}

// ===== MODAL PALET =====
function abrirModalPalet(id) {
  editingPaletId = id || null;
  const t = document.getElementById('modal-palet-title');
  const inp = document.getElementById('input-palet-nombre');
  if (id) {
    const p = palets.find(x => x.id === id);
    t.textContent = 'Editar Nombre';
    inp.value = p.nombre;
  } else {
    t.textContent = 'Nuevo Palet';
    inp.value = '';
  }
  document.getElementById('modal-palet').classList.add('open');
  setTimeout(() => inp.focus(), 300);
}

function editarNombrePalet(id) { abrirModalPalet(id); }

function cerrarModalPalet() {
  document.getElementById('modal-palet').classList.remove('open');
  editingPaletId = null;
}

function guardarPalet() {
  const nombre = document.getElementById('input-palet-nombre').value.trim();
  if (!nombre) { alert('Ingresá un nombre para el palet'); return; }

  if (editingPaletId) {
    const p = palets.find(x => x.id === editingPaletId);
    p.nombre = nombre;
  } else {
    palets.push({ id: uid(), nombre, paquetes: [] });
  }

  save();
  cerrarModalPalet();
  renderPalets();
}

// ===== MODAL PAQUETE =====
function abrirModalPaquete(paletId, editIdx) {
  targetPaletId = paletId;
  editingPaqIndex = editIdx !== undefined ? editIdx : null;
  const inp1 = document.getElementById('input-paq-nombre');
  const inp2 = document.getElementById('input-paq-cantidad');
  const t = document.getElementById('modal-paq-title');

  if (editingPaqIndex !== null) {
    const palet = palets.find(p => p.id === paletId);
    const pkg = palet.paquetes[editingPaqIndex];
    inp1.value = pkg.nombre;
    document.getElementById('input-paq-codigo').value = pkg.codigo || '';
    inp2.value = pkg.cantidad;
    document.getElementById('input-paq-vencimiento').value = pkg.vencimiento || '';
    t.textContent = 'Editar Paquete';
  } else {
    inp1.value = '';
    document.getElementById('input-paq-codigo').value = '';
    inp2.value = '';
    document.getElementById('input-paq-vencimiento').value = '';
    t.textContent = 'Agregar Paquete';
  }

  document.getElementById('modal-paquete').classList.add('open');
  setTimeout(() => inp1.focus(), 300);
}

function editarPaquete(paletId, idx) { abrirModalPaquete(paletId, idx); }

function cerrarModalPaquete() {
  document.getElementById('modal-paquete').classList.remove('open');
  targetPaletId = null;
  editingPaqIndex = null;
}

function guardarPaquete() {
  const nombre = document.getElementById('input-paq-nombre').value.trim();
  const codigo = document.getElementById('input-paq-codigo').value.trim();
  const cantidad = parseInt(document.getElementById('input-paq-cantidad').value);
  const vencimiento = document.getElementById('input-paq-vencimiento').value;
  if (!nombre) { alert('Ingresá el nombre del producto'); return; }
  if (!cantidad || cantidad < 1) { alert('Ingresá una cantidad válida'); return; }

  const palet = palets.find(p => p.id === targetPaletId);
  if (editingPaqIndex !== null) {
    palet.paquetes[editingPaqIndex] = { nombre, codigo, cantidad, vencimiento };
  } else {
    palet.paquetes.push({ nombre, codigo, cantidad, vencimiento });
  }

  save();
  cerrarModalPaquete();
  renderPalets();
  // Mantener abierto el palet
  const card = document.getElementById('palet-' + targetPaletId);
  if (card) card.classList.add('open');
}

function eliminarPaquete(paletId, idx) {
  if (!confirm('¿Eliminar este paquete?')) return;
  const palet = palets.find(p => p.id === paletId);
  palet.paquetes.splice(idx, 1);
  save();
  renderPalets();
  const card = document.getElementById('palet-' + paletId);
  if (card) card.classList.add('open');
}

// ===== ELIMINAR PALET =====
function pedirEliminarPalet(id) {
  deletingPaletId = id;
  document.getElementById('modal-del-palet').classList.add('open');
}

function cerrarModalDelPalet() {
  document.getElementById('modal-del-palet').classList.remove('open');
  deletingPaletId = null;
}

function confirmarEliminarPalet() {
  palets = palets.filter(p => p.id !== deletingPaletId);
  save();
  cerrarModalDelPalet();
  renderPalets();
}

// ===== RESUMEN =====
function renderResumen() {
  const totalPalets = palets.length;
  const totalPkgTypes = palets.reduce((a,p) => a + p.paquetes.length, 0);
  const totalUnidades = palets.reduce((a,p) => a + p.paquetes.reduce((b,pkg) => b + parseInt(pkg.cantidad), 0), 0);
  const totalPkgs = totalPkgTypes;

  document.getElementById('stat-palets').textContent = totalPalets;
  document.getElementById('stat-paquetes').textContent = totalPkgs;
  document.getElementById('stat-tipos').textContent = [...new Set(palets.flatMap(p => p.paquetes.map(pkg => pkg.nombre)))].length;
  document.getElementById('stat-unidades').textContent = totalUnidades;

  const lista = document.getElementById('resumen-lista');
  if (palets.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No hay datos aún.</p></div>';
    return;
  }

  lista.innerHTML = palets.map(p => {
    const total = p.paquetes.reduce((a,b) => a + parseInt(b.cantidad), 0);
    const pkgsStr = p.paquetes.map(pkg => `${pkg.nombre}: ${pkg.cantidad}`).join(' · ');
    return `
      <div class="resumen-palet">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="resumen-palet-name">${esc(p.nombre)}</div>
          <span class="badge">${total} pkg</span>
        </div>
        <div class="resumen-pkg">${pkgsStr || 'Sin paquetes'}</div>
        ${p.paquetes.some(pkg => getVencInfo(pkg.vencimiento)?.cls === 'vencido') ? '<div style="color:var(--danger);font-size:12px;font-weight:600;margin-top:4px">🔴 Tiene productos VENCIDOS</div>' : ''}
        ${!p.paquetes.some(pkg => getVencInfo(pkg.vencimiento)?.cls === 'vencido') && p.paquetes.some(pkg => getVencInfo(pkg.vencimiento)?.cls === 'pronto') ? '<div style="color:var(--accent);font-size:12px;font-weight:600;margin-top:4px">🟡 Próximos a vencer</div>' : ''}
      </div>
    `;
  }).join('');
}

// ===== EXPORTAR EXCEL =====
function exportarExcel() {
  if (palets.length === 0) { alert('No hay datos para exportar'); return; }

  // Generar CSV con BOM para Excel
  const bom = '\uFEFF';
  let csv = bom + 'Palet;Producto;Código;Cantidad;Fecha de Vencimiento;Estado\n';

  palets.forEach(p => {
    if (p.paquetes.length === 0) {
      csv += `"${p.nombre}";"(sin paquetes)";"";"";"";""\n`;
    } else {
      p.paquetes.forEach(pkg => {
        const vi = getVencInfo(pkg.vencimiento);
        const estado = vi ? vi.texto : 'Sin fecha';
        csv += `"${p.nombre}";"${pkg.nombre}";"${pkg.codigo||''}";"${pkg.cantidad}";"${pkg.vencimiento||''}";"${estado}"\n`;
      });
    }
  });

  // Agregar resumen
  csv += '\n';
  csv += 'RESUMEN\n';
  csv += `Total Palets;${palets.length}\n`;
  const totalUnidades = palets.reduce((a,p) => a + p.paquetes.reduce((b,pkg) => b + parseInt(pkg.cantidad), 0), 0);
  csv += `Total Unidades;${totalUnidades}\n`;
  csv += `Fecha de exportación;${new Date().toLocaleDateString('es-AR')}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `palets-${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== CERRAR MODALES AL TOCAR FONDO =====
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('open');
    }
  });
});

// Enter en inputs
document.getElementById('input-palet-nombre').addEventListener('keypress', e => { if(e.key==='Enter') guardarPalet(); });
document.getElementById('input-paq-cantidad').addEventListener('keypress', e => { if(e.key==='Enter') guardarPaquete(); });

// ===== BÚSQUEDA =====
function buscar(query) {
  const clearBtn = document.getElementById('search-clear-btn');
  clearBtn.classList.toggle('visible', query.length > 0);

  const resultsDiv = document.getElementById('search-results');
  const q = query.trim().toLowerCase();

  if (!q) {
    resultsDiv.innerHTML = `<div class="search-hint"><div class="icon">🔍</div><p>Escribí el nombre o código<br>de un producto para buscarlo<br>en todos los palets.</p></div>`;
    return;
  }

  // Agrupar resultados por producto (nombre+codigo como clave)
  const grupos = {}; // clave -> { nombre, codigo, palets: [{paletNombre, cantidad, vencimiento}] }

  palets.forEach(palet => {
    palet.paquetes.forEach(pkg => {
      const nombreMatch = pkg.nombre.toLowerCase().includes(q);
      const codigoMatch = pkg.codigo && pkg.codigo.toLowerCase().includes(q);
      if (!nombreMatch && !codigoMatch) return;

      const clave = pkg.nombre.toLowerCase() + '||' + (pkg.codigo || '').toLowerCase();
      if (!grupos[clave]) {
        grupos[clave] = { nombre: pkg.nombre, codigo: pkg.codigo || '', palets: [] };
      }
      grupos[clave].palets.push({
        paletNombre: palet.nombre,
        cantidad: pkg.cantidad,
        vencimiento: pkg.vencimiento || ''
      });
    });
  });

  const claves = Object.keys(grupos);

  if (claves.length === 0) {
    resultsDiv.innerHTML = `<div class="no-results"><div class="icon">😕</div><p>No se encontraron productos<br>con "<strong>${esc(query)}</strong>"</p></div>`;
    return;
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return esc(text);
    return esc(text.slice(0,idx)) + '<span class="highlight">' + esc(text.slice(idx, idx+q.length)) + '</span>' + esc(text.slice(idx+q.length));
  }

  resultsDiv.innerHTML = claves.map(clave => {
    const g = grupos[clave];
    const enMultiplesPalets = g.palets.length > 1;
    const totalUnidades = g.palets.reduce((a,b) => a + parseInt(b.cantidad), 0);

    const paletRows = g.palets.map(pr => {
      const vi = getVencInfo(pr.vencimiento);
      return `
        <div class="result-palet-row">
          <div style="flex:1">
            <div class="result-palet-name">📦 ${esc(pr.paletNombre)}</div>
            <div class="result-palet-qty">${pr.cantidad} paquete${pr.cantidad!=1?'s':''}</div>
          </div>
          ${vi ? `<span class="result-palet-venc ${vi.cls}">${vi.icon} ${vi.texto}</span>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="result-card">
        <div class="result-product-header">
          <div>
            <div class="result-product-name">${highlight(g.nombre, q)}</div>
            ${g.codigo ? `<div class="result-product-code">🔖 ${highlight(g.codigo, q)}</div>` : ''}
          </div>
          <div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            ${enMultiplesPalets ? `<span class="multi-badge">⚠️ ${g.palets.length} palets</span>` : ''}
            <span style="font-size:11px;color:var(--muted)">${totalUnidades} u. total</span>
          </div>
        </div>
        ${paletRows}
      </div>`;
  }).join('');
}

function limpiarBusqueda() {
  const inp = document.getElementById('search-input');
  inp.value = '';
  buscar('');
  inp.focus();
}

// ===== INIT =====
renderPalets();
updateHeader();