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
const API = "https://keyauth.win/api/seller";

function safeText(t) {
  if (!t) return "Sin detalles";
  t = String(t);
  return t.length > 1900 ? t.slice(0,1900) + "\n⚠ Recortado" : t;
}

async function keyauth(type, params={}) {
  const p = new URLSearchParams({ sellerkey: SELLER_KEY, type, ...params });
  const res = await fetch(API + "/?" + p.toString());
  return await res.json().catch(() => null);
}

function maskPass(p) {
  if (!p || p.length <= 1) return p;
  return p[0] + "*".repeat(p.length - 1);
}

const commandDefs = [
  ["createuser","Crear usuario",[
    ["usuario","string","Usuario",true],
    ["password","string","Contraseña",true]
  ]]
];

const commands = commandDefs.map(([name,desc,opts])=>{
  let b=new SlashCommandBuilder().setName(name).setDescription(desc);
  opts.forEach(([o,t,d,r])=>{
    b.addStringOption(x=>x.setName(o).setDescription(d).setRequired(r));
  });
  return b.toJSON();
});

const rest = new REST({version:"10"}).setToken(TOKEN);

(async()=>{
  await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
  console.log("✔ Comandos registrados");
})();

const client=new Client({intents:[GatewayIntentBits.Guilds]});

client.once("ready",()=>console.log("🔥 Bot ON:",client.user.tag));


client.on("interactionCreate", async i=>{
  if(!i.isChatInputCommand()) return;
  const name=i.commandName;

  await i.reply({content:"⏳ Procesando...",flags:64});

  const g=s=>i.options.getString(s);

  try{
    let r;
    switch(name){
      case "createuser":
        r = await keyauth("adduser", {user: g("usuario"), pass: g("password"), sub: "default", expiry: 1});
      break;
    }

    if(!r) return i.editReply("❌ No hubo respuesta de KeyAuth");
    if (r.success) {
      const user = g("usuario");
      const pass = maskPass(g("password"));
      const avatar = i.user.displayAvatarURL({ dynamic: true, size: 256 });
      return i.editReply({
        embeds: [
          {
            title: "✅ Ready Menor -> ",
            description: `**User:** ${user}\n**Pass:** ${pass}`,
            color: 0xff0000,
            thumbnail: { url: avatar },
            footer: {
              text: `Create By ${i.user.username}`,
              icon_url: avatar
            }
          }
        ] });
    }
    else i.editReply("❌ Error: \n"+safeText(r.message));

  }catch(e){
    i.editReply("❌ Error inesperado:\n"+safeText(e.message));
  }
});

client.login(TOKEN);

//Dev zJhery -> Data 26/11/2025
