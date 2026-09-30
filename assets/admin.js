/* Admin shell chrome shared by admin/*.html — systemic/shadcn direction */
(function(){
  "use strict";
  const NAV = [
    { href:"index.html", key:"adm.nav.dashboard" }, { href:"productos.html", key:"adm.nav.products" },
    { href:"pedidos.html", key:"adm.nav.orders" }, { href:"usuarios.html", key:"adm.nav.users" },
    { href:"clientes.html", key:"adm.nav.customers" }, { href:"facturacion.html", key:"adm.nav.billing" },
    { href:"compras.html", key:"adm.nav.purchasing" }, { href:"datos.html", key:"adm.nav.data" },
  ];
  function renderTopHeader(){
    const user = window.VDB.currentUser();
    const t = window.VI18N ? VI18N.t : (k=>k);
    return `
    <header class="admin-topheader">
      <a href="../index.html" class="brand admin-brand">
        <span class="brand-mark" aria-hidden="true">${window.VUI.icon("bolt")}</span>
        <span class="brand-text"><span class="brand-name">ElectroHogar</span><span class="brand-city">Admin</span></span>
      </a>
      <div class="admin-utility-bar">
        <a href="../index.html">${t("adm.backToStore")}</a>
        <button type="button" data-theme-toggle="text"></button>
        ${window.VI18N ? VI18N.switcherHTML() : ''}
        <span class="user-name">${user?window.VUI.esc(user.name):''}</span>
        <span class="bar-divider" aria-hidden="true"></span>
        <button type="button" class="danger" data-admin-logout>${t("acct.logout")}</button>
      </div>
    </header>`;
  }
  function renderSidebar(active){
    const t = window.VI18N ? VI18N.t : (k=>k);
    return `
    <aside class="admin-side">
      <nav class="admin-nav">${NAV.map(n=>`<a href="${n.href}" ${active===n.href?'aria-current="page"':''}>${t(n.key)}</a>`).join("")}</nav>
    </aside>`;
  }
  function mountAdmin(active, title, subtitle){
    const shell = document.createElement("div"); shell.className = "admin-shell";
    shell.innerHTML = `${renderTopHeader()}<div class="admin-body">${renderSidebar(active)}<main class="admin-main" id="main"><div class="admin-topbar"><div><h1>${title}</h1><p>${subtitle||''}</p></div></div><div data-admin-content></div></main></div>`;
    document.body.appendChild(shell);
    document.querySelector("[data-admin-logout]").addEventListener("click", ()=>{ window.VDB.logout(); location.href="../index.html"; });
    window.VUI.wireGlobalActions();
    return shell.querySelector("[data-admin-content]");
  }

  /* ---------- piezas compartidas por Clientes, Facturación y Compras ---------- */
  const esc = s => window.VUI.esc(s);
  const T = (k,v) => window.VI18N.t(k,v);
  const money = n => window.VUI.money(n);
  const fmtDate = ts => ts ? window.VI18N.fmtDate(ts,{day:"numeric",month:"short",year:"numeric"}) : "—";
  const fmtDay = ts => ts ? window.VI18N.fmtDate(ts,{day:"numeric",month:"short"}) : "—";
  const pct = n => n==null ? "—" : (n*100).toFixed(1).replace(/\.0$/,"")+"%";

  // Estado con punto + texto (no depende solo del color). tone: ok | warn | bad | info | muted
  function pill(text, tone){ return `<span class="status-pill tone-${tone||"muted"}">${esc(text)}</span>`; }

  function kpis(list){
    return `<div class="kpi-row">${list.map(k=>`<div class="kpi"><span class="kpi-l">${esc(k.label)}</span><span class="kpi-v ${k.tone?"tx-"+k.tone:""}">${esc(k.value)}</span>${k.sub?`<span class="kpi-s">${esc(k.sub)}</span>`:""}</div>`).join("")}</div>`;
  }
  const emptyRow = (cols, msg) => `<tr><td colspan="${cols}" class="empty-cell">${esc(msg||T("adm.noResults"))}</td></tr>`;

  /* Pestañas: la barra se repinta en cada cambio (para refrescar los contadores) y la pestaña
     activa se recuerda en el hash, así el panel principal puede enlazar a una pestaña concreta. */
  function tabs(root, defs){
    const fromHash = decodeURIComponent((location.hash||"").slice(1));
    let current = defs.some(d=>d.id===fromHash) ? fromHash : defs[0].id;
    root.innerHTML = `<div class="adm-tabs" role="tablist" data-tabbar></div><div class="adm-panel" role="tabpanel" data-panel></div>`;
    const bar = root.querySelector("[data-tabbar]"), panel = root.querySelector("[data-panel]");
    function paintBar(){
      bar.innerHTML = defs.map(d=>{
        const b = d.badge ? d.badge() : null;
        return `<button type="button" role="tab" data-tab="${d.id}" aria-selected="${d.id===current}">${esc(d.label)}${b&&b.n?`<span class="tab-badge ${b.warn?"warn":""}">${b.n}</span>`:""}</button>`;
      }).join("");
    }
    function show(id){
      current = id; paintBar();
      try{ history.replaceState(null,"","#"+id); }catch(e){}
      // contenedor nuevo en cada cambio: así los listeners de la pestaña anterior no se acumulan
      panel.innerHTML = ""; const box = document.createElement("div"); panel.appendChild(box); defs.find(d=>d.id===id).render(box);
    }
    bar.addEventListener("click",(e)=>{ const b=e.target.closest("[data-tab]"); if(b && b.dataset.tab!==current) show(b.dataset.tab); });
    // un enlace a otra pestaña de esta misma página (#cobrar, atrás/adelante) cambia de pestaña sin recargar
    window.addEventListener("hashchange",()=>{ const id=decodeURIComponent((location.hash||"").slice(1)); if(id!==current && defs.some(d=>d.id===id)) show(id); });
    show(current);
    return { show, refresh:()=>show(current), get current(){ return current; } };
  }

  /* Diálogo con <dialog> nativo: foco atrapado, Esc y backdrop gratis. `body` es HTML.
     Cada acción devuelve false para dejar abierto el diálogo (p. ej. si falla la validación).
     La acción primary es la de Enter. */
  function dialog(opts){
    const dlg = document.createElement("dialog");
    dlg.className = "adm-dialog"+(opts.wide?" wide":"");
    const actions = opts.actions || [];
    dlg.innerHTML = `<form class="dlg-form" novalidate>
      <header class="dlg-head"><h2>${esc(opts.title)}</h2><button type="button" class="dlg-x" data-dlg-close aria-label="${esc(T("neg.close"))}">×</button></header>
      <div class="dlg-body">${opts.body||""}</div>
      <footer class="dlg-foot">${actions.map((a,i)=>`<button type="${a.kind==="primary"?"submit":"button"}" class="btn btn-sm btn-${a.kind||"outline"}" data-act="${i}">${a.label}</button>`).join("")}<button type="button" class="btn btn-sm btn-ghost" data-dlg-close>${esc(T(actions.length?"acct.cancel":"neg.close"))}</button></footer>
    </form>`;
    document.body.appendChild(dlg);
    const close = ()=>{ if(dlg.open) dlg.close(); };
    dlg.addEventListener("close", ()=>{ dlg.remove(); if(opts.onClose) opts.onClose(); });
    dlg.addEventListener("click",(e)=>{ if(e.target===dlg) close(); });               // clic en el fondo
    dlg.querySelectorAll("[data-dlg-close]").forEach(b=>b.addEventListener("click", close));
    const run = i => { const a=actions[i]; if(a && a.onClick && a.onClick(dlg)===false) return; if(!a || a.keepOpen!==true) close(); };
    dlg.querySelectorAll("[data-act]").forEach(b=>{ if(b.type==="button") b.addEventListener("click",()=>run(+b.dataset.act)); });   // el submit lo recoge el form
    dlg.querySelector("form").addEventListener("submit",(e)=>{ e.preventDefault(); const i=actions.findIndex(a=>a.kind==="primary"); if(i>=0) run(i); });
    dlg.showModal();
    const first = dlg.querySelector("[autofocus]") || dlg.querySelector(".dlg-body input:not([type=hidden]):not([disabled]), .dlg-body select, .dlg-body textarea");
    if(first) first.focus();
    dlg.close$ = close;
    return dlg;
  }
  // Atajo: resultado {ok,error} de la capa de datos → aviso. Devuelve true si salió bien.
  function report(res, okKey){
    if(res && res.ok){ if(okKey) window.VUI.toast(T(okKey)); return true; }
    window.VUI.toast(T((res&&res.error)||"neg.err.generic")); return false;
  }
  const val = (root, sel) => { const el=root.querySelector(sel); return el ? el.value : ""; };

  /* Cobro/pago (facturas por cobrar y órdenes de compra por pagar). onSave recibe {amount,method,date,note}
     y devuelve el {ok,error} de la capa de datos; onDone se llama tras guardar. */
  const METHODS = ["cash","card","transfer"];
  const methodOpts = sel => METHODS.map(m=>`<option value="${m}" ${m===sel?"selected":""}>${T("pay."+m)}</option>`).join("");
  // Fecha elegida en un <input type=date> → marca de tiempo: hoy conserva la hora actual; otro día, el mediodía.
  const stamp = key => key===window.VNEG.todayKey() ? Date.now() : window.VNEG.dayStart(key)+12*3600000;
  function paymentDialog(o){
    const today = window.VNEG.todayKey();
    return dialog({ title:o.title, body:`${o.subtitle?`<p class="hint-line" style="margin-top:0;">${o.subtitle}</p>`:""}
      <div class="f-grid">
        <div class="field"><label>${T("pay.amount")}</label><input class="input" type="number" min="0.01" max="${o.balance}" step="0.01" data-f="amount" value="${o.balance}"><span class="hint">${T("pay.balance",{amount:money(o.balance)})}</span></div>
        <div class="field"><label>${T("pay.method")}</label><select class="input" data-f="method">${methodOpts(o.method||"cash")}</select></div>
        <div class="field"><label>${T("adm.th.date")}</label><input class="input" type="date" data-f="date" value="${today}" max="${today}"></div>
        <div class="field"><label>${T("pay.note")}</label><input class="input" data-f="note"></div>
      </div>`,
      actions:[{ label:T("pay.register"), kind:"primary", onClick:(d)=>{
        const res = o.onSave({ amount:val(d,"[data-f=amount]"), method:val(d,"[data-f=method]"), date:stamp(val(d,"[data-f=date]")||today), note:val(d,"[data-f=note]") });
        if(!report(res,"pay.done")) return false;
        if(o.onDone) o.onDone(); } }] });
  }

  /* Un <dialog> modal vive en la capa superior del navegador y tapa cualquier toast normal. En el admin el
     contenedor de avisos se promueve a popover para que salga por encima del diálogo abierto. */
  const baseToast = window.VUI.toast;
  window.VUI.toast = function(msg){
    baseToast(msg);
    const root = document.getElementById("toast-root");
    if(root && root.showPopover){ root.popover = "manual"; try{ root.hidePopover(); root.showPopover(); }catch(e){} }
  };

  window.VADMIN = { mountAdmin, esc, T, money, fmtDate, fmtDay, pct, pill, kpis, emptyRow, tabs, dialog, report, val, methodOpts, stamp, paymentDialog };
})();
