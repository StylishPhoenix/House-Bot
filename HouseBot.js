const fs = require('fs');
const { Client, GatewayIntentBits, Permissions, PermissionFlagsBits } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { token, guildID, timeInterval, pointsPerInterval, minimumVoice } = require('./config.json');
const pointChoices = require('./pointChoices.json');
const houseChoices = require('./houseChoices.json');
const userPointsData = {};

// Initialize the bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

// Define slash commands to add and remove house points
const addPoints = new SlashCommandBuilder()
    .setName('add_points')
    .setDescription('Adds points to a house')
    .addStringOption(option => option.setName('house')
    .setDescription('House name here')
    .setRequired(true)
    .addChoices(...require('./houseChoices.json'))
    )


    .addIntegerOption(option =>
        option.setName('points')
        .setDescription('Points here')
        .setRequired(true)
        .addChoices(...require('./pointChoices.json'))
    )
    .setDMPermission(false);

const remove_points = new SlashCommandBuilder()
    .setName("remove_points")
    .setDescription("Removes points from a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName('house')
        .setDescription('House name here')
        .setRequired(true)
        .addChoices(...require('./houseChoices.json'))
    )

    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const add_point_amount = new SlashCommandBuilder()
    .setName("add_point_amount")
    .setDescription("Adds a certain amount of points to a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName('house')
        .setDescription('House name here')
        .setRequired(true)
        .addChoices(...require('./houseChoices.json'))
    )

    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const show_points = new SlashCommandBuilder()
    .setName("points")
    .setDescription("Displays the current house points");

const commands = [
    addPoints.toJSON(),
    remove_points.toJSON(),
    show_points.toJSON(),
    add_point_amount.toJSON(),
    // Add other commands here
];

client.on('ready', async () => {
    console.log(`Bot has connected to Discord!`);
    await client.application.commands.set(commands);
    console.log(`Commands registered.`);
    load_points();
    const guild = client.guilds.cache.get(guildID);
    if (guild) {
        updateVoiceChannelPoints(guild);
    } else {
        console.error(`Guild not found with ID: ${guildID}`);
    }
	  
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const userId = message.author.id;
  const house = await getUserHouse(message.guild, userId);
  if (!house) return;
  calculatePoints(userId, message.content);
  addPointsForUser(house, userPointsData[userId].points);
  userPointsData[userId].points = 0;
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    if (commandName === 'add_points') {
        const house = interaction.options.getString('house');
        let points = interaction.options.getInteger('points');
            if (!house_points.hasOwnProperty(house)) {
        await interaction.reply(`Invalid house name: ${house}`);
        return;
    }

   const selectedChoice = pointChoices.find(choice => choice.value === points);
   if (selectedChoice) {
      points = selectedChoice.points;
    } else {
      await interaction.reply(`Invalid choice value: ${points}`);
      return;
    }
    house_points[house] += points;
    await interaction.reply(`${points} points added to ${house}.`);
    save_points();
} else if (commandName === 'remove_points') {
    const house = interaction.options.getString('house');
    const points = interaction.options.getInteger('points');

    if (!house_points.hasOwnProperty(house)) {
        await interaction.reply(`Invalid house name: ${house}`);
        return;
    }

    house_points[house] -= points;
    await interaction.reply(`${points} points removed from ${house}.`);
    save_points();
} else if (commandName === 'add_point_amount') {
    const house = interaction.options.getString('house');
    const points = interaction.options.getInteger('points');

    if (!house_points.hasOwnProperty(house)) {
        await interaction.reply(`Invalid house name: ${house}`);
        return;
    }

    house_points[house] += points;
    await interaction.reply(`${points} points added to ${house}.`);
    save_points();
} else if (commandName === 'points') {
    let message = 'Current house points:\n';
    for (const [house, points] of Object.entries(house_points)) {
        message += `${house}: ${points}\n`;
    }
    await interaction.reply(message);
}
});

function addPointsForUser(house, points) {
    if (house_points.hasOwnProperty(house)) {
        house_points[house] += points;
        save_points();
    }
}
function calculatePoints(userId, message) {
  if (message.length < 10) {
    return;
  }

  if (!userPointsData.hasOwnProperty(userId)) {
    userPointsData[userId] = {
      lastMessageTimestamp: Date.now(),
      points: 0,
      messagesInCurrentInterval: 0,
    };
  }

  const now = Date.now();
  const elapsedTime = now - userPointsData[userId].lastMessageTimestamp;

  if (elapsedTime >= 60000) {
    userPointsData[userId].lastMessageTimestamp = now;
    userPointsData[userId].messagesInCurrentInterval = 0;
  } else if (elapsedTime < 1) {
    return;
  }

  if (userPointsData[userId].messagesInCurrentInterval === 0) {
    userPointsData[userId].points += 10;
  } else {
    userPointsData[userId].points += Math.max(0, 10 - userPointsData[userId].messagesInCurrentInterval);
  }

  userPointsData[userId].messagesInCurrentInterval++;

  if (userPointsData[userId].points > 100) {
    userPointsData[userId].points = 100;
  }
}

async function updateVoiceChannelPoints(guild) {
  setInterval(async () => {
  const voiceChannels = guild.channels.cache.filter((channel) => channel.type === 2 && channel.id !== guild.afkChannelId);
    for (const voiceChannel of voiceChannels.values()) {
      // Check if there are more than 1 human members in the voice channel
      const humanMembers = voiceChannel.members.filter(member => !member.user.bot && !member.voice.mute && !member.voice.deaf);
      if (humanMembers.size >= minimumVoice) {
        for (const member of humanMembers.values()) {
          const house = await getUserHouse(guild, member.id);
          if (house) {
            addPointsForUser(house, pointsPerInterval);
          }
        }
      }
    }
  }, timeInterval);
}

function save_points() {
let data = '';
for (const [house, points] of Object.entries(house_points)) {
data += `${house}:${points}\n`;
}
fs.writeFileSync('house_points.txt', data);
}

async function getUserHouse(guild, userId) {
  // Fetch the member from the guild
  const member = await guild.members.fetch(userId);

  // Iterate over the member's roles
  for (const role of member.roles.cache.values()) {
    // Check if the role name is a house name
    if (house_points.hasOwnProperty(role.name)) {
      return role.name;
    }
  }

  // Return null if no house name found
  return null;
}

function load_points() {
  house_points = {};
  const houseChoicesValues = Object.values(require('./houseChoices.json'));
  houseChoicesValues.forEach(({ name }) => {
    house_points[name] = 0;
  });

  if (fs.existsSync('house_points.txt')) {
    const lines = fs.readFileSync('house_points.txt', 'utf-8').split('\n');
    for (const line of lines) {
      const [house, points] = line.split(':');
      if (house && points && house_points.hasOwnProperty(house)) {
        house_points[house] = parseInt(points, 10);
      }
    }
  }
}


client.login(token);
