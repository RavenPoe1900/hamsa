/* Admin shell chrome shared by admin/*.html — systemic/shadcn direction */
(function(){
  "use strict";
  const NAV = [
    { href:"index.html", key:"adm.nav.dashboard" }, { href:"productos.html", key:"adm.nav.products" },
    { href:"pedidos.html", key:"adm.nav.orders" }, { href:"usuarios.html", key:"adm.nav.users" },
    { href:"datos.html", key:"adm.nav.data" },
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
  window.VADMIN = { mountAdmin };
})();
