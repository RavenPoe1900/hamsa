/* ============================================================
   VASTO — i18n (es · en · ar)
   Sin dependencias, sin build. Se carga en <head> ANTES que
   data.js/app.js para fijar lang/dir en el primer frame y que
   el árabe no entre en RTL con un salto visible.
   ============================================================ */
(function(){
  "use strict";
  const KEY = "vasto-lang";

  const LANGS = {
    es: { short:"ES", name:"Español",  dir:"ltr", locale:"es-ES" },
    en: { short:"EN", name:"English",  dir:"ltr", locale:"en-US" },
    ar: { short:"AR", name:"العربية", dir:"rtl", locale:"ar" },
  };

  /* ---------- selección de idioma ---------- */
  function stored(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function fromBrowser(){
    const nav = (navigator.languages || [navigator.language || "es"]).map(l=>String(l).toLowerCase());
    for(const l of nav){ const base = l.split("-")[0]; if(LANGS[base]) return base; }
    return "es";
  }
  let lang = LANGS[stored()] ? stored() : fromBrowser();

  /* ---------- plurales ----------
     es/en: one | other.  ar: zero | one | two | few | many | other.
     Si una forma árabe no está definida cae a `other`, así que los
     casos que no cambian de palabra no hace falta escribirlos. */
  function pluralForm(n){
    if(lang !== "ar") return n === 1 ? "one" : "other";
    if(n === 0) return "zero";
    if(n === 1) return "one";
    if(n === 2) return "two";
    const mod100 = n % 100;
    if(mod100 >= 3 && mod100 <= 10) return "few";
    if(mod100 >= 11 && mod100 <= 99) return "many";
    return "other";
  }

  /* ---------- diccionarios ---------- */
  const DICT = {

  /* ============ CATEGORÍAS ============ */
  "cat.celulares-y-accesorios-tfan":        { es:"PC, Celulares y Accesorios", en:"PCs, Phones & Accessories", ar:"الحواسيب والهواتف والإكسسوارات" },
  "cat.clima-2z74":                         { es:"Split y Ventiladores",       en:"Air Conditioning & Fans",   ar:"التكييف والمراوح" },
  "cat.energia-de-respaldo":                { es:"Energía de Respaldo",        en:"Backup Power",              ar:"طاقة احتياطية" },
  "cat.ferreteria-8jrs":                    { es:"Ferretería",                 en:"Hardware & Tools",          ar:"العدد والأدوات" },
  "cat.juguetes-y-articulos-para-ninos-f45h":{es:"Juguetes y Artículos para Niños", en:"Toys & Kids",          ar:"الألعاب ومستلزمات الأطفال" },
  "cat.lavadoras-y-secadoras-jmgr":         { es:"Lavadoras y Secadoras",      en:"Washers & Dryers",          ar:"الغسالات والمجففات" },
  "cat.ollas-batidoras-cafeteras-y-mas":    { es:"Cocinas, Ollas, Batidoras, Cafeteras y Más", en:"Cooking, Pots, Blenders & Coffee", ar:"المطبخ والقدور والخلاطات وآلات القهوة" },
  "cat.otros-electrodomesticos":            { es:"Otros Electrodomésticos",    en:"Other Appliances",          ar:"أجهزة منزلية أخرى" },
  "cat.refrigeradores-41ef":                { es:"Refrigeradores y Neveras",   en:"Fridges & Freezers",        ar:"الثلاجات والمجمدات" },
  "cat.salud-y-bienestar-y5f6c":            { es:"Salud y Bienestar",          en:"Health & Wellness",         ar:"الصحة والعناية" },
  "cat.tecnologia-9kw9":                    { es:"Tecnología",                 en:"Technology",                ar:"التقنية" },
  "cat.televisores-0w8l":                   { es:"Televisores",                en:"Televisions",               ar:"أجهزة التلفاز" },
  "cat.transporte-kdri":                    { es:"Transporte",                 en:"Transport",                 ar:"وسائل التنقل" },
  "cat.utiles-del-hogar-99a9":              { es:"Útiles del Hogar",           en:"Household Essentials",      ar:"مستلزمات المنزل" },

  /* ============ CHROME: cabecera ============ */
  "skip":              { es:"Saltar al contenido", en:"Skip to content", ar:"تخطَّ إلى المحتوى" },
  "brand.aria":        { es:"ElectroHogar Habana — inicio", en:"ElectroHogar Habana — home", ar:"إلكترو هوغار هافانا — الصفحة الرئيسية" },
  "nav.all":           { es:"Todos los productos", en:"All products", ar:"جميع المنتجات" },
  "nav.orders":        { es:"Pedidos",   en:"Orders",    ar:"الطلبات" },
  "nav.favorites":     { es:"Favoritos", en:"Favorites", ar:"المفضلة" },
  "nav.account":       { es:"Mi cuenta", en:"My account", ar:"حسابي" },
  "nav.login":         { es:"Iniciar sesión", en:"Sign in", ar:"تسجيل الدخول" },
  "nav.accountAria":   { es:"{name}. Mi cuenta", en:"{name}. My account", ar:"{name}. حسابي" },
  "nav.cartAria":      { es:"Carrito, {n} artículos", en:"Cart, {n} items", ar:"السلة، {n} منتجات" },
  "theme.toLight":     { es:"Modo claro",  en:"Light mode", ar:"الوضع الفاتح" },
  "theme.toDark":      { es:"Modo oscuro", en:"Dark mode",  ar:"الوضع الداكن" },
  "theme.aria":        { es:"Cambiar tema", en:"Change theme", ar:"تغيير المظهر" },
  "lang.aria":         { es:"Idioma", en:"Language", ar:"اللغة" },
  "lang.switchTo":     { es:"Cambiar a {name}", en:"Switch to {name}", ar:"التبديل إلى {name}" },

  /* ============ CHROME: pie ============ */
  "footer.col.product":  { es:"Producto",  en:"Product",   ar:"المتجر" },
  "footer.about":        { es:"Sobre Electro Hogar", en:"About Electro Hogar", ar:"عن إلكترو هوغار" },
  "footer.news":         { es:"Novedades", en:"What's new", ar:"كل جديد" },
  "footer.status":       { es:"Estado del sistema", en:"System status", ar:"حالة النظام" },
  "footer.col.sell":     { es:"Vender",    en:"Sell",      ar:"البيع" },
  "footer.sellWithUs":   { es:"Vende en Electro Hogar", en:"Sell on Electro Hogar", ar:"بِع على إلكترو هوغار" },
  "footer.affiliates":   { es:"Afiliados", en:"Affiliates", ar:"برنامج الشركاء" },
  "footer.adminPanel":   { es:"Panel de administración", en:"Admin panel", ar:"لوحة التحكم" },
  "footer.col.resources":{ es:"Recursos",  en:"Resources", ar:"الموارد" },
  "footer.docs":         { es:"Documentación", en:"Documentation", ar:"التوثيق" },
  "footer.api":          { es:"API",       en:"API",       ar:"واجهة البرمجة" },
  "footer.col.support":  { es:"Soporte",   en:"Support",   ar:"الدعم" },
  "footer.yourOrders":   { es:"Tus pedidos", en:"Your orders", ar:"طلباتك" },
  "footer.shipping":     { es:"Envíos y devoluciones", en:"Shipping & returns", ar:"الشحن والإرجاع" },
  "footer.contact":      { es:"Contacto",  en:"Contact",   ar:"اتصل بنا" },
  "footer.copy":         { es:"© 2025 ElectroHogar Habana · Datos de demostración generados localmente",
                           en:"© 2025 ElectroHogar Habana · Demo data generated locally",
                           ar:"© 2025 إلكترو هوغار هافانا · بيانات تجريبية مُولَّدة محليًا" },
  "footer.backToTop":    { es:"Volver arriba", en:"Back to top", ar:"العودة إلى الأعلى" },
  "footer.socialAria":   { es:"Redes sociales", en:"Social media", ar:"مواقع التواصل" },

  /* ============ TARJETA DE PRODUCTO ============ */
  "card.outOfStock":   { es:"Agotado", en:"Out of stock", ar:"نفدت الكمية" },
  "card.lastUnits":    { one:{ es:"Última unidad", en:"Last one left", ar:"آخر قطعة" },
                         two:{ ar:"آخر قطعتين" },
                         few:{ ar:"آخر {n} قطع" },
                         other:{ es:"Últimas {n} unidades", en:"Only {n} left", ar:"آخر {n} قطعة" } },
  "card.warranty":     { es:"{v} de garantía", en:"{v} warranty", ar:"ضمان {v}" },
  "card.delivery24":   { es:"Entrega 24h", en:"24h delivery", ar:"توصيل خلال 24 ساعة" },
  "card.addToCart":    { es:"Añadir al carrito", en:"Add to cart", ar:"أضف إلى السلة" },
  "card.added":        { es:"✓ Añadido", en:"✓ Added", ar:"✓ تمت الإضافة" },
  "card.addToFav":     { es:"Añadir a favoritos", en:"Add to favorites", ar:"أضف إلى المفضلة" },
  "card.removeFromFav":{ es:"Quitar de favoritos", en:"Remove from favorites", ar:"أزل من المفضلة" },

  /* ============ AVISOS GLOBALES ============ */
  "toast.loginToCart": { es:"Inicia sesión para añadir al carrito", en:"Sign in to add to cart", ar:"سجّل الدخول لإضافة المنتج إلى السلة" },
  "toast.loginToFav":  { es:"Inicia sesión para guardar favoritos", en:"Sign in to save favorites", ar:"سجّل الدخول لحفظ المفضلة" },
  "toast.addedToCart": { es:"Añadido al carrito", en:"Added to cart", ar:"تمت الإضافة إلى السلة" },

  /* ============ COMUNES ============ */
  "crumb.home":        { es:"Inicio", en:"Home", ar:"الرئيسية" },
  "sum.subtotal":      { es:"Subtotal", en:"Subtotal", ar:"المجموع الفرعي" },
  "sum.shipping":      { es:"Envío", en:"Shipping", ar:"الشحن" },
  "sum.free":          { es:"Gratis", en:"Free", ar:"مجاني" },
  "sum.tax":           { es:"Impuestos", en:"Taxes", ar:"الضرائب" },
  "sum.total":         { es:"Total", en:"Total", ar:"الإجمالي" },
  "common.each":       { es:"c/u", en:"each", ar:"للوحدة" },
  "common.goToCatalog":{ es:"Ir al catálogo", en:"Go to catalog", ar:"الذهاب إلى الكتالوج" },
  "common.keepShopping":{ es:"Seguir comprando", en:"Continue shopping", ar:"متابعة التسوق" },
  "common.arrow":      { es:"→", en:"→", ar:"←" },
  "search.placeholder":{ es:"Buscar entre miles de productos…", en:"Search thousands of products…", ar:"ابحث بين آلاف المنتجات…" },
  "search.label":      { es:"Buscar productos", en:"Search products", ar:"البحث عن المنتجات" },
  "search.submit":     { es:"Buscar", en:"Search", ar:"بحث" },
  "search.catAria":    { es:"Categoría", en:"Category", ar:"الفئة" },
  "search.all":        { es:"Todas", en:"All", ar:"الكل" },

  /* ============ PORTADA ============ */
  "home.title":        { es:"Electro Hogar — Panel de catálogo", en:"Electro Hogar — Catalog", ar:"إلكترو هوغار — الكتالوج" },
  "home.dealsBadge":   { es:"Ofertas activas hoy", en:"Deals live today", ar:"عروض سارية اليوم" },
  "home.h1":           { es:"Lo que buscas, <em>al precio de hoy.</em>",
                         en:"What you're looking for, <em>at today's price.</em>",
                         ar:"ما تبحث عنه، <em>بسعر اليوم.</em>" },
  "home.sub":          { es:"Descuentos reales sobre stock disponible, con envío en 24 horas y devoluciones en 30 días, sin preguntas.",
                         en:"Real discounts on in-stock items, with 24-hour delivery and 30-day returns, no questions asked.",
                         ar:"خصومات حقيقية على المنتجات المتوفرة، مع توصيل خلال 24 ساعة وإرجاع خلال 30 يومًا دون أي أسئلة." },
  "home.featuredAria": { es:"Producto destacado", en:"Featured product", ar:"منتج مميز" },
  "home.categories":   { es:"Categorías", en:"Categories", ar:"الفئات" },
  "home.catPrev":      { es:"Categorías anteriores", en:"Previous categories", ar:"الفئات السابقة" },
  "home.catNext":      { es:"Categorías siguientes", en:"Next categories", ar:"الفئات التالية" },
  "home.deals":        { es:"Ofertas del día", en:"Deals of the day", ar:"عروض اليوم" },
  "home.bestsellers":  { es:"Más vendidos", en:"Best sellers", ar:"الأكثر مبيعًا" },
  "home.recent":       { es:"Visto recientemente", en:"Recently viewed", ar:"شوهد مؤخرًا" },
  "home.newArrivals":  { es:"Recién llegados", en:"New arrivals", ar:"وصل حديثًا" },
  "home.seeAllF":      { es:"Ver todas →", en:"See all →", ar:"عرض الكل ←" },
  "home.seeAllM":      { es:"Ver todos →", en:"See all →", ar:"عرض الكل ←" },
  "home.dealOfDay":    { es:"Oferta del día", en:"Deal of the day", ar:"عرض اليوم" },
  "home.featured":     { es:"Destacado", en:"Featured", ar:"مميز" },
  "home.noDeals":      { es:"Sin ofertas activas.", en:"No active deals.", ar:"لا توجد عروض نشطة." },

  /* ============ BÚSQUEDA ============ */
  "search.title":      { es:"Resultados — Electro Hogar", en:"Results — Electro Hogar", ar:"النتائج — إلكترو هوغار" },
  "search.results":    { es:"Resultados", en:"Results", ar:"النتائج" },
  "filters":           { es:"Filtros", en:"Filters", ar:"عوامل التصفية" },
  "filter.price":      { es:"Precio", en:"Price", ar:"السعر" },
  "filter.min":        { es:"Mín", en:"Min", ar:"الأدنى" },
  "filter.max":        { es:"Máx", en:"Max", ar:"الأعلى" },
  "filter.deals":      { es:"Ofertas", en:"Deals", ar:"العروض" },
  "filter.onSaleOnly": { es:"Solo con rebaja", en:"On sale only", ar:"المخفَّضة فقط" },
  "filter.availability":{ es:"Disponibilidad", en:"Availability", ar:"التوفر" },
  "filter.delivery24": { es:"Entrega en 24h", en:"24h delivery", ar:"توصيل خلال 24 ساعة" },
  "filter.inStockOnly":{ es:"Solo en stock", en:"In stock only", ar:"المتوفر فقط" },
  "filter.clear":      { es:"Limpiar filtros", en:"Clear filters", ar:"مسح عوامل التصفية" },
  "filter.removeAria": { es:"Quitar filtro {label}", en:"Remove filter {label}", ar:"إزالة عامل التصفية {label}" },
  "results.count":     { one:{ es:"resultado", en:"result", ar:"نتيجة" },
                         other:{ es:"resultados", en:"results", ar:"نتيجة" } },
  "sort.relevance":    { es:"Más relevantes", en:"Most relevant", ar:"الأكثر صلة" },
  "sort.priceAsc":     { es:"Precio: menor a mayor", en:"Price: low to high", ar:"السعر: من الأقل إلى الأعلى" },
  "sort.priceDesc":    { es:"Precio: mayor a menor", en:"Price: high to low", ar:"السعر: من الأعلى إلى الأقل" },
  "sort.new":          { es:"Más recientes", en:"Newest", ar:"الأحدث" },
  "sort.discount":     { es:"Mayor descuento", en:"Biggest discount", ar:"أكبر خصم" },
  "empty.noResults":   { es:"No hay resultados", en:"No results", ar:"لا توجد نتائج" },
  "empty.noResultsHint":{ es:"Prueba a quitar algún filtro o busca con otras palabras.",
                          en:"Try removing a filter or searching with different words.",
                          ar:"جرّب إزالة أحد عوامل التصفية أو البحث بكلمات أخرى." },
  "chip.onSale":       { es:"En oferta", en:"On sale", ar:"مخفَّض" },
  "chip.inStock":      { es:"En stock", en:"In stock", ar:"متوفر" },

  /* ============ FICHA DE PRODUCTO ============ */
  "pdp.title":         { es:"Producto — Electro Hogar", en:"Product — Electro Hogar", ar:"منتج — إلكترو هوغار" },
  "pdp.suffix":        { es:" — Electro Hogar", en:" — Electro Hogar", ar:" — إلكترو هوغار" },
  "pdp.notFound":      { es:"Producto no encontrado", en:"Product not found", ar:"المنتج غير موجود" },
  "pdp.notFoundHint":  { es:"Puede que ya no esté disponible.", en:"It may no longer be available.", ar:"قد لا يكون متاحًا بعد الآن." },
  "pdp.backToCatalog": { es:"Volver al catálogo", en:"Back to catalog", ar:"العودة إلى الكتالوج" },
  "pdp.fbw":           { es:"Comprados juntos habitualmente", en:"Frequently bought together", ar:"يُشترى عادةً معًا" },
  "pdp.fbwTotal":      { es:"Precio total:", en:"Total price:", ar:"السعر الإجمالي:" },
  "pdp.fbwAdd":        { es:"Agregar los <span data-fbw-count></span> al carrito",
                         en:"Add all <span data-fbw-count></span> to cart",
                         ar:"أضف الـ<span data-fbw-count></span> إلى السلة" },
  "pdp.thisProduct":   { es:"Este producto", en:"This item", ar:"هذا المنتج" },
  "pdp.tabDesc":       { es:"Descripción", en:"Description", ar:"الوصف" },
  "pdp.tabSpecs":      { es:"Especificaciones", en:"Specifications", ar:"المواصفات" },
  "pdp.alsoLike":      { es:"También te puede interesar", en:"You may also like", ar:"قد يعجبك أيضًا" },
  "pdp.soldBy":        { es:"Vendido por", en:"Sold by", ar:"يُباع بواسطة" },
  "pdp.reviews":       { one:{ es:"{n} reseña", en:"{n} review", ar:"تقييم واحد" },
                         two:{ ar:"تقييمان" },
                         few:{ ar:"{n} تقييمات" },
                         other:{ es:"{n} reseñas", en:"{n} reviews", ar:"{n} تقييمًا" } },
  "pdp.inStock":       { es:"En stock", en:"In stock", ar:"متوفر" },
  "pdp.eta":           { es:"Entrega estimada", en:"Estimated delivery", ar:"موعد التوصيل المتوقع" },
  "pdp.qty":           { es:"Cantidad", en:"Quantity", ar:"الكمية" },
  "pdp.qtyDec":        { es:"Disminuir cantidad", en:"Decrease quantity", ar:"إنقاص الكمية" },
  "pdp.qtyInc":        { es:"Aumentar cantidad", en:"Increase quantity", ar:"زيادة الكمية" },
  "pdp.buyNow":        { es:"Comprar ahora", en:"Buy now", ar:"اشترِ الآن" },
  "pdp.saveToFav":     { es:"Guardar en favoritos", en:"Save to favorites", ar:"احفظ في المفضلة" },
  "pdp.mainView":      { es:"Vista principal", en:"Main view", ar:"الصورة الرئيسية" },
  "pdp.noRelated":     { es:"No hay productos relacionados.", en:"No related products.", ar:"لا توجد منتجات ذات صلة." },
  "pdp.nAdded":        { one:{ es:"1 producto añadido al carrito", en:"1 product added to cart", ar:"تمت إضافة منتج واحد إلى السلة" },
                         two:{ ar:"تمت إضافة منتجين إلى السلة" },
                         few:{ ar:"تمت إضافة {n} منتجات إلى السلة" },
                         other:{ es:"{n} productos añadidos al carrito", en:"{n} products added to cart", ar:"تمت إضافة {n} منتجًا إلى السلة" } },

  /* ============ CARRITO ============ */
  "cart.title":        { es:"Tu carrito — Electro Hogar", en:"Your cart — Electro Hogar", ar:"سلّتك — إلكترو هوغار" },
  "cart.h1":           { es:"Tu carrito", en:"Your cart", ar:"سلّتك" },
  "crumb.cart":        { es:"Carrito", en:"Cart", ar:"السلة" },
  "cart.loginTitle":   { es:"Inicia sesión para ver tu carrito", en:"Sign in to see your cart", ar:"سجّل الدخول لعرض سلّتك" },
  "cart.loginMsg":     { es:"Guardamos tu carrito asociado a tu cuenta.", en:"We keep your cart linked to your account.", ar:"نحتفظ بسلّتك مرتبطة بحسابك." },
  "cart.emptyTitle":   { es:"Tu carrito está vacío", en:"Your cart is empty", ar:"سلّتك فارغة" },
  "cart.emptyMsg":     { es:"Explora el catálogo y añade algo que te guste.", en:"Browse the catalog and add something you like.", ar:"تصفّح الكتالوج وأضف ما يعجبك." },
  "cart.count":        { one:{ es:"(1 producto)", en:"(1 product)", ar:"(منتج واحد)" },
                         two:{ ar:"(منتجان)" },
                         few:{ ar:"({n} منتجات)" },
                         other:{ es:"({n} productos)", en:"({n} products)", ar:"({n} منتجًا)" } },
  "cart.model":        { es:"Modelo: {m}", en:"Model: {m}", ar:"الطراز: {m}" },
  "cart.inStock":      { es:"En stock", en:"In stock", ar:"متوفر" },
  "cart.outStock":     { es:"Sin stock — elimínalo o reduce la cantidad", en:"Out of stock — remove it or lower the quantity", ar:"غير متوفر — احذفه أو قلّل الكمية" },
  "cart.qtyDec":       { es:"Reducir cantidad", en:"Decrease quantity", ar:"إنقاص الكمية" },
  "cart.qtyInc":       { es:"Aumentar cantidad", en:"Increase quantity", ar:"زيادة الكمية" },
  "cart.remove":       { es:"Eliminar", en:"Remove", ar:"حذف" },
  "cart.saveLater":    { es:"Guardar para después", en:"Save for later", ar:"احفظه لاحقًا" },
  "cart.summary":      { es:"Resumen del pedido", en:"Order summary", ar:"ملخص الطلب" },
  "cart.subtotalN":    { one:{ es:"Subtotal (1 artículo)", en:"Subtotal (1 item)", ar:"المجموع الفرعي (منتج واحد)" },
                         two:{ ar:"المجموع الفرعي (منتجان)" },
                         few:{ ar:"المجموع الفرعي ({n} منتجات)" },
                         other:{ es:"Subtotal ({n} artículos)", en:"Subtotal ({n} items)", ar:"المجموع الفرعي ({n} منتجًا)" } },
  "cart.freeshipOk":   { es:"<b>¡Genial!</b> Tu pedido tiene <b>envío gratis</b>.",
                         en:"<b>Nice!</b> Your order ships <b>free</b>.",
                         ar:"<b>رائع!</b> طلبك يحصل على <b>شحن مجاني</b>." },
  "cart.freeshipMore": { es:"Añade <b>{amount}</b> más y consigue <b>envío gratis</b>.",
                         en:"Add <b>{amount}</b> more to get <b>free shipping</b>.",
                         ar:"أضف <b>{amount}</b> أخرى لتحصل على <b>شحن مجاني</b>." },
  "cart.checkout":     { es:"Tramitar pedido", en:"Checkout", ar:"إتمام الطلب" },
  "cart.secure":       { es:"Pago 100% seguro y cifrado", en:"100% secure, encrypted payment", ar:"دفع آمن ومشفَّر 100%" },
  "cart.related":      { es:"Productos que te pueden interesar", en:"Products you may like", ar:"منتجات قد تعجبك" },
  "cart.removed":      { es:"Producto eliminado", en:"Product removed", ar:"تم حذف المنتج" },
  "cart.savedLater":   { es:"Guardado para después", en:"Saved for later", ar:"تم الحفظ لوقت لاحق" },

  /* ============ CHECKOUT ============ */
  "co.title":          { es:"Finalizar compra — Electro Hogar", en:"Checkout — Electro Hogar", ar:"إتمام الشراء — إلكترو هوغار" },
  "co.h1":             { es:"Finalizar compra", en:"Checkout", ar:"إتمام الشراء" },
  "co.loading":        { es:"Cargando…", en:"Loading…", ar:"جارٍ التحميل…" },
  "co.nothingTitle":   { es:"No hay nada que tramitar", en:"Nothing to check out", ar:"لا يوجد ما يمكن إتمامه" },
  "co.nothingMsg":     { es:"Tu carrito está vacío.", en:"Your cart is empty.", ar:"سلّتك فارغة." },
  "co.step2":          { es:"Contacto, entrega y pago", en:"Contact, delivery & payment", ar:"التواصل والتوصيل والدفع" },
  "co.step3":          { es:"Confirmación", en:"Confirmation", ar:"التأكيد" },
  "co.contact":        { es:"Datos de contacto", en:"Contact details", ar:"بيانات التواصل" },
  "co.fullname":       { es:"Nombre completo", en:"Full name", ar:"الاسم الكامل" },
  "co.errFullname":    { es:"Introduce tu nombre completo.", en:"Enter your full name.", ar:"أدخل اسمك الكامل." },
  "co.phone":          { es:"Teléfono", en:"Phone", ar:"رقم الهاتف" },
  "co.errPhone":       { es:"Introduce un teléfono de contacto.", en:"Enter a contact phone number.", ar:"أدخل رقم هاتف للتواصل." },
  "co.address":        { es:"Dirección de entrega", en:"Delivery address", ar:"عنوان التوصيل" },
  "co.street":         { es:"Calle principal", en:"Main street", ar:"الشارع الرئيسي" },
  "co.required":       { es:"Requerido.", en:"Required.", ar:"حقل مطلوب." },
  "co.cross1":         { es:"Entre calle", en:"Between street", ar:"بين شارع" },
  "co.cross2":         { es:"Y calle", en:"And street", ar:"وشارع" },
  "co.houseno":        { es:"Número de casa/apto.", en:"House / apt. number", ar:"رقم المنزل أو الشقة" },
  "co.district":       { es:"Reparto / Barrio", en:"Neighborhood", ar:"الحي" },
  "co.municipality":   { es:"Municipio", en:"Municipality", ar:"البلدية" },
  "co.province":       { es:"Provincia", en:"Province", ar:"المحافظة" },
  "co.selectPh":       { es:"Selecciona…", en:"Select…", ar:"اختر…" },
  "co.errProvince":    { es:"Selecciona tu provincia.", en:"Select your province.", ar:"اختر محافظتك." },
  "co.payMethod":      { es:"Método de pago", en:"Payment method", ar:"طريقة الدفع" },
  "co.payCard":        { es:"Pagar con tarjeta", en:"Pay by card", ar:"الدفع بالبطاقة" },
  "co.payWa":          { es:"Coordinar por WhatsApp", en:"Arrange via WhatsApp", ar:"التنسيق عبر واتساب" },
  "co.payNote":        { es:"Elige cómo prefieres pagar: con tarjeta (simulación, se abre en una ventana emergente) o coordinando por WhatsApp con un mensaje ya redactado con tu pedido.",
                         en:"Choose how you'd rather pay: by card (a simulation that opens in a pop-up) or by arranging it over WhatsApp with a message already drafted with your order.",
                         ar:"اختر طريقة الدفع التي تناسبك: بالبطاقة (محاكاة تُفتح في نافذة منبثقة) أو بالتنسيق عبر واتساب برسالة مُعدّة مسبقًا تتضمّن طلبك." },
  "co.cardNum":        { es:"Número de tarjeta", en:"Card number", ar:"رقم البطاقة" },
  "co.errCardNum":     { es:"Número de tarjeta no válido.", en:"Invalid card number.", ar:"رقم البطاقة غير صالح." },
  "co.cardName":       { es:"Nombre en la tarjeta", en:"Name on card", ar:"الاسم على البطاقة" },
  "co.errCardName":    { es:"Introduce el nombre.", en:"Enter the name.", ar:"أدخل الاسم." },
  "co.cardExp":        { es:"Fecha de expiración", en:"Expiry date", ar:"تاريخ الانتهاء" },
  "co.cardExpPh":      { es:"MM/AA", en:"MM/YY", ar:"MM/YY" },
  "co.errCardExp":     { es:"Formato MM/AA.", en:"Format MM/YY.", ar:"الصيغة MM/YY." },
  "co.errCvv":         { es:"CVV no válido.", en:"Invalid CVV.", ar:"رمز CVV غير صالح." },
  "co.simNote":        { es:"Esto es una simulación de pago con fines de demostración. No se procesan pagos reales ni se almacenan datos de tarjetas.",
                         en:"This is a payment simulation for demo purposes. No real payments are processed and no card data is stored.",
                         ar:"هذه محاكاة للدفع لأغراض العرض التوضيحي فقط. لا تُنفَّذ أي عمليات دفع حقيقية ولا تُحفَظ بيانات البطاقات." },
  "co.pay":            { es:"Pagar {amount}", en:"Pay {amount}", ar:"ادفع {amount}" },
  "co.close":          { es:"Cerrar", en:"Close", ar:"إغلاق" },
  "co.yourOrder":      { es:"Tu pedido", en:"Your order", ar:"طلبك" },
  "co.checkFields":    { es:"Revisa los campos marcados", en:"Check the highlighted fields", ar:"راجع الحقول المحدَّدة" },
  "co.checkCard":      { es:"Revisa los datos de la tarjeta", en:"Check your card details", ar:"راجع بيانات البطاقة" },
  "co.processing":     { es:"Procesando pago…", en:"Processing payment…", ar:"جارٍ معالجة الدفع…" },
  "co.paySuccess":     { es:"Pago simulado exitoso", en:"Simulated payment successful", ar:"نجحت محاكاة الدفع" },
  "co.paySuccessSub":  { es:"Esto es una demostración: no se procesó ningún pago real. Te llevamos a la confirmación de tu pedido…",
                         en:"This is a demo: no real payment was processed. Taking you to your order confirmation…",
                         ar:"هذا عرض توضيحي: لم تُنفَّذ أي عملية دفع حقيقية. نقلك الآن إلى تأكيد الطلب…" },
  "co.addrLabel":      { es:"Entrega", en:"Delivery", ar:"التوصيل" },
  "co.waOrder":        { es:"PEDIDO", en:"ORDER", ar:"طلب" },
  "co.waName":         { es:"Nombre:", en:"Name:", ar:"الاسم:" },
  "co.waPhone":        { es:"Teléfono:", en:"Phone:", ar:"الهاتف:" },
  "co.waAddress":      { es:"Dirección:", en:"Address:", ar:"العنوان:" },
  "co.waItems":        { es:"Productos:", en:"Items:", ar:"المنتجات:" },
  "co.waTotal":        { es:"TOTAL A PAGAR:", en:"TOTAL TO PAY:", ar:"الإجمالي المطلوب دفعه:" },

  /* ============ CONFIRMACIÓN DE PEDIDO ============ */
  "oc.title":          { es:"Pedido confirmado — Electro Hogar", en:"Order confirmed — Electro Hogar", ar:"تم تأكيد الطلب — إلكترو هوغار" },
  "oc.notFound":       { es:"Pedido no encontrado", en:"Order not found", ar:"الطلب غير موجود" },
  "oc.notFoundHint":   { es:"Revisa el enlace o consulta tu historial.", en:"Check the link or look at your history.", ar:"تحقّق من الرابط أو راجع سجلّ طلباتك." },
  "oc.viewOrders":     { es:"Ver mis pedidos", en:"View my orders", ar:"عرض طلباتي" },
  "oc.confirmed":      { es:"Pedido confirmado", en:"Order confirmed", ar:"تم تأكيد الطلب" },
  "oc.sent":           { es:"Te hemos enviado la confirmación. Llegará <strong>{eta}</strong>.",
                         en:"We've sent you the confirmation. It arrives <strong>{eta}</strong>.",
                         ar:"أرسلنا إليك التأكيد. سيصل <strong>{eta}</strong>." },
  "oc.order":          { es:"Pedido", en:"Order", ar:"الطلب" },
  "oc.totalPaid":      { es:"Total pagado", en:"Total paid", ar:"الإجمالي المدفوع" },
  "oc.helpTitle":      { es:"¿Necesitas ayuda con tu pedido?", en:"Need help with your order?", ar:"هل تحتاج مساعدة بشأن طلبك؟" },
  "oc.helpText":       { es:"Escríbenos y te ayudamos con cambios, seguimiento o cualquier duda.",
                         en:"Write to us and we'll help with changes, tracking or any question.",
                         ar:"راسلنا وسنساعدك في التعديلات أو التتبّع أو أي استفسار." },
  "oc.contactSupport": { es:"Contactar con soporte →", en:"Contact support →", ar:"تواصل مع الدعم ←" },

  /* ============ PEDIDOS ============ */
  "orders.title":      { es:"Tus pedidos — Electro Hogar", en:"Your orders — Electro Hogar", ar:"طلباتك — إلكترو هوغار" },
  "orders.h1":         { es:"Tus pedidos", en:"Your orders", ar:"طلباتك" },
  "orders.placed":     { es:"Realizado", en:"Placed", ar:"تاريخ الطلب" },
  "orders.viewDetail": { es:"Ver detalle", en:"View details", ar:"عرض التفاصيل" },
  "orders.rebuy":      { es:"Volver a comprar", en:"Buy again", ar:"أعِد الشراء" },
  "orders.emptyTitle": { es:"Aún no tienes pedidos", en:"You have no orders yet", ar:"لا توجد لديك طلبات بعد" },
  "orders.emptyMsg":   { es:"Cuando realices tu primera compra, aparecerá aquí.", en:"When you place your first order, it will show up here.", ar:"عند إتمام أول عملية شراء، ستظهر هنا." },
  "orders.loadMore":   { es:"Cargar más pedidos", en:"Load more orders", ar:"تحميل المزيد من الطلبات" },
  "orders.remaining":  { one:{ es:"(1 restante)", en:"(1 remaining)", ar:"(طلب واحد متبقٍّ)" },
                         two:{ ar:"(طلبان متبقيان)" },
                         few:{ ar:"({n} طلبات متبقية)" },
                         other:{ es:"({n} restantes)", en:"({n} remaining)", ar:"({n} طلبًا متبقيًا)" } },
  "orders.notFound":   { es:"No se encontró el pedido", en:"Order not found", ar:"لم يُعثر على الطلب" },
  "orders.rebought":   { es:"Productos añadidos al carrito", en:"Products added to cart", ar:"تمت إضافة المنتجات إلى السلة" },
  "orders.noneAvail":  { es:"Ningún producto está disponible actualmente", en:"No product is available right now", ar:"لا يتوفر أي منتج في الوقت الحالي" },

  /* ============ FAVORITOS ============ */
  "fav.title":         { es:"Tus favoritos — Electro Hogar", en:"Your favorites — Electro Hogar", ar:"مفضّلتك — إلكترو هوغار" },
  "fav.h1":            { es:"Tus favoritos", en:"Your favorites", ar:"مفضّلتك" },
  "fav.emptyTitle":    { es:"Aún no has guardado nada", en:"You haven't saved anything yet", ar:"لم تحفظ أي شيء بعد" },
  "fav.emptyMsg":      { es:"Toca el corazón en cualquier producto para guardarlo aquí y encontrarlo rápido cuando lo necesites.",
                         en:"Tap the heart on any product to save it here and find it again quickly.",
                         ar:"اضغط على القلب في أي منتج لحفظه هنا والعثور عليه بسرعة عند الحاجة." },
  "fav.browse":        { es:"Explorar catálogo", en:"Browse catalog", ar:"تصفّح الكتالوج" },

  /* ============ LOGIN ============ */
  "auth.title":        { es:"Iniciar sesión — Electro Hogar", en:"Sign in — Electro Hogar", ar:"تسجيل الدخول — إلكترو هوغار" },
  "auth.signinH1":     { es:"Identifícate", en:"Sign in", ar:"سجّل الدخول" },
  "auth.signin":       { es:"Iniciar sesión", en:"Sign in", ar:"تسجيل الدخول" },
  "auth.register":     { es:"Crear cuenta", en:"Create account", ar:"إنشاء حساب" },
  "auth.demo":         { es:"Demo:", en:"Demo:", ar:"تجريبي:" },
  "auth.demoCustomer": { es:"cliente demo", en:"demo customer", ar:"عميل تجريبي" },
  "auth.email":        { es:"Correo electrónico", en:"Email", ar:"البريد الإلكتروني" },
  "auth.errEmail":     { es:"Email no válido.", en:"Invalid email.", ar:"البريد الإلكتروني غير صالح." },
  "auth.password":     { es:"Contraseña", en:"Password", ar:"كلمة المرور" },
  "auth.errPassword":  { es:"Introduce tu contraseña.", en:"Enter your password.", ar:"أدخل كلمة المرور." },
  "auth.name":         { es:"Nombre", en:"Name", ar:"الاسم" },
  "auth.errName":      { es:"Introduce tu nombre.", en:"Enter your name.", ar:"أدخل اسمك." },
  "auth.noAccount":    { es:"¿No tienes cuenta?", en:"Don't have an account?", ar:"ليس لديك حساب؟" },
  "auth.hasAccount":   { es:"¿Ya tienes cuenta?", en:"Already have an account?", ar:"لديك حساب بالفعل؟" },
  "auth.signedIn":     { es:"Sesión iniciada", en:"Signed in", ar:"تم تسجيل الدخول" },
  "auth.created":      { es:"Cuenta creada", en:"Account created", ar:"تم إنشاء الحساب" },
  "err.badCredentials":{ es:"Email o contraseña incorrectos.", en:"Incorrect email or password.", ar:"البريد الإلكتروني أو كلمة المرور غير صحيحة." },
  "err.emailExists":   { es:"Ya existe una cuenta con ese email.", en:"An account with that email already exists.", ar:"يوجد حساب بهذا البريد الإلكتروني بالفعل." },
  "err.emptyCart":     { es:"El carrito está vacío.", en:"The cart is empty.", ar:"السلة فارغة." },
  "err.noStock":       { es:"No hay stock suficiente de «{title}».", en:"Not enough stock of “{title}”.", ar:"لا تتوفر كمية كافية من «{title}»." },

  /* ============ CUENTA ============ */
  "acct.title":        { es:"Mi cuenta — Electro Hogar", en:"My account — Electro Hogar", ar:"حسابي — إلكترو هوغار" },
  "acct.admin":        { es:"Administrador", en:"Administrator", ar:"مدير" },
  "acct.wishlist":     { es:"Lista de favoritos", en:"Wishlist", ar:"قائمة المفضلة" },
  "acct.adminLink":    { es:"Administración →", en:"Administration →", ar:"لوحة التحكم ←" },
  "acct.logout":       { es:"Cerrar sesión", en:"Sign out", ar:"تسجيل الخروج" },
  "acct.hello":        { es:"Hola, {name}", en:"Hello, {name}", ar:"مرحبًا، {name}" },
  "acct.since":        { es:"{email} · cliente desde {date}", en:"{email} · customer since {date}", ar:"{email} · عميل منذ {date}" },
  "acct.addresses":    { es:"Direcciones", en:"Addresses", ar:"العناوين" },
  "acct.addAddress":   { es:"Añadir dirección", en:"Add address", ar:"إضافة عنوان" },
  "acct.noAddresses":  { es:"No tienes direcciones guardadas.", en:"You have no saved addresses.", ar:"ليس لديك عناوين محفوظة." },
  "acct.address":      { es:"Dirección", en:"Address", ar:"عنوان" },
  "acct.default":      { es:"Predeterminada", en:"Default", ar:"الافتراضي" },
  "acct.edit":         { es:"Editar", en:"Edit", ar:"تعديل" },
  "acct.delete":       { es:"Eliminar", en:"Delete", ar:"حذف" },
  "acct.label":        { es:"Etiqueta", en:"Label", ar:"التسمية" },
  "acct.labelPh":      { es:"Casa, Trabajo…", en:"Home, Work…", ar:"المنزل، العمل…" },
  "acct.streetNo":     { es:"Calle y número", en:"Street and number", ar:"الشارع والرقم" },
  "acct.city":         { es:"Ciudad", en:"City", ar:"المدينة" },
  "acct.zip":          { es:"Código postal", en:"Postal code", ar:"الرمز البريدي" },
  "acct.country":      { es:"País", en:"Country", ar:"الدولة" },
  "acct.save":         { es:"Guardar", en:"Save", ar:"حفظ" },
  "acct.cancel":       { es:"Cancelar", en:"Cancel", ar:"إلغاء" },
  "acct.data":         { es:"Datos de la cuenta", en:"Account details", ar:"بيانات الحساب" },
  "acct.emailHint":    { es:"El email no puede modificarse directamente. Contacta con soporte si necesitas cambiarlo.",
                         en:"The email can't be changed directly. Contact support if you need to change it.",
                         ar:"لا يمكن تغيير البريد الإلكتروني مباشرة. تواصل مع الدعم إذا احتجت إلى تغييره." },
  "acct.saveChanges":  { es:"Guardar cambios", en:"Save changes", ar:"حفظ التغييرات" },
  "acct.addrDeleted":  { es:"Dirección eliminada", en:"Address deleted", ar:"تم حذف العنوان" },
  "acct.addrUpdated":  { es:"Dirección actualizada", en:"Address updated", ar:"تم تحديث العنوان" },
  "acct.addrAdded":    { es:"Dirección añadida", en:"Address added", ar:"تمت إضافة العنوان" },
  "acct.nameEmpty":    { es:"El nombre no puede estar vacío", en:"The name can't be empty", ar:"لا يمكن ترك الاسم فارغًا" },
  "acct.nameUpdated":  { es:"Nombre actualizado", en:"Name updated", ar:"تم تحديث الاسم" },
  "acct.promptStreet": { es:"Dirección (calle y número):", en:"Address (street and number):", ar:"العنوان (الشارع والرقم):" },
  "acct.promptCity":   { es:"Ciudad:", en:"City:", ar:"المدينة:" },
  "acct.promptZip":    { es:"Código postal:", en:"Postal code:", ar:"الرمز البريدي:" },
  "acct.promptCountry":{ es:"País (ej. Cuba):", en:"Country (e.g. Cuba):", ar:"الدولة (مثال: كوبا):" },
  "acct.promptLabel":  { es:"Etiqueta (ej. Casa, Trabajo):", en:"Label (e.g. Home, Work):", ar:"التسمية (مثال: المنزل، العمل):" },
  "acct.defaultCountry":{ es:"Cuba", en:"Cuba", ar:"كوبا" },
  "acct.newAddress":   { es:"Nueva dirección", en:"New address", ar:"عنوان جديد" },

  /* ============ ADMIN: armazón ============ */
  "adm.nav.dashboard": { es:"Panel", en:"Dashboard", ar:"لوحة القيادة" },
  "adm.nav.products":  { es:"Productos", en:"Products", ar:"المنتجات" },
  "adm.nav.orders":    { es:"Pedidos", en:"Orders", ar:"الطلبات" },
  "adm.nav.users":     { es:"Usuarios", en:"Users", ar:"المستخدمون" },
  "adm.nav.reviews":   { es:"Reseñas", en:"Reviews", ar:"التقييمات" },
  "adm.nav.data":      { es:"Generador de datos", en:"Data generator", ar:"مولّد البيانات" },
  "adm.backToStore":   { es:"← Volver a la tienda", en:"← Back to store", ar:"→ العودة إلى المتجر" },
  "adm.noResults":     { es:"Sin resultados.", en:"No results.", ar:"لا توجد نتائج." },

  /* ============ ADMIN: cuadro de mando ============ */
  "adm.dash.title":    { es:"Panel — Admin Electro Hogar", en:"Dashboard — Electro Hogar Admin", ar:"لوحة القيادة — إدارة إلكترو هوغار" },
  "adm.dash.sub":      { es:"Resumen general de la tienda", en:"Store overview", ar:"نظرة عامة على المتجر" },
  "adm.kpi.revenue":   { es:"Ingresos totales", en:"Total revenue", ar:"إجمالي الإيرادات" },
  "adm.kpi.avgTicket": { es:"Ticket medio", en:"Average order value", ar:"متوسط قيمة الطلب" },
  "adm.kpi.perOrder":  { es:"por pedido", en:"per order", ar:"لكل طلب" },
  "adm.kpi.products":  { es:"Productos activos", en:"Active products", ar:"المنتجات النشطة" },
  "adm.kpi.customers": { es:"Clientes", en:"Customers", ar:"العملاء" },
  "adm.kpi.nOrders":   { one:{ es:"1 pedido", en:"1 order", ar:"طلب واحد" },
                         two:{ ar:"طلبان" }, few:{ ar:"{n} طلبات" },
                         other:{ es:"{n} pedidos", en:"{n} orders", ar:"{n} طلبًا" } },
  "adm.kpi.nOutOfStock":{ one:{ es:"1 agotado", en:"1 out of stock", ar:"منتج واحد نفد" },
                         other:{ es:"{n} agotados", en:"{n} out of stock", ar:"{n} منتجًا نفد" } },
  "adm.kpi.nReviews":  { one:{ es:"1 reseña", en:"1 review", ar:"تقييم واحد" },
                         two:{ ar:"تقييمان" }, few:{ ar:"{n} تقييمات" },
                         other:{ es:"{n} reseñas", en:"{n} reviews", ar:"{n} تقييمًا" } },
  "adm.chart.sales":   { es:"Ventas — últimos 30 días", en:"Sales — last 30 days", ar:"المبيعات — آخر 30 يومًا" },
  "adm.chart.lowStock":{ es:"Stock bajo", en:"Low stock", ar:"مخزون منخفض" },
  "adm.units":         { es:"{n} uds", en:"{n} units", ar:"{n} قطعة" },
  "adm.stockHealthy":  { es:"Todo el stock está saludable.", en:"All stock levels are healthy.", ar:"جميع مستويات المخزون جيدة." },

  /* ============ ADMIN: productos ============ */
  "adm.prod.title":    { es:"Productos — Admin Electro Hogar", en:"Products — Electro Hogar Admin", ar:"المنتجات — إدارة إلكترو هوغار" },
  "adm.prod.sub":      { es:"Gestiona el catálogo completo", en:"Manage the full catalog", ar:"إدارة الكتالوج بالكامل" },
  "adm.prod.searchPh": { es:"Buscar producto o marca…", en:"Search product or brand…", ar:"ابحث عن منتج أو علامة تجارية…" },
  "adm.prod.allCats":  { es:"Todas las categorías", en:"All categories", ar:"جميع الفئات" },
  "adm.prod.new":      { es:"+ Nuevo producto", en:"+ New product", ar:"+ منتج جديد" },
  "adm.th.product":    { es:"Producto", en:"Product", ar:"المنتج" },
  "adm.th.category":   { es:"Categoría", en:"Category", ar:"الفئة" },
  "adm.th.price":      { es:"Precio", en:"Price", ar:"السعر" },
  "adm.th.stock":      { es:"Stock", en:"Stock", ar:"المخزون" },
  "adm.th.rating":     { es:"Valoración", en:"Rating", ar:"التقييم" },
  "adm.priceUpdated":  { es:"Precio actualizado", en:"Price updated", ar:"تم تحديث السعر" },
  "adm.stockUpdated":  { es:"Stock actualizado", en:"Stock updated", ar:"تم تحديث المخزون" },
  "adm.confirmDelProduct":{ es:"¿Eliminar este producto?", en:"Delete this product?", ar:"هل تريد حذف هذا المنتج؟" },
  "adm.productDeleted":{ es:"Producto eliminado", en:"Product deleted", ar:"تم حذف المنتج" },

  /* ============ ADMIN: pedidos ============ */
  "adm.ord.title":     { es:"Pedidos — Admin Electro Hogar", en:"Orders — Electro Hogar Admin", ar:"الطلبات — إدارة إلكترو هوغار" },
  "adm.ord.sub":       { es:"Consulta y actualiza el estado de cada pedido", en:"Review and update each order's status", ar:"راجع حالة كل طلب وحدّثها" },
  "adm.ord.searchPh":  { es:"Buscar por Nº o cliente…", en:"Search by number or customer…", ar:"ابحث برقم الطلب أو العميل…" },
  "adm.ord.allStatus": { es:"Todos los estados", en:"All statuses", ar:"جميع الحالات" },
  "adm.status.pending":{ es:"Pendiente", en:"Pending", ar:"قيد الانتظار" },
  "adm.status.paid":   { es:"Pagado", en:"Paid", ar:"مدفوع" },
  "adm.status.shipped":{ es:"Enviado", en:"Shipped", ar:"تم الشحن" },
  "adm.status.delivered":{ es:"Entregado", en:"Delivered", ar:"تم التسليم" },
  "adm.status.cancelled":{ es:"Cancelado", en:"Cancelled", ar:"ملغى" },
  "adm.th.order":      { es:"Pedido", en:"Order", ar:"الطلب" },
  "adm.th.customer":   { es:"Cliente", en:"Customer", ar:"العميل" },
  "adm.th.date":       { es:"Fecha", en:"Date", ar:"التاريخ" },
  "adm.th.items":      { es:"Artículos", en:"Items", ar:"العناصر" },
  "adm.th.status":     { es:"Estado", en:"Status", ar:"الحالة" },
  "adm.statusUpdated": { es:"Estado actualizado", en:"Status updated", ar:"تم تحديث الحالة" },

  /* ============ ADMIN: usuarios ============ */
  "adm.usr.title":     { es:"Usuarios — Admin Electro Hogar", en:"Users — Electro Hogar Admin", ar:"المستخدمون — إدارة إلكترو هوغار" },
  "adm.usr.sub":       { es:"Gestiona cuentas y permisos", en:"Manage accounts and permissions", ar:"إدارة الحسابات والصلاحيات" },
  "adm.usr.searchPh":  { es:"Buscar por nombre o email…", en:"Search by name or email…", ar:"ابحث بالاسم أو البريد الإلكتروني…" },
  "adm.th.name":       { es:"Nombre", en:"Name", ar:"الاسم" },
  "adm.th.email":      { es:"Email", en:"Email", ar:"البريد الإلكتروني" },
  "adm.th.role":       { es:"Rol", en:"Role", ar:"الدور" },
  "adm.th.joined":     { es:"Alta", en:"Joined", ar:"تاريخ الانضمام" },
  "adm.role.customer": { es:"Cliente", en:"Customer", ar:"عميل" },
  "adm.role.admin":    { es:"Admin", en:"Admin", ar:"مدير" },
  "adm.you":           { es:"tú", en:"you", ar:"أنت" },
  "adm.roleUpdated":   { es:"Rol actualizado", en:"Role updated", ar:"تم تحديث الدور" },
  "adm.confirmDelUser":{ es:"¿Eliminar este usuario?", en:"Delete this user?", ar:"هل تريد حذف هذا المستخدم؟" },
  "adm.userDeleted":   { es:"Usuario eliminado", en:"User deleted", ar:"تم حذف المستخدم" },

  /* ============ ADMIN: reseñas ============ */
  "adm.rev.title":     { es:"Reseñas — Admin Electro Hogar", en:"Reviews — Electro Hogar Admin", ar:"التقييمات — إدارة إلكترو هوغار" },
  "adm.rev.sub":       { es:"Modera las opiniones publicadas por clientes", en:"Moderate reviews posted by customers", ar:"راجع التقييمات التي ينشرها العملاء" },
  "adm.rev.all":       { es:"Todas", en:"All", ar:"الكل" },
  "adm.rev.approved":  { es:"Aprobadas", en:"Approved", ar:"المعتمدة" },
  "adm.rev.hiddenF":   { es:"Ocultas", en:"Hidden", ar:"المخفية" },
  "adm.th.review":     { es:"Opinión", en:"Review", ar:"التقييم" },
  "adm.rev.deleted":   { es:"(eliminado)", en:"(deleted)", ar:"(محذوف)" },
  "adm.rev.isApproved":{ es:"Aprobada", en:"Approved", ar:"معتمد" },
  "adm.rev.isHidden":  { es:"Oculta", en:"Hidden", ar:"مخفي" },
  "adm.rev.hide":      { es:"Ocultar", en:"Hide", ar:"إخفاء" },
  "adm.rev.approve":   { es:"Aprobar", en:"Approve", ar:"اعتماد" },
  "adm.rev.none":      { es:"No hay reseñas.", en:"No reviews.", ar:"لا توجد تقييمات." },
  "adm.confirmDelReview":{ es:"¿Eliminar esta reseña?", en:"Delete this review?", ar:"هل تريد حذف هذا التقييم؟" },

  /* ============ ADMIN: generador de datos ============ */
  "adm.data.title":    { es:"Generador de datos — Admin Electro Hogar", en:"Data generator — Electro Hogar Admin", ar:"مولّد البيانات — إدارة إلكترو هوغار" },
  "adm.data.sub":      { es:"Todo lo que ves en Electro Hogar es mock: genera, exporta o reinicia el catálogo aquí",
                         en:"Everything you see in Electro Hogar is mock data: generate, export or reset the catalog here",
                         ar:"كل ما تراه في إلكترو هوغار بيانات تجريبية: وَلِّد الكتالوج أو صدّره أو أعِد ضبطه من هنا" },
  "adm.data.genProducts": { es:"Generar productos", en:"Generate products", ar:"توليد منتجات" },
  "adm.data.genProductsP":{ es:"Crea productos nuevos con precios, stock y valoraciones plausibles por categoría.",
                            en:"Creates new products with believable prices, stock and ratings per category.",
                            ar:"ينشئ منتجات جديدة بأسعار ومخزون وتقييمات معقولة لكل فئة." },
  "adm.data.genUsers":  { es:"Generar clientes", en:"Generate customers", ar:"توليد عملاء" },
  "adm.data.genUsersP": { es:"Añade cuentas de cliente nuevas (rol cliente, dirección incluida).",
                          en:"Adds new customer accounts (customer role, address included).",
                          ar:"يضيف حسابات عملاء جديدة (بدور عميل، مع العنوان)." },
  "adm.data.genOrders": { es:"Generar pedidos", en:"Generate orders", ar:"توليد طلبات" },
  "adm.data.genOrdersP":{ es:"Crea pedidos aleatorios entre clientes y productos existentes, en distintos estados.",
                          en:"Creates random orders between existing customers and products, in various statuses.",
                          ar:"ينشئ طلبات عشوائية بين العملاء والمنتجات الحالية، بحالات مختلفة." },
  "adm.data.nProducts": { es:"+{n} productos", en:"+{n} products", ar:"+{n} منتج" },
  "adm.data.nUsers":    { es:"+{n} clientes", en:"+{n} customers", ar:"+{n} عميل" },
  "adm.data.nOrders":   { es:"+{n} pedidos", en:"+{n} orders", ar:"+{n} طلب" },
  "adm.data.io":        { es:"Exportar / importar", en:"Export / import", ar:"التصدير والاستيراد" },
  "adm.data.ioP":       { es:"Descarga el estado completo como JSON o pega uno para restaurarlo.",
                          en:"Download the full state as JSON, or paste one to restore it.",
                          ar:"نزّل الحالة الكاملة بصيغة JSON، أو الصق ملفًا لاستعادتها." },
  "adm.data.copyJson":  { es:"Copiar JSON al portapapeles", en:"Copy JSON to clipboard", ar:"نسخ JSON إلى الحافظة" },
  "adm.data.importPh":  { es:"Pega aquí un JSON exportado…", en:"Paste an exported JSON here…", ar:"الصق هنا ملف JSON مُصدَّر…" },
  "adm.data.import":    { es:"Importar", en:"Import", ar:"استيراد" },
  "adm.data.resetZone": { es:"Zona de reinicio", en:"Reset zone", ar:"منطقة إعادة الضبط" },
  "adm.data.resetZoneP":{ es:"Sustituye los datos actuales de este navegador. No afecta a ningún servidor real.",
                          en:"Replaces the current data in this browser. No real server is affected.",
                          ar:"يستبدل البيانات الحالية في هذا المتصفح. لا يؤثر على أي خادم حقيقي." },
  "adm.data.restore":   { es:"Restaurar catálogo de ejemplo", en:"Restore sample catalog", ar:"استعادة الكتالوج النموذجي" },
  "adm.data.wipe":      { es:"Vaciar productos y pedidos", en:"Clear products and orders", ar:"إفراغ المنتجات والطلبات" },
  "adm.data.current":   { es:"Estado actual", en:"Current state", ar:"الحالة الراهنة" },
  "adm.data.stateLine": { es:"{p} productos · {u} usuarios · {o} pedidos · {r} reseñas",
                          en:"{p} products · {u} users · {o} orders · {r} reviews",
                          ar:"{p} منتج · {u} مستخدم · {o} طلب · {r} تقييم" },
  "adm.data.productsDone":{ es:"{n} productos generados", en:"{n} products generated", ar:"تم توليد {n} منتج" },
  "adm.data.usersDone": { es:"Clientes generados", en:"Customers generated", ar:"تم توليد العملاء" },
  "adm.data.ordersDone":{ es:"Pedidos generados", en:"Orders generated", ar:"تم توليد الطلبات" },
  "adm.data.needFirst": { es:"Necesitas productos y clientes primero", en:"You need products and customers first", ar:"تحتاج إلى منتجات وعملاء أولًا" },
  "adm.data.jsonCopied":{ es:"JSON copiado", en:"JSON copied", ar:"تم نسخ JSON" },
  "adm.data.copiedBelow":{ es:"Copiado abajo", en:"Copied below", ar:"تم النسخ في الأسفل" },
  "adm.data.imported":  { es:"Datos importados", en:"Data imported", ar:"تم استيراد البيانات" },
  "adm.data.badJson":   { es:"JSON no válido", en:"Invalid JSON", ar:"ملف JSON غير صالح" },
  "adm.data.confirmReset":{ es:"Sustituye todos los datos por el catálogo de ejemplo. ¿Continuar?",
                            en:"This replaces all data with the sample catalog. Continue?",
                            ar:"سيستبدل هذا جميع البيانات بالكتالوج النموذجي. هل تريد المتابعة؟" },
  "adm.data.resetDone": { es:"Catálogo reiniciado", en:"Catalog reset", ar:"تمت إعادة ضبط الكتالوج" },
  "adm.data.confirmWipe":{ es:"Elimina todos los productos y pedidos. ¿Continuar?",
                           en:"This deletes all products and orders. Continue?",
                           ar:"سيحذف هذا جميع المنتجات والطلبات. هل تريد المتابعة؟" },
  "adm.data.wipeDone":  { es:"Productos y pedidos eliminados", en:"Products and orders deleted", ar:"تم حذف المنتجات والطلبات" },

  /* ============ ADMIN: editor de producto ============ */
  "adm.pe.titleEdit":  { es:"Editar producto — Admin Electro Hogar", en:"Edit product — Electro Hogar Admin", ar:"تعديل منتج — إدارة إلكترو هوغار" },
  "adm.pe.edit":       { es:"Editar producto", en:"Edit product", ar:"تعديل المنتج" },
  "adm.pe.new":        { es:"Nuevo producto", en:"New product", ar:"منتج جديد" },
  "adm.pe.newSub":     { es:"Crea un producto mockeado nuevo", en:"Create a new mock product", ar:"أنشئ منتجًا تجريبيًا جديدًا" },
  "adm.pe.name":       { es:"Título", en:"Title", ar:"العنوان" },
  "adm.pe.errName":    { es:"Escribe un título.", en:"Enter a title.", ar:"أدخل عنوانًا." },
  "adm.pe.brand":      { es:"Marca", en:"Brand", ar:"العلامة التجارية" },
  "adm.pe.generic":    { es:"Genérica", en:"Generic", ar:"عام" },
  "adm.pe.price":      { es:"Precio ({c})", en:"Price ({c})", ar:"السعر ({c})" },
  "adm.pe.errPrice":   { es:"Precio no válido.", en:"Invalid price.", ar:"السعر غير صالح." },
  "adm.pe.oldPrice":   { es:"Precio anterior (opcional)", en:"Previous price (optional)", ar:"السعر السابق (اختياري)" },
  "adm.pe.create":     { es:"Crear producto", en:"Create product", ar:"إنشاء منتج" },
  "adm.pe.updated":    { es:"Producto actualizado", en:"Product updated", ar:"تم تحديث المنتج" },
  "adm.pe.created":    { es:"Producto creado", en:"Product created", ar:"تم إنشاء المنتج" },

  "err.hasOrders":     { es:"No se puede eliminar: tiene pedidos activos asociados.",
                         en:"Can't delete: it has active orders associated with it.",
                         ar:"تعذّر الحذف: توجد طلبات نشطة مرتبطة به." },

  /* ============ 404 ============ */
  "nf.title":          { es:"Página no encontrada — Electro Hogar", en:"Page not found — Electro Hogar", ar:"الصفحة غير موجودة — إلكترو هوغار" },
  "nf.h2":             { es:"Esta página no existe", en:"This page doesn't exist", ar:"هذه الصفحة غير موجودة" },
  "nf.msg":            { es:"Puede que el enlace esté roto o la página se haya movido.", en:"The link may be broken or the page may have moved.", ar:"قد يكون الرابط معطوبًا أو تم نقل الصفحة." },
  "nf.home":           { es:"Volver al inicio", en:"Back to home", ar:"العودة إلى الرئيسية" },

  };

  /* ---------- resolución ---------- */
  function interpolate(str, vars){
    if(!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, (m,k)=> (k in vars ? String(vars[k]) : m));
  }
  function t(key, vars){
    const entry = DICT[key];
    if(!entry) return key;                        // clave suelta: se ve en pantalla, se arregla
    const val = entry[lang] ?? entry.es ?? key;
    return interpolate(val, vars);
  }
  /* Plural: elige la forma gramatical de `n` y la interpola con {n}. */
  function tp(key, n, vars){
    const entry = DICT[key];
    if(!entry) return key;
    const form = entry[pluralForm(n)] || entry.other || entry;
    const val = form[lang] ?? (entry.other && entry.other[lang]) ?? form.es ?? key;
    return interpolate(val, Object.assign({n:n}, vars||{}));
  }
  function cat(id, fallback){ const k = "cat."+id; return DICT[k] ? t(k) : (fallback || id); }

  /* ---------- aplicación al documento ---------- */
  function applyDocAttrs(){
    const cfg = LANGS[lang];
    const el = document.documentElement;
    el.setAttribute("lang", lang);
    el.setAttribute("dir", cfg.dir);
  }
  applyDocAttrs();   // antes del primer pintado: el RTL no parpadea

  const ATTR_MAP = {
    "data-i18n":        (el,v)=> el.textContent = v,
    "data-i18n-html":   (el,v)=> el.innerHTML = v,
    "data-i18n-ph":     (el,v)=> el.setAttribute("placeholder", v),
    "data-i18n-aria":   (el,v)=> el.setAttribute("aria-label", v),
    "data-i18n-title":  (el,v)=> el.setAttribute("title", v),
    "data-i18n-value":  (el,v)=> el.setAttribute("value", v),
  };
  function applyDom(root){
    root = root || document;
    Object.keys(ATTR_MAP).forEach(attr=>{
      root.querySelectorAll("["+attr+"]").forEach(el=>{
        ATTR_MAP[attr](el, t(el.getAttribute(attr)));
      });
    });
  }

  /* ---------- cambio de idioma ----------
     Recarga: todo el contenido se pinta en el load y el estado vive en
     localStorage, así que recargar es la vía corta y sin estado huérfano. */
  function setLang(next){
    if(!LANGS[next] || next === lang) return;
    try{ localStorage.setItem(KEY, next); }catch(e){}
    location.reload();
  }

  /* ---------- selector para la cabecera ---------- */
  function switcherHTML(){
    return `<div class="lang-switch" role="group" aria-label="${t("lang.aria")}">` +
      Object.keys(LANGS).map(code=>{
        const on = code === lang;
        return `<button type="button" data-set-lang="${code}" class="${on?"is-active":""}" lang="${code}"
          aria-pressed="${on}" title="${t("lang.switchTo",{name:LANGS[code].name})}">${LANGS[code].short}</button>`;
      }).join("") + `</div>`;
  }

  /* ---------- formato local ---------- */
  function fmtDate(ts, opts){ return new Date(ts).toLocaleDateString(LANGS[lang].locale, opts); }
  function fmtNum(n){ return Number(n).toLocaleString(LANGS[lang].locale); }

  document.addEventListener("DOMContentLoaded", ()=>applyDom());
  document.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-set-lang]");
    if(b) setLang(b.dataset.setLang);
  });

  window.VI18N = {
    get lang(){ return lang; },
    get dir(){ return LANGS[lang].dir; },
    get locale(){ return LANGS[lang].locale; },
    get isRTL(){ return LANGS[lang].dir === "rtl"; },
    LANGS, t, tp, cat, setLang, applyDom, switcherHTML, fmtDate, fmtNum,
  };
})();
