/* Admin › Facturación — facturas, caja diaria, cuentas por cobrar y por pagar, resultados y ajustes.
   La factura es un documento interno imprimible (factura.html): no se envía a ninguna autoridad fiscal. */
(function(){
  "use strict";
  const { T:t, esc, money, fmtDate, pct, kpis, pill, emptyRow, tabs, dialog, report, val, methodOpts, stamp } = VADMIN;
  const num = n => VI18N.fmtNum(n);
  document.title = t("bill.title");
  const content = VADMIN.mountAdmin("facturacion.html", t("adm.nav.billing"), t("bill.sub"));

  const INV_TONE = { paid:"ok", pending:"muted", partial:"info", overdue:"bad", void:"muted", credited:"muted", credit:"info" };
  const neg = n => "−"+money(n);
  // "signed": una nota de crédito resta, así que se muestra en negativo
  const amt = i => i.kind==="credit" ? neg(i.total) : money(i.total);
  const METHODS = ["cash","card","transfer"];
  const timeOf = ts => new Date(ts).toLocaleTimeString(VI18N.locale,{hour:"2-digit",minute:"2-digit"});
  let ui, invView = "invoices", cajaDate = VNEG.todayKey();

  const paymentDialog = o => VADMIN.paymentDialog(Object.assign({ onDone:()=>ui.refresh() }, o));

  /* ============================ Facturas ============================ */
  function renderInvoices(panel){
    const all = VFIN.invoices(), unb = VFIN.unbilledOrders(), rc = VFIN.receivables();
    const m0 = new Date(); m0.setDate(1); m0.setHours(0,0,0,0);
    const monthInv = all.filter(i=>i.status!=="void" && i.issuedAt>=m0.getTime());
    const monthNet = monthInv.reduce((s,i)=>s+(i.kind==="credit"?-i.total:i.total),0);   // facturado neto de rectificaciones
    panel.innerHTML = `
      ${kpis([
        { label:t("bill.kpi.month"), value:money(monthNet), sub:VI18N.tp("bill.kpi.nInvoices",monthInv.length) },
        { label:t("bill.kpi.receivable"), value:money(rc.reduce((s,r)=>s+r.balance,0)), sub:t("bill.kpi.overdue",{amount:money(rc.filter(r=>r.daysLate>0).reduce((s,r)=>s+r.balance,0))}), tone:rc.some(r=>r.daysLate>0)?"warn":"" },
        { label:t("bill.kpi.unbilled"), value:num(unb.length), sub:money(unb.reduce((s,o)=>s+o.total,0)), tone:unb.length?"warn":"" },
      ])}
      <div class="toolbar"><div class="toolbar-left">
        <div class="seg-toggle"><button type="button" data-view="invoices" aria-pressed="${invView==="invoices"}">${t("bill.view.invoices")}</button><button type="button" data-view="unbilled" aria-pressed="${invView==="unbilled"}">${t("bill.view.unbilled")} (${unb.length})</button></div>
        ${invView==="invoices"?`<input class="input" type="search" placeholder="${t("bill.searchPh")}" data-search style="min-width:240px;">
        <select class="input" data-status><option value="">${t("adm.ord.allStatus")}</option>${["paid","pending","partial","overdue","credited","credit","void"].map(s=>`<option value="${s}">${t("inv.st."+s)}</option>`).join("")}</select>`:""}
      </div><div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${invView==="unbilled"&&unb.length?`<button class="btn btn-outline btn-sm" data-bill-all>${t("bill.billAll",{n:unb.length})}</button>`:""}
        <button class="btn btn-primary btn-sm" data-new>${VUI.icon("plus")} ${t("bill.new")}</button></div></div>
      ${invView==="invoices" ? `
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("inv.number")}</th><th>${t("adm.th.date")}</th><th>${t("adm.th.customer")}</th><th class="num">${t("sum.total")}</th><th class="num">${t("bill.th.balance")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`
      : `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.order")}</th><th>${t("adm.th.date")}</th><th>${t("adm.th.customer")}</th><th class="num">${t("sum.total")}</th><th></th></tr></thead><tbody>
        ${unb.map(o=>{ const u=VDB.db.users.find(x=>x.id===o.userId); return `<tr><td class="mono-tag">${esc(o.id)}</td><td class="nowrap">${fmtDate(o.createdAt)}</td><td>${u?esc(u.name):"—"}</td><td class="num">${money(o.total)}</td><td class="actions"><button class="btn btn-outline btn-sm" data-bill="${o.id}">${t("bill.issue")}</button></td></tr>`; }).join("") || emptyRow(5,t("bill.unbilled.empty"))}</tbody></table></div>`}`;

    panel.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{ invView=b.dataset.view; ui.refresh(); }));
    panel.querySelector("[data-new]").addEventListener("click", newInvoiceDialog);
    const ba = panel.querySelector("[data-bill-all]");
    if(ba) ba.addEventListener("click",()=>{ VUI.toast(VI18N.tp("bill.billedN",VFIN.invoiceAllUnbilled())); ui.refresh(); });
    panel.querySelectorAll("[data-bill]").forEach(b=>b.addEventListener("click",()=>{ if(report(VFIN.invoiceFromOrder(b.dataset.bill),"bill.issued")) ui.refresh(); }));
    if(invView!=="invoices") return;

    const paint = ()=>{
      const q = val(panel,"[data-search]").trim().toLowerCase(), st = val(panel,"[data-status]");
      const list = all.filter(i=>{ const s=VFIN.state(i); return (!st||s.state===st) && (!q || i.number.toLowerCase().includes(q) || i.customer.name.toLowerCase().includes(q) || (i.orderId||"").toLowerCase().includes(q)); });
      panel.querySelector("[data-rows]").innerHTML = list.map(i=>{
        const s=VFIN.state(i), credit=i.kind==="credit", orig=credit?VFIN.getInvoice(i.rectifies):null, by=!credit?VFIN.creditsOf(i)[0]:null;
        // reglas: se cobra lo que tiene saldo; se anula solo lo que nunca movió dinero; lo cobrado se rectifica con nota de crédito;
        // las facturas de pedido no se tocan (se rectifican solas al cancelar el pedido)
        const canPay = s.balance>0 && !i.settledByOrder && !credit;
        const canVoid = !credit && i.status==="issued" && !i.orderId && !i.payments.length && s.state!=="credited";
        const canCredit = !credit && i.status==="issued" && !i.orderId && i.payments.length>0 && s.state!=="credited";
        return `<tr>
        <td><span class="cell-title mono-tag" style="font-size:12.5px;color:var(--foreground);">${esc(i.number)}</span>${credit?`<span class="cell-sub">${t("inv.rectifies",{number:esc(orig?orig.number:"—")})}</span>`:i.orderId?`<span class="cell-sub">${t("inv.fromOrder",{id:esc(i.orderId)})}</span>`:""}${by?`<span class="cell-sub">${t("inv.rectifiedBy",{number:esc(by.number)})}</span>`:""}</td>
        <td class="nowrap">${fmtDate(i.issuedAt)}</td><td>${esc(i.customer.name)}</td><td class="num ${credit?"money-out":""}">${amt(i)}</td>
        <td class="num">${s.balance?money(s.balance):"—"}</td><td>${pill(t("inv.st."+s.state),INV_TONE[s.state])}</td>
        <td class="actions"><span class="row-actions">
          <a title="${t("inv.view")}" aria-label="${t("inv.view")}" target="_blank" rel="noopener" href="factura.html?id=${i.id}">${VUI.icon("search")}</a>
          ${canPay?`<button title="${t("bill.collect")}" aria-label="${t("bill.collect")}" data-pay="${i.id}">${VUI.icon("check")}</button>`:""}
          ${canCredit?`<button title="${t("inv.creditNote")}" aria-label="${t("inv.creditNote")}" data-credit="${i.id}">${VUI.icon("refresh")}</button>`:""}
          ${canVoid?`<button class="danger" title="${t("inv.void")}" aria-label="${t("inv.void")}" data-void="${i.id}">${VUI.icon("trash")}</button>`:""}</span></td></tr>`; }).join("") || emptyRow(7);
    };
    paint();
    panel.querySelectorAll("[data-search],[data-status]").forEach(el=>el.addEventListener(el.tagName==="INPUT"?"input":"change", paint));
    panel.querySelector("[data-rows]").addEventListener("click",(e)=>{
      const p = e.target.closest("[data-pay]"), v = e.target.closest("[data-void]"), c = e.target.closest("[data-credit]");
      if(c) creditDialog(VFIN.getInvoice(c.dataset.credit));
      if(p){ const inv=VFIN.getInvoice(p.dataset.pay), s=VFIN.state(inv); paymentDialog({ title:t("bill.collect"), subtitle:`${esc(inv.number)} · ${esc(inv.customer.name)}`, balance:s.balance, onSave:d=>VFIN.addPayment(inv.id,d) }); }
      if(v && confirm(t("inv.confirmVoid"))){ if(report(VFIN.voidInvoice(v.dataset.void),"inv.voided")) ui.refresh(); }
    });
  }

  // Una factura con cobros no se anula: se emite una nota de crédito que la rectifica, devuelve el dinero y, si procede, el stock.
  function creditDialog(inv){
    const s = VFIN.state(inv), hasGoods = inv.lines.some(l=>l.productId);
    dialog({ title:t("inv.creditNote")+" · "+inv.number, body:`
      <p class="hint-line" style="margin-top:0;">${t("inv.credit.help",{number:esc(inv.number)})}</p>
      <div class="f-grid">
        <div class="field full"><label>${t("inv.credit.reason")}</label><input class="input" data-f="reason" placeholder="${t("inv.credit.reasonPh")}"></div>
        ${s.paid>0?`<div class="field full"><label>${t("inv.credit.refund",{amount:money(s.paid)})}</label><select class="input" data-f="method">${methodOpts("cash")}</select></div>`:""}
        ${hasGoods?`<div class="field full"><label class="checkbox-row"><input type="checkbox" data-f="stock" checked> ${t("inv.credit.returnStock")}</label></div>`:""}
      </div>`,
      actions:[{ label:t("inv.credit.go"), kind:"danger", onClick:(d)=>{
        const res = VFIN.creditNote(inv.id,{ reason:val(d,"[data-f=reason]"), refundMethod:val(d,"[data-f=method]")||"cash", returnStock:hasGoods ? d.querySelector("[data-f=stock]").checked : false });
        if(!report(res,"inv.credit.done")) return false; ui.refresh(); } }] });
  }

  function newInvoiceDialog(){
    const b = VFIN.business(), customers = VCRM.customers().sort((a,c)=>a.name.localeCompare(c.name)), products = VDB.db.products, cur = VDB.db.settings.currency;
    const byTitle = new Map(products.map(p=>[p.title,p]));
    const dlg = dialog({ title:t("bill.new"), wide:true, body:`
      <datalist id="inv-products">${products.map(p=>`<option value="${esc(p.title)}"></option>`).join("")}</datalist>
      <div class="f-grid three">
        <div class="field"><label>${t("adm.th.customer")}</label><select class="input" data-f="user"><option value="">${t("bill.walkin")}</option>${customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label>${t("bill.cname")}</label><input class="input" data-f="name"></div>
        <div class="field"><label>${t("bill.taxId")}</label><input class="input" data-f="taxId"></div>
        <div class="field"><label>${t("adm.th.email")}</label><input class="input" data-f="email"></div>
        <div class="field" style="grid-column:span 2;"><label>${t("acct.address")}</label><input class="input" data-f="address"></div>
      </div>
      <h3 class="sec-h">${t("bill.lines")}</h3>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("bill.line.desc")}</th><th class="num" style="width:80px;">${t("bill.line.qty")}</th><th class="num" style="width:110px;">${t("bill.line.price",{c:cur})}</th><th class="num" style="width:100px;">${t("bill.line.amount")}</th><th style="width:36px;"></th></tr></thead><tbody data-lines></tbody></table></div>
      <button type="button" class="btn btn-outline btn-sm" data-add-line style="margin-bottom:16px;">${VUI.icon("plus")} ${t("bill.addLine")}</button>
      <div class="f-grid three">
        <div class="field"><label>${t("bill.tax")}</label><input class="input" type="number" min="0" step="0.01" data-f="taxRate" value="${b.taxRate}"></div>
        <div class="field"><label>${t("bill.terms")}</label><select class="input" data-f="terms"><option value="0">${t("bill.cash")}</option><option value="15">${t("bill.credit",{n:15})}</option><option value="30">${t("bill.credit",{n:30})}</option><option value="60">${t("bill.credit",{n:60})}</option></select></div>
        <div class="field" data-method-field><label>${t("pay.method")}</label><select class="input" data-f="method">${methodOpts("cash")}</select></div>
        <div class="field full"><label>${t("inv.note")}</label><input class="input" data-f="note"></div>
      </div>
      <div class="dlg-sum"><div><span>${t("inv.subtotal")}</span><span data-sub></span></div><div><span>${t("inv.tax")}</span><span data-tax></span></div><div class="grand"><span>${t("sum.total")}</span><span data-total></span></div></div>`,
      actions:[{ label:t("bill.emit"), kind:"primary", onClick:(d)=>{
        const f = k=>val(d,"[data-f="+k+"]");
        const lines = [...d.querySelectorAll("[data-line]")].filter(r=>r.querySelector("[data-desc]").value.trim()).map(r=>({ productId:r.dataset.pid||null, desc:val(r,"[data-desc]").trim(), qty:val(r,"[data-qty]"), price:val(r,"[data-price]") }));
        const res = VFIN.createInvoice({ userId:f("user")||null, customer:{ name:f("name"), taxId:f("taxId"), email:f("email"), address:f("address") }, lines, taxRate:f("taxRate"), creditDays:f("terms"), method:f("method"), note:f("note") });
        if(!report(res,"bill.issued")) return false;
        ui.refresh(); window.open("factura.html?id="+res.invoice.id, "_blank"); } }] });

    const tbody = dlg.querySelector("[data-lines]");
    const recalc = ()=>{
      let sub = 0;
      tbody.querySelectorAll("[data-line]").forEach(r=>{ const a=(+val(r,"[data-qty]")||0)*(+val(r,"[data-price]")||0); sub+=a; r.querySelector("[data-amount]").textContent=money(a); });
      const tax = Math.round(sub*(+val(dlg,"[data-f=taxRate]")||0))/100;
      dlg.querySelector("[data-sub]").textContent=money(sub); dlg.querySelector("[data-tax]").textContent=money(tax); dlg.querySelector("[data-total]").textContent=money(sub+tax);
    };
    function addLine(){
      const tr = document.createElement("tr"); tr.dataset.line = "";
      tr.innerHTML = `<td><input class="input" list="inv-products" data-desc placeholder="${t("bill.line.ph")}"><span class="cell-sub" data-stock></span></td><td><input class="input num" type="number" min="1" step="1" value="1" data-qty></td><td><input class="input num" type="number" min="0" step="0.01" data-price></td><td class="num" data-amount>${money(0)}</td><td><button type="button" class="btn btn-ghost btn-sm" data-rm aria-label="${t("acct.delete")}">×</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector("[data-desc]").addEventListener("input",(e)=>{
        const p = byTitle.get(e.target.value);
        if(p){ tr.dataset.pid=p.id; tr.querySelector("[data-price]").value=p.price; tr.querySelector("[data-stock]").textContent=t("bill.line.stock",{n:p.stock}); }
        else { delete tr.dataset.pid; tr.querySelector("[data-stock]").textContent=""; }
        recalc();
      });
      return tr;
    }
    dlg.querySelector("[data-add-line]").addEventListener("click", ()=>addLine().querySelector("[data-desc]").focus());
    tbody.addEventListener("input", recalc);
    tbody.addEventListener("click",(e)=>{ if(e.target.closest("[data-rm]")&&tbody.children.length>1){ e.target.closest("tr").remove(); recalc(); } });
    dlg.querySelector("[data-f=taxRate]").addEventListener("input", recalc);
    dlg.querySelector("[data-f=terms]").addEventListener("change",(e)=>{ dlg.querySelector("[data-method-field]").hidden = e.target.value!=="0"; });
    dlg.querySelector("[data-f=user]").addEventListener("change",(e)=>{
      const c = customers.find(x=>x.id===e.target.value); if(!c) return;
      dlg.querySelector("[data-f=name]").value=c.name; dlg.querySelector("[data-f=email]").value=c.email;
      dlg.querySelector("[data-f=address]").value=VNEG.addrLine(c.user.addresses[0]);
    });
    addLine(); recalc();
  }

  /* ============================ Caja ============================ */
  function renderCaja(panel){
    const rep = VFIN.dayReport(cajaDate), cl = rep.closing, today = VNEG.todayKey();
    const kindLabel = r => r.kind==="order" ? t("cash.k.order",{ref:esc(r.ref)}) : r.kind==="invoice" ? t("cash.k.invoice",{ref:esc(r.ref)}) : r.kind==="supplier" ? t("cash.k.supplier",{ref:esc(r.ref)}) : r.kind==="refund" ? t("cash.k.refund",{ref:esc(r.ref)}) : t("cash.cat."+r.category);
    const lateLive = cl && (Math.abs(rep.totalIn-cl.totalIn)>0.005 || Math.abs(rep.totalOut-cl.totalOut)>0.005);
    panel.innerHTML = `
      <div class="toolbar"><div class="toolbar-left">
        <input class="input" type="date" data-date value="${cajaDate}" max="${today}">
        <div class="seg-toggle"><button type="button" data-day="0" aria-pressed="${cajaDate===today}">${t("cash.today")}</button><button type="button" data-day="1" aria-pressed="${cajaDate===VNEG.dayKey(Date.now()-VNEG.DAY)}">${t("cash.yesterday")}</button></div>
        ${cl?pill(t("cash.closed"),"ok"):pill(t("cash.open"),"info")}
      </div><button class="btn btn-outline btn-sm" data-expense ${cl?"disabled":""}>${VUI.icon("plus")} ${t("cash.addExpense")}</button></div>
      ${kpis([
        { label:t("cash.in"), value:money(rep.totalIn), tone:"ok" }, { label:t("cash.out"), value:money(rep.totalOut), tone:rep.totalOut?"bad":"" },
        { label:t("cash.expected"), value:money(rep.expectedCash), sub:t("cash.expectedSub",{opening:money(rep.opening)}) },
      ])}
      ${lateLive?`<div class="callout warn"><p>${t("cash.late")}</p></div>`:""}
      <div class="two-cols-eq">
        <div>
          <h3 class="sec-h">${t("cash.movements")}</h3>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("cash.time")}</th><th>${t("cash.concept")}</th><th>${t("pay.method")}</th><th class="num">${t("cash.amount")}</th><th></th></tr></thead><tbody>
            ${rep.rows.map(r=>`<tr><td class="nowrap">${timeOf(r.ts)}</td><td><span class="cell-title">${esc(r.label)}</span><span class="cell-sub">${kindLabel(r)}</span></td><td>${t("pay."+r.method)}</td>
              <td class="num ${r.dir==="in"?"money-in":"money-out"}">${r.dir==="in"?"+":"−"}${money(r.amount)}</td>
              <td class="actions">${r.kind==="expense"&&!cl?`<span class="row-actions"><button class="danger" data-del-exp="${r.ref}" title="${t("acct.delete")}" aria-label="${t("acct.delete")}">${VUI.icon("trash")}</button></span>`:""}</td></tr>`).join("") || emptyRow(5,t("cash.empty"))}
          </tbody></table></div>
          <h3 class="sec-h sec-gap">${t("cash.byMethod")}</h3>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("pay.method")}</th><th class="num">${t("cash.in")}</th><th class="num">${t("cash.out")}</th></tr></thead><tbody>
            ${METHODS.map(m=>`<tr><td>${t("pay."+m)}</td><td class="num">${money(rep.tot.in[m])}</td><td class="num">${money(rep.tot.out[m])}</td></tr>`).join("")}</tbody></table></div>
        </div>
        <div>
          <h3 class="sec-h">${t("cash.closing")}</h3>
          <div class="chart-box" data-closing>
            ${cl ? `
              <div class="dlg-sum" style="margin:0;width:100%;">
                <div><span>${t("cash.opening")}</span><span>${money(cl.opening)}</span></div><div><span>${t("cash.expected")}</span><span>${money(cl.expectedCash)}</span></div>
                <div><span>${t("cash.counted")}</span><span>${money(cl.counted)}</span></div>
                <div class="grand"><span>${t("cash.diff")}</span><span class="${cl.diff<0?"money-out":cl.diff>0?"tx-warn":"money-in"}">${cl.diff>0?"+":""}${money(cl.diff)}</span></div></div>
              ${cl.note?`<p class="hint-line" style="margin:12px 0 0;">${esc(cl.note)}</p>`:""}<p class="hint-line" style="margin:8px 0 0;">${t("cash.closedAt",{date:fmtDate(cl.closedAt),time:timeOf(cl.closedAt)})}</p>`
            : `<div class="field"><label>${t("cash.opening")}</label><input class="input" type="number" min="0" step="0.01" data-opening value="${rep.opening}"><span class="hint">${t("cash.openingHint")}</span></div>
              <div class="dlg-sum" style="margin:0 0 14px;width:100%;"><div><span>${t("cash.expected")}</span><span data-exp>${money(rep.expectedCash)}</span></div></div>
              <div class="field"><label>${t("cash.counted")}</label><input class="input" type="number" min="0" step="0.01" data-counted placeholder="0.00"></div>
              <div class="dlg-sum" style="margin:0 0 14px;width:100%;"><div class="grand" style="border:0;margin:0;padding:0;"><span>${t("cash.diff")}</span><span data-diff>—</span></div></div>
              <div class="field"><label>${t("cash.note")}</label><input class="input" data-note></div>
              <button class="btn btn-primary btn-block" data-close ${cajaDate>today?"disabled":""}>${t("cash.close")}</button>`}
          </div>
        </div>
      </div>
      <h3 class="sec-h sec-gap">${t("cash.history")}</h3>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.date")}</th><th class="num">${t("cash.opening")}</th><th class="num">${t("cash.expected")}</th><th class="num">${t("cash.counted")}</th><th class="num">${t("cash.diff")}</th><th class="num">${t("cash.in")}</th><th class="num">${t("cash.out")}</th></tr></thead><tbody>
        ${VFIN.closings().map(c=>`<tr data-day-open="${c.date}" data-open><td class="nowrap">${fmtDate(VNEG.dayStart(c.date))}</td><td class="num">${money(c.opening)}</td><td class="num">${money(c.expectedCash)}</td><td class="num">${money(c.counted)}</td><td class="num ${c.diff<0?"money-out":c.diff>0?"tx-warn":""}">${c.diff>0?"+":""}${money(c.diff)}</td><td class="num">${money(c.totalIn)}</td><td class="num">${money(c.totalOut)}</td></tr>`).join("") || emptyRow(7,t("cash.history.empty"))}
      </tbody></table></div>`;

    const go = key => { cajaDate = key || today; ui.refresh(); };
    panel.querySelector("[data-date]").addEventListener("change",(e)=>go(e.target.value));
    panel.querySelectorAll("[data-day]").forEach(b=>b.addEventListener("click",()=>go(VNEG.dayKey(Date.now()-(+b.dataset.day)*VNEG.DAY))));
    panel.querySelectorAll("[data-day-open]").forEach(tr=>tr.addEventListener("click",()=>go(tr.dataset.dayOpen)));
    panel.querySelector("[data-expense]").addEventListener("click", ()=>expenseDialog());
    panel.querySelectorAll("[data-del-exp]").forEach(b=>b.addEventListener("click",()=>{ if(confirm(t("cash.confirmDelExp")) && report(VFIN.deleteExpense(b.dataset.delExp))) ui.refresh(); }));
    if(!cl){
      const upd = ()=>{
        const exp = Math.round(((+val(panel,"[data-opening]")||0)+rep.tot.in.cash-rep.tot.out.cash)*100)/100, raw = val(panel,"[data-counted]");
        panel.querySelector("[data-exp]").textContent = money(exp);
        const dEl = panel.querySelector("[data-diff]");
        if(raw===""){ dEl.textContent="—"; dEl.className=""; return; }
        const diff = Math.round((+raw-exp)*100)/100; dEl.textContent=(diff>0?"+":"")+money(diff); dEl.className = diff<0?"money-out":diff>0?"tx-warn":"money-in";
      };
      panel.querySelectorAll("[data-opening],[data-counted]").forEach(i=>i.addEventListener("input", upd));
      panel.querySelector("[data-close]").addEventListener("click",()=>{
        if(val(panel,"[data-counted]")===""){ VUI.toast(t("cash.needCount")); return; }
        if(!confirm(t("cash.confirmClose"))) return;
        if(report(VFIN.closeDay(cajaDate, val(panel,"[data-opening]"), val(panel,"[data-counted]"), val(panel,"[data-note]")),"cash.closedOk")) ui.refresh();
      });
    }
  }

  function expenseDialog(){
    dialog({ title:t("cash.addExpense"), body:`<div class="f-grid">
      <div class="field full"><label>${t("cash.concept")}</label><input class="input" data-f="concept" placeholder="${t("cash.conceptPh")}"></div>
      <div class="field"><label>${t("cash.category")}</label><select class="input" data-f="category">${VFIN.EXPENSE_CATS.map(c=>`<option value="${c}">${t("cash.cat."+c)}</option>`).join("")}</select></div>
      <div class="field"><label>${t("cash.amount")}</label><input class="input" type="number" min="0.01" step="0.01" data-f="amount"></div>
      <div class="field"><label>${t("pay.method")}</label><select class="input" data-f="method">${methodOpts("cash")}</select></div>
      <div class="field"><label>${t("adm.th.date")}</label><input class="input" type="date" data-f="date" value="${cajaDate}" max="${VNEG.todayKey()}"></div></div>`,
      actions:[{ label:t("acct.save"), kind:"primary", onClick:(d)=>{
        const f = k=>val(d,"[data-f="+k+"]");
        if(!report(VFIN.addExpense({ concept:f("concept"), category:f("category"), amount:f("amount"), method:f("method"), date:stamp(f("date")||cajaDate) }),"cash.expenseAdded")) return false;
        ui.refresh(); } }] });
  }

  /* ============================ Por cobrar / por pagar ============================ */
  const AGE = [["current","var(--success)","ar.current"],["d30","var(--warning)","ar.d30"],["d60","var(--destructive)","ar.d60"],["d90","var(--foreground)","ar.d90"]];
  function agingBlock(rows){
    const ag = VFIN.aging(rows), total = Object.values(ag).reduce((s,x)=>s+x,0);
    return `<div class="chart-box" style="margin-bottom:16px;"><h3 class="sec-h">${t("ar.aging")}</h3>
      <div class="aging-bar">${AGE.map(([k,c])=>ag[k]?`<i style="width:${ag[k]/total*100}%;background:${c}" title="${money(ag[k])}"></i>`:"").join("")}</div>
      <div class="aging-legend">${AGE.map(([k,c,lab])=>`<span><i style="background:${c}"></i>${t(lab)} <b>${money(ag[k])}</b></span>`).join("")}</div></div>`;
  }
  const lateCell = d => d>0 ? pill(t("ar.late",{n:d}),"bad") : pill(t("ar.onTime"),"ok");

  function renderReceivable(panel){
    const rows = VFIN.receivables(), total = rows.reduce((s,r)=>s+r.balance,0), over = rows.filter(r=>r.daysLate>0);
    panel.innerHTML = `${kpis([
      { label:t("ar.total"), value:money(total), sub:VI18N.tp("ar.nOpen",rows.length) },
      { label:t("ar.overdue"), value:money(over.reduce((s,r)=>s+r.balance,0)), sub:VI18N.tp("bill.kpi.nInvoices",over.length), tone:over.length?"bad":"" } ])}
      ${rows.length?agingBlock(rows):""}
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("inv.number")}</th><th>${t("adm.th.customer")}</th><th>${t("ar.issued")}</th><th>${t("ar.due")}</th><th class="num">${t("bill.th.balance")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead><tbody>
      ${rows.map(r=>{ const i=r.inv, prof=i.userId?VCRM.customer(i.userId):null, msg=t("ar.remind",{name:i.customer.name.split(" ")[0],number:i.number,amount:money(r.balance),store:VDB.db.settings.storeName||""});
        const remind = prof&&VNEG.waNumber(prof.phone) ? `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${VNEG.waLink(prof.phone,msg)}">${t("ar.remindWa")}</a>` : (i.customer.email?`<a class="btn btn-outline btn-sm" href="${esc(VNEG.mailLink(i.customer.email,t("ar.remindSubj",{number:i.number}),msg))}">${t("ar.remindMail")}</a>`:"");
        return `<tr><td class="mono-tag" style="color:var(--foreground);">${esc(i.number)}</td><td>${esc(i.customer.name)}</td><td class="nowrap">${fmtDate(i.issuedAt)}</td><td class="nowrap">${fmtDate(i.dueAt)}</td><td class="num">${money(r.balance)}</td><td>${lateCell(r.daysLate)}</td>
          <td class="actions"><span style="display:inline-flex;gap:6px;">${remind}<button class="btn btn-primary btn-sm" data-pay="${i.id}">${t("bill.collect")}</button></span></td></tr>`; }).join("") || emptyRow(7,t("ar.empty"))}
      </tbody></table></div>`;
    panel.querySelectorAll("[data-pay]").forEach(b=>b.addEventListener("click",()=>{ const inv=VFIN.getInvoice(b.dataset.pay); paymentDialog({ title:t("bill.collect"), subtitle:`${esc(inv.number)} · ${esc(inv.customer.name)}`, balance:VFIN.state(inv).balance, onSave:d=>VFIN.addPayment(inv.id,d) }); }));
  }

  function renderPayable(panel){
    const rows = VFIN.payables(), total = rows.reduce((s,r)=>s+r.balance,0), over = rows.filter(r=>r.daysLate>0);
    const soon = rows.filter(r=>r.daysLate<=0 && r.dueAt-Date.now()<=7*VNEG.DAY);
    panel.innerHTML = `${kpis([
      { label:t("ap.total"), value:money(total), sub:VI18N.tp("ap.nOpen",rows.length) },
      { label:t("ar.overdue"), value:money(over.reduce((s,r)=>s+r.balance,0)), sub:VI18N.tp("ap.nOrders",over.length), tone:over.length?"bad":"" },
      { label:t("ap.soon"), value:money(soon.reduce((s,r)=>s+r.balance,0)), sub:VI18N.tp("ap.nOrders",soon.length), tone:soon.length?"warn":"" } ])}
      ${rows.length?agingBlock(rows):""}
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("po.number")}</th><th>${t("po.supplier")}</th><th>${t("po.received")}</th><th>${t("ar.due")}</th><th class="num">${t("bill.th.balance")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead><tbody>
      ${rows.map(r=>{ const s=VBUY.supplier(r.po.supplierId); return `<tr><td class="mono-tag" style="color:var(--foreground);">${esc(r.po.number)}</td><td>${s?esc(s.name):"—"}</td><td class="nowrap">${fmtDate(VBUY.poFirstReceipt(r.po))}</td><td class="nowrap">${fmtDate(r.dueAt)}</td><td class="num">${money(r.balance)}</td><td>${lateCell(r.daysLate)}</td>
        <td class="actions"><button class="btn btn-primary btn-sm" data-pay="${r.po.id}">${t("ap.pay")}</button></td></tr>`; }).join("") || emptyRow(7,t("ap.empty"))}
      </tbody></table></div>`;
    panel.querySelectorAll("[data-pay]").forEach(b=>b.addEventListener("click",()=>{ const po=VBUY.getPO(b.dataset.pay), s=VBUY.supplier(po.supplierId); paymentDialog({ title:t("ap.pay"), subtitle:`${esc(po.number)} · ${s?esc(s.name):""}`, balance:VBUY.poBalance(po), method:"transfer", onSave:d=>VBUY.addPayment(po.id,d) }); }));
  }

  /* ============================ Resultados ============================ */
  let period = "month";
  function range(p){
    const now=new Date(), y=now.getFullYear(), m=now.getMonth(), end=Date.now()+1;
    return p==="month" ? [new Date(y,m,1).getTime(), new Date(y,m+1,1).getTime()] : p==="last" ? [new Date(y,m-1,1).getTime(), new Date(y,m,1).getTime()]
      : p==="30d" ? [Date.now()-30*VNEG.DAY, end] : p==="year" ? [new Date(y,0,1).getTime(), new Date(y+1,0,1).getTime()] : [0, end];
  }
  function renderResults(panel){
    const [from,to] = range(period), s = VFIN.summary(from,to), rc = VFIN.receivables(), py = VFIN.payables(), inv = VBUY.inventoryAtCost(), months = VFIN.monthly(6);
    const maxAbs = Math.max(1, ...months.map(m=>Math.abs(m.result)));
    panel.innerHTML = `
      <div class="toolbar"><div class="toolbar-left"><select class="input" data-period>${[["month","res.p.month"],["last","res.p.last"],["30d","res.p.30d"],["year","res.p.year"],["all","res.p.all"]].map(([v,k])=>`<option value="${v}" ${v===period?"selected":""}>${t(k)}</option>`).join("")}</select></div></div>
      ${s.noCost?`<div class="callout warn"><p>${VI18N.tp("res.noCost",s.noCost)}</p></div>`:""}
      <div class="two-cols-eq">
        <div class="chart-box"><h3 class="sec-h">${t("res.pnl")}</h3>
          <table class="pnl"><tbody>
            <tr><td>${t("res.sales")}</td><td>${money(s.sales)}</td></tr><tr><td>${t("res.shipping")}</td><td>${money(s.shipping)}</td></tr>
            <tr class="sum"><td>${t("res.revenue")}</td><td>${money(s.revenue)}</td></tr>
            <tr><td>${t("res.cogs")}</td><td>${s.cogs?neg(s.cogs):money(0)}</td></tr>
            <tr class="sum"><td>${t("res.gross")} <span class="muted" style="font-weight:500;">· ${pct(s.grossPct)}</span></td><td>${money(s.gross)}</td></tr>
            ${Object.keys(s.byCat).map(c=>`<tr class="sub"><td>${t("cash.cat."+c)}</td><td>${neg(s.byCat[c])}</td></tr>`).join("")}
            <tr><td>${t("res.expenses")}</td><td>${s.expenses?neg(s.expenses):money(0)}</td></tr>
            <tr class="sum"><td>${t("res.result")}</td><td class="${s.result<0?"money-out":"money-in"}">${s.result<0?neg(-s.result):money(s.result)}</td></tr>
          </tbody></table><p class="hint-line" style="margin:12px 0 0;">${t("res.basis")}</p></div>
        <div>
          <div class="chart-box" style="margin-bottom:16px;"><h3 class="sec-h">${t("res.position")}</h3>
            <table class="pnl"><tbody>
              <tr><td>${t("ar.total")}</td><td>${money(rc.reduce((x,r)=>x+r.balance,0))}</td></tr><tr><td>${t("ap.total")}</td><td>${money(py.reduce((x,r)=>x+r.balance,0))}</td></tr>
              <tr><td>${t("res.inventory")}${inv.missing?` <span class="muted">· ${t("res.invMissing",{n:inv.missing})}</span>`:""}</td><td>${money(inv.value)}</td></tr>
              <tr><td>${t("res.taxCollected")}</td><td>${money(s.tax)}</td></tr></tbody></table></div>
          <div class="chart-box"><h3 class="sec-h">${t("res.months")}</h3>
            <table class="pnl"><tbody>${months.map(m=>`<tr><td class="nowrap">${VI18N.fmtDate(m.from,{month:"short",year:"numeric"})}</td><td style="width:42%;"><span class="mini-bar ${m.result<0?"neg":""}"><i style="width:${Math.abs(m.result)/maxAbs*100}%"></i></span></td><td>${m.result<0?neg(-m.result):money(m.result)}</td></tr>`).join("")}</tbody></table></div>
        </div>
      </div>`;
    panel.querySelector("[data-period]").addEventListener("change",(e)=>{ period=e.target.value; ui.refresh(); });
  }

  /* ============================ Actividad ============================ */
  const signed = n => (n>0?"+":n<0?"−":"")+money(Math.abs(n));
  function logText(e){
    const p = Object.assign({}, e.params);
    ["from","to","amount"].forEach(k=>{ if(k in p) p[k] = p[k]==null ? "—" : money(p[k]); });
    if("diff" in p) p.diff = signed(p.diff);
    if(p.date) p.date = fmtDate(VNEG.dayStart(p.date));
    return t("log."+e.action, p);
  }
  function renderActivity(panel){
    const rows = VFIN.activity().slice(0,200);
    panel.innerHTML = `<p class="hint-line" style="margin-top:0;">${t("log.help")}</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("log.th.when")}</th><th>${t("log.th.user")}</th><th>${t("log.th.what")}</th></tr></thead><tbody>
      ${rows.map(e=>`<tr><td class="nowrap">${fmtDate(e.at)} <span class="muted">${timeOf(e.at)}</span></td><td>${e.user==="@sistema"?t("log.system"):esc(e.user)}</td><td>${esc(logText(e))}</td></tr>`).join("") || emptyRow(3,t("log.empty"))}
      </tbody></table></div>`;
  }

  /* ============================ Ajustes ============================ */
  function renderSettings(panel){
    const b = VFIN.business();
    panel.innerHTML = `<div class="chart-box" style="max-width:720px;"><h3 class="sec-h">${t("set.business")}</h3><p class="hint-line" style="margin-top:0;">${t("set.help")}</p>
      <div class="f-grid">
        <div class="field"><label>${t("set.legalName")}</label><input class="input" data-f="legalName" value="${esc(b.legalName)}"></div>
        <div class="field"><label>${t("bill.taxId")}</label><input class="input" data-f="taxId" value="${esc(b.taxId)}"></div>
        <div class="field full"><label>${t("acct.address")}</label><input class="input" data-f="address" value="${esc(b.address)}"></div>
        <div class="field"><label>${t("cust.phone")}</label><input class="input" data-f="phone" value="${esc(b.phone)}"></div>
        <div class="field"><label>${t("adm.th.email")}</label><input class="input" data-f="email" value="${esc(b.email)}"></div>
        <div class="field"><label>${t("set.prefix")}</label><input class="input" data-f="prefix" value="${esc(b.prefix)}" maxlength="6"><span class="hint">${t("set.prefixHint")}</span></div>
        <div class="field"><label>${t("set.taxRate")}</label><input class="input" type="number" min="0" step="0.01" data-f="taxRate" value="${b.taxRate}"><span class="hint">${t("set.taxHint")}</span></div>
        <div class="field full"><label>${t("set.footer")}</label><textarea class="input" data-f="footer" style="min-height:64px;">${esc(b.footer)}</textarea></div>
      </div><button class="btn btn-primary btn-sm" data-save>${VUI.icon("check")} ${t("acct.saveChanges")}</button></div>`;
    panel.querySelector("[data-save]").addEventListener("click",()=>{
      const patch = {}; panel.querySelectorAll("[data-f]").forEach(i=>{ patch[i.dataset.f]=i.value; });
      VFIN.setBusiness(patch); VUI.toast(t("set.saved")); ui.refresh();
    });
  }

  ui = tabs(content, [
    { id:"facturas", label:t("bill.tab.invoices"), render:renderInvoices, badge:()=>({ n:VFIN.unbilledOrders().length, warn:true }) },
    { id:"caja", label:t("bill.tab.cash"), render:renderCaja },
    { id:"cobrar", label:t("bill.tab.receivable"), render:renderReceivable, badge:()=>({ n:VFIN.receivables().filter(r=>r.daysLate>0).length, warn:true }) },
    { id:"pagar", label:t("bill.tab.payable"), render:renderPayable, badge:()=>({ n:VFIN.payables().filter(r=>r.daysLate>0).length, warn:true }) },
    { id:"resultados", label:t("bill.tab.results"), render:renderResults },
    { id:"actividad", label:t("bill.tab.activity"), render:renderActivity },
    { id:"ajustes", label:t("bill.tab.settings"), render:renderSettings },
  ]);
})();
