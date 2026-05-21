require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;
const RED_LOTUS_ROLE_ID = process.env.RED_LOTUS_ROLE_ID;
const SFERA_BOT_CHANNEL_ID = process.env.SFERA_BOT_CHANNEL_ID;

const SIGNUP_EMOJI = "✅";
const LEAVE_EMOJI = "❎";
const MAX_PLAYERS = 10;
const TIMEZONE = "Europe/Sarajevo";

let activeSfera = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

function formatTime(date) {
  return date.toLocaleTimeString("bs-BA", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function makeEmbed(players, sferaTime) {
  const list =
    players.length > 0
      ? players.map((id, i) => `**${i + 1}.** <@${id}>`).join("\n")
      : "Niko se još nije prijavio.";

  return new EmbedBuilder()
    .setTitle(`🌐 Sfera prijava | Sfera u ${formatTime(sferaTime)}`)
    .setDescription(
      `Reaguj sa ${SIGNUP_EMOJI} za prijavu.\n` +
        `Reaguj sa ${LEAVE_EMOJI} za odjavu.\n\n` +
        `**Lista ${players.length}/${MAX_PLAYERS}:**\n${list}`
    )
    .setColor(0x8b00ff)
    .setFooter({ text: "Prijava traje 30 minuta." });
}

async function sendAnnouncement(text) {
  const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
  if (channel) await channel.send(text);
}

async function updateSignupMessage() {
  if (!activeSfera) return;

  await activeSfera.message.edit({
    embeds: [makeEmbed(activeSfera.players, activeSfera.sferaTime)],
  });
}

function clearSferaTimers() {
  if (!activeSfera) return;

  activeSfera.timers.forEach((timer) => {
    clearTimeout(timer);
    clearInterval(timer);
  });
}

client.once("clientReady", async () => {
  console.log(`Bot je online kao ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("sfera")
      .setDescription("Pokreće prijavu za sferu."),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });

  console.log("Slash komanda /sfera je registrovana.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "sfera") return;

  await interaction.deferReply({ ephemeral: true });

  if (activeSfera) {
    return interaction.editReply({
      content: "❌ Sfera prijava je već aktivna.",
    });
  }

  const sferaTime = new Date(Date.now() + 30 * 60 * 1000);

  const sferaBotChannel = await client.channels.fetch(
    SFERA_BOT_CHANNEL_ID
  );

  const message = await sferaBotChannel.send({
    embeds: [makeEmbed([], sferaTime)],
  });

  await sferaBotChannel.send(
    `<@&${RED_LOTUS_ROLE_ID}> 🌐 Nova Sfera prijava je otvorena!\n\nReagujte sa ✅ ili ❎ na listu ispod.\nSfera počinje u ${formatTime(
      sferaTime
    )}.`
  );

  await message.react(SIGNUP_EMOJI);
  await message.react(LEAVE_EMOJI);

  activeSfera = {
    message,
    players: [],
    timers: [],
    sferaTime,
    signupChannelId: SFERA_BOT_CHANNEL_ID,
  };

  await interaction.editReply({
    content: `✅ Sfera prijava je pokrenuta u <#${SFERA_BOT_CHANNEL_ID}>.`,
  });

  // SVAKIH 5 MINUTA
  activeSfera.timers.push(
    setInterval(async () => {
      if (!activeSfera) return;

      const diffMs = activeSfera.sferaTime.getTime() - Date.now();
      const minutesLeft = Math.ceil(diffMs / 60000);

      if (minutesLeft <= 0) return;

      await sendAnnouncement(
        `<@&${RED_LOTUS_ROLE_ID}> Do sfere ima još **${minutesLeft} minuta**.\n\nPrijava: <#${activeSfera.signupChannelId}>`
      );
    }, 5 * 60 * 1000)
  );

  // 1 MINUTA
  activeSfera.timers.push(
    setTimeout(async () => {
      if (!activeSfera) return;

      await sendAnnouncement(
        `<@&${RED_LOTUS_ROLE_ID}> Napali smo sferu. Za 29 minuta teleport. Ako winamo bonusi su dobri.`
      );
    }, 1 * 60 * 1000)
  );

  // 15 MINUTA
  activeSfera.timers.push(
    setTimeout(async () => {
      if (!activeSfera) return;

      await sendAnnouncement(
        `<@&${RED_LOTUS_ROLE_ID}> Sfera za 15 minuta. Reagujte za sfera listu da bi igrali.\n\nPrijava: <#${activeSfera.signupChannelId}>`
      );
    }, 15 * 60 * 1000)
  );

  // 25 MINUTA
  activeSfera.timers.push(
    setTimeout(async () => {
      if (!activeSfera) return;

      const taggedPlayers =
        activeSfera.players.length > 0
          ? activeSfera.players.map((id) => `<@${id}>`).join(" ")
          : "Nema prijavljenih igrača.";

      await sendAnnouncement(
        `<@&${RED_LOTUS_ROLE_ID}> SVI KOJI IGRAJU SFERU NEK DOLAZE U VOICE #SFERAVOICE I DO FAM KUCE DA SE OPREME.!!\n\n${taggedPlayers}`
      );
    }, 25 * 60 * 1000)
  );

  // 30 MINUTA - FINALNA LISTA
  activeSfera.timers.push(
    setTimeout(async () => {
      if (!activeSfera) return;

      const finalList =
        activeSfera.players.length > 0
          ? activeSfera.players
              .map((id, i) => `**${i + 1}.** <@${id}>`)
              .join("\n")
          : "Nema prijavljenih igrača.";

      await sferaBotChannel.send(
        `<@&${RED_LOTUS_ROLE_ID}> 🌐 **FINALNA LISTA ZA SFERU** 🌐\n\n${finalList}`
      );

      clearSferaTimers();
      activeSfera = null;
    }, 30 * 60 * 1000)
  );
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot || !activeSfera) return;

  if (reaction.partial) await reaction.fetch();

  if (reaction.message.id !== activeSfera.message.id) return;

  if (reaction.emoji.name === SIGNUP_EMOJI) {
    await reaction.users.remove(user.id).catch(() => {});

    if (activeSfera.players.includes(user.id)) return;

    if (activeSfera.players.length >= MAX_PLAYERS) return;

    activeSfera.players.push(user.id);

    await updateSignupMessage();
  }

  if (reaction.emoji.name === LEAVE_EMOJI) {
    await reaction.users.remove(user.id).catch(() => {});

    activeSfera.players = activeSfera.players.filter(
      (id) => id !== user.id
    );

    await updateSignupMessage();
  }
});

client.login(TOKEN);
