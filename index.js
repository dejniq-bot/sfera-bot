require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const FAMILY_NAME = process.env.FAMILY_NAME;

const ROLE_ID = process.env.ROLE_ID;

const SFERA_CHANNEL_ID =
  process.env.SFERA_CHANNEL_ID;

const SFERA_LOG_CHANNEL_ID =
  process.env.SFERA_LOG_CHANNEL_ID;

const MAX_PLAYERS = 10;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

let activeSfera = null;

function formatTime(date) {
  return date.toLocaleTimeString(
    "bs-BA",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  );
}

function createButtons(
  disabled = false
) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("join")
        .setLabel("Prijavi se")
        .setEmoji("✅")
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId("leave")
        .setLabel("Odjavi se")
        .setEmoji("❌")
        .setStyle(
          ButtonStyle.Danger
        )
        .setDisabled(disabled)
    );
}
function makeEmbed(
  players,
  sferaTime,
  type
) {

  const icon =
    type === "napad"
      ? "⚔️"
      : "🛡️";

  const color =
    type === "napad"
      ? 0x8B0000
      : 0x1E3A8A;

  const list =
    players.length > 0
      ? players
          .map(
            (id, i) =>
              `**${i + 1}.** <@${id}>`
          )
          .join("\n")
      : "Nema prijavljenih.";

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(
      `🌹 ${FAMILY_NAME}`
    )
    .setDescription(
      `${icon} ${type.toUpperCase()} NA SFERU`
    )
    .addFields(
      {
        name: "🕘 Vrijeme sfere",
        value:
          formatTime(
            sferaTime
          ),
        inline: true
      },
      {
        name: "👥 Prijavljeni",
        value:
          `${players.length}/${MAX_PLAYERS}`,
        inline: true
      },
      {
        name: "📋 Lista",
        value: list
      }
    )
    .setFooter({
      text:
        `${FAMILY_NAME} • Sfera sistem`
    });
}

async function sendLog(
  text
) {

  try {

    const channel =
      await client.channels.fetch(
        SFERA_LOG_CHANNEL_ID
      );

    if (channel) {
      await channel.send(text);
    }

  } catch (err) {
    console.error(err);
  }
}

function clearSferaTimers() {

  if (!activeSfera)
    return;

  activeSfera.timers.forEach(
    timer => {
      clearTimeout(timer);
    }
  );

  activeSfera.timers = [];
}

async function updateEmbed() {

  if (!activeSfera)
    return;

  await activeSfera.message.edit({
    embeds: [
      makeEmbed(
        activeSfera.players,
        activeSfera.sferaTime,
        activeSfera.type
      )
    ],
    components: [
      createButtons(
        activeSfera.players.length >=
          MAX_PLAYERS
      )
    ]
  });
}const commands = [
  new SlashCommandBuilder()
    .setName("napad")
    .setDescription(
      "Pokreni napad na sferu"
    ),

  new SlashCommandBuilder()
    .setName("odbrana")
    .setDescription(
      "Pokreni odbranu sfere"
    ),

  new SlashCommandBuilder()
    .setName("ss")
    .setDescription(
      "Zaustavi aktivnu sferu"
    )
].map(cmd => cmd.toJSON());

client.once(
  Events.ClientReady,
  async () => {

    console.log(
      `Bot online: ${client.user.tag}`
    );

    const rest =
      new REST({
        version: "10"
      }).setToken(TOKEN);

    try {

      await rest.put(
        Routes.applicationGuildCommands(
          CLIENT_ID,
          GUILD_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        "Slash komande registrovane."
      );

    } catch (err) {
      console.error(err);
    }
  }
);

client.on(
  Events.InteractionCreate,
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) return;

    if (
      interaction.commandName ===
      "ss"
    ) {

      if (!activeSfera) {

        return interaction.reply({
          content:
            "❌ Nema aktivne sfere.",
          ephemeral: true
        });
      }

      clearSferaTimers();

      await activeSfera.message.edit({
        components: [
          createButtons(true)
        ]
      });

      await sendLog(
        `🛑 SFERA ZAUSTAVLJENA

Zaustavio:
<@${interaction.user.id}>`
      );

      activeSfera = null;

     return interaction.reply({
  content:
    `✅ ${type} pokrenut.`,
  ephemeral: true
}); 
    }
);
    

    if (
      interaction.commandName !==
        "napad" &&
      interaction.commandName !==
        "odbrana"
    ) {
      return;
    }

    if (activeSfera) {

      return interaction.reply({
        content:
          "❌ Već postoji aktivna sfera.",
        ephemeral: true
      });
    }

    const type =
      interaction.commandName;

    const sferaTime =
      new Date(
        Date.now() +
        30 * 60 * 1000
      );

    const sferaChannel =
      await client.channels.fetch(
        SFERA_CHANNEL_ID
      );

    const message =
      await sferaChannel.send({
        content:
          `<@&${ROLE_ID}>`,
        embeds: [
          makeEmbed(
            [],
            sferaTime,
            type
          )
        ],
        components: [
          createButtons()
        ]
      });

    activeSfera = {
  type,
  creator:
    interaction.user.id,
  message,
  players: [],
  timers: [],
  sferaTime
};

