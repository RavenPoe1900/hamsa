/* ============================================================
   VASTO — mock data engine
   Single localStorage key holds the whole "backend". No network,
   no build step. VDB.* is the only surface every page touches.
   ============================================================ */
(function(){
  "use strict";
  const KEY = "vasto_db_v3";
  const SESSION_KEY = "vasto_session_v1";

  // el catálogo scrapeado viene en MAYÚSCULAS SOSTENIDAS; lo pasamos a formato título
  const SMALL_WORDS = new Set(["y","de","del","la","el","en","a","al","con","para","por","un","una","o"]);
  function titleCase(s){
    if(!s) return s;
    return String(s).toLowerCase().split(" ").map((w,i)=>{
      if(!w) return w;
      if(SMALL_WORDS.has(w) && i!==0) return w;
      return w.charAt(0).toUpperCase()+w.slice(1);
    }).join(" ");
  }

  const CATEGORIES = window.REAL_CATEGORIES;
  // Ciclo de vida del pedido: solo avanza un paso o se cancela antes de entregarse. Un pedido entregado o cancelado ya no cambia
  // (una devolución posterior es otro proceso); así no se puede «resucitar» un pedido cancelado sin volver a descontar stock.
  const ORDER_NEXT = { pending:["paid","cancelled"], paid:["shipped","cancelled"], shipped:["delivered","cancelled"], delivered:[], cancelled:[] };
  // Un pedido retiene stock mientras está vivo: se descuenta lo que haya (sin bajar de 0) y se anota cuánto por línea (it.held),
  // para devolver exactamente eso si se cancela. Un pedido que nace ya cancelado no retiene nada.
  function holdStock(order, getProduct){
    if(order.status==="cancelled"){ order.stock="released"; return; }
    order.items.forEach(it=>{ const p=getProduct(it.productId), n=p ? Math.min(Math.max(0,p.stock), it.qty) : 0; if(p) p.stock -= n; it.held = n; });
    order.stock = "held";
  }
  const localKey = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  CATEGORIES.forEach(c=>{ c.name = titleCase(c.name); });

  const BRANDS = ["Norlyn","Kaido","Halvern","Fjorn","Ostra","Brumel","Talvix","Ferro&Co","Solby","Adurra","Northmark","Quenta"];

  const ADJ = ["Pro","Max","Lite","Plus","Studio","Essential","Compact","Ultra","Everyday","Signature"];

  const NOUNS = {
    electro:  ["Auriculares inalámbricos","Altavoz Bluetooth","Cargador USB-C 65W","Teclado mecánico","Ratón inalámbrico","Monitor 27\" 2K","Disco SSD 1TB","Webcam 1080p","Power bank 20000mAh","Hub USB-C 7 en 1","Smartwatch deportivo","Tablet 10\""],
    hogar:    ["Set de sartenes antiadherentes","Cafetera de goteo","Robot aspirador","Juego de sábanas","Set de cuchillos","Batidora de vaso","Freidora de aire","Organizador modular","Lámpara de escritorio LED","Set de toallas","Difusor de aromas","Cesta de mimbre"],
    moda:     ["Camiseta de algodón","Sudadera con capucha","Zapatillas running","Chaqueta cortavientos","Vaqueros slim fit","Mochila urbana","Cinturón de piel","Gafas de sol polarizadas","Bufanda de punto","Camisa de lino"],
    libros:   ["Novela de misterio","Guía de cocina mediterránea","Manual de productividad","Atlas ilustrado","Cuaderno de notas A5","Biografía histórica","Libro de fotografía","Cómic gráfico","Ensayo de divulgación","Diario de viaje"],
    deporte:  ["Esterilla de yoga","Mancuernas ajustables","Tienda de campaña 2p","Botella térmica 1L","Bicicleta plegable","Set de bandas elásticas","Mochila de senderismo 30L","Balón de fútbol","Casco de ciclismo","Saco de dormir"],
    juguetes: ["Set de bloques de construcción","Puzzle 1000 piezas","Peluche de felpa","Coche a control remoto","Juego de mesa familiar","Kit de manualidades","Muñeca articulada","Set de dinosaurios","Pista de canicas","Plastilina no tóxica"],
    belleza:  ["Crema hidratante facial","Set de brochas de maquillaje","Champú sin sulfatos","Perfume floral 50ml","Kit de manicura","Mascarilla de arcilla","Aceite corporal","Espejo con luz LED","Set de esponjas de maquillaje","Sérum de vitamina C"],
    mascotas: ["Cama acolchada para mascotas","Arnés ajustable","Rascador para gatos","Comedero automático","Juguete interactivo","Transportín de viaje","Correa retráctil","Cepillo deslanador","Snacks naturales","Cama de viaje plegable"],
  };

  const FIRST_NAMES = ["Marta","Diego","Lucía","Pablo","Sara","Nico","Elena","Iván","Carla","Mateo","Julia","Hugo"];
  const LAST_NAMES  = ["Ferreiro","Salas","Montoya","Reyes","Blanch","Cordero","Miralles","Peña","Arroyo","Vidal"];

  function seedRandom(seed){
    let s = seed >>> 0;
    return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function pick(rnd, arr){ return arr[Math.floor(rnd()*arr.length)]; }
  function pickN(rnd, arr, n){ const c=[...arr]; const out=[]; while(out.length<n && c.length){ out.push(c.splice(Math.floor(rnd()*c.length),1)[0]); } return out; }
  function uid(prefix){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
  function round2(n){ return Math.round(n*100)/100; }

  function makeProduct(rnd, forcedCat){
    const cat = forcedCat || pick(rnd, CATEGORIES).id;
    const catDef = CATEGORIES.find(c=>c.id===cat);
    const noun = pick(rnd, NOUNS[cat] || ["Artículo variado"]);
    const brand = pick(rnd, BRANDS);
    const useAdj = rnd() > 0.4;
    const title = useAdj ? `${noun} ${brand} ${pick(rnd, ADJ)}` : `${noun} ${brand}`;
    const basePrice = {electro:[19,240], hogar:[9,140], moda:[12,90], libros:[7,32], deporte:[10,180], juguetes:[6,60], belleza:[5,45], mascotas:[6,55]}[cat] || [5,120];
    const price = round2(basePrice[0] + rnd()*(basePrice[1]-basePrice[0]));
    const hasDiscount = rnd() > 0.62;
    const oldPrice = hasDiscount ? round2(price * (1 + 0.1 + rnd()*0.35)) : null;
    const reviewCount = Math.floor(rnd()*rnd()*3000);
    const rating = reviewCount === 0 ? 0 : round2(3.1 + rnd()*1.85);
    const stock = rnd() > 0.08 ? Math.floor(rnd()*rnd()*140) : 0;
    const prime = rnd() > 0.35;
    const hue1 = catDef.hue[0], hue2 = catDef.hue[1];
    return {
      id: uid("p"),
      title, brand, category: cat, categoryName: catDef.name,
      price, oldPrice, stock, rating, reviewCount, prime,
      emoji: catDef.emoji, hue1, hue2,
      description: `${title} pensado para el uso diario. Materiales seleccionados, acabado cuidado y garantía del fabricante incluida. Ideal si buscas algo fiable en la categoría de ${catDef.name.toLowerCase()}.`,
      specs: {
        "Marca": brand,
        "Categoría": catDef.name,
        "Modelo": `${brand.slice(0,3).toUpperCase()}-${Math.floor(rnd()*9000+1000)}`,
        "Garantía": rnd() > 0.5 ? "2 años" : "1 año",
        "Peso": `${round2(0.1 + rnd()*4)} kg`,
      },
      tags: [catDef.name, brand, hasDiscount ? "oferta" : "", prime ? "prime" : ""].filter(Boolean),
      createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*220),
    };
  }

  function makeUser(rnd, role){
    const first = pick(rnd, FIRST_NAMES), last = pick(rnd, LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@correo.mock`;
    return {
      id: uid("u"), name, email, password: "1234", role: role || "customer",
      addresses: [{
        id: uid("addr"), label:"Casa",
        line1: `Calle ${pick(rnd, ["Mayor","del Sol","Almendro","Robles","Ribera"])} ${Math.floor(rnd()*90+1)}`,
        city: pick(rnd, ["Madrid","Valencia","Sevilla","Bilbao","Zaragoza"]),
        zip: String(Math.floor(10000+rnd()*89999)), country:"España",
      }],
      createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*300),
    };
  }

  function seedDB(){
    const rnd = seedRandom(20260908);
    const products = window.REAL_PRODUCTS.map(p=>{
      const catDef = CATEGORIES.find(c=>c.id===p.category);
      const categoryName = catDef ? catDef.name : titleCase(p.categoryName);
      return { ...p, title: titleCase(p.title), categoryName, tags:[categoryName],
        createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*220) };
    });

    const users = [
      { id:"u_admin", name:"Admin Vasto", email:"admin@vasto.mock", password:"admin", role:"admin", addresses:[], createdAt: Date.now()-1000*60*60*24*300 },
      { id:"u_demo",  name:"Cliente Demo", email:"demo@vasto.mock", password:"demo", role:"customer",
        addresses:[{id:uid("addr"), label:"Casa", line1:"Calle Mayor 12", city:"Madrid", zip:"28013", country:"España"}],
        createdAt: Date.now()-1000*60*60*24*250 },
    ];
    for(let i=0;i<6;i++) users.push(makeUser(rnd, "customer"));

    const orders = [];
    const statuses = ["pending","paid","shipped","delivered","delivered","delivered","cancelled"];
    for(let i=0;i<16;i++){
      const buyer = pick(rnd, users.filter(u=>u.role==="customer"));
      const items = pickN(rnd, products, 1+Math.floor(rnd()*3)).map(p=>({
        productId:p.id, title:p.title, qty:1+Math.floor(rnd()*3), priceAtPurchase:p.price, cost:p.cost, emoji:p.emoji, hue1:p.hue1, hue2:p.hue2, image:p.image,
      }));
      const subtotal = round2(items.reduce((s,it)=>s+it.priceAtPurchase*it.qty,0));
      const shipping = subtotal > 75 ? 0 : 4.99;
      const tax = 0;
      const status = pick(rnd, statuses);
      orders.push({
        id: uid("ord").toUpperCase(), userId: buyer.id, items, subtotal, shipping, tax,
        total: round2(subtotal+shipping+tax), status,
        address: buyer.addresses[0] || {line1:"—",city:"—",zip:"—",country:"España"},
        paymentLast4: String(Math.floor(1000+rnd()*8999)),
        createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*60),
      });
    }
    orders.sort((a,b)=>b.createdAt-a.createdAt);
    orders.forEach(o=>holdStock(o, id=>products.find(p=>p.id===id)));

    const reviewBodies = [
      "Muy contento con la compra, cumple lo que promete.",
      "Buena relación calidad-precio, tardó un poco en llegar.",
      "Superó mis expectativas, lo volvería a comprar.",
      "Correcto pero esperaba algo mejor por el precio.",
      "Envío rápido y producto tal cual la foto.",
      "No es la primera vez que compro esta marca, siempre acierto.",
    ];
    const reviews = [];
    pickN(rnd, products, 24).forEach(p=>{
      const n = 1 + Math.floor(rnd()*3);
      for(let i=0;i<n;i++){
        const author = pick(rnd, users.filter(u=>u.role==="customer"));
        reviews.push({
          id: uid("rev"), productId: p.id, userId: author.id, userName: author.name,
          rating: 2 + Math.floor(rnd()*4), body: pick(rnd, reviewBodies),
          verified: rnd() > 0.3, status:"approved",
          createdAt: Date.now() - Math.floor(rnd()*1000*60*60*24*120),
        });
      }
    });

    return {
      version: 1,
      settings: { taxRate:0, freeShippingFrom:75, currency:"$", storeName:"ElectroHogar-Habana" },
      categories: CATEGORIES,
      products, users, orders, reviews,
      carts: {}, wishlists: {},
    };
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) { const db = seedDB(); save(db); return db; }
      return JSON.parse(raw);
    }catch(e){ const db = seedDB(); save(db); return db; }
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

  function getSession(){
    try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; }
  }
  function setSession(userId){ localStorage.setItem(SESSION_KEY, JSON.stringify({userId})); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  const db = load();

  const VDB = {
    CATEGORIES, BRANDS,
    db,
    save(){ save(db); },
    reset(){ Object.assign(db, seedDB()); save(db); },
    wipe(){ db.products=[]; db.orders=[]; db.reviews=[]; save(db); },

    // ---- session ----
    currentUser(){
      const s = getSession(); if(!s) return null;
      return db.users.find(u=>u.id===s.userId) || null;
    },
    login(email, password){
      const u = db.users.find(u=>u.email.toLowerCase()===String(email).toLowerCase());
      if(!u || u.password !== password) return {ok:false, error:"Email o contraseña incorrectos."};
      setSession(u.id); return {ok:true, user:u};
    },
    register(name, email, password){
      if(db.users.some(u=>u.email.toLowerCase()===String(email).toLowerCase())) return {ok:false, error:"Ya existe una cuenta con ese email."};
      const u = { id:uid("u"), name, email, password, role:"customer", addresses:[], createdAt:Date.now() };
      db.users.push(u); save(db); setSession(u.id); return {ok:true, user:u};
    },
    logout(){ clearSession(); },

    // ---- catalog ----
    listProducts({ q, category, minPrice, maxPrice, minRating, primeOnly, inStockOnly, onSaleOnly, brands, sort } = {}){
      let list = db.products.slice();
      if(q){ const needle=q.toLowerCase(); list = list.filter(p=> p.title.toLowerCase().includes(needle) || p.brand.toLowerCase().includes(needle) || p.categoryName.toLowerCase().includes(needle)); }
      if(category) list = list.filter(p=>p.category===category);
      if(minPrice!=null) list = list.filter(p=>p.price>=minPrice);
      if(maxPrice!=null) list = list.filter(p=>p.price<=maxPrice);
      if(minRating) list = list.filter(p=>p.rating>=minRating);
      if(primeOnly) list = list.filter(p=>p.prime);
      if(inStockOnly) list = list.filter(p=>p.stock>0);
      if(onSaleOnly) list = list.filter(p=>p.oldPrice && p.oldPrice>p.price);
      if(brands && brands.length) list = list.filter(p=>brands.includes(p.brand));
      const discountPct = p => p.oldPrice ? 1-p.price/p.oldPrice : 0;
      switch(sort){
        case "price-asc": list.sort((a,b)=>a.price-b.price); break;
        case "price-desc": list.sort((a,b)=>b.price-a.price); break;
        case "rating": list.sort((a,b)=>b.rating-a.rating); break;
        case "new": list.sort((a,b)=>b.createdAt-a.createdAt); break;
        case "discount": list.sort((a,b)=>discountPct(b)-discountPct(a)); break;
        default: break; // relevance = insertion order
      }
      return list;
    },
    getProduct(id){ return db.products.find(p=>p.id===id) || null; },
    relatedProducts(product, n=6){
      return db.products.filter(p=>p.category===product.category && p.id!==product.id).slice(0,n);
    },
    productReviews(productId){ return db.reviews.filter(r=>r.productId===productId && r.status==="approved").sort((a,b)=>b.createdAt-a.createdAt); },
    addReview(productId, {rating, body, userId, userName}){
      const r = { id:uid("rev"), productId, userId, userName, rating, body, verified:false, status:"approved", createdAt:Date.now() };
      db.reviews.unshift(r); save(db); return r;
    },

    // ---- cart ----
    cartFor(userId){ return db.carts[userId] || (db.carts[userId] = []); },
    addToCart(userId, productId, qty=1){
      const cart = this.cartFor(userId);
      const line = cart.find(l=>l.productId===productId);
      if(line) line.qty += qty; else cart.push({productId, qty});
      save(db);
    },
    setCartQty(userId, productId, qty){
      const cart = this.cartFor(userId);
      const line = cart.find(l=>l.productId===productId);
      if(!line) return;
      if(qty<=0){ this.removeFromCart(userId, productId); return; }
      line.qty = qty; save(db);
    },
    removeFromCart(userId, productId){
      db.carts[userId] = this.cartFor(userId).filter(l=>l.productId!==productId); save(db);
    },
    cartCount(userId){ if(!userId) return 0; return this.cartFor(userId).reduce((s,l)=>s+l.qty,0); },
    cartLines(userId){
      return this.cartFor(userId).map(l=>({ ...l, product: this.getProduct(l.productId) })).filter(l=>l.product);
    },
    cartTotals(userId){
      const lines = this.cartLines(userId);
      const subtotal = round2(lines.reduce((s,l)=>s+l.product.price*l.qty,0));
      const shipping = lines.length===0 ? 0 : (subtotal >= db.settings.freeShippingFrom ? 0 : 4.99);
      const tax = round2(subtotal*db.settings.taxRate);
      return { subtotal, shipping, tax, total: round2(subtotal+shipping+tax), count: lines.reduce((s,l)=>s+l.qty,0) };
    },
    clearCart(userId){ db.carts[userId] = []; save(db); },

    // ---- wishlist ----
    wishlistFor(userId){ return db.wishlists[userId] || (db.wishlists[userId] = []); },
    toggleWishlist(userId, productId){
      const list = this.wishlistFor(userId);
      const idx = list.indexOf(productId);
      if(idx>=0) list.splice(idx,1); else list.push(productId);
      save(db); return idx<0;
    },
    isWishlisted(userId, productId){ return !!userId && this.wishlistFor(userId).includes(productId); },

    // ---- orders ----
    placeOrder(userId, address, paymentLast4){
      const lines = this.cartLines(userId);
      if(!lines.length) return {ok:false, error:"El carrito está vacío."};
      for(const l of lines){ if(l.product.stock < l.qty) return {ok:false, error:`No hay stock suficiente de "${l.product.title}".`}; }
      const totals = this.cartTotals(userId);
      const order = {
        id: uid("ord").toUpperCase(), userId,
        items: lines.map(l=>({ productId:l.product.id, title:l.product.title, qty:l.qty, priceAtPurchase:l.product.price, cost:l.product.cost, held:l.qty, emoji:l.product.emoji, hue1:l.product.hue1, hue2:l.product.hue2, image:l.product.image })),
        subtotal: totals.subtotal, shipping: totals.shipping, tax: totals.tax, total: totals.total,
        status: "paid", address, paymentLast4, createdAt: Date.now(),
        paidAt: Date.now(), stock: "held",   // stock retenido: si se cancela, vuelve al almacén
      };
      lines.forEach(l=>{ const p=this.getProduct(l.product.id); if(p) p.stock = Math.max(0, p.stock-l.qty); });
      db.orders.unshift(order);
      this.clearCart(userId);
      save(db);
      return {ok:true, order};
    },
    userOrders(userId){ return db.orders.filter(o=>o.userId===userId).sort((a,b)=>b.createdAt-a.createdAt); },
    getOrder(id){ return db.orders.find(o=>o.id===id) || null; },
    // Devuelve al almacén lo que el pedido retenía y lo marca liberado (no se puede devolver dos veces). Un pedido anterior a este
    // control no tiene anotado lo retenido: se da por retenida toda la cantidad, como hacía la tienda al venderlo.
    releaseStock(o){
      if(o.stock==="released") return 0;
      let back = 0;
      o.items.forEach(it=>{ const p=this.getProduct(it.productId), n=typeof it.held==="number" ? it.held : it.qty; if(p && n>0){ p.stock += n; back += n; } });
      o.stock = "released"; o.stockReturned = back; return back;
    },
    holdStock(o){ holdStock(o, id=>this.getProduct(id)); },
    orderNext(status){ return ORDER_NEXT[status] || []; },
    _transition(o, status){
      if(o.status===status) return true;
      if(!this.orderNext(o.status).includes(status)) return false;
      const now = Date.now();
      if(status==="paid" && !o.paidAt) o.paidAt = now;
      if(status==="cancelled"){
        if(["paid","shipped"].includes(o.status)) o.paidAt = o.paidAt || o.createdAt;   // ya estaba cobrado: hay que devolver dinero
        o.cancelledAt = now;
        this.releaseStock(o);
      }
      o.status = status; save(db); return true;
    },
    cancelOrder(id){ const o=this.getOrder(id); return !!o && ["pending","paid"].includes(o.status) && this._transition(o,"cancelled"); },
    setOrderStatus(id, status){ const o=this.getOrder(id); return !!o && this._transition(o,status); },

    // ---- admin: products CRUD ----
    createProduct(data){
      const catDef = CATEGORIES.find(c=>c.id===data.category) || CATEGORIES[0];
      const p = {
        id: uid("p"), title:data.title, brand:data.brand||"Genérica", category:data.category, categoryName:catDef.name,
        price:Number(data.price)||0, oldPrice: data.oldPrice?Number(data.oldPrice):null,
        stock:Number(data.stock)||0, rating:0, reviewCount:0, prime: !!data.prime,
        cost: (data.cost===undefined||data.cost===null||data.cost==="") ? null : Number(data.cost),
        emoji: catDef.emoji, hue1: catDef.hue[0], hue2: catDef.hue[1], image: data.image||null,
        description: data.description||"", specs: data.specs||{}, tags:[catDef.name],
        createdAt: Date.now(),
      };
      db.products.unshift(p); save(db); return p;
    },
    updateProduct(id, data){
      const p = this.getProduct(id); if(!p) return null;
      Object.assign(p, data);
      if(data.category){ const c=CATEGORIES.find(c=>c.id===data.category); if(c){ p.categoryName=c.name; p.emoji=c.emoji; p.hue1=c.hue[0]; p.hue2=c.hue[1]; } }
      save(db); return p;
    },
    deleteProduct(id){
      const hasOrders = db.orders.some(o=>o.items.some(it=>it.productId===id) && !["cancelled"].includes(o.status));
      if(hasOrders) return {ok:false, error:"hasOrders"};
      db.products = db.products.filter(p=>p.id!==id); save(db); return {ok:true};
    },

    // ---- admin: users ----
    setUserRole(id, role){ const u=db.users.find(u=>u.id===id); if(u){ u.role=role; save(db); } },
    // Un cliente con pedidos no se elimina: dejaría pedidos y facturas sin dueño.
    deleteUser(id){
      if(db.orders.some(o=>o.userId===id)) return {ok:false, error:"neg.err.userHasOrders"};
      db.users = db.users.filter(u=>u.id!==id); save(db); return {ok:true};
    },

    // ---- admin: reviews moderation ----
    setReviewStatus(id, status){ const r=db.reviews.find(r=>r.id===id); if(r){ r.status=status; save(db); } },
    deleteReview(id){ db.reviews = db.reviews.filter(r=>r.id!==id); save(db); },

    // ---- admin: bulk mock generators ----
    generateProducts(n=20){
      const rnd = seedRandom(Date.now() % 2147483647);
      for(let i=0;i<n;i++) db.products.unshift(makeProduct(rnd));
      save(db); return n;
    },
    generateUsers(n=10){
      const rnd = seedRandom((Date.now()+777) % 2147483647);
      for(let i=0;i<n;i++) db.users.push(makeUser(rnd,"customer"));
      save(db); return n;
    },
    generateOrders(n=10){
      const rnd = seedRandom((Date.now()+333) % 2147483647);
      const customers = db.users.filter(u=>u.role==="customer");
      if(!customers.length || !db.products.length) return 0;
      const statuses = ["pending","paid","shipped","delivered","cancelled"];
      for(let i=0;i<n;i++){
        const buyer = pick(rnd, customers);
        const items = pickN(rnd, db.products, 1+Math.floor(rnd()*3)).map(p=>({
          productId:p.id, title:p.title, qty:1+Math.floor(rnd()*3), priceAtPurchase:p.price, cost:p.cost, emoji:p.emoji, hue1:p.hue1, hue2:p.hue2, image:p.image,
        }));
        const subtotal = round2(items.reduce((s,it)=>s+it.priceAtPurchase*it.qty,0));
        const shipping = subtotal > db.settings.freeShippingFrom ? 0 : 4.99;
        const tax = round2(subtotal*db.settings.taxRate);
        const ord = ({ id:uid("ord").toUpperCase(), userId:buyer.id, items, subtotal, shipping, tax, total: round2(subtotal+shipping+tax), status: pick(rnd,statuses), address: buyer.addresses[0]||{line1:"—",city:"—",zip:"—",country:"España"}, paymentLast4:String(Math.floor(1000+rnd()*8999)), createdAt: Date.now()-Math.floor(rnd()*1000*60*60*24*30) });
        holdStock(ord, id=>this.getProduct(id)); db.orders.unshift(ord);
      }
      save(db); return n;
    },

    // ---- stats ----
    stats(){
      const paid = db.orders.filter(o=>["paid","shipped","delivered"].includes(o.status));   // pendiente y cancelado no son ingreso
      const revenue = paid.reduce((s,o)=>s+o.total,0);
      const orderCount = paid.length;
      const avgTicket = orderCount ? revenue/orderCount : 0;
      const lowStock = db.products.filter(p=>p.stock>0 && p.stock<=5).length;
      const outOfStock = db.products.filter(p=>p.stock===0).length;
      const pendingOrders = db.orders.filter(o=>o.status==="pending").length;
      const inventoryValue = db.products.reduce((s,p)=>s+p.price*p.stock,0);
      return { revenue: round2(revenue), orderCount, avgTicket: round2(avgTicket||0), lowStock, outOfStock, pendingOrders, inventoryValue: round2(inventoryValue),
        productCount: db.products.length, userCount: db.users.length, reviewCount: db.reviews.length };
    },
    salesByDay(days=30){
      const buckets = new Map();
      const now = Date.now();
      for(let i=days-1;i>=0;i--){
        const d = new Date(now - i*86400000);
        buckets.set(localKey(d), 0);   // día local: un pedido de las 22:30 pertenece a ese día, no al siguiente (UTC)
      }
      db.orders.forEach(o=>{
        if(!["paid","shipped","delivered"].includes(o.status)) return;
        const key = localKey(new Date(o.createdAt));
        if(buckets.has(key)) buckets.set(key, buckets.get(key)+o.total);
      });
      return Array.from(buckets.entries()).map(([date,total])=>({date,total:round2(total)}));
    },

    money(n){ return db.settings.currency + Number(n).toFixed(2); },
    uid,
  };

  window.VDB = VDB;
})();
