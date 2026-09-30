// Crea el cobro en Stripe por el total exacto del carrito.
const Stripe = require("stripe");

const PRECIO_CENTAVOS = 4000;
const MAX_SESIONES = 20;

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Metodo no permitido" }); return; }
  const llave = process.env.STRIPE_SECRET_KEY;
  if (!llave) { res.status(500).json({ error: "Falta configurar STRIPE_SECRET_KEY" }); return; }
  try {
    const cuerpo = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const sesiones = Array.isArray(cuerpo.sesiones) ? cuerpo.sesiones : [];
    if (!sesiones.length) { res.status(400).json({ error: "El carrito esta vacio" }); return; }
    if (sesiones.length > MAX_SESIONES) { res.status(400).json({ error: "Demasiadas sesiones" }); return; }
    const stripe = new Stripe(llave);
    const line_items = sesiones.map(function (s) {
      return { quantity: 1, price_data: { currency: "usd", unit_amount: PRECIO_CENTAVOS, product_data: { name: ("Blueprint Truck - " + String(s.etiqueta || "sesion")).slice(0, 250) } } };
    });
    const origen = req.headers.origin || "https://truck.403data.com";
    const referencia = String(cuerpo.referencia || "").slice(0, 60);
    const correo = String(cuerpo.correo || "");
    const claves = sesiones.map(function (s) { return String(s.clave || ""); }).filter(Boolean).join(",").slice(0, 480);
    const sesion = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: line_items,
      client_reference_id: referencia || undefined,
      customer_email: correo.indexOf("@") > 0 ? correo : undefined,
      metadata: {
        referencia: referencia,
        nombre: String(cuerpo.nombre || "").slice(0, 100),
        telefono: String(cuerpo.telefono || "").slice(0, 40),
        relevo: String(cuerpo.relevo || "").slice(0, 100),
        contenido: String(cuerpo.contenido || "").slice(0, 40),
        mercadeo: String(cuerpo.mercadeo || "no").slice(0, 10),
        claves: claves,
        sesiones: sesiones.map(function (s) { return s.etiqueta; }).join(" | ").slice(0, 480)
      },
      success_url: origen + "/?pago=ok&ref=" + encodeURIComponent(referencia),
      cancel_url: origen + "/?pago=cancelado"
    });
    res.status(200).json({ url: sesion.url });
  } catch (e) {
    res.status(500).json({ error: "Stripe rechazo la solicitud", detalle: String((e && e.message) || e).slice(0, 200) });
  }
};
