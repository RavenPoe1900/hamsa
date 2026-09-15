/* Admin shell chrome shared by admin/*.html — systemic/shadcn direction */
(function(){
  "use strict";
  const T = (k,v)=>window.VI18N.t(k,v);
  // Las etiquetas se resuelven al pintar, no al cargar el módulo.
  const NAV = [
    { href:"index.html", key:"adm.nav.dashboard" }, { href:"productos.html", key:"adm.nav.products" },
    { href:"pedidos.html", key:"adm.nav.orders" },   { href:"usuarios.html", key:"adm.nav.users" },
    { href:"resenas.html", key:"adm.nav.reviews" },  { href:"datos.html", key:"adm.nav.data" },
  ];
  function renderSidebar(active){
    const user = window.VDB.currentUser();
    return `
    <aside class="admin-side">
      <a href="../index.html" class="admin-brand"><img src="../assets/logo-electrohogar.png" alt="Electro Hogar Vid Habana"><span>Admin</span></a>
      <nav class="admin-nav">${NAV.map(n=>`<a href="${n.href}" ${active===n.href?'aria-current="page"':''}>${T(n.key)}</a>`).join("")}</nav>
      <div class="admin-side-foot">
        <a href="../index.html">${T("adm.backToStore")}</a>
        <button type="button" data-theme-toggle="text" style="display:flex;align-items:center;gap:8px;"></button>
        <div style="padding:7px 10px;font-size:11.5px;color:var(--muted-fg);">${user?window.VUI.esc(user.name):''}</div>
        <button type="button" data-admin-logout>${T("acct.logout")}</button>
        <div style="padding:8px 10px 2px;">${window.VI18N.switcherHTML()}</div>
      </div>
    </aside>`;
  }
  function mountAdmin(active, title, subtitle){
    const shell = document.createElement("div"); shell.className = "admin-shell";
    shell.innerHTML = `${renderSidebar(active)}<main class="admin-main" id="main"><div class="admin-topbar"><div><h1>${title}</h1><p>${subtitle||''}</p></div></div><div data-admin-content></div></main>`;
    document.body.appendChild(shell);
    document.querySelector("[data-admin-logout]").addEventListener("click", ()=>{ window.VDB.logout(); location.href="../index.html"; });
    window.VUI.wireGlobalActions();
    return shell.querySelector("[data-admin-content]");
  }
  window.VADMIN = { mountAdmin };
})();