scheduleSferaTimers();

    await sendLog(
      `${type === "napad"
        ? "⚔️"
        : "🛡️"} ${type.toUpperCase()}

Pokrenuo:
<@${interaction.user.id}>

Vrijeme:
${formatTime(
  sferaTime
)}`
    );

    return interaction.reply({
      content:
        `✅ ${type} pokrenut.`,
      ephemeral: true
    });
  }
);
client.on(
  Events.InteractionCreate,
  async interaction => {

    if (
      !interaction.isButton()
    ) return;

    if (!activeSfera) {

      return interaction.reply({
        content:
          "❌ Nema aktivne sfere.",
        ephemeral: true
      });
    }

    if (
      interaction.customId ===
      "join"
    ) {

      if (
        activeSfera.players.includes(
          interaction.user.id
        )
      ) {

        return interaction.reply({
          content:
            "❌ Već si prijavljen.",
          ephemeral: true
        });
      }

      if (
        activeSfera.players.length >=
        MAX_PLAYERS
      ) {

        return interaction.reply({
          content:
            "❌ Lista je puna.",
          ephemeral: true
        });
      }

      activeSfera.players.push(
        interaction.user.id
      );

      await updateEmbed();

      return interaction.reply({
        content:
          "✅ Uspješno si prijavljen.",
        ephemeral: true
      });
    }

    if (
      interaction.customId ===
      "leave"
    ) {

      activeSfera.players =
        activeSfera.players.filter(
          id =>
            id !==
            interaction.user.id
        );

      await updateEmbed();

      return interaction.reply({
        content:
          "❌ Uklonjen si sa liste.",
        ephemeral: true
      });
    }
  }
);
async function startSphereNow() {

  if (!activeSfera)
    return;

  const channel =
    await client.channels.fetch(
      SFERA_CHANNEL_ID
    );

  const mentions =
    activeSfera.players.length > 0
      ? activeSfera.players
          .map(
            id => `<@${id}>`
          )
          .join(" ")
      : "";

  await channel.send(
`${mentions}

🚨 SFERA JE POČELA

${activeSfera.type === "napad"
  ? "⚔️ NAPAD"
  : "🛡️ ODBRANA"}

🕘 ${formatTime(
  activeSfera.sferaTime
)}

🎙️ SVI U VOICE!
🔫 OPREMITE SE!`
  );

  await sendLog(
`✅ SFERA POČELA

Tip:
${activeSfera.type}

Pokrenuo:
<@${activeSfera.creator}>

Prijavljeno:
${activeSfera.players.length}/10`
  );

  await activeSfera.message.edit({
    embeds: [
      makeEmbed(
        activeSfera.players,
        activeSfera.sferaTime,
        activeSfera.type
      )
    ],
    components: [
      createButtons(true)
    ]
  });

  clearSferaTimers();

  activeSfera = null;
}

function scheduleSferaTimers() {

  const notifications = [
    25,
    20,
    15,
    10,
    5,
    4,
    3,
    2,
    1
  ];

  notifications.forEach(
    minutesLeft => {

      const delay =
        (30 - minutesLeft) *
        60 *
        1000;

      const timer =
        setTimeout(
          async () => {

            if (!activeSfera)
              return;

            const channel =
              await client.channels.fetch(
                SFERA_CHANNEL_ID
              );

            const icon =
              activeSfera.type ===
              "napad"
                ? "⚔️"
                : "🛡️";

            let text =
`<@&${ROLE_ID}>

🌹 ${FAMILY_NAME}

${icon} ${activeSfera.type.toUpperCase()}

⏳ Ostalo ${minutesLeft} minuta
🕘 Sfera u ${formatTime(
  activeSfera.sferaTime
)}`;

            if (
              minutesLeft <= 5
            ) {

              text +=
`\n\n🎙️ UĐITE U VOICE
🔫 ZAVRŠITE OPREMANJE`;
            }

            await channel.send(
              text
            );

          },
          delay
        );

      activeSfera.timers.push(
        timer
      );
    }
  );

  const startTimer =
    setTimeout(
      startSphereNow,
      30 * 60 * 1000
    );

  activeSfera.timers.push(
    startTimer
  );
}
client.login(TOKEN);
