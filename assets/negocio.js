/* ============================================================
   NEGOCIO — CRM y fidelización · facturación y contabilidad básica ·
   compras y proveedores. Sin dependencias, sin servidor.

   Todo vive en db.neg, dentro de la misma base local que usa la tienda
   (VDB.db, clave vasto_db_v3). Clientes y ventas NO se copian: se derivan
   de db.users y db.orders, así que un pedido nuevo de la tienda aparece
   solo en el CRM, en los puntos y en la contabilidad.
   Se carga después de data.js. Expone VNEG, VCRM, VFIN y VBUY.

   Las funciones que pueden fallar devuelven {ok:false, error:"neg.err.*"}
   con una clave de i18n; la interfaz la traduce con t().
   ============================================================ */
(function(){
  "use strict";
  const VDB = window.VDB, db = VDB.db, uid = VDB.uid;
  const DAY = 86400000;
  const SOLD = ["paid","shipped","delivered"];        // pedidos con la venta ya cobrada
  const LOW_MARGIN = 0.15;                            // por debajo se marca "margen bajo"
  const EXPENSE_CATS = ["rent","utilities","transport","marketing","supplies","payroll","other"];
  const round2 = n => Math.round((Number(n)||0)*100)/100;
  const sum = (arr, f) => arr.reduce((s,x)=>s+f(x), 0);
  const pad = (n,w) => String(n).padStart(w,"0");
  const dayKey = ts => { const d=new Date(ts); return d.getFullYear()+"-"+pad(d.getMonth()+1,2)+"-"+pad(d.getDate(),2); };
  const dayStart = key => new Date(key+"T00:00:00").getTime();
  const nextDay = ts => { const d=new Date(ts); d.setDate(d.getDate()+1); return d.getTime(); };
  const todayKey = () => dayKey(Date.now());
  const isNum = v => typeof v === "number" && isFinite(v);
  const fail = error => ({ok:false, error});

  /* ---------- estructura y migración ---------- */
  function emptyNeg(){
    return { v:1,
      crm:{ rules:{ pointsPerUnit:1, pointValue:0.05, vipSpend:1000, riskDays:45, newDays:30 }, profiles:{}, ledger:[], coupons:[], campaigns:[], earned:{} },
      fin:{ business:{ legalName:db.settings.storeName||"", taxId:"", address:"", phone:"", email:"", prefix:"F", taxRate:round2((db.settings.taxRate||0)*100), footer:"" }, invoices:[], expenses:[], closings:[] },
      buy:{ auto:true, suppliers:[], pos:[], ignore:{} }, log:[] };
  }
  function fill(dst, src){
    Object.keys(src).forEach(k=>{
      if(dst[k]===undefined) dst[k]=src[k];
      else if(src[k] && typeof src[k]==="object" && !Array.isArray(src[k]) && dst[k] && typeof dst[k]==="object") fill(dst[k], src[k]);
    });
    return dst;
  }
  function neg(){ return db.neg || ensure(); }
  // La demo (negocio-demo.js) lleva su propia versión: si sube, se vuelve a sembrar. Sin fichero de demo, la base empieza vacía.
  const demoVersion = () => window.VNEG_DEMO ? window.VNEG_DEMO.version : 0;
  function ensure(){
    if(!db.neg || db.neg.v!==1 || (demoVersion() && db.neg.demoV!==demoVersion())){ seed(); VDB.save(); }
    else { fill(db.neg, emptyNeg()); sync(); }
    return db.neg;
  }
  const crm = () => neg().crm, fin = () => neg().fin, buy = () => neg().buy;

  /* Registro de actividad: quién tocó dinero o inventario y qué cambió (las frases están en i18n-negocio, claves log.*). */
  function log(action, params, at, who){
    const n=neg(), u=VDB.currentUser();
    n.log.unshift({ id:uid("log"), at:at||Date.now(), user:who||(u?u.name:"—"), action, params:params||{} });
    if(n.log.length>500) n.log.length=500;
  }
  // Un movimiento no puede fecharse en el futuro (se tolera un minuto de desfase de reloj).
  const isFuture = ts => ts > Date.now()+60000;

  /* ---------- contacto ---------- */
  // wa.me pide el número solo con dígitos y con prefijo de país; sin él no se puede abrir el chat.
  function waNumber(phone){ const d=String(phone||"").replace(/\D/g,"").replace(/^0+/,""); return d.length>=8 ? d : ""; }
  const waLink = (phone, text) => "https://wa.me/"+waNumber(phone)+(text?"?text="+encodeURIComponent(text):"");
  const mailLink = (email, subject, body) => "mailto:"+encodeURIComponent(email||"").replace("%40","@")+"?subject="+encodeURIComponent(subject||"")+"&body="+encodeURIComponent(body||"");
  const addrLine = a => a ? [a.line1,a.city,a.zip,a.country].filter(x=>x&&x!=="—").join(", ") : "";
  const buyerOf = o => db.users.find(u=>u.id===o.userId) || null;

  /* ============================================================
     COMPRAS — helpers compartidos (los usan también finanzas y CRM)
     ============================================================ */
  const supplierOf = id => buy().suppliers.find(s=>s.id===id) || null;
  const rpOf = p => isNum(p.reorderPoint) ? p.reorderPoint : 5;
  const rqOf = p => isNum(p.reorderQty) ? p.reorderQty : 10;
  const costOf = p => (p && isNum(p.cost)) ? p.cost : null;
  const poTotal = po => round2(sum(po.lines, l=>l.qty*l.unitCost));
  // Cada entrega del proveedor es una recepción, con su fecha, su costo real y el nº de factura o albarán que trae.
  const receiptsOf = po => po.receipts || (po.receivedAt ? [{ date:po.receivedAt, lines:po.lines.filter(l=>l.receivedQty>0).map(l=>({ productId:l.productId, qty:l.receivedQty, unitCost:isNum(l.receivedCost)?l.receivedCost:l.unitCost })) }] : []);
  const poReceivedValue = po => round2(sum(receiptsOf(po), r=>sum(r.lines, l=>l.qty*l.unitCost)));
  const poPaid = po => round2(sum(po.payments||[], x=>x.amount));
  const hasGoods = po => po.status==="received" || po.status==="partial";          // ya entró mercancía: hay deuda con el proveedor
  const poBalance = po => hasGoods(po) ? Math.max(0, round2(poReceivedValue(po)-poPaid(po))) : 0;
  const firstReceiptAt = po => { const r=receiptsOf(po); return r.length ? Math.min(...r.map(x=>x.date)) : null; };
  const poDue = po => { const s=supplierOf(po.supplierId), t=firstReceiptAt(po); return t==null ? null : t + (s?s.terms:0)*DAY; };
  const isOpenPO = po => po.status==="draft" || po.status==="sent" || po.status==="partial";
  const pending = l => Math.max(0, l.qty - (l.receivedQty||0));                      // lo que aún falta por llegar de esa línea
  function poNumber(){ let max=0; buy().pos.forEach(p=>{ const m=/^OC-(\d+)$/.exec(p.number); if(m) max=Math.max(max,+m[1]); }); return "OC-"+pad(max+1,4); }
  function onOrder(productId){ return sum(buy().pos.filter(isOpenPO), po=>sum(po.lines.filter(l=>l.productId===productId), pending)); }
  function soldMap(days){
    const since=Date.now()-days*DAY, m={};
    db.orders.forEach(o=>{ if(SOLD.includes(o.status) && o.createdAt>=since) o.items.forEach(it=>{ m[it.productId]=(m[it.productId]||0)+it.qty; }); });
    fin().invoices.forEach(i=>{ if(!i.orderId && i.kind!=="credit" && i.status==="issued" && i.issuedAt>=since && creditedTotal(i)===0) i.lines.forEach(l=>{ if(l.productId) m[l.productId]=(m[l.productId]||0)+l.qty; }); });
    return m;
  }
  // Costo medio ponderado: lo que ya hay en almacén al costo que tenía + lo que entra al costo nuevo.
  function applyReceipt(p, qty, unitCost){
    if(!p || qty<=0) return;
    const stock=Math.max(0,p.stock||0), old=costOf(p);
    p.cost = (old==null || stock===0) ? round2(unitCost) : round2((stock*old + qty*unitCost)/(stock+qty));
    p.stock = (p.stock||0) + qty;
  }

  const VBUY = {
    LOW_MARGIN,
    suppliers(){ return buy().suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name)); },
    supplier: supplierOf,
    saveSupplier(d){
      const name=String(d.name||"").trim(); if(!name) return fail("neg.err.name");
      const terms=Math.max(0,Math.floor(Number(d.terms)||0)), leadDays=Math.max(0,Math.floor(Number(d.leadDays)||0));
      let s = d.id ? supplierOf(d.id) : null;
      if(!s){ s={ id:uid("sup"), active:true, categories:[], notes:"" }; buy().suppliers.push(s); }
      Object.assign(s, { name, contact:String(d.contact||"").trim(), phone:String(d.phone||"").trim(), email:String(d.email||"").trim(),
        terms, leadDays, categories:d.categories||s.categories, notes:String(d.notes||"").trim(), active:d.active!==false });
      VDB.save(); return {ok:true, supplier:s};
    },
    deleteSupplier(id){
      if(buy().pos.some(p=>p.supplierId===id)) return fail("neg.err.supplierUsed");
      db.products.forEach(p=>{ if(p.supplierId===id) p.supplierId=null; });
      buy().suppliers = buy().suppliers.filter(s=>s.id!==id); VDB.save(); return {ok:true};
    },
    // Proveedor nuevo con muchas referencias: lo asigna a los productos aún sin proveedor de esas categorías.
    assignByCategories(supplierId, cats){
      let n=0; db.products.forEach(p=>{ if(cats.includes(p.category) && !p.supplierId){ p.supplierId=supplierId; n++; } });
      if(n) VDB.save(); return n;
    },
    supplierStats(id){
      const pos = buy().pos.filter(p=>p.supplierId===id && hasGoods(p));
      return { bought: round2(sum(pos, poReceivedValue)), balance: round2(sum(pos, poBalance)), orders: buy().pos.filter(p=>p.supplierId===id).length };
    },
    setProductParams(id, patch){
      const p=VDB.getProduct(id); if(!p) return fail("neg.err.noProduct");
      const before={ cost:isNum(p.cost)?p.cost:null, rp:p.reorderPoint, rq:p.reorderQty };
      if("cost" in patch){ const c=patch.cost; p.cost = (c===""||c==null) ? null : Math.max(0, round2(c)); }
      if("reorderPoint" in patch) p.reorderPoint = Math.max(0, Math.floor(Number(patch.reorderPoint)||0));
      if("reorderQty" in patch) p.reorderQty = Math.max(1, Math.floor(Number(patch.reorderQty)||1));
      if("supplierId" in patch) p.supplierId = patch.supplierId || null;
      const now=isNum(p.cost)?p.cost:null;
      if(now!==before.cost) log("cost",{ title:p.title, from:before.cost, to:now });
      if(p.reorderPoint!==before.rp || p.reorderQty!==before.rq) log("reorder",{ title:p.title, min:rpOf(p), qty:rqOf(p) });
      VDB.save(); return {ok:true};
    },
    setAuto(on){ buy().auto = !!on; VDB.save(); },
    get auto(){ return !!buy().auto; },

    /* reposición: qué comprar y a quién */
    suggestions(){
      const sold=soldMap(30), out=[];
      db.products.forEach(p=>{
        const stock=p.stock||0, oo=onOrder(p.id);
        if(stock+oo > rpOf(p)) return;
        const s = supplierOf(p.supplierId), lead = s?s.leadDays:7;
        // cubre el plazo del proveedor + 14 días al ritmo de venta de los últimos 30; nunca menos que la cantidad fija
        // y siempre lo bastante para dejar stock + pedido por encima del mínimo (si no, seguiría saliendo «por reponer»).
        const need = Math.ceil((sold[p.id]||0)/30*(lead+14)) - stock - oo, toMin = rpOf(p) + 1 - stock - oo;
        out.push({ product:p, supplierId:s?s.id:null, stock, onOrder:oo, sold30:sold[p.id]||0, qty:Math.max(rqOf(p), need, toMin), cost:costOf(p), ignored:(buy().ignore[p.id]||0)>Date.now() });
      });
      return out.sort((a,b)=>a.stock-b.stock);
    },
    // Crea (o completa) un borrador por proveedor. Los productos sin proveedor no se pueden pedir: se devuelven aparte.
    generateDrafts(items){
      const list = items || VBUY.suggestions().map(x=>({productId:x.product.id, qty:x.qty}));
      list.forEach(it=>{ delete buy().ignore[it.productId]; });      // lo pides tú a propósito: deja de estar descartado
      const bySup = {}, noSupplier = [];
      list.forEach(it=>{
        const p=VDB.getProduct(it.productId); if(!p || !(it.qty>0)) return;
        if(!p.supplierId || !supplierOf(p.supplierId)){ noSupplier.push(p); return; }
        (bySup[p.supplierId] = bySup[p.supplierId]||[]).push({ productId:p.id, title:p.title, qty:Math.floor(it.qty), unitCost:costOf(p)||0 });
      });
      const touched=[];
      Object.keys(bySup).forEach(sid=>{
        let po = buy().pos.find(x=>x.status==="draft" && x.supplierId===sid);
        if(!po){ po={ id:uid("po"), number:poNumber(), supplierId:sid, status:"draft", lines:[], createdAt:Date.now(), note:"", payments:[], receipts:[] }; buy().pos.unshift(po); }
        bySup[sid].forEach(l=>{ if(!po.lines.some(x=>x.productId===l.productId)) po.lines.push(l); });
        touched.push(po);
      });
      if(touched.length) VDB.save();
      return { orders:touched, noSupplier };
    },
    autoDrafts(){
      if(!buy().auto) return 0;
      // lo que quitaste a mano de un borrador no se vuelve a añadir solo durante 7 días
      const list = VBUY.suggestions().filter(x=>!x.ignored).map(x=>({ productId:x.product.id, qty:x.qty }));
      const before = new Set(buy().pos.filter(p=>p.status==="draft").map(p=>p.id+":"+p.lines.length));
      const r = VBUY.generateDrafts(list);
      return r.orders.filter(o=>!before.has(o.id+":"+o.lines.length)).length;
    },

    /* órdenes de compra */
    pos(){ return buy().pos.slice().sort((a,b)=>b.createdAt-a.createdAt); },
    getPO(id){ return buy().pos.find(p=>p.id===id)||null; },
    poTotal, poReceivedValue, poPaid, poBalance, poDue, receiptsOf, hasGoods, pending, poFirstReceipt:firstReceiptAt,
    poUnits: po => sum(po.lines, l=>l.qty),
    savePO(d){
      const s=supplierOf(d.supplierId); if(!s) return fail("neg.err.supplier");
      const lines=(d.lines||[]).filter(l=>l.productId && l.qty>0).map(l=>({ productId:l.productId, title:l.title||(VDB.getProduct(l.productId)||{}).title||"—", qty:Math.floor(l.qty), unitCost:Math.max(0,round2(l.unitCost)) }));
      if(!lines.length) return fail("neg.err.noLines");
      let po = d.id ? VBUY.getPO(d.id) : null;
      if(po && po.status!=="draft") return fail("neg.err.notDraft");
      const prev = po ? po.lines.map(l=>l.productId) : [];
      if(!po){ po={ id:uid("po"), number:poNumber(), status:"draft", createdAt:Date.now(), payments:[], receipts:[] }; buy().pos.unshift(po); }
      Object.assign(po, { supplierId:s.id, lines, note:String(d.note||"").trim() });
      prev.filter(id=>!lines.some(l=>l.productId===id)).forEach(id=>{ buy().ignore[id]=Date.now()+7*DAY; });
      VDB.save(); return {ok:true, po};
    },
    sendPO(id){
      const po=VBUY.getPO(id); if(!po || po.status!=="draft") return fail("neg.err.notDraft");
      const s=supplierOf(po.supplierId);
      po.status="sent"; po.sentAt=Date.now(); po.expectedAt=po.sentAt + (s?s.leadDays:0)*DAY;
      log("poSend",{ number:po.number }); VDB.save(); return {ok:true};
    },
    cancelPO(id){
      // una orden con mercancía ya recibida no se cancela: se cierra (closePO)
      const po=VBUY.getPO(id); if(!po || !(po.status==="draft"||po.status==="sent")) return fail("neg.err.cantCancel");
      po.status="cancelled"; log("poCancel",{ number:po.number }); VDB.save(); return {ok:true};
    },
    deletePO(id){
      const po=VBUY.getPO(id); if(!po || po.status!=="draft") return fail("neg.err.notDraft");
      po.lines.forEach(l=>{ buy().ignore[l.productId]=Date.now()+7*DAY; });
      buy().pos = buy().pos.filter(p=>p.id!==id); VDB.save(); return {ok:true};
    },
    // received: [{productId, qty, unitCost}] con lo que llegó ESTA vez y a qué costo. Si falta mercancía la orden queda
    // «parcial» (sigue en camino lo que falta); opts.close la cierra aunque el resto no llegue. opts.ref = nº de factura/albarán.
    receivePO(id, received, opts){
      opts=opts||{};
      const po=VBUY.getPO(id); if(!po || !(po.status==="sent"||po.status==="partial")) return fail("neg.err.notSent");
      const rows=po.lines.map(l=>{ const r=(received||[]).find(x=>x.productId===l.productId)||{}; return { l, qty:Math.max(0,Math.floor(Number(r.qty)||0)), cost:Math.max(0,round2(r.unitCost)) }; }).filter(x=>x.qty>0);
      if(!rows.length) return fail("neg.err.nothingReceived");
      const now=Date.now(); po.receipts=po.receipts||[];
      rows.forEach(({l,qty,cost})=>applyReceipt(VDB.getProduct(l.productId), qty, cost));
      po.receipts.push({ id:uid("rcp"), date:now, ref:String(opts.ref||"").trim(), lines:rows.map(x=>({ productId:x.l.productId, qty:x.qty, unitCost:x.cost })) });
      po.lines.forEach(l=>{ let q=0, v=0; po.receipts.forEach(r=>r.lines.forEach(x=>{ if(x.productId===l.productId){ q+=x.qty; v+=x.qty*x.unitCost; } })); l.receivedQty=q; l.receivedCost=q?round2(v/q):null; });
      po.receivedAt=now;
      const complete=po.lines.every(l=>(l.receivedQty||0)>=l.qty);
      po.status=(complete||opts.close)?"received":"partial"; if(opts.close && !complete) po.closedShort=true;
      log(po.status==="received"?"poReceive":"poPartial",{ number:po.number, units:sum(rows,x=>x.qty) });
      VDB.save(); return {ok:true, complete:po.status==="received"};
    },
    // El proveedor no enviará el resto: la orden se cierra con lo recibido y deja de figurar «en camino».
    closePO(id){
      const po=VBUY.getPO(id); if(!po || po.status!=="partial") return fail("neg.err.notPartial");
      po.status="received"; po.closedShort=true; log("poClose",{ number:po.number }); VDB.save(); return {ok:true};
    },
    addPayment(id, d){
      const po=VBUY.getPO(id); if(!po || !hasGoods(po)) return fail("neg.err.notReceived");
      const amount=round2(d.amount);
      if(!(amount>0)) return fail("neg.err.amount");
      if(amount>poBalance(po)+0.005) return fail("neg.err.overBalance");
      const date=d.date||Date.now();
      if(isFuture(date)) return fail("neg.err.futureDate");
      if(dayKey(date) < dayKey(firstReceiptAt(po))) return fail("neg.err.dateBeforeDoc");   // no se paga antes de recibir
      if(VFIN.closingOf(dayKey(date))) return fail("neg.err.dayClosed");
      po.payments.push({ id:uid("pay"), date, amount, method:d.method||"transfer", note:String(d.note||"").trim() });
      log("payOut",{ number:po.number, amount }); VDB.save(); return {ok:true};
    },
    onOrder,
    /* costos */
    costHistory(productId){
      const out=[];
      buy().pos.forEach(po=>receiptsOf(po).forEach(r=>r.lines.forEach(l=>{ if(l.productId===productId && l.qty>0) out.push({ poId:po.id, number:po.number, date:r.date, qty:l.qty, unitCost:l.unitCost, ref:r.ref||"" }); })));
      return out.sort((a,b)=>b.date-a.date);
    },
    costRows(){
      const hist={};
      buy().pos.forEach(po=>receiptsOf(po).forEach(r=>r.lines.forEach(l=>{ if(l.qty>0) (hist[l.productId]=hist[l.productId]||[]).push({ date:r.date, cost:l.unitCost }); })));
      return db.products.map(p=>{
        const c=costOf(p), h=(hist[p.id]||[]).sort((a,b)=>b.date-a.date), last=h[0]?h[0].cost:null, prev=h[1]?h[1].cost:null;
        const margin = c==null ? null : round2(p.price-c);
        return { product:p, cost:c, price:p.price, margin, marginPct: (c==null||!p.price) ? null : (p.price-c)/p.price, last, prev, delta:(last!=null&&prev)?(last-prev)/prev:null, supplierId:p.supplierId||null };
      });
    },
    // Productos en o por debajo de SU mínimo (no un 5 fijo): es la misma definición que usa la reposición.
    lowStock(){ return db.products.filter(p=>(p.stock||0)<=rpOf(p)).sort((a,b)=>(a.stock||0)-(b.stock||0)); },
    inventoryAtCost(){
      let value=0, missing=0;
      db.products.forEach(p=>{ const c=costOf(p); if(c==null){ if(p.stock>0) missing++; } else value+=c*Math.max(0,p.stock||0); });
      return { value:round2(value), missing };
    },
  };

  /* ============================================================
     FINANZAS — facturas, caja, cuentas por cobrar y por pagar, resultados
     ============================================================ */
  // Un pedido cuenta como cobrado desde que se paga; si luego se cancela, conserva su fecha de cobro para poder devolverlo.
  const paidAtOf = o => o.paidAt || (SOLD.includes(o.status) ? o.createdAt : null);
  const activeInvoiceOf = orderId => fin().invoices.find(i=>i.orderId===orderId && i.kind!=="credit" && i.status!=="void") || null;
  const creditsOf = inv => fin().invoices.filter(c=>c.kind==="credit" && c.rectifies===inv.id);
  const creditedTotal = inv => round2(sum(creditsOf(inv), c=>c.total));
  function nextNumber(pre, year){
    let max=0;
    fin().invoices.forEach(i=>{ const p=String(i.number).split("-"); if(p[0]===pre && p[p.length-2]===String(year)) max=Math.max(max, +p[p.length-1]||0); });
    return pre+"-"+year+"-"+pad(max+1,4);
  }
  const nextInvoiceNumber = year => nextNumber(fin().business.prefix||"F", year);
  function itemCost(it){ if(isNum(it.cost)) return it.cost; const p=VDB.getProduct(it.productId); return costOf(p); }
  function invState(inv){
    if(inv.kind==="credit") return { paid:0, balance:0, state:"credit", credited:0 };
    const credited=creditedTotal(inv), paid = inv.settledByOrder ? inv.total : round2(sum(inv.payments, x=>x.amount));
    let state="pending", balance=0;
    if(inv.status==="void") state="void";
    else if(credited>0.005) state="credited";                    // rectificada por una nota de crédito: ya no se cobra ni cuenta
    else{
      balance=Math.max(0, round2(inv.total-paid));
      if(balance<=0.005) state="paid";
      else if(dayKey(inv.dueAt) < todayKey()) state="overdue";
      else if(paid>0) state="partial";
    }
    return { paid, balance, state, credited };
  }
  /* Una factura emitida no se edita ni se borra: se rectifica con una nota de crédito (serie NC), que la anula por el total,
     devuelve lo cobrado y, si procede, la mercancía al almacén. */
  function issueCredit(inv, o){
    const at=o.at||Date.now(), paid=inv.settledByOrder ? 0 : round2(sum(inv.payments, x=>x.amount));
    const nc={ id:uid("inv"), kind:"credit", number:nextNumber("NC", new Date(at).getFullYear()), rectifies:inv.id, orderId:inv.orderId||null, userId:inv.userId||null,
      customer:Object.assign({}, inv.customer), issuedAt:at, dueAt:at, status:"issued", payments:[], refunds:[], note:String(o.reason||"").trim(),
      lines:inv.lines.map(l=>Object.assign({}, l)), subtotal:inv.subtotal, shipping:inv.shipping||0, tax:inv.tax, total:inv.total, taxRate:inv.taxRate, returnStock:!!o.returnStock };
    if(paid>0) nc.refunds.push({ id:uid("ref"), date:at, amount:Math.min(paid,inv.total), method:o.refundMethod||"cash" });
    if(o.returnStock) nc.lines.forEach(l=>{ const p=l.productId?VDB.getProduct(l.productId):null; if(p) p.stock+=l.qty; });
    fin().invoices.push(nc); return nc;
  }
  // force: solo la demo, para facturar un pedido que luego se canceló
  function invoiceFromOrder(orderId, at, force){
    const o=VDB.getOrder(orderId); if(!o) return fail("neg.err.noOrder");
    if(!SOLD.includes(o.status) && !(force && o.paidAt)) return fail("neg.err.orderNotPaid");
    if(activeInvoiceOf(orderId)) return fail("neg.err.alreadyInvoiced");
    const u=buyerOf(o), when=at||Date.now();
    const inv={ id:uid("inv"), number:nextInvoiceNumber(new Date(when).getFullYear()), orderId:o.id, userId:o.userId,
      customer:{ name:u?u.name:"—", taxId:"", email:u?u.email:"", address:addrLine(o.address) },
      issuedAt:when, dueAt:when, status:"issued", settledByOrder:true, payments:[], note:"",
      lines:o.items.map(it=>({ productId:it.productId, desc:it.title, qty:it.qty, price:it.priceAtPurchase, cost:itemCost(it) })),
      subtotal:o.subtotal, shipping:o.shipping, tax:o.tax, total:o.total, taxRate:o.subtotal?round2(o.tax/o.subtotal*100):0 };
    fin().invoices.push(inv); VDB.save(); return {ok:true, invoice:inv};
  }
  // d: {userId?, customer:{name,taxId,email,address}, lines:[{productId?,desc,qty,price}], taxRate(%), creditDays, method, note}
  function issueManual(d, at, skipStock){
    const name=String((d.customer||{}).name||"").trim(); if(!name) return fail("neg.err.customer");
    const lines=(d.lines||[]).map(l=>({ productId:l.productId||null, desc:String(l.desc||"").trim(), qty:Number(l.qty), price:Number(l.price) }));
    if(!lines.length || lines.some(l=>!l.desc || !(l.qty>0) || !(l.price>=0))) return fail("neg.err.lines");
    const when=at||Date.now(), credit=Math.max(0,Math.floor(Number(d.creditDays)||0));
    if(!skipStock && credit===0 && VFIN.closingOf(dayKey(when))) return fail("neg.err.dayClosed");
    if(!skipStock){
      for(const l of lines){ if(!l.productId) continue; const p=VDB.getProduct(l.productId); if(p && p.stock<l.qty) return fail("neg.err.noStock"); }
    }
    lines.forEach(l=>{ const p=l.productId?VDB.getProduct(l.productId):null; l.cost=costOf(p); if(p && !skipStock) p.stock=Math.max(0,p.stock-l.qty); });
    const subtotal=round2(sum(lines,l=>l.qty*l.price)), rate=Math.max(0,Number(d.taxRate)||0), tax=round2(subtotal*rate/100);
    const inv={ id:uid("inv"), number:nextInvoiceNumber(new Date(when).getFullYear()), orderId:null, userId:d.userId||null,
      customer:{ name, taxId:String(d.customer.taxId||"").trim(), email:String(d.customer.email||"").trim(), address:String(d.customer.address||"").trim() },
      issuedAt:when, dueAt:when+credit*DAY, status:"issued", settledByOrder:false, payments:[], note:String(d.note||"").trim(),
      lines, subtotal, shipping:0, tax, total:round2(subtotal+tax), taxRate:rate };
    if(credit===0) inv.payments.push({ id:uid("pay"), date:when, amount:inv.total, method:d.method||"cash", note:"" });
    fin().invoices.push(inv); if(!skipStock) log("invoice",{ number:inv.number, amount:inv.total }); VDB.save(); return {ok:true, invoice:inv};
  }
  const VFIN = {
    EXPENSE_CATS,
    business(){ return fin().business; },
    setBusiness(patch){
      const b=fin().business;
      if("prefix" in patch) patch.prefix=String(patch.prefix||"").replace(/[^A-Za-z0-9]/g,"").slice(0,6)||"F";
      if("taxRate" in patch) patch.taxRate=Math.max(0,Number(patch.taxRate)||0);
      Object.assign(b,patch); VDB.save();
    },
    invoices(){ return fin().invoices.slice().sort((a,b)=>b.issuedAt-a.issuedAt || b.number.localeCompare(a.number)); },
    getInvoice: id => fin().invoices.find(i=>i.id===id)||null,
    invoiceOf: activeInvoiceOf,
    state: invState,
    // pedidos con la venta cobrada que aún no tienen factura vigente
    unbilledOrders(){ return db.orders.filter(o=>SOLD.includes(o.status) && !activeInvoiceOf(o.id)).sort((a,b)=>b.createdAt-a.createdAt); },
    invoiceFromOrder,
    invoiceAllUnbilled(){ let n=0; VFIN.unbilledOrders().reverse().forEach(o=>{ if(invoiceFromOrder(o.id,o.createdAt).ok) n++; }); return n; },
    createInvoice: d => issueManual(d, Date.now(), false),
    // Anular solo vale para una factura manual que nunca movió dinero. Con cobros, o si viene de un pedido, se rectifica.
    voidInvoice(id){
      const inv=VFIN.getInvoice(id); if(!inv || inv.kind==="credit" || inv.status==="void") return fail("neg.err.noInvoice");
      if(inv.orderId) return fail("neg.err.voidOrderInvoice");
      if(inv.payments.length || creditedTotal(inv)>0) return fail("neg.err.useCreditNote");
      inv.status="void"; inv.voidedAt=Date.now();
      inv.lines.forEach(l=>{ const p=l.productId?VDB.getProduct(l.productId):null; if(p) p.stock+=l.qty; });
      log("void",{ number:inv.number }); VDB.save(); return {ok:true};
    },
    // o: {reason, refundMethod, returnStock, at}. Las facturas de un pedido se rectifican solas al cancelar el pedido.
    creditNote(id, o){
      o=o||{}; const inv=VFIN.getInvoice(id);
      if(!inv || inv.kind==="credit" || inv.status!=="issued") return fail("neg.err.noInvoice");
      if(inv.orderId) return fail("neg.err.creditViaOrder");
      if(creditedTotal(inv)>0) return fail("neg.err.alreadyCredited");
      const at=o.at||Date.now(), paid=round2(sum(inv.payments, x=>x.amount));
      if(paid>0 && VFIN.closingOf(dayKey(at))) return fail("neg.err.dayClosed");
      const nc=issueCredit(inv,{ at, reason:o.reason, refundMethod:o.refundMethod, returnStock:o.returnStock!==false && inv.lines.some(l=>l.productId) });
      log("credit",{ number:nc.number, of:inv.number, amount:nc.total }, at); VDB.save(); return {ok:true, invoice:nc};
    },
    creditsOf, credited:creditedTotal,
    addPayment(id, d){
      const inv=VFIN.getInvoice(id); if(!inv || inv.kind==="credit" || inv.status==="void" || inv.settledByOrder) return fail("neg.err.noInvoice");
      if(creditedTotal(inv)>0) return fail("neg.err.alreadyCredited");
      const amount=round2(d.amount); if(!(amount>0)) return fail("neg.err.amount");
      if(amount>invState(inv).balance+0.005) return fail("neg.err.overBalance");
      const date=d.date||Date.now();
      if(isFuture(date)) return fail("neg.err.futureDate");
      if(dayKey(date) < dayKey(inv.issuedAt)) return fail("neg.err.dateBeforeDoc");          // no se cobra antes de emitir
      if(VFIN.closingOf(dayKey(date))) return fail("neg.err.dayClosed");
      inv.payments.push({ id:uid("pay"), date, amount, method:d.method||"cash", note:String(d.note||"").trim() });
      log("payIn",{ number:inv.number, amount }); VDB.save(); return {ok:true};
    },

    /* cuentas por cobrar / por pagar */
    receivables(){
      return fin().invoices.map(inv=>({ inv, ...invState(inv) })).filter(r=>r.balance>0)
        .map(r=>({ ...r, daysLate: Math.max(0, Math.round((dayStart(todayKey())-dayStart(dayKey(r.inv.dueAt)))/DAY)) }))
        .sort((a,b)=>a.inv.dueAt-b.inv.dueAt);
    },
    payables(){
      return buy().pos.filter(po=>poBalance(po)>0).map(po=>{ const due=poDue(po); return { po, balance:poBalance(po), dueAt:due, daysLate:Math.max(0, Math.round((dayStart(todayKey())-dayStart(dayKey(due)))/DAY)) }; })
        .sort((a,b)=>a.dueAt-b.dueAt);
    },
    aging(rows){
      const b={ current:0, d30:0, d60:0, d90:0 };
      rows.forEach(r=>{ const k = r.daysLate<=0?"current":r.daysLate<=30?"d30":r.daysLate<=60?"d60":"d90"; b[k]+=r.balance; });
      Object.keys(b).forEach(k=>b[k]=round2(b[k])); return b;
    },

    /* caja */
    addExpense(d){
      const amount=round2(d.amount), concept=String(d.concept||"").trim();
      if(!concept) return fail("neg.err.concept"); if(!(amount>0)) return fail("neg.err.amount");
      const date=d.date||Date.now();
      if(isFuture(date)) return fail("neg.err.futureDate");
      if(VFIN.closingOf(dayKey(date))) return fail("neg.err.dayClosed");
      fin().expenses.push({ id:uid("exp"), date, concept, category:EXPENSE_CATS.includes(d.category)?d.category:"other", amount, method:d.method||"cash" });
      log("expense",{ concept, amount }); VDB.save(); return {ok:true};
    },
    deleteExpense(id){
      const e=fin().expenses.find(x=>x.id===id); if(!e) return fail("neg.err.noExpense");
      if(VFIN.closingOf(dayKey(e.date))) return fail("neg.err.dayClosed");
      fin().expenses = fin().expenses.filter(x=>x.id!==id); log("expenseDel",{ concept:e.concept, amount:e.amount }); VDB.save(); return {ok:true};
    },
    movements(from, to){
      const out=[], inR = ts => ts>=from && ts<to;
      db.orders.forEach(o=>{
        const pa=paidAtOf(o), u=buyerOf(o);
        if(pa!=null && inR(pa)) out.push({ ts:pa, dir:"in", method:"card", amount:o.total, kind:"order", ref:o.id, label:u?u.name:"—" });
        // pedido cobrado y luego cancelado: sale el mismo importe por la misma vía (tarjeta) en la fecha de la cancelación
        if(o.status==="cancelled" && o.paidAt && o.cancelledAt && inR(o.cancelledAt)) out.push({ ts:o.cancelledAt, dir:"out", method:"card", amount:o.total, kind:"refund", ref:o.id, label:u?u.name:"—" });
      });
      fin().invoices.forEach(i=>{
        if(i.status==="void") return;
        if(i.kind==="credit"){ (i.refunds||[]).forEach(r=>{ if(inR(r.date)) out.push({ ts:r.date, dir:"out", method:r.method, amount:r.amount, kind:"refund", ref:i.number, refId:i.id, label:i.customer.name }); }); return; }
        if(i.settledByOrder) return;
        i.payments.forEach(p=>{ if(inR(p.date)) out.push({ ts:p.date, dir:"in", method:p.method, amount:p.amount, kind:"invoice", ref:i.number, refId:i.id, label:i.customer.name }); });
      });
      fin().expenses.forEach(e=>{ if(inR(e.date)) out.push({ ts:e.date, dir:"out", method:e.method, amount:e.amount, kind:"expense", ref:e.id, label:e.concept, category:e.category }); });
      buy().pos.forEach(po=>po.payments.forEach(p=>{ if(inR(p.date)){ const s=supplierOf(po.supplierId); out.push({ ts:p.date, dir:"out", method:p.method, amount:p.amount, kind:"supplier", ref:po.number, refId:po.id, label:s?s.name:"—" }); } }));
      return out.sort((a,b)=>a.ts-b.ts);
    },
    closings(){ return fin().closings.slice().sort((a,b)=>b.date.localeCompare(a.date)); },
    closingOf: key => fin().closings.find(c=>c.date===key)||null,
    openingFor(key){ const prev=VFIN.closings().find(c=>c.date<key); return prev?prev.counted:0; },
    dayReport(key){
      const from=dayStart(key), rows=VFIN.movements(from, nextDay(from));
      const tot={ in:{cash:0,card:0,transfer:0}, out:{cash:0,card:0,transfer:0} };
      rows.forEach(r=>{ tot[r.dir][r.method]=round2((tot[r.dir][r.method]||0)+r.amount); });
      const closing=VFIN.closingOf(key), opening=closing?closing.opening:VFIN.openingFor(key);
      return { key, rows, tot, closing, opening, expectedCash:round2(opening+tot.in.cash-tot.out.cash), totalIn:round2(sum(rows.filter(r=>r.dir==="in"),r=>r.amount)), totalOut:round2(sum(rows.filter(r=>r.dir==="out"),r=>r.amount)) };
    },
    closeDay(key, opening, counted, note){
      if(key>todayKey()) return fail("neg.err.future");
      if(VFIN.closingOf(key)) return fail("neg.err.dayClosed");
      opening=round2(opening); counted=round2(counted);
      if(!isFinite(opening) || !isFinite(counted) || counted<0 || opening<0) return fail("neg.err.amount");
      const r=VFIN.dayReport(key), expected=round2(opening+r.tot.in.cash-r.tot.out.cash);
      const diff=round2(counted-expected);
      fin().closings.push({ id:uid("cls"), date:key, opening, expectedCash:expected, counted, diff, note:String(note||"").trim(), totalIn:r.totalIn, totalOut:r.totalOut, closedAt:Date.now() });
      log("close",{ date:key, diff }); VDB.save(); return {ok:true};
    },

    /* resultados (base devengado: la venta cuenta el día que se cobra el pedido o se emite la factura) */
    summary(from, to){
      const inR = ts => ts>=from && ts<to;
      let sales=0, shipping=0, tax=0, cogs=0, noCost=0;
      const cost = (lines, get, sign) => lines.forEach(l=>{ const c=get(l); if(c==null){ if(sign>0) noCost+=l.qty; } else cogs+=sign*c*l.qty; });
      db.orders.forEach(o=>{
        const pa=paidAtOf(o);
        if(pa!=null && inR(pa)){ sales+=o.subtotal; shipping+=o.shipping; tax+=o.tax; cost(o.items, itemCost, 1); }
        // cancelado tras cobrarse: la venta se revierte en el mes de la cancelación, no se borra del mes en que se hizo
        if(o.status==="cancelled" && o.paidAt && o.cancelledAt && inR(o.cancelledAt)){ sales-=o.subtotal; shipping-=o.shipping; tax-=o.tax; cost(o.items, itemCost, -1); }
      });
      fin().invoices.forEach(i=>{
        if(i.orderId || i.status==="void" || !inR(i.issuedAt)) return;        // las facturas de pedido ya cuentan por el pedido
        const goods = () => i.lines.filter(l=>l.productId), c = l=>isNum(l.cost)?l.cost:null;
        if(i.kind==="credit"){ sales-=i.subtotal; tax-=i.tax; if(i.returnStock) cost(goods(), c, -1); }
        else { sales+=i.subtotal; tax+=i.tax; cost(goods(), c, 1); }
      });
      const byCat={}; let expenses=0;
      fin().expenses.forEach(e=>{ if(inR(e.date)){ byCat[e.category]=round2((byCat[e.category]||0)+e.amount); expenses+=e.amount; } });
      sales=round2(sales); shipping=round2(shipping); cogs=round2(cogs); expenses=round2(expenses);
      const revenue=round2(sales+shipping), gross=round2(revenue-cogs);
      return { sales, shipping, revenue, cogs, gross, grossPct:revenue?gross/revenue:null, expenses, byCat, result:round2(gross-expenses), tax:round2(tax), noCost };
    },
    // Ingresos netos por día natural LOCAL: alimenta la gráfica del panel con la misma definición que Resultados.
    dailyRevenue(days){
      const out=[], t0=new Date(); t0.setHours(0,0,0,0);
      for(let i=days-1;i>=0;i--){ const from=new Date(t0.getFullYear(),t0.getMonth(),t0.getDate()-i).getTime(); out.push({ date:dayKey(from), total:VFIN.summary(from,nextDay(from)).revenue }); }
      return out;
    },
    // Cifras del panel: ingresos netos de todo el histórico y nº de ventas vivas (pedidos cobrados + facturas de mostrador sin rectificar).
    overview(){
      const s=VFIN.summary(0, Date.now()+DAY);
      const count = db.orders.filter(o=>SOLD.includes(o.status)).length + fin().invoices.filter(i=>i.kind!=="credit" && !i.orderId && i.status==="issued" && creditedTotal(i)===0).length;
      return { revenue:s.revenue, count, avgTicket:count?round2(s.revenue/count):0 };
    },
    activity(){ return neg().log.slice(); },
    monthly(n){
      const out=[], d=new Date(); d.setDate(1); d.setHours(0,0,0,0);
      for(let i=0;i<n;i++){
        const from=new Date(d.getFullYear(), d.getMonth()-i, 1).getTime(), to=new Date(d.getFullYear(), d.getMonth()-i+1, 1).getTime();
        out.push({ from, ...VFIN.summary(from,to) });
      }
      return out;
    },
  };

  /* ============================================================
     CRM — clientes, puntos, cupones y campañas
     ============================================================ */
  const SEGMENTS = ["all","vip","active","new","risk","none"];
  const rules = () => crm().rules;
  const profileOf = id => Object.assign({ phone:"", optIn:false, tags:[], notes:"" }, crm().profiles[id]||{});
  // Los puntos se fijan cuando se ganan (crm.earned): cambiar la regla después solo afecta a las compras futuras.
  const pointsOf = (userId, purchases) => sum(purchases, p=>p.points) + sum(crm().ledger.filter(l=>l.userId===userId), l=>l.points);
  function enrich(u, now){
    const r=rules(), pr=profileOf(u.id), earned=crm().earned;
    const orders=db.orders.filter(o=>o.userId===u.id);
    const invs=fin().invoices.filter(i=>i.userId===u.id && !i.orderId && i.kind!=="credit");     // ventas de mostrador a este cliente
    const pts=(key, subtotal)=>earned[key]!==undefined ? earned[key] : Math.floor(subtotal*r.pointsPerUnit);
    const live=i=>i.status==="issued" && creditedTotal(i)===0;
    // compras vivas: pedidos cobrados y facturas manuales no anuladas ni rectificadas
    const purchases=[
      ...orders.filter(o=>SOLD.includes(o.status)).map(o=>({ type:"order", id:o.id, at:o.createdAt, total:o.total, points:pts(o.id,o.subtotal) })),
      ...invs.filter(live).map(i=>({ type:"invoice", id:i.number, invId:i.id, at:i.issuedAt, total:i.total, points:pts(i.id,i.subtotal) })),
    ].sort((a,b)=>b.at-a.at);
    // historial completo (incluye lo pendiente, cancelado o rectificado) para la ficha
    const history=[
      ...orders.map(o=>({ type:"order", id:o.id, at:o.createdAt, total:o.total, status:o.status, points:SOLD.includes(o.status)?pts(o.id,o.subtotal):0 })),
      ...invs.map(i=>({ type:"invoice", id:i.number, invId:i.id, at:i.issuedAt, total:i.total, status:invState(i).state, points:live(i)?pts(i.id,i.subtotal):0 })),
    ].sort((a,b)=>b.at-a.at);
    const spent=round2(sum(purchases,x=>x.total)), last=purchases.length?purchases[0].at:null, first=purchases.length?purchases[purchases.length-1].at:null;
    const days=last==null?null:Math.floor((now-last)/DAY), seg=[];
    if(!purchases.length) seg.push("none");
    else{
      seg.push(days>r.riskDays?"risk":"active");
      if(spent>=r.vipSpend) seg.push("vip");
      if(purchases.length===1 && (now-first)/DAY<=r.newDays) seg.push("new");
    }
    return { id:u.id, user:u, name:u.name, email:u.email, phone:pr.phone, optIn:pr.optIn, tags:pr.tags, notes:pr.notes,
      history, purchases, orderCount:purchases.length, spent, avgTicket:purchases.length?round2(spent/purchases.length):0, lastOrderAt:last, daysSince:days,
      points:pointsOf(u.id, purchases), segments:seg, primary:["none","risk","vip","new","active"].find(k=>seg.includes(k)) };
  }
  function uniqueCode(code, selfId){ return !crm().coupons.some(c=>c.code===code && c.id!==selfId); }
  function fmtTpl(tpl, c, coupon){
    return String(tpl||"").replace(/\{(\w+)\}/g,(m,k)=>{
      if(k==="nombre") return c.name.split(" ")[0];
      if(k==="tienda") return db.settings.storeName||"";
      if(k==="cupon") return coupon?coupon.code:"";
      if(k==="puntos") return String(c.points);
      return m;
    });
  }
  const VCRM = {
    SEGMENTS,
    rules, setRules(patch){
      const r=rules();
      ["pointsPerUnit","pointValue","vipSpend","riskDays","newDays"].forEach(k=>{ if(k in patch){ const v=Number(patch[k]); if(isFinite(v) && v>=0) r[k]=v; } });
      VDB.save();
    },
    customers(){ const now=Date.now(); return db.users.filter(u=>u.role==="customer").map(u=>enrich(u,now)); },
    customer(id){ const u=db.users.find(x=>x.id===id); return u ? enrich(u,Date.now()) : null; },
    setProfile(id, patch){
      const cur=crm().profiles[id]||(crm().profiles[id]={ phone:"", optIn:false, tags:[], notes:"" });
      if("phone" in patch) cur.phone=String(patch.phone||"").trim();
      if("optIn" in patch) cur.optIn=!!patch.optIn;
      if("tags" in patch) cur.tags=patch.tags;
      if("notes" in patch) cur.notes=String(patch.notes||"").trim();
      VDB.save();
    },
    ledger(userId){ return crm().ledger.filter(l=>l.userId===userId).sort((a,b)=>b.createdAt-a.createdAt); },
    adjustPoints(userId, points, reason){
      points=Math.trunc(Number(points)); if(!points) return fail("neg.err.points");
      const c=VCRM.customer(userId); if(!c) return fail("neg.err.customer");
      if(points<0 && -points>c.points) return fail("neg.err.notEnoughPoints");
      crm().ledger.push({ id:uid("led"), userId, points, reason:String(reason||"").trim()||"adjust", kind:"adjust", createdAt:Date.now() });
      VDB.save(); return {ok:true};
    },
    // Canje: los puntos se descuentan y se emite un cupón personal de un solo uso (vale 90 días).
    redeemPoints(userId, points){
      points=Math.floor(Number(points)); const c=VCRM.customer(userId);
      if(!c) return fail("neg.err.customer"); if(!(points>0)) return fail("neg.err.points");
      if(points>c.points) return fail("neg.err.notEnoughPoints");
      const value=round2(points*rules().pointValue); if(!(value>0)) return fail("neg.err.points");
      let code; do{ code="PTS-"+Math.random().toString(36).slice(2,8).toUpperCase(); }while(!uniqueCode(code));
      const coupon={ id:uid("cpn"), code, type:"fixed", value, minSpend:0, from:null, to:dayKey(Date.now()+90*DAY), maxUses:1, uses:0, active:true, userId, source:"points", note:"", createdAt:Date.now() };
      crm().coupons.unshift(coupon);
      crm().ledger.push({ id:uid("led"), userId, points:-points, reason:code, kind:"redeem", couponId:coupon.id, createdAt:Date.now() });
      VDB.save(); return {ok:true, coupon};
    },

    coupons(){ return crm().coupons.slice().sort((a,b)=>b.createdAt-a.createdAt); },
    coupon: id => crm().coupons.find(c=>c.id===id)||null,
    couponStatus(c){
      const t=todayKey();
      if(!c.active) return "off";
      if(c.from && c.from>t) return "scheduled";
      if(c.to && c.to<t) return "expired";
      if(c.maxUses && c.uses>=c.maxUses) return "spent";
      return "active";
    },
    saveCoupon(d){
      const code=String(d.code||"").trim().toUpperCase();
      if(!/^[A-Z0-9_-]{3,20}$/.test(code)) return fail("neg.err.code");
      if(!uniqueCode(code, d.id)) return fail("neg.err.codeUsed");
      const type=d.type==="fixed"?"fixed":"percent", value=Number(d.value);
      if(!(value>0) || (type==="percent" && value>100)) return fail("neg.err.value");
      if(d.from && d.to && d.from>d.to) return fail("neg.err.dates");
      let c = d.id ? VCRM.coupon(d.id) : null;
      if(!c){ c={ id:uid("cpn"), uses:0, source:"manual", createdAt:Date.now() }; crm().coupons.unshift(c); }
      Object.assign(c, { code, type, value:round2(value), minSpend:Math.max(0,Number(d.minSpend)||0), from:d.from||null, to:d.to||null,
        maxUses:Math.max(0,Math.floor(Number(d.maxUses)||0)), active:d.active!==false, userId:d.userId||null, note:String(d.note||"").trim() });
      VDB.save(); return {ok:true, coupon:c};
    },
    toggleCoupon(id){ const c=VCRM.coupon(id); if(c){ c.active=!c.active; VDB.save(); } },
    deleteCoupon(id){ crm().coupons=crm().coupons.filter(c=>c.id!==id); VDB.save(); },
    // La tienda no canjea cupones (decisión de alcance): el uso se anota a mano cuando se aplica en una venta.
    registerUse(id){ const c=VCRM.coupon(id); if(!c || VCRM.couponStatus(c)!=="active") return fail("neg.err.couponInactive"); c.uses++; VDB.save(); return {ok:true}; },

    audience(segment, channel){
      const list=VCRM.customers().filter(c=>segment==="all"||c.segments.includes(segment));
      const eligible=[], skipped={ optOut:0, noContact:0 };
      list.forEach(c=>{
        if(!c.optIn){ skipped.optOut++; return; }
        if(channel==="whatsapp" ? !waNumber(c.phone) : !c.email){ skipped.noContact++; return; }
        eligible.push(c);
      });
      return { eligible, skipped, total:list.length };
    },
    render: fmtTpl,
    campaigns(){ return crm().campaigns.slice().sort((a,b)=>b.createdAt-a.createdAt); },
    campaign: id => crm().campaigns.find(c=>c.id===id)||null,
    createCampaign(d){
      const name=String(d.name||"").trim(), message=String(d.message||"").trim();
      if(!name) return fail("neg.err.name"); if(!message) return fail("neg.err.message");
      const channel=d.channel==="email"?"email":"whatsapp", aud=VCRM.audience(d.segment, channel);
      if(!aud.eligible.length) return fail("neg.err.noAudience");
      const camp={ id:uid("cmp"), name, channel, segment:d.segment, couponId:d.couponId||null, subject:String(d.subject||"").trim(), message,
        recipients:aud.eligible.map(c=>({ userId:c.id, sentAt:null })), createdAt:Date.now() };
      crm().campaigns.unshift(camp); VDB.save(); return {ok:true, campaign:camp};
    },
    // Enlace listo para abrir WhatsApp/correo con el mensaje ya escrito para ese cliente.
    linkFor(camp, userId){
      const c=VCRM.customer(userId); if(!c) return "";
      const coupon=camp.couponId?VCRM.coupon(camp.couponId):null, text=fmtTpl(camp.message,c,coupon);
      return camp.channel==="whatsapp" ? waLink(c.phone,text) : mailLink(c.email, fmtTpl(camp.subject,c,coupon), text);
    },
    markSent(campId, userId){
      const camp=VCRM.campaign(campId), r=camp&&camp.recipients.find(x=>x.userId===userId);
      if(r && !r.sentAt){ r.sentAt=Date.now(); VDB.save(); }
    },
    deleteCampaign(id){ crm().campaigns=crm().campaigns.filter(c=>c.id!==id); VDB.save(); },
  };

  /* ============================================================
     Sembrado: el contenido de ejemplo vive en negocio-demo.js (se carga antes que este fichero).
     ============================================================ */
  function seed(){
    const n=emptyNeg(); db.neg=n;
    if(window.VNEG_DEMO) window.VNEG_DEMO.populate(n);
    n.demoV=demoVersion();
    sync();
    return n;
  }
  /* Deriva de los pedidos lo que no se puede calcular al vuelo y debe quedar fijo:
     · los puntos de cada compra, al ritmo de la regla vigente ese día;
     · la nota de crédito de un pedido facturado que se canceló después (la tienda no carga este módulo, así que se emite aquí). */
  function sync(){
    let dirty=false; const earned=crm().earned, rate=rules().pointsPerUnit;
    db.orders.forEach(o=>{ if(paidAtOf(o)!=null && earned[o.id]===undefined){ earned[o.id]=Math.floor(o.subtotal*rate); dirty=true; } });
    fin().invoices.forEach(i=>{ if(i.kind!=="credit" && !i.orderId && i.status==="issued" && earned[i.id]===undefined){ earned[i.id]=Math.floor(i.subtotal*rate); dirty=true; } });
    db.orders.forEach(o=>{
      if(o.status!=="cancelled" || !o.paidAt) return;
      const inv=activeInvoiceOf(o.id);
      if(inv && creditedTotal(inv)===0){
        const nc=issueCredit(inv,{ at:o.cancelledAt||Date.now(), reason:"cancel", returnStock:false });   // el stock ya lo devolvió la tienda al cancelar
        log("credit",{ number:nc.number, of:inv.number, amount:nc.total }, nc.issuedAt, "@sistema"); dirty=true;
      }
    });
    if(dirty) VDB.save();
  }

  /* reset/wipe de datos.html deben arrastrar también lo de este módulo */
  const baseReset=VDB.reset, baseWipe=VDB.wipe;
  VDB.reset=function(){ baseReset.call(this); delete db.neg; ensure(); };
  VDB.wipe=function(){
    baseWipe.call(this);
    const keep=neg(), fresh=emptyNeg();
    fresh.fin.business=keep.fin.business; fresh.crm.rules=keep.crm.rules; fresh.crm.profiles=keep.crm.profiles; fresh.buy.suppliers=keep.buy.suppliers; fresh.buy.auto=keep.buy.auto;
    fresh.demoV=keep.demoV;   // vaciar no debe disparar un nuevo sembrado de la demo
    db.neg=fresh; VDB.save();
  };

  // Editar precio, costo o stock a mano desde el editor de producto deja constancia en el registro de actividad.
  const baseUpdate=VDB.updateProduct;
  VDB.updateProduct=function(id, data){
    const p=VDB.getProduct(id), b=p?{ title:p.title, stock:p.stock, price:p.price, cost:isNum(p.cost)?p.cost:null }:null;
    const r=baseUpdate.call(this,id,data);
    if(p && b){
      if(p.stock!==b.stock) log("stock",{ title:b.title, from:b.stock, to:p.stock });
      if(p.price!==b.price) log("price",{ title:b.title, from:b.price, to:p.price });
      const c=isNum(p.cost)?p.cost:null; if(c!==b.cost) log("cost",{ title:b.title, from:b.cost, to:c });
      VDB.save();
    }
    return r;
  };

  window.VNEG = { SOLD, DAY, round2, dayKey, dayStart, todayKey, waNumber, waLink, mailLink, addrLine, isNum,
    issueManual, poNumber, ensure, sync, log, paidAtOf,
    // «Cargar datos de ejemplo»: descarta lo de negocio y vuelve a sembrarlo con fechas de hoy
    reloadDemo(){ delete db.neg; ensure(); return !!window.VNEG_DEMO; } };
  window.VCRM = VCRM; window.VFIN = VFIN; window.VBUY = VBUY;
  ensure();
})();
