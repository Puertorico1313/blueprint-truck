// Devuelve cuantos cupos ya se pagaron por fecha y hora, leyendo a Stripe.
// Asi la disponibilidad es la misma para todo el mundo, sin base de datos aparte.
const Stripe = require("stripe");

module.exports = async (req, res) => {
  const llave = process.env.STRIPE_SECRET_KEY;
  if (!llave) { res.status(200).json({ cupos: {} }); return; }
  try {
    const stripe = new Stripe(llave);
    const cupos = {};
    let pagina;
    let params = { limit: 100 };
    for (let i = 0; i < 3; i++) {
      pagina = await stripe.checkout.sessions.list(params);
      pagina.data.forEach(function (s) {
        if (s.payment_status !== "paid") return;
        const claves = String((s.metadata && s.metadata.claves) || "").split(",").filter(Boolean);
        claves.forEach(function (c) { cupos[c] = (cupos[c] || 0) + 1; });
      });
      if (!pagina.has_more) break;
      params = { limit: 100, starting_after: pagina.data[pagina.data.length - 1].id };
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ cupos: cupos });
  } catch (e) {
    res.status(200).json({ cupos: {} });
  }
};
