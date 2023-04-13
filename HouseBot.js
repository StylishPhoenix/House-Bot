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

const displayPointHistory = new SlashCommandBuilder()
    .setName('display_point_history')
    .setDescription('Displays point history for a house or a user ID')
    .addSubcommand(subcommand => subcommand
        .setName('user')
        .setDescription('Displays point history for a user ID')
        .addStringOption(option => option.setName('user_id')
            .setDescription('Enter the user ID')
            .setRequired(true)
        )
        .addIntegerOption(option => option.setName('limit')
            .setDescription('Number of records to display (defaults to 20)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('house')
        .setDescription('Displays point history for a house')
        .addStringOption(option => option.setName('house_name')
            .setDescription('Enter the house name')
            .setRequired(true)
        )
        .addIntegerOption(option => option.setName('limit')
            .setDescription('Number of records to display (defaults to 20)')
            .setRequired(false)
        )
    );

const commands = [
    addPoints.toJSON(),
    remove_points.toJSON(),
    show_points.toJSON(),
    add_point_amount.toJSON(),
    displayPointHistory.toJSON(), 
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

  calculatePoints(userId, house, message.content);
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
}else if (commandName === 'display_point_history') {
        const subcommand = interaction.options.getSubcommand();
        const limit = interaction.options.getInteger('limit') || 20;

        let targetId;
        let targetType;

        if (subcommand === 'user') {
            targetType = 'user';
            targetId = interaction.options.getString('user_id');
        } else if (subcommand === 'house') {
            targetType = 'house';
            targetId = interaction.options.getString('house_name');
        }

        const pointHistory = await displayPointHistory(targetType, targetId, limit);
        let message = `Displaying the most recent ${limit} point history entries for ${targetType} ${targetId}:\n\n`;

        pointHistory.forEach(entry => {
            message += `ID: ${entry.id}, ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}: ${entry.targetId}, Points: ${entry.points}, Timestamp: ${entry.timestamp}\n`;
        });

        await interaction.reply(message);
});

function addPointsForUser(house, points) {
    if (house_points.hasOwnProperty(house)) {
        house_points[house] += points;
        save_points();
    }
}
function calculatePoints(userId, house, message) {
  if (message.length < 10) {
    return;
  }
  const pointsPerMessage = [25, 20, 15, 10, 10, 5, 5, 5, 5];
	
  if (!userPointsData.hasOwnProperty(userId)) {
    userPointsData[userId] = {
      lastMessageTimestamp: Date.now() - 30000,
      points: 0,
      messagesInCurrentInterval: 0,
    };
  }

  const now = Date.now();
  const elapsedTime = now - userPointsData[userId].lastMessageTimestamp;

  if (elapsedTime >= 3600000) { //The maximum point cap resets every hour.
    userPointsData[userId].lastMessageTimestamp = now;
    userPointsData[userId].messagesInCurrentInterval = 0;
  } else if (elapsedTime < 30000) { //The minimum interval between messages.  If the user spams out a bunch, the system will update the time of their last message in order to prevent attempts to spam until they are rewarded.
    userPointsData[userId].lastMessageTimestamp = now;
    return;
  }

  if (userPointsData[userId].messagesInCurrentInterval === 0) {
    userPointsData[userId].points += pointsPerMessage[userPointsData[userId].messagesInCurrentInterval];
  } else {
    userPointsData[userId].points += pointsPerMessage[userPointsData[userId].messagesInCurrentInterval] || 0;
  }

  userPointsData[userId].messagesInCurrentInterval++;

  if (userPointsData[userId].points > 100) {
    userPointsData[userId].points = 100;
  }
  const earnedPoints = userPointsData[userId].points;
  userPointsData[userId].points = 0;
  addPointsForUser(house, earnedPoints);
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

async function displayPointHistory(targetType, targetId, limit = 20) {
  // Check for valid targetType
  if (targetType !== 'user' && targetType !== 'house') {
    throw new Error('Invalid targetType');
  }

  // Connect to the database
  const db = await openDatabase();

  // Query the database based on targetType
  let results;
  if (targetType === 'user') {
    results = await db.all(
      `SELECT * FROM point_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [targetId, limit]
    );
  } else if (targetType === 'house') {
    results = await db.all(
      `SELECT * FROM point_history WHERE house = ? ORDER BY timestamp DESC LIMIT ?`,
      [targetId, limit]
    );
  }

  // Close the database connection
  await db.close();

  return results;
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
