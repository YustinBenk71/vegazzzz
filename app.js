// ===== MIGRACIÓN DE DATOS ANTIGUOS =====
function migrarDatosAntiguos() {
  // Buscar datos de la versión anterior
  const datosViejos = localStorage.getItem('gp_palets');
  
  if (datosViejos) {
    try {
      const palets = JSON.parse(datosViejos);
      
      // Verificar si ya tenemos datos nuevos
      const datosNuevos = localStorage.getItem('palets_data');
      if (!datosNuevos) {
        // Guardar en el nuevo formato
        localStorage.setItem('palets_data', datosViejos);
        console.log('✅ Datos migrados exitosamente');
        alert('✅ Tus palets antiguos han sido migrados correctamente');
      }
    } catch (err) {
      console.error('Error migrando datos:', err);
    }
  }
}
// ===== VERIFICAR LOGIN =====
function verificarLogin() {
    const email = localStorage.getItem('usuario-email');
    if (!email) {
        // Si no hay email, redirigir a login
        window.location.href = 'indexlogin.html';
    } else {
        // Mostrar email en header
        document.getElementById('usuario-actual').textContent = email;
    }
}

function logout() {
    if (!confirm('¿Cerrar sesión?')) return;
    localStorage.removeItem('usuario-email');
    window.location.href = 'indexlogin.html';
}

// ===== VERIFICAR AL CARGAR =====
window.addEventListener('load', () => {
    verificarLogin();
    // ... resto del código
});
// ===== ESTADO =====
let palets = [];
let editingPaletId = null;
let editingPaqId = null;
let targetPaletId = null;
let deletingPaletId = null;

// ===== GUARDAR/CARGAR DE LOCALSTORAGE =====
function guardarDatos() {
  localStorage.setItem('palets_data', JSON.stringify(palets));
}

function cargarDatos() {
  const datos = localStorage.getItem('palets_data');
  if (datos) {
    try {
      palets = JSON.parse(datos);
    } catch (err) {
      console.error('Error cargando datos:', err);
      palets = [];
    }
  }
}

