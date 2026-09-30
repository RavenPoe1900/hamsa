/* Admin › Clientes — CRM y fidelización: clientes, cupones y campañas por WhatsApp / correo.
   Los clientes se derivan de usuarios y pedidos (ver negocio.js); aquí solo se pinta y se edita. */
(function(){
  "use strict";
  const { T:t, esc, money, fmtDate, kpis, pill, emptyRow, tabs, dialog, report, val } = VADMIN;
  const num = n => VI18N.fmtNum(n);
  const ago = n => n===0 ? t("cust.today") : VI18N.tp("cust.daysAgo", n);
  document.title = t("cust.title");
  const content = VADMIN.mountAdmin("clientes.html", t("adm.nav.customers"), t("cust.sub"));

  const SEG_TONE = { none:"muted", risk:"bad", vip:"info", new:"ok", active:"ok", all:"muted" };
  const segPill = k => pill(t("seg."+k), SEG_TONE[k]);
  const INV_TONE = { paid:"ok", pending:"muted", partial:"info", overdue:"bad", void:"muted", credited:"muted" };
  const statusPill = s => `<span class="status-pill status-${s}">${t("adm.status."+s)}</span>`;
  const dateInput = ts => ts ? VNEG.dayKey(ts) : "";
  let ui;   // controlador de pestañas

  /* ============================ Clientes ============================ */
  function renderCustomers(panel){
    const all = VCRM.customers(), r = VCRM.rules();
    const count = s => all.filter(c=>c.segments.includes(s)).length;
    panel.innerHTML = `
      ${kpis([
        { label:t("cust.kpi.total"), value:num(all.length), sub:t("cust.kpi.withOrders",{n:all.filter(c=>c.orderCount).length}) },
        { label:t("seg.vip"), value:num(count("vip")) },
        { label:t("seg.risk"), value:num(count("risk")), tone:count("risk")?"warn":"" },
        { label:t("cust.kpi.points"), value:num(all.reduce((s,c)=>s+Math.max(0,c.points),0)), sub:t("cust.kpi.pointsWorth",{amount:money(all.reduce((s,c)=>s+Math.max(0,c.points),0)*r.pointValue)}) },
      ])}
      <div class="toolbar"><div class="toolbar-left">
        <input class="input" type="search" placeholder="${t("cust.searchPh")}" data-search style="min-width:260px;">
        <select class="input" data-seg><option value="all">${t("seg.all")}</option>${["vip","active","new","risk","none"].map(k=>`<option value="${k}">${t("seg."+k)}</option>`).join("")}</select>
        <select class="input" data-sort><option value="spent">${t("cust.sort.spent")}</option><option value="points">${t("cust.sort.points")}</option><option value="recent">${t("cust.sort.recent")}</option><option value="name">${t("cust.sort.name")}</option></select>
      </div><button class="btn btn-outline btn-sm" data-rules>${t("cust.rules")}</button></div>
      <p class="hint-line" style="margin-top:0;">${t("cust.legend",{vip:money(r.vipSpend),risk:r.riskDays,days:r.newDays})}</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>${t("adm.th.customer")}</th><th>${t("cust.th.contact")}</th><th class="num">${t("cust.th.orders")}</th><th class="num">${t("cust.th.spent")}</th><th>${t("cust.th.last")}</th><th class="num">${t("cust.th.points")}</th><th>${t("cust.th.segment")}</th></tr></thead>
        <tbody data-rows></tbody></table></div>`;
    const sorters = { spent:(a,b)=>b.spent-a.spent, points:(a,b)=>b.points-a.points, recent:(a,b)=>(b.lastOrderAt||0)-(a.lastOrderAt||0), name:(a,b)=>a.name.localeCompare(b.name) };
    const paint = ()=>{
      const q = val(panel,"[data-search]").trim().toLowerCase(), seg = val(panel,"[data-seg]");
      const list = all.filter(c=>(seg==="all"||c.segments.includes(seg)) && (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q))).sort(sorters[val(panel,"[data-sort]")]);
      panel.querySelector("[data-rows]").innerHTML = list.map(c=>`
        <tr data-open="${c.id}">
          <td><span class="cell-title">${esc(c.name)}</span><span class="cell-sub">${esc(c.email)}</span></td>
          <td>${c.phone?esc(c.phone):'<span class="muted">—</span>'}<span class="cell-sub">${c.optIn?t("cust.optIn"):t("cust.optOut")}</span></td>
          <td class="num">${c.orderCount}</td><td class="num">${money(c.spent)}</td>
          <td>${c.lastOrderAt?fmtDate(c.lastOrderAt)+`<span class="cell-sub">${ago(c.daysSince)}</span>`:'<span class="muted">—</span>'}</td>
          <td class="num">${num(c.points)}</td><td>${segPill(c.primary)}</td></tr>`).join("") || emptyRow(7);
    };
    paint();
    panel.querySelectorAll("[data-search],[data-seg],[data-sort]").forEach(el=>el.addEventListener(el.tagName==="INPUT"?"input":"change", paint));
    panel.querySelector("tbody").addEventListener("click",(e)=>{ const tr=e.target.closest("[data-open]"); if(tr) openCustomer(tr.dataset.open); });
    panel.querySelector("[data-rules]").addEventListener("click", openRules);
  }

  function openRules(){
    const r = VCRM.rules();
    const dlg = dialog({ title:t("cust.rules"), body:`
      <p class="hint-line" style="margin-top:0;">${t("cust.rules.help")}</p>
      <div class="f-grid">
        <div class="field"><label>${t("cust.rules.ppu",{c:VDB.db.settings.currency})}</label><input class="input" type="number" min="0" step="0.1" data-k="pointsPerUnit" value="${r.pointsPerUnit}"></div>
        <div class="field"><label>${t("cust.rules.pv")}</label><input class="input" type="number" min="0" step="0.01" data-k="pointValue" value="${r.pointValue}"><span class="hint" data-preview></span></div>
        <div class="field"><label>${t("cust.rules.vip",{c:VDB.db.settings.currency})}</label><input class="input" type="number" min="0" step="10" data-k="vipSpend" value="${r.vipSpend}"></div>
        <div class="field"><label>${t("cust.rules.risk")}</label><input class="input" type="number" min="1" step="1" data-k="riskDays" value="${r.riskDays}"></div>
        <div class="field"><label>${t("cust.rules.new")}</label><input class="input" type="number" min="1" step="1" data-k="newDays" value="${r.newDays}"></div>
      </div>`,
      actions:[{ label:t("acct.save"), kind:"primary", onClick:(d)=>{ const patch={}; d.querySelectorAll("[data-k]").forEach(i=>{ patch[i.dataset.k]=i.value; }); VCRM.setRules(patch); VUI.toast(t("cust.rules.saved")); ui.refresh(); } }] });
    const prev = ()=>{ const pv=+val(dlg,"[data-k=pointValue]")||0; dlg.querySelector("[data-preview]").textContent = t("cust.rules.preview",{amount:money(pv*100)}); };
    dlg.querySelector("[data-k=pointValue]").addEventListener("input", prev); prev();
  }

  function openCustomer(id){
    const c = VCRM.customer(id), r = VCRM.rules(), ledger = VCRM.ledger(id);
    const reopen = ()=>{ dlg.close$(); openCustomer(id); ui.refresh(); };
    const wa = VNEG.waNumber(c.phone);
    const dlg = dialog({ title:c.name, wide:true, body:`
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;">
        ${segPill(c.primary)}${c.segments.filter(s=>s!==c.primary).map(segPill).join("")}
        <span class="muted" style="font-size:12.5px;">${esc(c.email)}</span>
        <span style="margin-inline-start:auto;display:flex;gap:8px;">
          ${wa?`<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${VNEG.waLink(c.phone)}">WhatsApp</a>`:""}
          <a class="btn btn-outline btn-sm" href="${VNEG.mailLink(c.email,"","")}">${t("cust.mail")}</a></span>
      </div>
      ${kpis([
        { label:t("cust.th.spent"), value:money(c.spent) }, { label:t("cust.th.orders"), value:String(c.orderCount), sub:t("cust.avgTicket",{amount:money(c.avgTicket)}) },
        { label:t("cust.th.last"), value:c.lastOrderAt?fmtDate(c.lastOrderAt):"—", sub:c.lastOrderAt?ago(c.daysSince):"" },
        { label:t("cust.th.points"), value:num(c.points), sub:t("cust.kpi.pointsWorth",{amount:money(Math.max(0,c.points)*r.pointValue)}) } ])}
      <h3 class="sec-h">${t("cust.profile")}</h3>
      <div class="f-grid">
        <div class="field"><label>${t("cust.phone")}</label><input class="input" data-f="phone" value="${esc(c.phone)}" placeholder="+53 5 555 5555"><span class="hint">${t("cust.phoneHint")}</span></div>
        <div class="field"><label>${t("cust.tags")}</label><input class="input" data-f="tags" value="${esc(c.tags.join(", "))}" placeholder="${t("cust.tagsPh")}"></div>
        <div class="field full"><label class="checkbox-row"><input type="checkbox" data-f="optIn" ${c.optIn?"checked":""}> ${t("cust.consent")}</label><span class="hint">${t("cust.consentHint")}</span></div>
        <div class="field full"><label>${t("cust.notes")}</label><textarea class="input" data-f="notes" style="min-height:64px;">${esc(c.notes)}</textarea></div>
      </div>
      <h3 class="sec-h sec-gap" style="display:flex;justify-content:space-between;align-items:center;">${t("cust.pointsTitle")}
        <span style="display:flex;gap:8px;text-transform:none;letter-spacing:0;"><button type="button" class="btn btn-outline btn-sm" data-adjust>${t("cust.adjust")}</button><button type="button" class="btn btn-primary btn-sm" data-redeem ${c.points>0?"":"disabled"}>${t("cust.redeem")}</button></span></h3>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.date")}</th><th>${t("cust.led.reason")}</th><th class="num">${t("cust.th.points")}</th></tr></thead><tbody>
        ${ledger.map(l=>`<tr><td class="nowrap">${fmtDate(l.createdAt)}</td><td>${l.kind==="redeem"?t("cust.led.redeem",{code:esc(l.reason)}):(l.reason==="adjust"||l.reason==="welcome"?t("cust.led."+l.reason):esc(l.reason))}</td><td class="num ${l.points<0?"money-out":"money-in"}">${l.points>0?"+":""}${num(l.points)}</td></tr>`).join("") || emptyRow(3,t("cust.led.empty"))}
      </tbody></table></div>
      <h3 class="sec-h sec-gap">${t("cust.history")}</h3>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("cust.th.doc")}</th><th>${t("adm.th.date")}</th><th>${t("adm.th.status")}</th><th class="num">${t("sum.total")}</th><th class="num">${t("cust.th.points")}</th></tr></thead><tbody>
        ${c.history.map(h=>`<tr><td class="mono-tag">${esc(h.id)}${h.type==="invoice"?`<span class="cell-sub">${t("cust.doc.invoice")}</span>`:""}</td><td class="nowrap">${fmtDate(h.at)}</td><td>${h.type==="order"?statusPill(h.status):pill(t("inv.st."+h.status),INV_TONE[h.status]||"muted")}</td><td class="num">${money(h.total)}</td><td class="num">${h.points?"+"+num(h.points):"—"}</td></tr>`).join("") || emptyRow(5,t("cust.history.empty"))}
      </tbody></table></div>`,
      actions:[{ label:t("acct.saveChanges"), kind:"primary", onClick:(d)=>{
        VCRM.setProfile(id, { phone:val(d,"[data-f=phone]"), optIn:d.querySelector("[data-f=optIn]").checked, notes:val(d,"[data-f=notes]"),
          tags:[...new Set(val(d,"[data-f=tags]").split(",").map(s=>s.trim()).filter(Boolean))].slice(0,8) });
        VUI.toast(t("cust.saved")); ui.refresh(); } }] });
    dlg.querySelector("[data-adjust]").addEventListener("click", ()=>{
      const d2 = dialog({ title:t("cust.adjust"), body:`<div class="field"><label>${t("cust.adjust.points")}</label><input class="input" type="number" step="1" data-p value="" placeholder="+50 / -20"><span class="hint">${t("cust.adjust.hint")}</span></div>
        <div class="field"><label>${t("cust.led.reason")}</label><input class="input" data-r placeholder="${t("cust.adjust.reasonPh")}"></div>`,
        actions:[{ label:t("acct.save"), kind:"primary", onClick:(d)=>{ if(!report(VCRM.adjustPoints(id, val(d,"[data-p]"), val(d,"[data-r]")), "cust.adjust.done")) return false; setTimeout(reopen,0); } }] });
    });
    dlg.querySelector("[data-redeem]").addEventListener("click", ()=>{
      const d2 = dialog({ title:t("cust.redeem"), body:`<p class="hint-line" style="margin-top:0;">${t("cust.redeem.help",{max:num(c.points)})}</p>
        <div class="field"><label>${t("cust.redeem.points")}</label><input class="input" type="number" min="1" max="${c.points}" step="1" data-p value="${c.points}"><span class="hint" data-val></span></div>`,
        actions:[{ label:t("cust.redeem.go"), kind:"primary", onClick:(d)=>{ const res=VCRM.redeemPoints(id, val(d,"[data-p]")); if(!report(res)) return false;
          VUI.toast(t("cust.redeem.done",{code:res.coupon.code,amount:money(res.coupon.value)})); setTimeout(reopen,0); } }] });
      const upd = ()=>{ d2.querySelector("[data-val]").textContent = t("cust.redeem.value",{amount:money((+val(d2,"[data-p]")||0)*r.pointValue)}); };
      d2.querySelector("[data-p]").addEventListener("input", upd); upd();
    });
  }

  /* ============================ Cupones ============================ */
  const CPN_TONE = { active:"ok", scheduled:"info", expired:"muted", spent:"warn", off:"muted" };
  const cpnValue = c => c.type==="percent" ? c.value+"%" : money(c.value);

  function renderCoupons(panel){
    const list = VCRM.coupons(), users = Object.fromEntries(VDB.db.users.map(u=>[u.id,u]));
    const act = list.filter(c=>VCRM.couponStatus(c)==="active").length;
    panel.innerHTML = `
      ${kpis([{ label:t("cpn.kpi.active"), value:String(act) }, { label:t("cpn.kpi.total"), value:String(list.length) }, { label:t("cpn.kpi.uses"), value:num(list.reduce((s,c)=>s+c.uses,0)) }])}
      <div class="toolbar"><p class="hint-line" style="margin:0;">${t("cpn.scope")}</p><button class="btn btn-primary btn-sm" data-new>${VUI.icon("plus")} ${t("cpn.new")}</button></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>${t("cpn.th.code")}</th><th>${t("cpn.th.discount")}</th><th class="num">${t("cpn.th.min")}</th><th>${t("cpn.th.valid")}</th><th class="num">${t("cpn.th.uses")}</th><th>${t("cpn.th.for")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead>
        <tbody>${list.map(c=>{ const st=VCRM.couponStatus(c), u=c.userId&&users[c.userId]; return `<tr>
          <td><span class="cell-title mono-tag" style="font-size:12.5px;color:var(--foreground);">${esc(c.code)}</span>${c.note?`<span class="cell-sub">${esc(c.note)}</span>`:""}${c.source==="points"?`<span class="cell-sub">${t("cpn.fromPoints")}</span>`:""}</td>
          <td class="nowrap">${cpnValue(c)}</td><td class="num">${c.minSpend?money(c.minSpend):"—"}</td>
          <td class="nowrap">${c.from||c.to?`${c.from?fmtDate(dateMs(c.from)):"…"} → ${c.to?fmtDate(dateMs(c.to)):"…"}`:t("cpn.noLimit")}</td>
          <td class="num nowrap">${c.uses}${c.maxUses?" / "+c.maxUses:" / ∞"}</td><td>${u?esc(u.name):t("cpn.everyone")}</td><td>${pill(t("cpn.st."+st),CPN_TONE[st])}</td>
          <td class="actions"><span class="row-actions">
            <button title="${t("cpn.registerUse")}" aria-label="${t("cpn.registerUse")}" data-use="${c.id}" ${st==="active"?"":"disabled"}>${VUI.icon("check")}</button>
            <button title="${t(c.active?"cpn.disable":"cpn.enable")}" aria-label="${t(c.active?"cpn.disable":"cpn.enable")}" data-toggle="${c.id}">${VUI.icon("refresh")}</button>
            <button title="${t("acct.edit")}" aria-label="${t("acct.edit")}" data-edit="${c.id}">${VUI.icon("edit")}</button>
            <button class="danger" title="${t("acct.delete")}" aria-label="${t("acct.delete")}" data-del="${c.id}">${VUI.icon("trash")}</button></span></td></tr>`; }).join("") || emptyRow(8,t("cpn.empty"))}</tbody></table></div>`;
    panel.querySelector("[data-new]").addEventListener("click", ()=>couponDialog(null));
    panel.addEventListener("click",(e)=>{
      const b = e.target.closest("[data-use],[data-toggle],[data-edit],[data-del]"); if(!b || b.disabled) return;
      if(b.dataset.use){ if(report(VCRM.registerUse(b.dataset.use),"cpn.used")) ui.refresh(); }
      else if(b.dataset.toggle){ VCRM.toggleCoupon(b.dataset.toggle); ui.refresh(); }
      else if(b.dataset.edit) couponDialog(VCRM.coupon(b.dataset.edit));
      else if(b.dataset.del && confirm(t("cpn.confirmDel"))){ VCRM.deleteCoupon(b.dataset.del); ui.refresh(); }
    });
  }
  function dateMs(key){ return new Date(key+"T00:00:00").getTime(); }

  function couponDialog(c){
    const customers = VCRM.customers().sort((a,b)=>a.name.localeCompare(b.name));
    const dlg = dialog({ title:t(c?"cpn.edit":"cpn.new"), body:`
      <div class="f-grid">
        <div class="field"><label>${t("cpn.th.code")}</label><div style="display:flex;gap:6px;"><input class="input" data-f="code" value="${esc(c?c.code:"")}" maxlength="20" style="text-transform:uppercase;"><button type="button" class="btn btn-outline btn-sm" data-gen>${t("cpn.generate")}</button></div></div>
        <div class="field"><label>${t("cpn.type")}</label><select class="input" data-f="type"><option value="percent" ${c&&c.type==="percent"||!c?"selected":""}>${t("cpn.type.percent")}</option><option value="fixed" ${c&&c.type==="fixed"?"selected":""}>${t("cpn.type.fixed",{c:VDB.db.settings.currency})}</option></select></div>
        <div class="field"><label>${t("cpn.value")}</label><input class="input" type="number" min="0" step="0.01" data-f="value" value="${c?c.value:10}"></div>
        <div class="field"><label>${t("cpn.th.min")}</label><input class="input" type="number" min="0" step="1" data-f="minSpend" value="${c?c.minSpend:0}"></div>
        <div class="field"><label>${t("cpn.from")}</label><input class="input" type="date" data-f="from" value="${c&&c.from||""}"></div>
        <div class="field"><label>${t("cpn.to")}</label><input class="input" type="date" data-f="to" value="${c&&c.to||""}"></div>
        <div class="field"><label>${t("cpn.maxUses")}</label><input class="input" type="number" min="0" step="1" data-f="maxUses" value="${c?c.maxUses:0}"><span class="hint">${t("cpn.maxUsesHint")}</span></div>
        <div class="field"><label>${t("cpn.th.for")}</label><select class="input" data-f="userId"><option value="">${t("cpn.everyone")}</option>${customers.map(u=>`<option value="${u.id}" ${c&&c.userId===u.id?"selected":""}>${esc(u.name)}</option>`).join("")}</select></div>
        <div class="field full"><label>${t("cpn.note")}</label><input class="input" data-f="note" value="${esc(c?c.note:"")}"></div>
      </div>`,
      actions:[{ label:t("acct.save"), kind:"primary", onClick:(d)=>{
        const f = k=>val(d,"[data-f="+k+"]");
        if(!report(VCRM.saveCoupon({ id:c&&c.id, active:c?c.active:true, code:f("code"), type:f("type"), value:f("value"), minSpend:f("minSpend"), from:f("from")||null, to:f("to")||null, maxUses:f("maxUses"), userId:f("userId")||null, note:f("note") }), "cpn.saved")) return false;
        ui.refresh(); } }] });
    dlg.querySelector("[data-gen]").addEventListener("click", ()=>{ dlg.querySelector("[data-f=code]").value = "PROMO"+Math.random().toString(36).slice(2,6).toUpperCase(); });
  }

  /* ============================ Campañas ============================ */
  const TEMPLATES = ["winback","promo","thanks"];
  const SEG_FOR_TPL = { winback:"risk", promo:"all", thanks:"vip" };

  function renderCampaigns(panel){
    const list = VCRM.campaigns();
    panel.innerHTML = `
      <div class="toolbar"><p class="hint-line" style="margin:0;max-width:640px;">${t("cmp.help")}</p><button class="btn btn-primary btn-sm" data-new>${VUI.icon("plus")} ${t("cmp.new")}</button></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>${t("cmp.th.name")}</th><th>${t("cmp.th.channel")}</th><th>${t("cmp.th.segment")}</th><th>${t("cmp.th.coupon")}</th><th>${t("cmp.th.sent")}</th><th>${t("adm.th.date")}</th><th></th></tr></thead>
        <tbody>${list.map(m=>{ const sent=m.recipients.filter(r=>r.sentAt).length, cp=m.couponId&&VCRM.coupon(m.couponId); return `<tr data-open="${m.id}">
          <td class="cell-title">${esc(m.name)}</td><td>${pill(t("cmp.ch."+m.channel), m.channel==="whatsapp"?"ok":"info")}</td><td>${segPill(m.segment)}</td>
          <td class="mono-tag">${cp?esc(cp.code):"—"}</td>
          <td style="min-width:120px;">${sent} / ${m.recipients.length}<span class="mini-bar"><i style="width:${m.recipients.length?sent/m.recipients.length*100:0}%"></i></span></td>
          <td class="nowrap">${fmtDate(m.createdAt)}</td>
          <td class="actions"><span class="row-actions"><button class="danger" title="${t("acct.delete")}" aria-label="${t("acct.delete")}" data-del="${m.id}">${VUI.icon("trash")}</button></span></td></tr>`; }).join("") || emptyRow(7,t("cmp.empty"))}</tbody></table></div>`;
    panel.querySelector("[data-new]").addEventListener("click", campaignDialog);
    panel.querySelector("tbody").addEventListener("click",(e)=>{
      const del = e.target.closest("[data-del]");
      if(del){ if(confirm(t("cmp.confirmDel"))){ VCRM.deleteCampaign(del.dataset.del); ui.refresh(); } return; }
      const tr = e.target.closest("[data-open]"); if(tr) openCampaign(tr.dataset.open);
    });
  }

  function campaignDialog(){
    const coupons = VCRM.coupons().filter(c=>VCRM.couponStatus(c)==="active");
    const dlg = dialog({ title:t("cmp.new"), wide:true, body:`
      <div class="f-grid">
        <div class="field"><label>${t("cmp.th.name")}</label><input class="input" data-f="name" placeholder="${t("cmp.namePh")}"></div>
        <div class="field"><label>${t("cmp.th.channel")}</label><select class="input" data-f="channel"><option value="whatsapp">${t("cmp.ch.whatsapp")}</option><option value="email">${t("cmp.ch.email")}</option></select></div>
        <div class="field"><label>${t("cmp.th.segment")}</label><select class="input" data-f="segment">${VCRM.SEGMENTS.map(k=>`<option value="${k}">${t("seg."+k)}</option>`).join("")}</select></div>
        <div class="field"><label>${t("cmp.coupon")}</label><select class="input" data-f="couponId"><option value="">${t("cmp.noCoupon")}</option>${coupons.map(c=>`<option value="${c.id}">${esc(c.code)} · ${cpnValue(c)}</option>`).join("")}</select></div>
        <div class="field full"><label>${t("cmp.template")}</label><select class="input" data-tpl>${TEMPLATES.map(k=>`<option value="${k}">${t("tpl."+k)}</option>`).join("")}</select></div>
        <div class="field full" data-subject-field hidden><label>${t("cmp.subject")}</label><input class="input" data-f="subject"></div>
        <div class="field full"><label>${t("cmp.message")}</label><textarea class="input" data-f="message" style="min-height:110px;"></textarea><span class="hint">${t("cmp.vars")}</span></div>
      </div>
      <div class="callout" data-audience></div>
      <h3 class="sec-h">${t("cmp.preview")}</h3><div class="pre-box" data-preview></div>`,
      actions:[{ label:t("cmp.create"), kind:"primary", onClick:(d)=>{
        const f = k=>val(d,"[data-f="+k+"]");
        const res = VCRM.createCampaign({ name:f("name"), channel:f("channel"), segment:f("segment"), couponId:f("couponId")||null, subject:f("subject"), message:f("message") });
        if(!report(res)) return false;
        ui.refresh(); setTimeout(()=>openCampaign(res.campaign.id),0); } }] });
    const f = k=>dlg.querySelector("[data-f="+k+"]");
    const applyTpl = ()=>{ const k=dlg.querySelector("[data-tpl]").value; f("message").value=t("tpl."+k+".msg"); f("subject").value=t("tpl."+k+".subj"); f("segment").value=SEG_FOR_TPL[k]; refresh(); };
    const refresh = ()=>{
      const ch=f("channel").value, aud=VCRM.audience(f("segment").value, ch), coupon=f("couponId").value?VCRM.coupon(f("couponId").value):null;
      dlg.querySelector("[data-subject-field]").hidden = ch!=="email";
      const needCoupon = f("message").value.includes("{cupon}") && !coupon;   // avisar antes de mandar «usa el cupón .»
      dlg.querySelector("[data-audience]").innerHTML = `<div><p><b>${VI18N.tp("cmp.aud.will",aud.eligible.length)}</b> · ${t("cmp.aud.skipped",{a:aud.skipped.optOut,b:aud.skipped.noContact,contact:t(ch==="whatsapp"?"cmp.aud.noPhone":"cmp.aud.noEmail")})}</p>${needCoupon?`<p class="tx-warn" style="margin-top:4px;">${t("cmp.needCoupon")}</p>`:""}</div>`;
      const sample = aud.eligible[0];
      dlg.querySelector("[data-preview]").textContent = sample ? VCRM.render(f("message").value, sample, coupon) : t("cmp.aud.none");
    };
    dlg.querySelector("[data-tpl]").addEventListener("change", applyTpl);
    ["channel","segment","couponId","message"].forEach(k=>f(k).addEventListener(k==="message"?"input":"change", refresh));
    applyTpl();
  }

  function openCampaign(id){
    const m = VCRM.campaign(id); if(!m) return;
    const coupon = m.couponId && VCRM.coupon(m.couponId);
    const rows = ()=>m.recipients.map(r=>{
      const c = VCRM.customer(r.userId); if(!c) return "";
      return `<tr data-r="${r.userId}"><td class="cell-title">${esc(c.name)}</td><td>${esc(m.channel==="whatsapp"?c.phone:c.email)}</td>
        <td data-state>${r.sentAt?pill(t("cmp.sentOn",{date:fmtDate(r.sentAt)}),"ok"):pill(t("cmp.pending"),"muted")}</td>
        <td class="actions"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" data-send href="${esc(VCRM.linkFor(m,r.userId))}">${t(m.channel==="whatsapp"?"cmp.openWa":"cmp.openMail")}</a></td></tr>`;
    }).join("");
    const dlg = dialog({ title:m.name, wide:true, body:`
      <p class="hint-line" style="margin-top:0;">${pill(t("cmp.ch."+m.channel), m.channel==="whatsapp"?"ok":"info")} ${segPill(m.segment)}${coupon?` · ${t("cmp.th.coupon")}: <b>${esc(coupon.code)}</b>`:""}</p>
      ${m.channel==="email"?`<h3 class="sec-h">${t("cmp.subject")}</h3><div class="pre-box">${esc(m.subject)}</div>`:""}
      <h3 class="sec-h">${t("cmp.message")}</h3><div class="pre-box">${esc(m.message)}</div>
      <h3 class="sec-h">${t("cmp.recipients",{n:m.recipients.length})}</h3><p class="hint-line">${t("cmp.sendHelp")}</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.customer")}</th><th>${t(m.channel==="whatsapp"?"cust.phone":"adm.th.email")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead><tbody>${rows()}</tbody></table></div>`,
      onClose:()=>ui.refresh() });
    // el enlace se abre en pestaña nueva; al hacer clic se anota como enviado
    dlg.querySelector("tbody").addEventListener("click",(e)=>{
      if(!e.target.closest("[data-send]")) return;
      const tr = e.target.closest("tr"); VCRM.markSent(m.id, tr.dataset.r);
      tr.querySelector("[data-state]").innerHTML = pill(t("cmp.sentOn",{date:fmtDate(Date.now())}),"ok");
    });
  }

  /* ============================ montaje ============================ */
  ui = tabs(content, [
    { id:"clientes", label:t("cust.tab.customers"), render:renderCustomers },
    { id:"cupones", label:t("cust.tab.coupons"), render:renderCoupons },
    { id:"campanas", label:t("cust.tab.campaigns"), render:renderCampaigns },
  ]);
})();
