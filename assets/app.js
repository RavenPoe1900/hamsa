/* VASTO — "Systemic" shared UI (shadcn/ui visual language) */
(function(){
  "use strict";
  // atajos al motor de idioma (i18n.js se carga en <head>, siempre está listo)
  const T  = (k,v)=>window.VI18N.t(k,v);
  const TP = (k,n,v)=>window.VI18N.tp(k,n,v);
  const THEME_KEY = "vasto-theme";
  function storedTheme(){ try{ return localStorage.getItem(THEME_KEY); }catch(e){ return null; } }
  function effectiveTheme(){ return storedTheme() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
  function applyTheme(t){
    if(t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(storedTheme());
  function toggleTheme(){
    const next = effectiveTheme()==="dark" ? "light" : "dark";
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    applyTheme(next);
    document.querySelectorAll("[data-theme-toggle]").forEach(syncThemeToggleBtn);
  }
  function syncThemeToggleBtn(btn){
    const dark = effectiveTheme()==="dark";
    const label = dark?T("theme.toLight"):T("theme.toDark");
    btn.innerHTML = btn.dataset.themeToggle==="text" ? `${icon(dark?"sun":"moon")}<span>${label}</span>` : icon(dark?"sun":"moon");
    btn.setAttribute("aria-label", label);
  }
  const ICONS = {
    sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>',
    moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.6-4.6-10-9.4C.5 7.6 2.3 4 6 4c2.1 0 3.7 1.2 6 3.6C14.3 5.2 15.9 4 18 4c3.7 0 5.5 3.6 4 7.1-2.4 4.8-10 9.4-10 9.4z"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
    box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5 12 3l8.5 4.5V16L12 20.5 3.5 16z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v8.5"/></svg>',
    heartFill:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5s-7.6-4.6-10-9.4C.5 7.6 2.3 4 6 4c2.1 0 3.7 1.2 6 3.6C14.3 5.2 15.9 4 18 4c3.7 0 5.5 3.6 4 7.1-2.4 4.8-10 9.4-10 9.4z"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/></svg>',
    star:'<svg viewBox="0 0 20 20"><path fill="currentColor" d="M10 1.4l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L1.4 7.8l6-.8z"/></svg>',
    starHalf:'<svg viewBox="0 0 20 20"><defs><clipPath id="halfclip"><rect x="0" y="0" width="10" height="20"/></clipPath></defs><path fill="var(--border)" d="M10 1.4l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L1.4 7.8l6-.8z"/><path fill="currentColor" clip-path="url(#halfclip)" d="M10 1.4l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L1.4 7.8l6-.8z"/></svg>',
    starEmpty:'<svg viewBox="0 0 20 20"><path fill="var(--border)" d="M10 1.4l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L1.4 7.8l6-.8z"/></svg>',
    bolt:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6.5h11v10h-11z"/><path d="M12.5 10.5h4l3 3v3h-7z"/><circle cx="6" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 5-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4.5"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="11" width="15" height="9.5" rx="1.6"/><path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.5v4.5h-4.5"/></svg>',
    laptop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4.5" width="16" height="10.5" rx="1.2"/><path d="M2.5 19.5h19M9 19.5l.6-2.5h4.8l.6 2.5"/></svg>',
    fan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 12c0-3.5 2-6 4.5-6s2 3-.5 4.5"/><path d="M12 12c3.5 0 6 2 6 4.5s-3 2-4.5-.5"/><path d="M12 12c0 3.5-2 6-4.5 6s-2-3 .5-4.5"/><path d="M12 12c-3.5 0-6-2-6-4.5s3-2 4.5.5"/></svg>',
    battery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="16" height="10" rx="1.5"/><path d="M20.5 10v4"/><path d="M8.5 9.5 6 12.5h3l-1.5 3 4-3.5h-3z" fill="currentColor" stroke="none"/></svg>',
    wrench:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 9.3a4 4 0 1 0-5.4 5.4L3 21l2 2 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.2-.6-.6-2.2z"/></svg>',
    blocks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    washer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2.5" width="18" height="19" rx="2"/><circle cx="12" cy="13.5" r="5.5"/><circle cx="12" cy="13.5" r="2.2"/><path d="M6.3 5.5h.01M9 5.5h.01"/></svg>',
    blender:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l-1.2 12.5a2 2 0 0 1-2 1.8h-1.6a2 2 0 0 1-2-1.8z"/><path d="M6.5 3h11"/><rect x="8.5" y="19" width="7" height="2.5" rx="1"/></svg>',
    fridge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 9.5h14"/><path d="M8 5v2M8 12v2.5"/></svg>',
    pulse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12h4l2-5 3 10 2-8 1.5 3h6.5"/></svg>',
    tv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8.5 20.5h7M12 17v3.5"/></svg>',
    scooter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="18" r="2.3"/><circle cx="18.5" cy="18" r="2.3"/><path d="M5.5 18 10 8h5.5M10 8h3.5M15.5 8 18.5 18M15.5 8l2-4.5h2.5"/></svg>',
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7"/><path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10"/><path d="M10 20.5V15a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5.5"/></svg>',
    chevronLeft:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chevronRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  };
  function icon(name){ return `<span class="ic" aria-hidden="true">${ICONS[name]||''}</span>`; }
  function stars(rating){ const full=Math.floor(rating), half=rating-full>=0.5; let out='<span class="stars">'; for(let i=0;i<5;i++){ out += i<full?ICONS.star:(i===full&&half?ICONS.starHalf:ICONS.starEmpty); } return out+'</span>'; }
  function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  const _TC_SMALL=new Set(["de","del","a","al","con","para","y","o","u","e","en","por","la","el","los","las","un","una","sin","sobre"]);
  const _TC_ACR=new Set(["USB","USK","HP","TV","PC","AC","DC","LED","RGB","SSD","HDD","HDMI","LCD","OLED","QLED","KWH","KW","WH","W","V","GPS","BT","LFP","PVC","ABS","ML","MM","CM","HZ"]);
  const _TC_SPEC={"iphone":"iPhone","ipad":"iPad","ipod":"iPod","airpods":"AirPods","macbook":"MacBook","imac":"iMac"};
  function _capW(w,first){ if(!w)return w; if(/\d/.test(w))return w; const lo=w.toLowerCase(); if(_TC_SPEC[lo])return _TC_SPEC[lo]; if(!first&&_TC_SMALL.has(lo))return lo; if(w.length<=4&&_TC_ACR.has(w.toUpperCase()))return w.toUpperCase(); return lo.replace(/^[a-záéíóúüñ]/,c=>c.toUpperCase()); }
  function titleCase(str){ return String(str||"").trim().split(/\s+/).map((w,i)=>w.split("-").map((p,j)=>_capW(p,i===0&&j===0)).join("-")).join(" "); }
  function money(n){ return window.VDB.money(n); }
  function etaLabel(d){ return window.VI18N.fmtDate(Date.now()+d*86400000,{weekday:"long",day:"numeric",month:"long"}); }
  function thumbStyle(p){ return `--thumb-tone:${p.hue1}2E`; }
  function thumbImg(p){ return p && p.image ? `<img src="${p.image}" alt="${esc(p.title||"")}" loading="lazy">` : `<span style="font-size:30px">${p?p.emoji:""}</span>`; }

  function renderHeader(){
    const VDB=window.VDB, user=VDB.currentUser(), count=user?VDB.cartCount(user.id):0;
    return `
    <a href="#main" class="skip-link">${T("skip")}</a>
    <header class="site-header">
      <div class="header-row">
        <a href="index.html" class="brand" aria-label="${T("brand.aria")}">
          <span class="brand-mark" aria-hidden="true">${ICONS.bolt}</span>
          <span class="brand-text"><span class="brand-name">ElectroHogar</span><span class="brand-city">Habana</span></span>
        </a>
        <div class="header-actions">
          <a class="header-link" href="buscar.html" aria-label="${T("nav.all")}">${icon('blocks')}<span class="txt"><b>${T("nav.all")}</b></span></a>
          <a class="header-link" href="pedidos.html" aria-label="${T("nav.orders")}">${icon('box')}<span class="txt"><b>${T("nav.orders")}</b></span></a>
          <a class="header-link" href="favoritos.html" aria-label="${T("nav.favorites")}">${icon('heart')}<span class="txt"><b>${T("nav.favorites")}</b></span></a>
          ${user?`<a class="header-link" href="cuenta.html" aria-label="${esc(T("nav.accountAria",{name:user.name.split(" ")[0]}))}">${icon('user')}<span class="txt"><span class="lbl">${esc(user.name.split(" ")[0])}</span><b>${T("nav.account")}</b></span></a>`:`<a class="header-link" href="login.html" aria-label="${T("nav.login")}">${icon('user')}<span class="txt"><b>${T("nav.login")}</b></span></a>`}
          <a class="header-link icon-only cart" href="carrito.html" aria-label="${T("nav.cartAria",{n:count})}">${icon('cart')}<span class="cart-badge" data-cart-badge>${count}</span></a>
          <button type="button" class="header-link icon-only" data-theme-toggle aria-label="${T("theme.aria")}"></button>
          ${window.VI18N.switcherHTML()}
        </div>
      </div>
    </header>`;
  }
  function renderFooter(){
    return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div><h4>${T("footer.col.product")}</h4><a href="#">${T("footer.about")}</a><a href="#">${T("footer.news")}</a><a href="#">${T("footer.status")}</a></div>
        <div><h4>${T("footer.col.sell")}</h4><a href="#">${T("footer.sellWithUs")}</a><a href="#">${T("footer.affiliates")}</a><a href="admin/index.html">${T("footer.adminPanel")}</a></div>
        <div><h4>${T("footer.col.resources")}</h4><a href="#">${T("footer.docs")}</a><a href="#">${T("footer.api")}</a></div>
        <div><h4>${T("footer.col.support")}</h4><a href="pedidos.html">${T("footer.yourOrders")}</a><a href="#">${T("footer.shipping")}</a><a href="#">${T("footer.contact")}</a></div>
      </div>
      <div class="footer-base">
        <div class="footer-social" aria-label="${T("footer.socialAria")}">
          <a href="#" aria-label="Facebook" class="footer-social-link"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
          <a href="#" aria-label="Instagram" class="footer-social-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg></a>
          <a href="#" aria-label="WhatsApp" class="footer-social-link"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.47 14.38c-.24-.12-1.41-.7-1.63-.77-.22-.08-.38-.12-.54.12-.16.23-.62.77-.76.93-.14.16-.28.18-.52.06a6.6 6.6 0 0 1-3.3-2.89c-.25-.43.25-.4.7-1.33.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41H9.6c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.41-.58 1.61-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28zM12 2a10 10 0 0 1 8.66 15l1.28 4.67-4.83-1.27A10 10 0 1 1 12 2z"/></svg></a>
        </div>
        <span>${T("footer.copy")}</span>
      </div>
    </footer>
    <button class="back-to-top" id="backToTop" aria-label="${T("footer.backToTop")}" data-scroll-top hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M18 15l-6-6-6 6"/></svg>
    </button>`;
  }
  function productCard(p, opts){
    opts = opts||{};
    const VDB=window.VDB, user=VDB.currentUser(), wished = user && VDB.isWishlisted(user.id,p.id);
    // urgencia solo cuando es real: agotado o stock crítico. "En stock" no aporta señal.
    const stockNote = p.stock===0 ? `<span class="stock-note out">${T("card.outOfStock")}</span>`
      : p.stock<5 ? `<span class="stock-note">${icon('bolt')}${TP("card.lastUnits",p.stock)}</span>` : "";
    const discountPct = p.oldPrice ? Math.round((1-p.price/p.oldPrice)*100) : 0;
    const [euros,cents] = p.price.toFixed(2).split(".");
    // el vendedor (marca) enlaza a su propio catálogo, igual que en la ficha de producto
    const seller = p.brand ? `<a href="buscar.html?q=${encodeURIComponent(p.brand)}" class="product-seller">${esc(p.brand)}</a>` : "";
    const warranty = p.specs && p.specs["Garantía"] ? esc(T("card.warranty",{v:p.specs["Garantía"]})) : "";
    const meta = [seller, warranty].filter(Boolean).join(" · ");
    // un solo distintivo por card: el descuento manda sobre la entrega 24h
    const badge = p.oldPrice ? "" : (p.prime ? `<span class="prime-badge">${T("card.delivery24")}</span>` : "");
    return `
    <article class="product-card" data-product-id="${p.id}">
      <a href="producto.html?id=${p.id}" class="product-thumb" style="${thumbStyle(p)}">
        ${thumbImg(p)}
        ${p.oldPrice?`<span class="discount-badge">−${discountPct}%</span>`:""}
      </a>
      <button class="wish-btn" data-wish="${p.id}" aria-pressed="${!!wished}" aria-label="${wished?T("card.removeFromFav"):T("card.addToFav")}">${icon(wished?'heartFill':'heart')}</button>
      <a href="producto.html?id=${p.id}" class="product-title">${esc(p.title)}</a>
      ${meta?`<p class="product-meta">${meta}</p>`:""}
      <div class="price-row">
        <span class="price">${VDB.db.settings.currency}${euros}<small>.${cents}</small></span>
        ${p.oldPrice?`<span class="price-old">${money(p.oldPrice)}</span>`:""}
      </div>
      ${badge}
      ${stockNote}
      ${opts.showAdd!==false?`<button class="btn btn-buy btn-sm" data-add-cart="${p.id}" ${p.stock===0?'disabled':''}>${p.stock===0?'':icon('cart')}${p.stock===0?T("card.outOfStock"):T("card.addToCart")}</button>`:""}
    </article>`;
  }
  function toast(msg){
    let root=document.getElementById("toast-root"); if(!root){ root=document.createElement("div"); root.id="toast-root"; document.body.appendChild(root); }
    const el=document.createElement("div"); el.className="toast"; el.textContent=msg; root.appendChild(el);
    setTimeout(()=>{ el.style.opacity="0"; el.style.transition="opacity .2s"; setTimeout(()=>el.remove(),200); },2200);
  }
  function announce(msg){
    let live=document.getElementById("live-region");
    if(!live){ live=document.createElement("div"); live.id="live-region"; live.className="visually-hidden"; live.setAttribute("role","status"); live.setAttribute("aria-live","polite"); document.body.appendChild(live); }
    live.textContent = msg;
  }
  function flashAdded(btn){
    if(btn.dataset.flashing) return;   // en doble clic se perdería la etiqueta original
    btn.dataset.flashing="1";
    const original = btn.innerHTML;
    btn.innerHTML = T("card.added"); btn.classList.add("is-added");
    setTimeout(()=>{ btn.innerHTML=original; btn.classList.remove("is-added"); delete btn.dataset.flashing; }, 1400);
  }
  function wireGlobalActions(){
    document.addEventListener("click",(e)=>{
      const addBtn = e.target.closest("[data-add-cart]");
      if(addBtn){
        const VDB=window.VDB, user=VDB.currentUser();
        if(!user){ toast(T("toast.loginToCart")); setTimeout(()=>location.href="login.html?next="+encodeURIComponent(location.pathname+location.search),700); return; }
        VDB.addToCart(user.id, addBtn.dataset.addCart, 1); updateCartBadge();
        flashAdded(addBtn); announce(T("toast.addedToCart")); return;
      }
      const wishBtn = e.target.closest("[data-wish]");
      if(wishBtn){
        const VDB=window.VDB, user=VDB.currentUser();
        if(!user){ toast(T("toast.loginToFav")); return; }
        const nowOn = VDB.toggleWishlist(user.id, wishBtn.dataset.wish);
        wishBtn.setAttribute("aria-pressed",String(nowOn)); wishBtn.innerHTML=icon(nowOn?'heartFill':'heart');
        wishBtn.setAttribute("aria-label", nowOn?T("card.removeFromFav"):T("card.addToFav")); return;
      }
      if(e.target.closest("[data-scroll-top]")){ window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?"auto":"smooth"}); }
const themeBtn = e.target.closest("[data-theme-toggle]");
      if(themeBtn){ toggleTheme(); return; }
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(syncThemeToggleBtn);
    // Botón flotante back-to-top
    const btt = document.getElementById("backToTop");
    if(btt){
      const onScroll = ()=>{ btt.hidden = window.scrollY < 300; };
      window.addEventListener("scroll", onScroll, {passive:true});
      onScroll();
    }
  }
  function updateCartBadge(){ const VDB=window.VDB, user=VDB.currentUser(), badge=document.querySelector("[data-cart-badge]"); if(badge) badge.textContent = user?VDB.cartCount(user.id):0; }
  function mountChrome(){ const h=document.querySelector("[data-header-mount]"), f=document.querySelector("[data-footer-mount]"); if(h) h.innerHTML=renderHeader(); if(f) f.innerHTML=renderFooter(); wireGlobalActions(); }
  function requireAuth(){ const u=window.VDB.currentUser(); if(!u){ location.href="login.html?next="+encodeURIComponent(location.pathname+location.search); return null; } return u; }
  function requireAdmin(){ const u=requireAuth(); if(u && u.role!=="admin"){ location.href="../cuenta.html"; return null; } return u; }

  window.VUI = { icon, icons:ICONS, stars, esc, titleCase, money, etaLabel, productCard, thumbStyle, thumbImg, toast, mountChrome, updateCartBadge, requireAuth, requireAdmin, wireGlobalActions };
})();
