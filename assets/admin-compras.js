/* Admin › Compras — reposición sugerida, órdenes de compra, proveedores y control de costos.
   Al recibir una orden entra el stock y el costo del producto pasa a ser el promedio ponderado. */
(function(){
  "use strict";
  const { T:t, esc, money, fmtDate, pct, kpis, pill, emptyRow, tabs, dialog, report, val, paymentDialog } = VADMIN;
  const num = n => VI18N.fmtNum(n);
  document.title = t("buy.title");
  const content = VADMIN.mountAdmin("compras.html", t("adm.nav.purchasing"), t("buy.sub"));

  const PO_TONE = { draft:"muted", sent:"info", partial:"warn", received:"ok", cancelled:"muted" };
  const catName = id => { const c=VDB.CATEGORIES.find(x=>x.id===id); return c ? VI18N.cat(c.id,c.name) : "—"; };
  const supOpts = (sel, blank) => (blank?`<option value="">${blank}</option>`:"")+VBUY.suppliers().filter(s=>s.active||s.id===sel).map(s=>`<option value="${s.id}" ${s.id===sel?"selected":""}>${esc(s.name)}</option>`).join("");
  let ui;

  /* La reposición automática solo crea BORRADORES al abrir esta página; enviar una orden siempre es una decisión tuya. */
  const autoCreated = VBUY.autoDrafts();
  if(autoCreated) setTimeout(()=>VUI.toast(VI18N.tp("reo.autoCreated",autoCreated)), 300);

  /* ============================ Reposición ============================ */
  function renderReorder(panel){
    const sug = VBUY.suggestions(), noSup = sug.filter(x=>!x.supplierId);
    const open = VBUY.pos().filter(p=>["draft","sent","partial"].includes(p.status));
    const est = sug.filter(x=>x.supplierId).reduce((s,x)=>s+x.qty*(x.cost||0),0);
    const groups = {}; sug.forEach(x=>{ (groups[x.supplierId||""]=groups[x.supplierId||""]||[]).push(x); });
    const order = Object.keys(groups).sort((a,b)=>a===""?1:b===""?-1:(VBUY.supplier(a).name).localeCompare(VBUY.supplier(b).name));
    panel.innerHTML = `
      ${kpis([
        { label:t("reo.kpi.toReorder"), value:num(sug.length), tone:sug.length?"warn":"" },
        { label:t("reo.kpi.noSupplier"), value:num(noSup.length), tone:noSup.length?"bad":"" },
        { label:t("reo.kpi.estimate"), value:money(est) },
        { label:t("reo.kpi.open"), value:num(open.length), sub:t("reo.kpi.openSub",{n:open.filter(p=>p.status==="draft").length}) },
      ])}
      <div class="callout"><label class="checkbox-row"><input type="checkbox" data-auto ${VBUY.auto?"checked":""}> <span><b>${t("reo.auto")}</b><br><span class="muted" style="font-size:12px;">${t("reo.autoHelp")}</span></span></label>
        <div class="btns"><button class="btn btn-primary btn-sm" data-generate ${sug.length-noSup.length?"":"disabled"}>${t("reo.generate")}</button></div></div>
      <p class="hint-line" style="margin-top:0;">${t("reo.formula")}</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th style="width:34px;"></th><th>${t("adm.th.product")}</th><th class="num">${t("adm.th.stock")}</th><th class="num">${t("reo.th.min")}</th><th class="num">${t("reo.th.sold")}</th><th class="num">${t("reo.th.onOrder")}</th><th class="num">${t("reo.th.qty")}</th><th class="num">${t("reo.th.cost")}</th></tr></thead><tbody>
        ${order.map(sid=>{ const s=sid&&VBUY.supplier(sid); return `<tr><td colspan="8" style="background:var(--muted);font-weight:700;font-size:12px;">${s?`${esc(s.name)} <span class="muted" style="font-weight:500;">· ${VI18N.tp("sup.leadN",s.leadDays)}</span>`:t("reo.noSupplier")}</td></tr>`
          + groups[sid].map(x=>{ const p=x.product; return `<tr data-row="${p.id}">
            <td>${x.supplierId?`<input type="checkbox" data-pick checked aria-label="${esc(p.title)}">`:""}</td>
            <td><span class="cell-title">${esc(p.title)}</span><span class="cell-sub">${catName(p.category)}</span>${x.ignored?`<span class="cell-sub tx-warn">${t("reo.ignored")}</span>`:""}${x.supplierId?"":`<select class="input inline-input wide" data-assign style="margin-top:4px;">${supOpts("",t("reo.assign"))}</select>`}</td>
            <td class="num ${x.stock===0?"tx-bad":""}">${x.stock}</td><td class="num">${p.reorderPoint??5}</td><td class="num">${x.sold30}</td><td class="num">${x.onOrder||"—"}</td>
            <td class="num">${x.supplierId?`<input class="input inline-input" type="number" min="1" step="1" value="${x.qty}" data-qty>`:"—"}</td>
            <td class="num">${x.cost==null?`<span class="tx-warn">${t("cost.none")}</span>`:money(x.cost)}</td></tr>`; }).join(""); }).join("") || emptyRow(8,t(open.length?"reo.emptyCovered":"reo.empty"))}
      </tbody></table></div>`;

    panel.querySelector("[data-auto]").addEventListener("change",(e)=>{ VBUY.setAuto(e.target.checked); if(e.target.checked){ const n=VBUY.autoDrafts(); if(n) VUI.toast(VI18N.tp("reo.autoCreated",n)); } ui.refresh(); });
    panel.querySelector("[data-generate]").addEventListener("click",()=>{
      const items = [...panel.querySelectorAll("tr[data-row]")].filter(r=>r.querySelector("[data-pick]:checked")).map(r=>({ productId:r.dataset.row, qty:+val(r,"[data-qty]") }));
      if(!items.length){ VUI.toast(t("reo.nonePicked")); return; }
      const res = VBUY.generateDrafts(items);
      VUI.toast(VI18N.tp("reo.generated",res.orders.length)); ui.show("ordenes");
    });
    panel.querySelectorAll("[data-assign]").forEach(sel=>sel.addEventListener("change",()=>{ if(sel.value && report(VBUY.setProductParams(sel.closest("tr").dataset.row,{supplierId:sel.value}),"reo.assigned")) ui.refresh(); }));
  }

  /* ============================ Órdenes ============================ */
  let poFilter = "";
  // una orden enviada cuya fecha de llegada prevista ya pasó
  const isLate = po => (po.status==="sent"||po.status==="partial") && po.expectedAt && VNEG.dayKey(po.expectedAt) < VNEG.todayKey();
  function renderOrders(panel){
    const all = VBUY.pos();
    panel.innerHTML = `
      <div class="toolbar"><div class="toolbar-left"><select class="input" data-status><option value="">${t("adm.ord.allStatus")}</option>${["draft","sent","partial","received","cancelled"].map(s=>`<option value="${s}" ${s===poFilter?"selected":""}>${t("po.st."+s)}</option>`).join("")}</select></div>
        <button class="btn btn-primary btn-sm" data-new>${VUI.icon("plus")} ${t("po.new")}</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("po.number")}</th><th>${t("po.supplier")}</th><th>${t("adm.th.date")}</th><th class="num">${t("adm.th.items")}</th><th class="num">${t("sum.total")}</th><th>${t("adm.th.status")}</th><th></th></tr></thead><tbody>
        ${all.filter(p=>!poFilter||p.status===poFilter).map(po=>{ const s=VBUY.supplier(po.supplierId), bal=VBUY.poBalance(po), recv=VBUY.hasGoods(po);
          return `<tr data-open="${po.id}"><td class="cell-title mono-tag" style="font-size:12.5px;color:var(--foreground);">${esc(po.number)}</td><td>${s?esc(s.name):"—"}</td><td class="nowrap">${fmtDate(po.createdAt)}${po.status==="sent"&&po.expectedAt?`<span class="cell-sub">${t("po.expected",{date:fmtDate(po.expectedAt)})}</span>`:""}</td>
            <td class="num">${VBUY.poUnits(po)}${po.status==="partial"?`<span class="cell-sub">${t("po.gotten")}: ${po.lines.reduce((a,l)=>a+(l.receivedQty||0),0)}</span>`:""}</td><td class="num">${money(recv?VBUY.poReceivedValue(po):VBUY.poTotal(po))}</td>
            <td>${pill(t("po.st."+po.status),PO_TONE[po.status])}${recv&&bal>0?" "+pill(t("po.toPay"),"warn"):""}${isLate(po)?" "+pill(t("po.late"),"bad"):""}</td>
            <td class="actions"><span style="display:inline-flex;gap:6px;">
              ${po.status==="draft"?`<button class="btn btn-outline btn-sm" data-send="${po.id}">${t("po.send")}</button>`:""}
              ${po.status==="sent"||po.status==="partial"?`<button class="btn btn-primary btn-sm" data-receive="${po.id}">${t("po.receive")}</button>`:""}</span></td></tr>`; }).join("") || emptyRow(7,t("po.empty"))}
      </tbody></table></div>`;
    panel.querySelector("[data-status]").addEventListener("change",(e)=>{ poFilter=e.target.value; ui.refresh(); });
    panel.querySelector("[data-new]").addEventListener("click",()=>poEditor(null));
    panel.querySelector("tbody").addEventListener("click",(e)=>{
      const snd=e.target.closest("[data-send]"), rcv=e.target.closest("[data-receive]"), row=e.target.closest("[data-open]");
      if(snd) sendDialog(VBUY.getPO(snd.dataset.send)); else if(rcv) receiveDialog(VBUY.getPO(rcv.dataset.receive)); else if(row) openPO(row.dataset.open);
    });
  }

  function openPO(id){ const po=VBUY.getPO(id); if(po.status==="draft") poEditor(po); else poView(po); }

  function poEditor(po){
    const products = VDB.db.products, byTitle = new Map(products.map(p=>[p.title,p])), sup = VBUY.suppliers().filter(s=>s.active||(po&&s.id===po.supplierId));
    if(!sup.length){ VUI.toast(t("po.needSupplier")); return; }
    const dlg = dialog({ title:po?po.number:t("po.new"), wide:true, body:`
      <datalist id="po-products">${products.map(p=>`<option value="${esc(p.title)}"></option>`).join("")}</datalist>
      <div class="f-grid"><div class="field"><label>${t("po.supplier")}</label><select class="input" data-f="supplier">${supOpts(po?po.supplierId:sup[0].id)}</select></div>
        <div class="field"><label>${t("inv.note")}</label><input class="input" data-f="note" value="${esc(po?po.note:"")}"></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.product")}</th><th class="num" style="width:90px;">${t("reo.th.qty")}</th><th class="num" style="width:120px;">${t("po.unitCost")}</th><th class="num" style="width:100px;">${t("bill.line.amount")}</th><th style="width:36px;"></th></tr></thead><tbody data-lines></tbody></table></div>
      <button type="button" class="btn btn-outline btn-sm" data-add style="margin-bottom:14px;">${VUI.icon("plus")} ${t("bill.addLine")}</button>
      <div class="dlg-sum"><div class="grand"><span>${t("sum.total")}</span><span data-total></span></div></div>`,
      actions:[{ label:t("po.saveDraft"), kind:"primary", onClick:(d)=>{
        const lines = [...d.querySelectorAll("[data-line]")].filter(r=>r.dataset.pid).map(r=>({ productId:r.dataset.pid, qty:+val(r,"[data-qty]"), unitCost:+val(r,"[data-cost]") }));
        if(!report(VBUY.savePO({ id:po&&po.id, supplierId:val(d,"[data-f=supplier]"), lines, note:val(d,"[data-f=note]") }),"po.saved")) return false;
        ui.show("ordenes"); } }] });
    const tbody = dlg.querySelector("[data-lines]");
    const recalc = ()=>{ let sum=0; tbody.querySelectorAll("[data-line]").forEach(r=>{ const a=(+val(r,"[data-qty]")||0)*(+val(r,"[data-cost]")||0); sum+=a; r.querySelector("[data-amount]").textContent=money(a); }); dlg.querySelector("[data-total]").textContent=money(sum); };
    function addLine(l){
      const tr=document.createElement("tr"); tr.dataset.line=""; if(l) tr.dataset.pid=l.productId;
      tr.innerHTML=`<td><input class="input" list="po-products" data-desc value="${l?esc(l.title):""}" placeholder="${t("bill.line.ph")}"></td><td><input class="input num" type="number" min="1" step="1" data-qty value="${l?l.qty:1}"></td><td><input class="input num" type="number" min="0" step="0.01" data-cost value="${l?l.unitCost:""}"></td><td class="num" data-amount></td><td><button type="button" class="btn btn-ghost btn-sm" data-rm aria-label="${t("acct.delete")}">×</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector("[data-desc]").addEventListener("input",(e)=>{ const p=byTitle.get(e.target.value); if(p){ tr.dataset.pid=p.id; if(!+val(tr,"[data-cost]")) tr.querySelector("[data-cost]").value=p.cost??""; } else delete tr.dataset.pid; recalc(); });
      return tr;
    }
    (po?po.lines:[null]).forEach(addLine);
    dlg.querySelector("[data-add]").addEventListener("click",()=>addLine().querySelector("[data-desc]").focus());
    tbody.addEventListener("input", recalc);
    tbody.addEventListener("click",(e)=>{ if(e.target.closest("[data-rm]")&&tbody.children.length>1){ e.target.closest("tr").remove(); recalc(); } });
    recalc();
  }

  function poView(po){
    const s = VBUY.supplier(po.supplierId), recv = VBUY.hasGoods(po), bal = VBUY.poBalance(po), open = po.status==="sent"||po.status==="partial";
    const receipts = VBUY.receiptsOf(po), pend = l => VBUY.pending(l);
    const dlg = dialog({ title:`${po.number} · ${s?s.name:""}`, wide:true, body:`
      <p class="hint-line" style="margin-top:0;">${pill(t("po.st."+po.status),PO_TONE[po.status])}${isLate(po)?" "+pill(t("po.late"),"bad"):""}
        ${po.sentAt?` · ${t("po.sentOn",{date:fmtDate(po.sentAt)})}`:""}${open&&po.expectedAt?` · ${t("po.expected",{date:fmtDate(po.expectedAt)})}`:""}${recv?` · ${t("ar.due")}: ${fmtDate(VBUY.poDue(po))}`:""}</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.product")}</th><th class="num">${t("po.ordered")}</th>${recv?`<th class="num">${t("po.gotten")}</th><th class="num">${t("po.pendingQty")}</th>`:""}<th class="num">${t("po.unitCost")}</th><th class="num">${t("bill.line.amount")}</th></tr></thead><tbody>
        ${po.lines.map(l=>{ const q=recv?(l.receivedQty||0):l.qty, c=recv&&VNEG.isNum(l.receivedCost)?l.receivedCost:l.unitCost; return `<tr><td>${esc(l.title)}</td><td class="num">${l.qty}</td>${recv?`<td class="num">${l.receivedQty||0}</td><td class="num ${pend(l)&&po.status==="partial"?"tx-warn":""}">${po.closedShort&&pend(l)?"—":pend(l)||"—"}</td>`:""}<td class="num">${money(c)}</td><td class="num">${money(q*c)}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="dlg-sum"><div class="grand"><span>${t("sum.total")}</span><span>${money(recv?VBUY.poReceivedValue(po):VBUY.poTotal(po))}</span></div>${recv?`<div><span>${t("po.paid")}</span><span>${money(VBUY.poPaid(po))}</span></div><div><span>${t("bill.th.balance")}</span><span>${money(bal)}</span></div>`:""}</div>
      ${po.note?`<p class="hint-line">${esc(po.note)}</p>`:""}
      ${receipts.length?`<h3 class="sec-h sec-gap">${t("po.receipts")}</h3><div class="table-wrap"><table class="data-table"><tbody>${receipts.map(r=>`<tr><td class="nowrap">${fmtDate(r.date)}</td><td class="mono-tag">${esc(r.ref||"—")}</td><td class="num">${r.lines.reduce((a,l)=>a+l.qty,0)}</td><td class="num">${money(r.lines.reduce((a,l)=>a+l.qty*l.unitCost,0))}</td></tr>`).join("")}</tbody></table></div>`:""}
      ${recv&&po.payments.length?`<h3 class="sec-h sec-gap">${t("inv.payments")}</h3><div class="table-wrap"><table class="data-table"><tbody>${po.payments.map(p=>`<tr><td class="nowrap">${fmtDate(p.date)}</td><td>${t("pay."+p.method)}</td><td class="num">${money(p.amount)}</td></tr>`).join("")}</tbody></table></div>`:""}`,
      actions:[
        ...(open?[{ label:t("po.receive"), kind:"primary", onClick:()=>{ setTimeout(()=>receiveDialog(po),0); } }]:[]),
        ...(po.status==="sent"?[{ label:t("po.cancel"), kind:"danger", onClick:()=>{ if(!confirm(t("po.confirmCancel"))) return false; report(VBUY.cancelPO(po.id)); ui.refresh(); } }]:[]),
        ...(po.status==="partial"?[{ label:t("po.close"), kind:"outline", onClick:()=>{ if(!confirm(t("po.confirmClose"))) return false; if(report(VBUY.closePO(po.id),"po.closedOk")) ui.refresh(); } }]:[]),
        ...(recv&&bal>0?[{ label:t("ap.pay"), kind:"primary", onClick:()=>{ setTimeout(()=>paymentDialog({ title:t("ap.pay"), subtitle:`${esc(po.number)} · ${s?esc(s.name):""}`, balance:bal, method:"transfer", onSave:d=>VBUY.addPayment(po.id,d), onDone:()=>ui.refresh() }),0); } }]:[]),
      ] });
    return dlg;
  }

  function poMessage(po){
    const s = VBUY.supplier(po.supplierId);
    return t("po.msg.head",{contact:(s.contact||s.name).split(" ")[0],store:VDB.db.settings.storeName||"",number:po.number})+"\n\n"
      + po.lines.map(l=>`- ${l.qty} × ${l.title}`).join("\n")+"\n\n"+t("po.msg.foot");
  }
  // Enviar = abrir WhatsApp / correo con el pedido ya escrito. Al hacer clic la orden pasa a "enviada".
  function sendDialog(po){
    const s = VBUY.supplier(po.supplierId), text = poMessage(po), wa = VNEG.waNumber(s.phone);
    const dlg = dialog({ title:`${t("po.send")} · ${po.number}`, body:`
      <p class="hint-line" style="margin-top:0;">${t("po.send.help",{days:s.leadDays})}</p><div class="pre-box">${esc(text)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        ${wa?`<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" data-go href="${VNEG.waLink(s.phone,text)}">WhatsApp</a>`:""}
        ${s.email?`<a class="btn btn-outline btn-sm" data-go href="${esc(VNEG.mailLink(s.email,t("po.msg.subj",{number:po.number}),text))}">${t("cust.mail")}</a>`:""}
        ${!wa&&!s.email?`<span class="tx-warn" style="font-size:12.5px;">${t("po.send.noContact")}</span>`:""}</div>`,
      actions:[{ label:t("po.markSent"), kind:"outline", onClick:()=>{ if(report(VBUY.sendPO(po.id),"po.sentOk")) ui.refresh(); else return false; } }] });
    dlg.querySelectorAll("[data-go]").forEach(a=>a.addEventListener("click",()=>{ VBUY.sendPO(po.id); VUI.toast(t("po.sentOk")); ui.refresh(); setTimeout(()=>dlg.close$(),0); }));
  }

  // Se puede recibir por partes: cada entrega lleva su fecha, su costo real y el nº de factura del proveedor.
  function receiveDialog(po){
    const s = VBUY.supplier(po.supplierId);
    const dlg = dialog({ title:`${t("po.receive")} · ${po.number}`, wide:true, body:`
      <p class="hint-line" style="margin-top:0;">${t("po.receive.help",{days:s?s.terms:0})}</p>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("adm.th.product")}</th><th class="num">${t("po.ordered")}</th><th class="num">${t("po.receivedSoFar")}</th><th class="num" style="width:100px;">${t("po.gotten")}</th><th class="num" style="width:120px;">${t("po.realCost")}</th><th class="num" style="width:100px;">${t("bill.line.amount")}</th></tr></thead><tbody>
        ${po.lines.map(l=>`<tr data-l="${l.productId}"><td>${esc(l.title)}</td><td class="num">${l.qty}</td><td class="num">${l.receivedQty||0}</td><td><input class="input num" type="number" min="0" step="1" data-qty value="${VBUY.pending(l)}"></td><td><input class="input num" type="number" min="0" step="0.01" data-cost value="${l.unitCost}"></td><td class="num" data-amount></td></tr>`).join("")}</tbody></table></div>
      <div class="f-grid"><div class="field"><label>${t("po.refNo")}</label><input class="input" data-ref></div>
        <div class="field"><label class="checkbox-row" style="margin-top:28px;"><input type="checkbox" data-close> ${t("po.closeShort")}</label></div></div>
      <div class="dlg-sum"><div class="grand"><span>${t("po.thisReceipt")}</span><span data-total></span></div></div>`,
      actions:[{ label:t("po.confirmReceive"), kind:"primary", onClick:(d)=>{
        const rec = [...d.querySelectorAll("tr[data-l]")].map(r=>({ productId:r.dataset.l, qty:+val(r,"[data-qty]"), unitCost:+val(r,"[data-cost]") }));
        const res = VBUY.receivePO(po.id, rec, { ref:val(d,"[data-ref]"), close:d.querySelector("[data-close]").checked });
        if(!report(res)) return false;
        VUI.toast(t(res.complete?"po.receivedOk":"po.partialOk")); ui.refresh(); } }] });
    const recalc = ()=>{ let sum=0; dlg.querySelectorAll("tr[data-l]").forEach(r=>{ const a=(+val(r,"[data-qty]")||0)*(+val(r,"[data-cost]")||0); sum+=a; r.querySelector("[data-amount]").textContent=money(a); }); dlg.querySelector("[data-total]").textContent=money(sum); };
    dlg.querySelector("tbody").addEventListener("input", recalc); recalc();
  }

  /* ============================ Proveedores ============================ */
  function renderSuppliers(panel){
    const list = VBUY.suppliers();
    panel.innerHTML = `
      <div class="toolbar"><p class="hint-line" style="margin:0;">${t("sup.help")}</p><button class="btn btn-primary btn-sm" data-new>${VUI.icon("plus")} ${t("sup.new")}</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>${t("po.supplier")}</th><th>${t("cust.th.contact")}</th><th class="num">${t("sup.terms")}</th><th class="num">${t("sup.lead")}</th><th class="num">${t("sup.bought")}</th><th class="num">${t("bill.th.balance")}</th><th></th></tr></thead><tbody>
        ${list.map(s=>{ const st=VBUY.supplierStats(s.id); return `<tr>
          <td><span class="cell-title">${esc(s.name)}</span><span class="cell-sub">${esc(s.contact)}${s.active?"":` · ${t("sup.inactive")}`}</span></td>
          <td>${esc(s.phone)||"—"}<span class="cell-sub">${esc(s.email)}</span></td><td class="num">${VI18N.tp("sup.daysN",s.terms)}</td><td class="num">${VI18N.tp("sup.daysN",s.leadDays)}</td>
          <td class="num">${money(st.bought)}</td><td class="num ${st.balance?"tx-warn":""}">${st.balance?money(st.balance):"—"}</td>
          <td class="actions"><span class="row-actions">
            ${VNEG.waNumber(s.phone)?`<a title="WhatsApp" aria-label="WhatsApp" target="_blank" rel="noopener" href="${VNEG.waLink(s.phone)}">${VUI.icon("user")}</a>`:""}
            <button title="${t("acct.edit")}" aria-label="${t("acct.edit")}" data-edit="${s.id}">${VUI.icon("edit")}</button>
            <button class="danger" title="${t("acct.delete")}" aria-label="${t("acct.delete")}" data-del="${s.id}">${VUI.icon("trash")}</button></span></td></tr>`; }).join("") || emptyRow(7,t("sup.empty"))}
      </tbody></table></div>`;
    panel.querySelector("[data-new]").addEventListener("click",()=>supplierDialog(null));
    panel.querySelector("tbody").addEventListener("click",(e)=>{
      const ed=e.target.closest("[data-edit]"), del=e.target.closest("[data-del]");
      if(ed) supplierDialog(VBUY.supplier(ed.dataset.edit));
      else if(del && confirm(t("sup.confirmDel")) && report(VBUY.deleteSupplier(del.dataset.del),"sup.deleted")) ui.refresh();
    });
  }

  function supplierDialog(s){
    const counts = {}; VDB.db.products.forEach(p=>{ counts[p.category]=(counts[p.category]||0)+1; });
    dialog({ title:t(s?"sup.edit":"sup.new"), wide:true, body:`
      <div class="f-grid three">
        <div class="field" style="grid-column:span 2;"><label>${t("po.supplier")}</label><input class="input" data-f="name" value="${esc(s?s.name:"")}"></div>
        <div class="field"><label>${t("sup.contact")}</label><input class="input" data-f="contact" value="${esc(s?s.contact:"")}"></div>
        <div class="field"><label>${t("cust.phone")}</label><input class="input" data-f="phone" value="${esc(s?s.phone:"")}" placeholder="+53 5 555 5555"></div>
        <div class="field"><label>${t("adm.th.email")}</label><input class="input" data-f="email" value="${esc(s?s.email:"")}"></div>
        <div class="field"><label class="checkbox-row" style="margin-top:28px;"><input type="checkbox" data-f="active" ${!s||s.active?"checked":""}> ${t("sup.active")}</label></div>
        <div class="field"><label>${t("sup.terms")}</label><input class="input" type="number" min="0" step="1" data-f="terms" value="${s?s.terms:15}"><span class="hint">${t("sup.termsHint")}</span></div>
        <div class="field"><label>${t("sup.lead")}</label><input class="input" type="number" min="0" step="1" data-f="leadDays" value="${s?s.leadDays:7}"><span class="hint">${t("sup.leadHint")}</span></div>
        <div class="field"><label>${t("cpn.note")}</label><input class="input" data-f="notes" value="${esc(s?s.notes:"")}"></div>
      </div>
      <h3 class="sec-h">${t("sup.cats")}</h3><p class="hint-line">${t("sup.catsHelp")}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 14px;margin-bottom:14px;">
        ${VDB.CATEGORIES.filter(c=>counts[c.id]).map(c=>`<label class="checkbox-row"><input type="checkbox" data-cat="${c.id}" ${s&&s.categories.includes(c.id)?"checked":""}> ${esc(VI18N.cat(c.id,c.name))} <span class="muted">(${counts[c.id]})</span></label>`).join("")}</div>`,
      actions:[{ label:t("acct.save"), kind:"primary", onClick:(d)=>{
        const f = k=>val(d,"[data-f="+k+"]"), cats=[...d.querySelectorAll("[data-cat]:checked")].map(i=>i.dataset.cat);
        const res = VBUY.saveSupplier({ id:s&&s.id, name:f("name"), contact:f("contact"), phone:f("phone"), email:f("email"), terms:f("terms"), leadDays:f("leadDays"), notes:f("notes"), active:d.querySelector("[data-f=active]").checked, categories:cats });
        if(!report(res,"sup.saved")) return false;
        const n = VBUY.assignByCategories(res.supplier.id, cats); if(n) VUI.toast(VI18N.tp("sup.assigned",n));
        ui.refresh(); } }] });
  }

  /* ============================ Costos ============================ */
  const cst = { q:"", filter:"all", page:0 };
  const PAGE = 25;
  function renderCosts(panel){
    const rows = VBUY.costRows(), withCost = rows.filter(r=>r.cost!=null), inv = VBUY.inventoryAtCost();
    const low = rows.filter(r=>r.marginPct!=null && r.marginPct<VBUY.LOW_MARGIN);
    const avg = withCost.length ? withCost.reduce((s,r)=>s+(r.marginPct||0),0)/withCost.length : null;
    const FILTERS = { all:()=>true, nocost:r=>r.cost==null, low:r=>r.marginPct!=null&&r.marginPct<VBUY.LOW_MARGIN, up:r=>r.delta!=null&&r.delta>0 };
    panel.innerHTML = `
      ${kpis([
        { label:t("cost.kpi.inventory"), value:money(inv.value), sub:inv.missing?t("res.invMissing",{n:inv.missing}):"" },
        { label:t("cost.kpi.avgMargin"), value:pct(avg), sub:t("cost.kpi.avgSub") },
        { label:t("cost.kpi.low"), value:num(low.length), sub:t("cost.kpi.lowSub",{n:VBUY.LOW_MARGIN*100}), tone:low.length?"warn":"" },
        { label:t("cost.kpi.none"), value:num(rows.length-withCost.length), tone:rows.length-withCost.length?"warn":"" },
      ])}
      <div class="toolbar"><div class="toolbar-left"><input class="input" type="search" data-search placeholder="${t("adm.prod.searchPh")}" value="${esc(cst.q)}" style="min-width:240px;">
        <select class="input" data-filter>${[["all","cost.f.all"],["nocost","cost.f.nocost"],["low","cost.f.low"],["up","cost.f.up"]].map(([v,k])=>`<option value="${v}" ${v===cst.filter?"selected":""}>${t(k)}</option>`).join("")}</select></div></div>
      <div class="table-wrap"><table class="data-table" style="min-width:900px;"><thead><tr><th>${t("adm.th.product")}</th><th>${t("po.supplier")}</th><th class="num">${t("reo.th.cost")}</th><th class="num">${t("cost.price")}</th><th class="num">${t("cost.margin")}</th><th class="num">${t("cost.lastBuy")}</th><th class="num">${t("reo.th.min")}</th><th class="num">${t("reo.th.qty")}</th></tr></thead><tbody data-rows></tbody></table></div>
      <div data-pager></div>`;
    const paint = ()=>{
      const q = cst.q.trim().toLowerCase();
      const list = rows.filter(r=>FILTERS[cst.filter](r) && (!q || r.product.title.toLowerCase().includes(q) || r.product.brand.toLowerCase().includes(q)));
      const pages = Math.max(1, Math.ceil(list.length/PAGE)); cst.page = Math.min(cst.page, pages-1);
      panel.querySelector("[data-rows]").innerHTML = list.slice(cst.page*PAGE,(cst.page+1)*PAGE).map(r=>{ const p=r.product; return `<tr data-id="${p.id}">
        <td><span class="cell-title">${esc(p.title)}</span><span class="cell-sub">${catName(p.category)}</span></td>
        <td><select class="input inline-input wide" data-p="supplierId">${supOpts(p.supplierId||"","—")}</select></td>
        <td class="num"><input class="input inline-input" type="number" min="0" step="0.01" data-p="cost" value="${r.cost??""}" placeholder="—"></td>
        <td class="num">${money(r.price)}</td>
        <td class="num nowrap">${r.margin==null?`<span class="tx-warn">—</span>`:`<span class="${r.marginPct<VBUY.LOW_MARGIN?"tx-bad":""}">${money(r.margin)} · ${pct(r.marginPct)}</span>`}</td>
        <td class="num">${r.last==null?"—":money(r.last)}${r.delta?`<span class="cell-sub ${r.delta>0?"tx-bad":"tx-ok"}">${r.delta>0?"▲":"▼"} ${pct(Math.abs(r.delta))}</span>`:""}</td>
        <td class="num"><input class="input inline-input" type="number" min="0" step="1" data-p="reorderPoint" value="${p.reorderPoint??5}"></td>
        <td class="num"><input class="input inline-input" type="number" min="1" step="1" data-p="reorderQty" value="${p.reorderQty??10}"></td></tr>`; }).join("") || emptyRow(8);
      panel.querySelector("[data-pager]").innerHTML = pages>1 ? `<div class="pagination">${Array.from({length:pages},(_,i)=>`<button type="button" data-page="${i}" ${i===cst.page?'aria-current="true"':""}>${i+1}</button>`).join("")}</div>` : "";
    };
    paint();
    panel.querySelector("[data-search]").addEventListener("input",(e)=>{ cst.q=e.target.value; cst.page=0; paint(); });
    panel.querySelector("[data-filter]").addEventListener("change",(e)=>{ cst.filter=e.target.value; cst.page=0; paint(); });
    panel.querySelector("[data-pager]").addEventListener("click",(e)=>{ const b=e.target.closest("[data-page]"); if(b){ cst.page=+b.dataset.page; paint(); } });
    panel.querySelector("[data-rows]").addEventListener("change",(e)=>{
      const el = e.target.closest("[data-p]"); if(!el) return;
      if(report(VBUY.setProductParams(el.closest("tr").dataset.id,{ [el.dataset.p]:el.value }))) ui.refresh();
    });
  }

  ui = tabs(content, [
    { id:"reposicion", label:t("buy.tab.reorder"), render:renderReorder, badge:()=>({ n:VBUY.suggestions().length, warn:true }) },
    { id:"ordenes", label:t("buy.tab.orders"), render:renderOrders, badge:()=>({ n:VBUY.pos().filter(p=>["draft","sent","partial"].includes(p.status)).length }) },
    { id:"proveedores", label:t("buy.tab.suppliers"), render:renderSuppliers },
    { id:"costos", label:t("buy.tab.costs"), render:renderCosts },
  ]);
})();