// ===== DESCARGAR JSON =====
function descargarJSON() {
  const dataStr = JSON.stringify(palets, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `palets-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  alert('✅ Archivo descargado correctamente');
}

// ===== CARGAR JSON =====
function abrirCargadorJSON() {
  document.getElementById('file-input').click();
}

function cargarJSON() {
  const file = document.getElementById('file-input').files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const datos = JSON.parse(e.target.result);
      
      // Validar que sea un array
      if (!Array.isArray(datos)) {
        alert('❌ El archivo debe contener un array de palets');
        return;
      }

      // Preguntar si quiere reemplazar o combinar
      const opcion = confirm('¿Reemplazar todos los datos?\n\n✅ OK = Reemplazar\n❌ Cancelar = Combinar con existentes');
      
      if (opcion) {
        palets = datos;
      } else {
        // Combinar: agregar los datos nuevos
        palets = [...palets, ...datos];
      }

      guardarDatos();
      renderPalets();
      alert('✅ Datos cargados correctamente');
    } catch (err) {
      alert('❌ Error al cargar el archivo: ' + err.message);
    }
  };
  reader.readAsText(file);
  
  // Limpiar el input
  document.getElementById('file-input').value = '';
}

// ===== HELPERS =====
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function getVencInfo(vencimiento) {
  if (!vencimiento) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const venc = new Date(vencimiento + 'T00:00:00');
  const diff = Math.ceil((venc - today) / (1000*60*60*24));
  const label = venc.toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
  if (diff < 0) return { cls:'vencido', icon:'🔴', texto:`Vencido: ${label}` };
  if (diff <= 30) return { cls:'pronto', icon:'🟡', texto:`Vence en ${diff}d` };
  return { cls:'ok', icon:'🟢', texto:`Vence: ${label}` };
}

function updateHeader() {
  document.getElementById('total-palets-header').textContent = palets.length + ' palet' + (palets.length!=1?'s':'');
  const now = new Date();
  document.getElementById('header-date').textContent = now.toLocaleDateString('es-AR', {weekday:'short',day:'numeric',month:'short'});
}

// ===== CRUD PALETS =====
function crearPalet(nombre) {
  palets.push({
    id: uid(),
    nombre: nombre,
    paquetes: [],
    fecha_creacion: new Date().toISOString()
  });
  guardarDatos();
  renderPalets();
}

function actualizarPalet(id, nombre) {
  const p = palets.find(x => x.id === id);
  if (p) {
    p.nombre = nombre;
    guardarDatos();
    renderPalets();
  }
}

function eliminarPalet(id) {
  palets = palets.filter(p => p.id !== id);
  guardarDatos();
  renderPalets();
}

// ===== CRUD PAQUETES =====
function crearPaquete(paletId, nombre, codigo, cantidad, vencimiento) {
  const p = palets.find(x => x.id === paletId);
  if (p) {
    p.paquetes.push({
      id: uid(),
      nombre: nombre,
      codigo: codigo,
      cantidad: parseInt(cantidad),
      vencimiento: vencimiento,
      fecha_creacion: new Date().toISOString()
    });
    guardarDatos();
    renderPalets();
  }
}

function actualizarPaquete(paletId, paqId, nombre, codigo, cantidad, vencimiento) {
  const p = palets.find(x => x.id === paletId);
  if (p) {
    const pkg = p.paquetes.find(x => x.id === paqId);
    if (pkg) {
      pkg.nombre = nombre;
      pkg.codigo = codigo;
      pkg.cantidad = parseInt(cantidad);
      pkg.vencimiento = vencimiento;
      guardarDatos();
      renderPalets();
    }
  }
}

function eliminarPaquete(paletId, paqId) {
  if (!confirm('¿Eliminar este paquete?')) return;
  const p = palets.find(x => x.id === paletId);
  if (p) {
    p.paquetes = p.paquetes.filter(pkg => pkg.id !== paqId);
    guardarDatos();
    renderPalets();
  }
}

// ===== RENDER PALETS =====
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
    const totalPkg = (p.paquetes || []).reduce((a,b) => a + parseInt(b.cantidad), 0);
    const pkgsHtml = (p.paquetes || []).map((pkg) => {
      const vencInfo = getVencInfo(pkg.vencimiento);
      return `
      <div class="pkg-row">
        <div class="pkg-info">
          <div class="pkg-name">${esc(pkg.nombre)}</div>
          <div class="pkg-qty">📦 ${pkg.cantidad} paquete${pkg.cantidad!=1?'s':''}</div>
          ${pkg.codigo ? `<div class="pkg-code">🔖 ${esc(pkg.codigo)}</div>` : ''}
          ${vencInfo ? `<div class="pkg-venc ${vencInfo.cls}">${vencInfo.icon} ${vencInfo.texto}</div>` : ''}
        </div>
        <button class="btn-icon edit" onclick="editarPaquete('${p.id}','${pkg.id}')">✏️</button>
        <button class="btn-icon del" onclick="eliminarPaquete('${p.id}','${pkg.id}')">🗑</button>
      </div>
    `}).join('');

    const hasVencido = (p.paquetes || []).some(pkg => { const v = getVencInfo(pkg.vencimiento); return v && v.cls === 'vencido'; });
    const hasPronto = !hasVencido && (p.paquetes || []).some(pkg => { const v = getVencInfo(pkg.vencimiento); return v && v.cls === 'pronto'; });

    return `
      <div class="palet-card ${hasVencido?'has-vencido':hasPronto?'has-pronto':''}" id="palet-${p.id}">
        <div class="palet-header" onclick="togglePalet('${p.id}')">
          <div>
            <div class="palet-name">${esc(p.nombre)}</div>
            <div class="palet-meta">${(p.paquetes || []).length} tipo${(p.paquetes || []).length!=1?'s':''} · ${totalPkg} paquete${totalPkg!=1?'s':''}</div>
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
  if (card) card.classList.toggle('open');
}

function cambiarScreen(name, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  btn.classList.add('active');

  const fab = document.getElementById('fab-btn');
  if (name === 'palets') {
    fab.style.display = 'flex';
  } else if (name === 'resumen') {
    fab.style.display = 'none';
    renderResumen();
  } else if (name === 'buscar') {
    fab.style.display = 'none';
    setTimeout(() => document.getElementById('search-input').focus(), 200);
  }
}

// ===== MODALES =====
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

function editarNombrePalet(id) {
  abrirModalPalet(id);
}

function cerrarModalPalet() {
  document.getElementById('modal-palet').classList.remove('open');
  editingPaletId = null;
}

function guardarPalet() {
  const nombre = document.getElementById('input-palet-nombre').value.trim();
  if (!nombre) {
    alert('Ingresá un nombre para el palet');
    return;
  }

  if (editingPaletId) {
    actualizarPalet(editingPaletId, nombre);
  } else {
    crearPalet(nombre);
  }

  cerrarModalPalet();
}

function abrirModalPaquete(paletId, paqId) {
  targetPaletId = paletId;
  editingPaqId = paqId || null;
  const inp1 = document.getElementById('input-paq-nombre');
  const t = document.getElementById('modal-paq-title');

  if (paqId) {
    const palet = palets.find(p => p.id === paletId);
    const pkg = palet.paquetes.find(x => x.id === paqId);
    inp1.value = pkg.nombre;
    document.getElementById('input-paq-codigo').value = pkg.codigo || '';
    document.getElementById('input-paq-cantidad').value = pkg.cantidad;
    document.getElementById('input-paq-vencimiento').value = pkg.vencimiento || '';
    t.textContent = 'Editar Paquete';
  } else {
    inp1.value = '';
    document.getElementById('input-paq-codigo').value = '';
    document.getElementById('input-paq-cantidad').value = '';
    document.getElementById('input-paq-vencimiento').value = '';
    t.textContent = 'Agregar Paquete';
  }

  document.getElementById('modal-paquete').classList.add('open');
  setTimeout(() => inp1.focus(), 300);
}

function editarPaquete(paletId, paqId) {
  abrirModalPaquete(paletId, paqId);
}

function cerrarModalPaquete() {
  document.getElementById('modal-paquete').classList.remove('open');
  targetPaletId = null;
  editingPaqId = null;
}

function guardarPaquete() {
  const nombre = document.getElementById('input-paq-nombre').value.trim();
  const codigo = document.getElementById('input-paq-codigo').value.trim();
  const cantidad = parseInt(document.getElementById('input-paq-cantidad').value);
  const vencimiento = document.getElementById('input-paq-vencimiento').value;

  if (!nombre) {
    alert('Ingresá el nombre del producto');
    return;
  }
  if (!cantidad || cantidad < 1) {
    alert('Ingresá una cantidad válida');
    return;
  }

  if (editingPaqId) {
    actualizarPaquete(targetPaletId, editingPaqId, nombre, codigo, cantidad, vencimiento);
  } else {
    crearPaquete(targetPaletId, nombre, codigo, cantidad, vencimiento);
  }

  cerrarModalPaquete();
}

function pedirEliminarPalet(id) {
  deletingPaletId = id;
  document.getElementById('modal-del-palet').classList.add('open');
}

function cerrarModalDelPalet() {
  document.getElementById('modal-del-palet').classList.remove('open');
  deletingPaletId = null;
}

function confirmarEliminarPalet() {
  eliminarPalet(deletingPaletId);
  cerrarModalDelPalet();
}

// ===== RESUMEN =====
function renderResumen() {
  const totalPalets = palets.length;
  const totalPkgTypes = palets.reduce((a,p) => a + (p.paquetes || []).length, 0);
  const totalUnidades = palets.reduce((a,p) => a + (p.paquetes || []).reduce((b,pkg) => b + parseInt(pkg.cantidad), 0), 0);

  document.getElementById('stat-palets').textContent = totalPalets;
  document.getElementById('stat-paquetes').textContent = totalPkgTypes;
  document.getElementById('stat-tipos').textContent = [...new Set(palets.flatMap(p => (p.paquetes || []).map(pkg => pkg.nombre)))].length;
  document.getElementById('stat-unidades').textContent = totalUnidades;

  const lista = document.getElementById('resumen-lista');
  if (palets.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No hay datos aún.</p></div>';
    return;
  }

  lista.innerHTML = palets.map(p => {
    const total = (p.paquetes || []).reduce((a,b) => a + parseInt(b.cantidad), 0);
    const pkgsStr = (p.paquetes || []).map(pkg => `${pkg.nombre}: ${pkg.cantidad}`).join(' · ');
    return `
      <div class="resumen-palet">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="resumen-palet-name">${esc(p.nombre)}</div>
          <span class="badge">${total} pkg</span>
        </div>
        <div class="resumen-pkg">${pkgsStr || 'Sin paquetes'}</div>
        ${(p.paquetes || []).some(pkg => getVencInfo(pkg.vencimiento)?.cls === 'vencido') ? '<div style="color:var(--danger);font-size:12px;font-weight:600;margin-top:4px">🔴 VENCIDOS</div>' : ''}
      </div>
    `;
  }).join('');
}

// ===== BÚSQUEDA =====
function buscar(query) {
  const clearBtn = document.getElementById('search-clear-btn');
  clearBtn.classList.toggle('visible', query.length > 0);
  const resultsDiv = document.getElementById('search-results');
  const q = query.trim().toLowerCase();

  if (!q) {
    resultsDiv.innerHTML = `<div class="search-hint"><div class="icon">🔍</div><p>Escribí para buscar</p></div>`;
    return;
  }

  const grupos = {};
  palets.forEach(palet => {
    (palet.paquetes || []).forEach(pkg => {
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
    resultsDiv.innerHTML = `<div class="no-results"><div class="icon">😕</div><p>No encontrado</p></div>`;
    return;
  }

  resultsDiv.innerHTML = claves.map(clave => {
    const g = grupos[clave];
    const paletRows = g.palets.map(pr => {
      const vi = getVencInfo(pr.vencimiento);
      return `
        <div class="result-palet-row">
          <div style="flex:1">
            <div class="result-palet-name">📦 ${esc(pr.paletNombre)}</div>
            <div class="result-palet-qty">${pr.cantidad} paquete${pr.cantidad!=1?'s':''}</div>
          </div>
          ${vi ? `<span class="result-palet-venc ${vi.cls}">${vi.icon}</span>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="result-card">
        <div class="result-product-header">
          <div>
            <div class="result-product-name">${esc(g.nombre)}</div>
            ${g.codigo ? `<div class="result-product-code">🔖 ${esc(g.codigo)}</div>` : ''}
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

// ===== EXPORTAR EXCEL =====
function exportarExcel() {
  if (palets.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const bom = '\uFEFF';
  let csv = bom + 'Palet;Producto;Código;Cantidad;Vencimiento;Estado\n';

  palets.forEach(p => {
    if (!p.paquetes || p.paquetes.length === 0) {
      csv += `"${p.nombre}";"(sin paquetes)";"";"";"";""\n`;
    } else {
      p.paquetes.forEach(pkg => {
        const vi = getVencInfo(pkg.vencimiento);
        const estado = vi ? vi.texto : 'Sin fecha';
        csv += `"${p.nombre}";"${pkg.nombre}";"${pkg.codigo||''}";"${pkg.cantidad}";"${pkg.vencimiento||''}";"${estado}"\n`;
      });
    }
  });

  csv += '\nRESUMEN\n';
  csv += `Total Palets;${palets.length}\n`;
  const totalUnidades = palets.reduce((a,p) => a + (p.paquetes || []).reduce((b,pkg) => b + parseInt(pkg.cantidad), 0), 0);
  csv += `Total Unidades;${totalUnidades}\n`;
  csv += `Fecha;${new Date().toLocaleDateString('es-AR')}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `palets-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== CERRAR MODALES =====
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

document.getElementById('input-palet-nombre')?.addEventListener('keypress', e => { if(e.key==='Enter') guardarPalet(); });
document.getElementById('input-paq-cantidad')?.addEventListener('keypress', e => { if(e.key==='Enter') guardarPaquete(); });

// ===== INIT =====
window.addEventListener('load', () => {
  migrarDatosAntiguos();
  cargarDatos();
  renderPalets();
});