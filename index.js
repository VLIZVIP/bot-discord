import dotenv from "dotenv";
import fetch from "node-fetch";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

dotenv.config();

const TOKEN = process.env.TOKEN;
const SELLER_KEY = process.env.SELLER_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const API = "https://keyauth.cc/api/seller";

// ---------------------------------------------
// FUNCIONES ÚTILES
// ---------------------------------------------
function safeText(t) {
  if (!t) return "Sin detalles";
  t = String(t);
  return t.length > 1800 ? t.slice(0, 1800) + "\n⚠ Recortado" : t;
}

// Petición a KeyAuth con timeout
async function keyauth(type, params = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const p = new URLSearchParams({
    sellerkey: SELLER_KEY,
    type,
    ...params,
  });

  try {
    const res = await fetch(API + "/?" + p.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    return null; // Railway corta conexiones → evitamos crash
  }
}

// ---------------------------------------------
// DEFINICIÓN DE COMANDOS
// ---------------------------------------------
const commandDefs = [
  ["createuser", "Crear usuario", [
    ["usuario", "string", "Usuario", true],
    ["password", "string", "Contraseña", true]
  ]],
  ["deleteuser", "Borrar usuario", [
    ["usuario", "string", "Usuario", true]
  ]],
  ["userinfo", "Ver info usuario", [
    ["usuario", "string", "Usuario", true]
  ]],
  ["banuser", "Banear usuario", [
    ["usuario", "string", "Usuario", true]
  ]],
  ["unbanuser", "Desbanear usuario", [
    ["usuario", "string", "Usuario", true]
  ]],
  ["extenduser", "Extender usuario", [
    ["usuario", "string", "Usuario", true],
    ["dias", "string", "Días", true]
  ]],
  ["resetpass", "Resetear contraseña", [
    ["usuario", "string", "Usuario", true],
    ["password", "string", "Nueva contraseña", true]
  ]],
  ["setlevel", "Cambiar nivel", [
    ["usuario", "string", "Usuario", true],
    ["nivel", "string", "Nivel", true]
  ]],
  ["genkey", "Generar keys", [
    ["nivel", "string", "Nivel", true],
    ["cantidad", "string", "Cantidad", true],
    ["dias", "string", "Días", true]
  ]],
  ["deletekey", "Eliminar key", [
    ["key", "string", "Key", true]
  ]],
  ["keyinfo", "Info de key", [
    ["key", "string", "Key", true]
  ]],
  ["usekey", "Activar key a usuario", [
    ["usuario", "string", "Usuario", true],
    ["key", "string", "Key", true]
  ]],
  ["appinfo", "Información de app", []],
  ["subscriptions", "Subs info", []],
  ["levels", "Niveles info", []],
];

// Generar comandos
const commands = commandDefs.map(([name, desc, opts]) => {
  let b = new SlashCommandBuilder()
    .setName(name)
    .setDescription(desc);

  opts.forEach(([o, t, d, r]) => {
    b.addStringOption(x => x.setName(o).setDescription(d).setRequired(r));
  });

  return b.toJSON();
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✔ Comandos registrados");
})();

// ---------------------------------------------
// INICIO DEL BOT
// ---------------------------------------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("🔥 Bot ON:", client.user.tag);
});

// ---------------------------------------------
// MANEJO DE COMANDOS
// ---------------------------------------------
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const name = i.commandName;
  const g = s => i.options.getString(s);

  await i.reply({ content: "⏳ Procesando...", ephemeral: true });

  try {
    let r;

    switch (name) {
      case "createuser":
        r = await keyauth("adduser", {
          user: g("usuario"),
          pass: g("password"),
          level: 1,
          expiry: 1
        });
        break;

      case "deleteuser":
        r = await keyauth("deluser", { user: g("usuario") });
        break;

      case "userinfo":
        r = await keyauth("userinfo", { user: g("usuario") });
        break;

      case "banuser":
        r = await keyauth("banuser", { user: g("usuario") });
        break;

      case "unbanuser":
        r = await keyauth("unbanuser", { user: g("usuario") });
        break;

      case "extenduser":
        r = await keyauth("extenduser", {
          user: g("usuario"),
          expiry: g("dias")
        });
        break;

      case "resetpass":
        r = await keyauth("resetpw", {
          user: g("usuario"),
          pass: g("password")
        });
        break;

      case "setlevel":
        r = await keyauth("setlevel", {
          user: g("usuario"),
          level: g("nivel")
        });
        break;

      case "genkey":
        r = await keyauth("add", {
          expiry: g("dias"),
          level: g("nivel"),
          amount: g("cantidad"),
          mask: "*****-*****"
        });
        break;

      case "deletekey":
        r = await keyauth("del", { key: g("key") });
        break;

      case "keyinfo":
        r = await keyauth("info", { key: g("key") });
        break;

      case "usekey":
        r = await keyauth("use", {
          user: g("usuario"),
          key: g("key")
        });
        break;

      case "appinfo":
        r = await keyauth("appinfo");
        break;

      case "subscriptions":
        r = await keyauth("subscriptions");
        break;

      case "levels":
        r = await keyauth("levels");
        break;
    }

    if (!r) {
      return i.editReply("❌ No hubo respuesta de KeyAuth (El servidor tardó demasiado)");
    }

    if (r.success) {
      i.editReply("✅ **Éxito:**\n```json\n" + safeText(JSON.stringify(r, null, 2)) + "```");
    } else {
      i.editReply("❌ **Error:**\n```json\n" + safeText(r.message) + "```");
    }

  } catch (err) {
    i.editReply("❌ Error inesperado:\n```" + err.message + "```");
  }
});

client.login(TOKEN);
