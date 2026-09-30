// Escucha a Stripe. Cuando un pago se completa:
//  1. le manda al cliente su confirmacion con la marca de Blueprint Truck
//  2. te manda a ti el lead con todos sus datos
const Stripe = require("stripe");

module.exports.config = { api: { bodyParser: false } };

function leerCrudo(req) {
  return new Promise(function (resolve, reject) {
    const trozos = [];
    req.on("data", function (t) { trozos.push(t); });
    req.on("end", function () { resolve(Buffer.concat(trozos)); });
    req.on("error", reject);
  });
}

function escapar(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function correoCliente(d) {
  const filas = d.sesiones.map(function (s) {
    return '<tr><td style="padding:14px 16px;border-bottom:1px solid #24324D;color:#F2F5FA;font-size:15px;font-weight:600">' + escapar(s) + '</td></tr>';
  }).join("");
  return '<!doctype html><html lang="es"><body style="margin:0;background:#080D18;font-family:Helvetica,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080D18;padding:24px 12px"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111B2E;border-radius:18px;overflow:hidden;border:1px solid #24324D">' +
    '<tr><td style="background:#0B1324;border-bottom:3px solid #2F55FF;padding:28px 24px">' +
    '<p style="margin:0 0 6px;color:#7F9BFF;font-size:11px;letter-spacing:3px;text-transform:uppercase">Blueprint Lab · 403</p>' +
    '<h1 style="margin:0;color:#F2F5FA;font-size:30px;letter-spacing:1px;text-transform:uppercase">Blueprint Truck</h1>' +
    '<p style="margin:10px 0 0;color:#C8D3E8;font-size:15px">Estamos ready para ti, ' + escapar((d.nombre || "").split(" ")[0]) + '.</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 24px 8px">' +
    '<p style="margin:0 0 4px;color:#9AA8C2;font-size:11px;letter-spacing:2px;text-transform:uppercase">Tus sesiones</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">' + filas + '</table></td></tr>' +
    '<tr><td style="padding:16px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16223A;border-radius:12px"><tr><td style="padding:18px 20px">' +
    '<p style="margin:0 0 6px;color:#7F9BFF;font-size:11px;letter-spacing:2px;text-transform:uppercase">Llega 15 minutos antes</p>' +
    '<p style="margin:0;color:#C8D3E8;font-size:14px;line-height:1.5">Ese cuarto de hora es para estirar y calentar. A la hora en punto arrancan los 45 minutos de conditioning.</p>' +
    '</td></tr></table></td></tr>' +
    '<tr><td style="padding:0 24px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16223A;border-radius:12px"><tr><td style="padding:18px 20px">' +
    '<p style="margin:0 0 6px;color:#7F9BFF;font-size:11px;letter-spacing:2px;text-transform:uppercase">Ven con el tanque listo</p>' +
    '<p style="margin:0;color:#C8D3E8;font-size:14px;line-height:1.5">Come algo ligero 30 o 40 minutos antes: dos o tres datiles, un guineo, o una cucharada de miel. Poca cosa, pero cambia el rendimiento.</p>' +
    '</td></tr></table></td></tr>' +
    '<tr><td style="padding:0 24px 24px">' +
    '<p style="margin:0 0 4px;color:#9AA8C2;font-size:11px;letter-spacing:2px;text-transform:uppercase">Referencia</p>' +
    '<p style="margin:0;color:#F2F5FA;font-size:16px;font-family:monospace">' + escapar(d.referencia) + '</p>' +
    '<p style="margin:12px 0 0;color:#9AA8C2;font-size:13px">Pagaste ' + escapar(d.total) + '. Guarda este correo.</p></td></tr>' +
    '<tr><td style="background:#0B1324;padding:20px 24px;text-align:center">' +
    '<p style="margin:0;color:#9AA8C2;font-size:13px">Dudas? Escribenos por WhatsApp al 939-273-5708</p>' +
    '<p style="margin:8px 0 0;color:#6B7890;font-size:11px;letter-spacing:3px;text-transform:uppercase">Project Blueprint · 403</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function correoInterno(d) {
  const fila = function (k, v) {
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:13px">' + k +
      '</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;font-size:14px;font-weight:600">' + escapar(v) + '</td></tr>';
  };
  return '<!doctype html><html lang="es"><body style="font-family:Helvetica,Arial,sans-serif;background:#f6f7f9;padding:20px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e6ea">' +
    '<tr><td style="background:#0E1628;padding:18px 20px;color:#fff;font-size:16px;font-weight:700">Nueva reserva pagada — Blueprint Truck</td></tr>' +
    '<tr><td style="padding:12px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    fila("Referencia", d.referencia) +
    fila("Nombre", d.nombre) +
    fila("Telefono", d.telefono) +
    fila("Correo", d.correo) +
    fila("Total", d.total) +
    fila("Sesiones", d.sesiones.join(" · ")) +
    fila("Relevo", d.relevo) +
    fila("Contenido", d.contenido) +
    fila("Quiere mercadeo", d.mercadeo) +
    '</table></td></tr></table></body></html>';
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Metodo no permitido" }); return; }
  const llave = process.env.STRIPE_SECRET_KEY;
  const firmaSecreta = process.env.STRIPE_WEBHOOK_SECRET;
  if (!llave || !firmaSecreta) { res.status(500).json({ error: "Faltan llaves" }); return; }
  let evento;
  try {
    const crudo = await leerCrudo(req);
    const stripe = new Stripe(llave);
    evento = stripe.webhooks.constructEvent(crudo, req.headers["stripe-signature"], firmaSecreta);
  } catch (e) {
    res.status(400).json({ error: "Firma invalida" });
    return;
  }
  if (evento.type !== "checkout.session.completed") { res.status(200).json({ recibido: true }); return; }
  const s = evento.data.object;
  const m = s.metadata || {};
  const d = {
    referencia: m.referencia || s.client_reference_id || "",
    nombre: m.nombre || "",
    telefono: m.telefono || "",
    correo: (s.customer_details && s.customer_details.email) || "",
    sesiones: String(m.sesiones || "").split(" | ").filter(Boolean),
    total: "$" + ((s.amount_total || 0) / 100).toFixed(2),
    contenido: m.contenido || "",
    mercadeo: m.mercadeo || "no",
    relevo: m.relevo || ""
  };
  const interno = process.env.CORREO_INTERNO || "projectblueprint403@gmail.com";
  const desde = process.env.CORREO_DESDE || "Blueprint Truck <truck@403data.com>";
  const tareas = [];
  if (process.env.RESEND_API_KEY) {
    const enviar = function (para, asunto, html, responderA) {
      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: desde, to: [para], subject: asunto, html: html, reply_to: responderA })
      }).catch(function () {});
    };
    if (d.correo) {
      tareas.push(enviar(d.correo, "Estas adentro - Blueprint Truck (" + d.referencia + ")", correoCliente(d), interno));
    }
    tareas.push(enviar(interno, "Reserva pagada - " + d.referencia + " - " + (d.nombre || "sin nombre"), correoInterno(d), d.correo || interno));
  }
  await Promise.all(tareas);
  res.status(200).json({ recibido: true });
};
