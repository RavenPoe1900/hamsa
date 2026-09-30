/* ============================================================
   NEGOCIO — datos de demostración
   Se carga ANTES que negocio.js. Rellena Clientes, Facturación y Compras con casos escogidos a propósito
   para que cada pantalla enseñe todos sus estados (VIP en riesgo, cobros vencidos por antigüedad,
   márgenes bajos, órdenes atrasadas, cierres de caja con diferencia…). Todo es ficticio.

   Las fechas son relativas a hoy, así que la demo siempre parece «de esta semana».
   Es determinista: sin Math.random, cada carga produce lo mismo.
   Si subes VERSION, negocio.js vuelve a sembrar la demo en la siguiente carga.
   ============================================================ */
(function(){
  "use strict";
  const VERSION = 4;

  function rng(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }

  function populate(n){
    const VDB=window.VDB, db=VDB.db, uid=VDB.uid, V=window.VNEG, VFIN=window.VFIN, VCRM=window.VCRM;
    const { DAY, SOLD, round2, dayKey, isNum } = V;
    const rnd=rng(20260928), now=Date.now(), ago=d=>now-d*DAY, pad=(x,w)=>String(x).padStart(w,"0");
    const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
    const shuffle=a=>{ const c=a.slice(); for(let i=c.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [c[i],c[j]]=[c[j],c[i]]; } return c; };
    const HOUR=3600000;

    /* ---------- proveedores: activos, sin contacto (contado) e inactivo ---------- */
    const SUP = [
      { key:"tech",   name:"Caribe Tech Import",         contact:"Rolando Pérez",   phone:"+53 5 5551 0142", email:"pedidos@caribetech.mock",  terms:15, leadDays:10, categories:["celulares-y-accesorios-tfan","tecnologia-9kw9","televisores-0w8l"] },
      { key:"cold",   name:"Frío y Clima Distribuidora", contact:"Yamila Ortega",   phone:"+53 5 5552 0277", email:"ventas@frioyclima.mock",   terms:30, leadDays:14, categories:["clima-2z74","refrigeradores-41ef","lavadoras-y-secadoras-jmgr","otros-electrodomesticos"] },
      { key:"energy", name:"Energía Norte",              contact:"Adrián Salas",    phone:"+53 5 5553 0391", email:"compras@energianorte.mock", terms:7,  leadDays:7,  categories:["energia-de-respaldo","transporte-kdri"] },
      { key:"home",   name:"Hogar Mayorista",            contact:"Beatriz Cano",    phone:"+53 5 5554 0456", email:"info@hogarmayorista.mock",  terms:21, leadDays:5,  categories:["ollas-batidoras-cafeteras-y-mas","utiles-del-hogar-99a9","juguetes-y-articulos-para-ninos-f45h","salud-y-bienestar-y5f6c"] },
      { key:"tools",  name:"Ferretería del Puerto",      contact:"Gilberto Núñez",  phone:"",                email:"",                          terms:0,  leadDays:3,  categories:["ferreteria-8jrs"], notes:"Solo al contado. Sin teléfono ni correo registrados: se les pide en persona." },
      { key:"old",    name:"Importadora Vieja Habana",   contact:"Mercedes Lara",   phone:"+53 5 5556 0512", email:"mlara@viejahabana.mock",   terms:45, leadDays:21, categories:[], active:false, notes:"Dejó de suministrar; se conserva por el historial." },
    ];
    const sup={}; n.buy.suppliers=SUP.map(s=>{ const o=Object.assign({ id:uid("sup"), active:true, notes:"" }, s); delete o.key; sup[s.key]=o; return o; });
    const supFor={}; n.buy.suppliers.forEach(s=>s.categories.forEach(c=>{ supFor[c]=s.id; }));

    /* ---------- productos: costo, mínimo y proveedor, con casos límite ---------- */
    db.products.forEach(p=>{
      p.cost=round2(Math.max(0.5, p.price*(0.55+rnd()*0.23)));
      p.reorderPoint=5; p.reorderQty=p.price>500?3:p.price>150?6:p.price>50?12:24;
      p.supplierId=supFor[p.category]||null;
    });
    const used=new Set(), shuffled=shuffle(db.products);
    const take=(k,f)=>{ const out=[]; for(const p of shuffled){ if(out.length>=k) break; if(used.has(p.id)||!f(p)) continue; used.add(p.id); out.push(p); } return out; };
    const lowM=take(12, p=>p.price>=8); lowM.forEach(p=>{ p.cost=round2(p.price*(0.87+rnd()*0.09)); });   // margen bajo (4–14 %)
    const noCost=take(8, p=>p.stock>0); noCost.forEach(p=>{ p.cost=null; });                        // sin costo registrado
    take(10, p=>p.stock>=6 && p.stock<=25 && p.supplierId).forEach(p=>{ p.reorderPoint=p.stock+2+Math.floor(rnd()*4); });   // su mínimo los pone en «reponer»
    const hot=take(2, p=>p.price>150 && p.stock<=4 && p.supplierId && isNum(p.cost));                // se venden mucho y quedan pocos
    if(hot.length<2) take(2-hot.length, p=>p.price>60 && p.stock<=6 && p.supplierId && isNum(p.cost)).forEach(p=>hot.push(p));
    take(4, p=>p.stock<=5 && p.supplierId).forEach(p=>{ p.supplierId=null; });                      // por reponer pero sin proveedor

    /* ---------- clientes y pedidos de demostración (ids fijos → se pueden regenerar) ---------- */
    // los pedidos de una demo anterior devuelven lo que retenían; los de la v3 no descontaron nada y no devuelven nada
    db.orders.filter(o=>String(o.id).startsWith("ORD_DM_") && o.stock==="held").forEach(o=>VDB.releaseStock(o));
    db.orders=db.orders.filter(o=>!String(o.id).startsWith("ORD_DM_"));
    db.users=db.users.filter(u=>!String(u.id).startsWith("u_dm_"));
    const PEOPLE=[
      ["ana","Ana Beltrán","Calle 23 #456 e/ 10 y 12, Vedado","10400"], ["marcos","Marcos Ibarra","Ave. 5ta #1204, Miramar","11300"],
      ["yulia","Yulia Cabrera","Calle 41 #2210, Playa","11300"],        ["oscar","Óscar Delgado","Calzada de Diez de Octubre #870","10600"],
      ["lidia","Lidia Fuentes","Calle Obispo #312, La Habana Vieja","10100"], ["raul","Raúl Mendoza","Calle 100 #4501, Marianao","11400"],
      ["teresa","Teresa Aguilar","Calle L #250, Vedado","10400"],       ["julian","Julián Robles","Reparto Lawton #118","10700"],
      ["nuria","Nuria Campos","Calle 8 #907, Nuevo Vedado","10600"],    ["pedro","Pedro Salas","Calle San Rafael #66","10200"],
    ];
    PEOPLE.forEach(([key,name,line,zip],i)=>db.users.push({ id:"u_dm_"+key, name, email:name.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g,".")+"@correo.mock", password:"1234", role:"customer",
      addresses:[{ id:uid("addr"), label:"Casa", line1:line, city:"La Habana", zip, country:"Cuba" }], createdAt:ago(240-i*17) }));
    const U=k=>db.users.find(u=>u.id==="u_dm_"+k);

    const cand=db.products.filter(p=>p.stock>0 && isNum(p.cost));
    const near=t=>cand.slice().sort((a,b)=>Math.abs(a.price-t)-Math.abs(b.price-t)).slice(0,3)[Math.floor(rnd()*3)];
    const line=(p,qty)=>({ productId:p.id, title:p.title, qty, priceAtPurchase:p.price, cost:isNum(p.cost)?p.cost:null, emoji:p.emoji, hue1:p.hue1, hue2:p.hue2, image:p.image });
    // [cliente, hace N días, estado, importes objetivo por línea]  ("nc0"/"nc1" = producto sin costo)
    const ORDERS=[
      ["ana",0,"paid",[260,45]], ["ana",3,"shipped",[480]], ["ana",15,"delivered",["nc0",320,80]], ["ana",30,"delivered",[900]], ["ana",52,"delivered",[210,60,25]], ["ana",78,"delivered",[540]],
      ["marcos",6,"delivered",[620]], ["marcos",21,"delivered",[380,120]], ["marcos",44,"delivered",[450]], ["marcos",70,"cancelled",[300]], ["marcos",72,"delivered",[210]], ["marcos",34,"cancelled",[260],{ paid:true }],   // este se cobró y luego se canceló
      ["yulia",62,"delivered",[750]], ["yulia",88,"delivered",[540,90]], ["yulia",120,"delivered",[400]],
      ["oscar",75,"delivered",[1100]], ["oscar",100,"delivered",[300]],
      ["lidia",0,"pending",[65]], ["lidia",1,"delivered",[35]], ["lidia",12,"delivered",[18,12]], ["lidia",26,"delivered",[42]],
      ["raul",9,"delivered",[85]], ["raul",33,"delivered",["nc1",60,30]], ["raul",58,"delivered",[140]],
      ["raul",4,"delivered",["hot0:12"]], ["lidia",7,"delivered",["hot1:10"]],
      ["teresa",5,"paid",[95]], ["julian",18,"delivered",[150,20]], ["nuria",50,"delivered",[70]], ["nuria",65,"delivered",[45]],
    ];
    ORDERS.forEach(([who,d,status,targets,opt],i)=>{
      opt=opt||{};
      const u=U(who), items=targets.map(t=>{
        if(typeof t==="string"){ const [name,q]=t.split(":"), p=(name.startsWith("nc")?noCost:hot)[+name.slice(-1)]; return line(p, q?+q:1); }   // "nc0" sin costo · "hot1:12" 12 unidades
        return line(near(t), t<=60?1+Math.floor(rnd()*2):1); });
      const subtotal=round2(sum(items,it=>it.priceAtPurchase*it.qty)), shipping=subtotal>75?0:4.99;
      db.orders.push({ id:"ORD_DM_"+pad(i+1,3), userId:u.id, items, subtotal, shipping, tax:0, total:round2(subtotal+shipping), status, address:u.addresses[0],
        paymentLast4:String(1000+Math.floor(rnd()*8999)), createdAt:d===0?now-(2+i%3)*HOUR:ago(d)-Math.floor(rnd()*8)*HOUR });
      const o=db.orders[db.orders.length-1];
      if(SOLD.includes(status) || (status==="cancelled" && opt.paid)) o.paidAt=o.createdAt;               // cobrado en el momento
      if(status==="cancelled") o.cancelledAt=o.createdAt+(opt.paid?2:1)*DAY;
      VDB.holdStock(o);                                                                                        // retiene stock (o queda «liberado» si nació cancelado)
    });
    db.orders.sort((a,b)=>b.createdAt-a.createdAt);
    db.orders.forEach(o=>o.items.forEach(it=>{ if(!isNum(it.cost)){ const p=VDB.getProduct(it.productId); it.cost=(p&&isNum(p.cost))?p.cost:null; } }));

    /* ---------- perfiles: teléfono, consentimiento, etiquetas y notas ---------- */
    const custs=db.users.filter(u=>u.role==="customer");
    custs.forEach(u=>{ n.crm.profiles[u.id]={ phone:"+53 5 "+(1000+Math.floor(rnd()*8999))+" "+(1000+Math.floor(rnd()*8999)), optIn:true, tags:[], notes:"" }; });
    const prof=(k,patch)=>Object.assign(n.crm.profiles["u_dm_"+k], patch);
    prof("ana",{ tags:["mayorista","prefiere WhatsApp"], notes:"Compra para su negocio de alquiler de equipos. Suele pedir factura." });
    prof("marcos",{ tags:["empresa"], notes:"Paga por transferencia. Contacto de compras: su hermana." });
    prof("lidia",{ tags:["referida"] }); prof("oscar",{ notes:"Cliente antiguo; hace meses que no responde." });
    prof("julian",{ phone:"" });                                 // sin teléfono → WhatsApp no puede llegarle
    prof("nuria",{ optIn:false }); prof("pedro",{ optIn:false });
    if(custs[2] && !String(custs[2].id).startsWith("u_dm_")) n.crm.profiles[custs[2].id].optIn=false;

    /* ---------- negocio ---------- */
    Object.assign(n.fin.business,{ legalName:"ElectroHogar Habana S.R.L.", taxId:"NIT 000-123-456 (demo)", address:"Calle 23 #456 e/ 10 y 12, Vedado, La Habana, Cuba",
      phone:"+53 7 555 0100", email:"ventas@electrohogar.mock", prefix:"F", footer:"Gracias por su compra. Garantía según fabricante.\nDocumento de demostración: datos ficticios." });
    n.buy.auto=false;   // en la demo se ve primero la tabla de reposición; al activarlo se crean los borradores

    /* ---------- facturas de pedidos: casi todas emitidas, 5 sin facturar, 1 anulada y reemitida ---------- */
    const sold=db.orders.filter(o=>SOLD.includes(o.status)).sort((a,b)=>a.createdAt-b.createdAt);
    const skip=new Set(sold.slice(-4).map(o=>o.id)); skip.add(sold[Math.floor(sold.length*0.35)].id);
    const billable=db.orders.filter(o=>(SOLD.includes(o.status)&&!skip.has(o.id)) || (o.status==="cancelled" && o.paidAt)).sort((a,b)=>a.createdAt-b.createdAt);
    billable.forEach(o=>VFIN.invoiceFromOrder(o.id,o.createdAt,true));   // la del pedido cancelado recibirá su nota de crédito al arrancar

    /* ---------- facturas manuales: cuentas por cobrar en cada tramo de antigüedad ---------- */
    const L=(t,q)=>{ const p=near(t); return { productId:p.id, desc:p.title, qty:q||1, price:p.price }; };
    const S=(desc,price,q)=>({ productId:null, desc, qty:q||1, price });
    let V_credit=null;
    const rate=n.fin.business.taxRate;   // por defecto, el de la tienda; a empresas se les factura con 10 %
    const mk=(who,d,credit,lines,opt)=>{
      const u=who?U(who):null, o=opt||{};
      const r=V.issueManual({ userId:u?u.id:null, customer:{ name:u?u.name:"Cliente de mostrador", email:u?u.email:"", taxId:"", address:u?V.addrLine(u.addresses[0]):"" }, lines, taxRate:o.taxRate!=null?o.taxRate:rate, creditDays:credit, method:o.method||"cash" }, o.at||ago(d), true);
      return r.invoice;
    };
    const pay=(inv,d,share,method)=>inv.payments.push({ id:uid("pay"), date:ago(d), amount:round2(inv.total*share), method:method||"transfer", note:"" });
    mk("yulia",95,30,[L(180,2),L(60)]);                                                   // 61+ días vencida, sin cobrar nada
    pay(mk("oscar",55,30,[L(300),S("Instalación y puesta en marcha",45)],{ taxRate:10 }),30,0.4);          // 1–30 días, cobro parcial
    pay(mk("raul",75,30,[L(120,2)]),50,0.25);                                              // 31–60 días, cobro parcial
    pay(mk("marcos",10,30,[L(220)],{ taxRate:10 }),4,0.3);                                                // cobro parcial y todavía vigente
    mk("lidia",20,60,[L(90,2),S("Mantenimiento anual",30)]);                              // vigente, con línea de servicio
    const paid=mk("julian",30,15,[L(160)],{ taxRate:0 }); pay(paid,22,0.6); pay(paid,15,0.4);   // cobrada en dos pagos
    const voided=mk("ana",25,30,[L(70)],{ taxRate:0 }); voided.status="void"; voided.voidedAt=ago(24);
    // devolución con nota de crédito: se cobró, el cliente devolvió y se le reembolsó en efectivo
    const ret=mk("lidia",14,0,[L(85),S("Instalación",20)]);
    V_credit=VFIN.creditNote(ret.id,{ at:ago(12), reason:"Devolución: el cliente no lo necesitaba", refundMethod:"cash", returnStock:false }).invoice;
    mk(null,8,0,[L(140)],{ method:"card" }); mk(null,6,0,[L(55),S("Servicio técnico a domicilio",25)],{ method:"transfer" });
    // ventas de mostrador al contado en efectivo, una por día: alimentan la caja de cada jornada
    for(let d=0; d<=9; d++){ const at=Math.min(now-10*60000, ago(d)-(1+Math.floor(rnd()*4))*HOUR); mk(null,d,0,[L(30+Math.floor(rnd()*90),1)],{ at, taxRate:0 }); }

    /* la numeración de la demo sigue el orden de las fechas, como en una serie real */
    const seq={}; n.fin.invoices.sort((a,b)=>a.issuedAt-b.issuedAt).forEach(i=>{ const pre=i.kind==="credit"?"NC":n.fin.business.prefix, y=new Date(i.issuedAt).getFullYear(), k=pre+y; seq[k]=(seq[k]||0)+1; i.number=pre+"-"+y+"-"+pad(seq[k],4); });

    /* ---------- gastos ---------- */
    [ ["rent","Alquiler del local",350,62,"transfer"], ["rent","Alquiler del local",350,32,"transfer"], ["rent","Alquiler del local",350,2,"transfer"],
      ["utilities","Electricidad",68,50,"transfer"], ["utilities","Electricidad",72,20,"transfer"], ["utilities","Internet y telefonía",25,48,"transfer"], ["utilities","Internet y telefonía",25,18,"transfer"],
      ["payroll","Salario de dependiente",300,31,"transfer"], ["payroll","Salario de dependiente",300,1,"transfer"],
      ["marketing","Anuncios en redes",60,40,"transfer"], ["marketing","Anuncios en redes",40,14,"transfer"],
      ["supplies","Embalaje y cinta",35,27,"cash"], ["supplies","Embalaje y cinta",22,9,"cash"], ["other","Reparación del mostrador",45,6,"cash"],
      ["rent","Alquiler del local",350,95,"transfer"], ["payroll","Salario de dependiente",300,92,"transfer"], ["rent","Alquiler del local",350,125,"transfer"], ["payroll","Salario de dependiente",300,122,"transfer"],
      ["transport","Combustible y mensajería",14,21,"cash"], ["transport","Combustible y mensajería",11,13,"cash"], ["transport","Combustible y mensajería",15,8,"cash"], ["transport","Combustible y mensajería",9,4,"cash"], ["transport","Combustible y mensajería",12,0,"cash"],
    ].forEach(([category,concept,amount,d,method])=>n.fin.expenses.push({ id:uid("exp"), date:d===0?now-HOUR:ago(d)-4*HOUR, concept, category, amount, method }));

    /* ---------- compras: órdenes en todos los estados, con cambios de costo entre recepciones ---------- */
    const pool=k=>db.products.filter(p=>p.supplierId===sup[k].id && isNum(p.cost) && p.price>=10 && !used.has(p.id)).sort((a,b)=>a.id.localeCompare(b.id));
    const T=pool("tech"), C=pool("cold"), E=pool("energy"), H=pool("home"), W=pool("tools");
    const cap=p=>p.cost>1000?1:p.cost>300?2:p.cost>100?5:999, qtyFor=(p,q)=>Math.min(q,cap(p));
    const rl=(p,q,f,got)=>{ const qq=qtyFor(p,q); return { productId:p.id, title:p.title, qty:qq, unitCost:round2(p.cost*f), receivedQty:got==null?qq:Math.min(got,qq-(qq>1?1:0)), receivedCost:round2(p.cost*f) }; };
    const ol=(p,q)=>({ productId:p.id, title:p.title, qty:qtyFor(p,q), unitCost:round2(p.cost) });
    const specs=[];   // {sup, status, days (desde envío/recepción), lines, pays:[[díasAtrás, cuota, método]]}
    if(T.length>=4){ const [a,b,c,d]=T;
      specs.push({ s:"tech", st:"received", days:80, lines:[rl(a,20,0.93),rl(b,12,0.97),rl(c,8,1)], pays:[[70,1,"transfer"]] });
      specs.push({ s:"tech", st:"partial", days:20, lines:[rl(c,10,1.12),rl(d,15,1,12)], pays:[[15,0.6,"transfer"]] });   // costo de C sube; llegaron 12 de 15 y faltan 3
      specs.push({ s:"tech", st:"received", days:12, lines:[rl(a,20,1.02)], pays:[] });                                  // costo de A sube; vence en 3 días
      specs.push({ s:"tech", st:"draft", days:1, lines:[ol(b,10),ol(d,12),ol(a,8)] });
    }
    if(C.length>=3){ const [e,f,g]=C;
      specs.push({ s:"cold", st:"received", days:60, lines:[rl(e,6,1.04),rl(f,4,1)], pays:[[35,1,"transfer"]] });
      specs.push({ s:"cold", st:"received", days:8, lines:[rl(e,6,0.98),rl(f,5,1.06)], pays:[[3,0.3,"transfer"]] });            // costo de E baja
      specs.push({ s:"cold", st:"sent", days:4, lines:[ol(f,8),ol(g,6)] });                                                    // llega en ~10 días
    }
    if(E.length>=2){ const [h,i]=E;
      specs.push({ s:"energy", st:"received", days:25, lines:[rl(h,10,1),rl(i,6,1)], pays:[] });                              // vencida (plazo 7 días)
      specs.push({ s:"energy", st:"sent", days:20, lines:[ol(h,10),ol(i,8)] });                                               // debía llegar hace 13 días
    }
    if(H.length>=3){ const [j,k,l]=H;
      specs.push({ s:"home", st:"received", days:15, lines:[rl(j,24,1),rl(k,12,1)], pays:[] });
      specs.push({ s:"home", st:"draft", days:0, lines:[ol(l,12),ol(k,10)] });
      specs.push({ s:"home", st:"cancelled", days:30, lines:[ol(j,10)] });
    }
    if(W.length>=2){
      specs.push({ s:"tools", st:"received", days:6, lines:[rl(W[0],10,1),rl(W[1],6,1)], pays:[] });                        // al contado y sin pagar: vencida hace 6 días
      specs.push({ s:"tools", st:"received", days:40, lines:[rl(W[1],5,0.97)], pays:[] });                                  // vencida hace 40 días (tramo 31–60)
    }
    if(H.length>=4) specs.push({ s:"old", st:"received", days:110, lines:[rl(H[3],20,1)], pays:[[95,1,"transfer"]] });
    specs.sort((a,b)=>b.days-a.days);
    specs.forEach(sp=>{
      const got=sp.st==="received"||sp.st==="partial", s=sup[sp.s], created=got?ago(sp.days)-(s.leadDays+1)*DAY:ago(sp.days);
      const po={ id:uid("po"), number:V.poNumber(), supplierId:s.id, status:sp.st, createdAt:created, lines:sp.lines, note:"", payments:[], receipts:[] };
      if(sp.st!=="draft"){ po.sentAt=created; po.expectedAt=created+s.leadDays*DAY; }
      if(got){
        po.receivedAt=ago(sp.days);
        po.receipts.push({ id:uid("rcp"), date:po.receivedAt, ref:"FAC-"+(1000+Math.floor(rnd()*8999)), lines:po.lines.filter(l=>l.receivedQty>0).map(l=>({ productId:l.productId, qty:l.receivedQty, unitCost:l.receivedCost })) });
        const total=sum(po.lines,l=>l.receivedQty*l.receivedCost); (sp.pays||[]).forEach(([d,share,m])=>po.payments.push({ id:uid("pay"), date:ago(d), amount:round2(total*share), method:m, note:"" }));
      }
      n.buy.pos.push(po);
    });
    // el costo vigente de cada producto es el de su última recepción
    n.buy.pos.filter(p=>p.status==="received"||p.status==="partial").sort((a,b)=>a.receivedAt-b.receivedAt).forEach(po=>po.lines.forEach(l=>{ const p=VDB.getProduct(l.productId); if(p&&l.receivedQty>0) p.cost=l.receivedCost; }));

    /* ---------- CRM: cupones en todos los estados, puntos y campañas ---------- */
    const cpn=(code,type,value,minSpend,from,to,maxUses,uses,extra)=>Object.assign({ id:uid("cpn"), code, type, value, minSpend, from, to, maxUses, uses, active:true, userId:null, note:"", source:"manual", createdAt:ago(30) }, extra||{});
    n.crm.coupons=[
      cpn("BIENVENIDA10","percent",10,50,null,null,0,14,{ note:"Primera compra" }),
      cpn("VERANO15","percent",15,100,dayKey(ago(10)),dayKey(now+20*DAY),100,38),
      cpn("FIJO20","fixed",20,150,dayKey(ago(60)),dayKey(ago(15)),50,31,{ note:"Campaña cerrada" }),                    // vencido
      cpn("OTONO5","percent",5,0,dayKey(now+6*DAY),dayKey(now+40*DAY),0,0,{ note:"Se activa la semana que viene" }),     // programado
      cpn("AGOTADO25","percent",25,200,null,null,10,10,{ note:"Los 10 usos ya se gastaron" }),                            // agotado
      cpn("PAUSA30","percent",30,0,null,null,0,2,{ active:false, note:"Pausado hasta revisar el margen" }),               // desactivado
      cpn("ANA12","percent",12,0,null,null,0,1,{ userId:U("ana").id, note:"Condición especial de mayorista" }),          // personal
    ];
    const rescued=cpn("PTS-K7Q3ZD","fixed",15,0,null,dayKey(now+60*DAY),1,0,{ userId:U("marcos").id, source:"points", note:"" });
    n.crm.coupons.push(rescued);
    const led=(u,points,reason,kind,d,extra)=>n.crm.ledger.push(Object.assign({ id:uid("led"), userId:u.id, points, reason, kind:kind||"adjust", createdAt:ago(d) }, extra||{}));
    led(U("lidia"),50,"welcome","adjust",20); led(U("ana"),200,"Recomendó a otro cliente","adjust",14); led(U("marcos"),-300,rescued.code,"redeem",9,{ couponId:rescued.id });
    led(U("teresa"),25,"Corrección por pedido duplicado","adjust",3);

    const campaign=(name,channel,segment,couponCode,subject,message,d,sentShare)=>{
      const cp=couponCode?n.crm.coupons.find(c=>c.code===couponCode):null;
      const r=VCRM.createCampaign({ name, channel, segment, couponId:cp?cp.id:null, subject, message });
      if(!r.ok) return;
      const m=r.campaign; m.createdAt=ago(d);
      const k=Math.round(m.recipients.length*sentShare); m.recipients.forEach((x,i)=>{ if(i<k) x.sentAt=m.createdAt+(1+i)*HOUR; });
    };
    campaign("Vuelve, te extrañamos","whatsapp","risk","BIENVENIDA10","","Hola {nombre}, hace tiempo que no nos visitas en {tienda} y nos encantaría verte de nuevo. Si te animas, usa el cupón {cupon} en tu próxima compra.",9,0.5);
    campaign("Gracias, clientes VIP","email","vip","ANA12","Gracias por tu confianza, {nombre}","Hola {nombre}, gracias por ser uno de nuestros mejores clientes en {tienda}. Tienes {puntos} puntos acumulados para canjear por un cupón: escríbenos cuando quieras.",21,1);
    campaign("Ofertas de verano","whatsapp","all","VERANO15","","Hola {nombre}, esta semana tenemos ofertas nuevas en {tienda}. Usa el cupón {cupon} y ahorra en tu próxima compra.",0,0);

    /* ---------- cierres de caja: 9 jornadas, con faltantes y sobrantes; hoy queda abierta ---------- */
    const DIFFS=[0,-2.5,0,1,0,0,-8,0,0];   // del día más antiguo al de ayer
    const NOTES={ "-2.5":"Faltante en billetes chicos", "1":"Sobrante por redondeo de un vuelto", "-8":"Faltante: se revisa el comprobante de un gasto" };
    let opening=100;
    for(let d=9; d>=1; d--){
      const key=dayKey(ago(d)), rep=VFIN.dayReport(key), diff=DIFFS[9-d], counted=round2(Math.max(0, rep.expectedCash-rep.opening+opening+diff));
      if(VFIN.closeDay(key, opening, counted, NOTES[String(diff)]||"").ok) opening=counted;
    }

    /* ---------- registro de actividad: historial creíble, con fechas pasadas ---------- */
    const who="Admin Vasto"; n.log=[];
    n.fin.closings.forEach(c=>{ c.closedAt=V.dayStart(c.date)+20*HOUR; V.log("close",{ date:c.date, diff:c.diff }, c.closedAt, who); });
    V.log("void",{ number:voided.number }, ago(24), who);
    if(V_credit) V.log("credit",{ number:V_credit.number, of:V_credit.note?ret.number:"", amount:V_credit.total }, V_credit.issuedAt, who);
    lowM.slice(0,3).forEach((p,i)=>V.log("cost",{ title:p.title, from:round2(p.cost*1.12), to:p.cost }, ago(3+i*4), who));
    V.log("poReceive",{ number:n.buy.pos.filter(p=>p.status==="received").sort((a,b)=>b.receivedAt-a.receivedAt)[0].number, units:20 }, ago(6), who);
    n.log.sort((a,b)=>b.at-a.at);
  }

  window.VNEG_DEMO = { version:VERSION, populate };
})();
