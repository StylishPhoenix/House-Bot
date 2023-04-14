const fs = require('fs');
const { Client, GatewayIntentBits, Permissions, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { token, guildID, timeInterval, pointsPerInterval, minimumVoice } = require('./config.json');
const pointChoices = require('./pointChoices.json');
const houseChoices = require('./houseChoices.json');
const userPointsData = {};
const userVoiceTimes = {};
const Database = require('better-sqlite3');

// Initialize the bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

const db = new Database('./points_log.db');
createTableIfNotExists(db);


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
    .setName('point_history')
    .setDescription('Displays point history for a house or a user ID')
    .addSubcommand(subcommand => subcommand
        .setName('user')
        .setDescription('Displays point history for a user ID')
        .addStringOption(option => option.setName('user')
            .setDescription('Enter the user ID')
            .setRequired(true)
        )
        )
    .addSubcommand(subcommand => subcommand
        .setName('house')
        .setDescription('Displays point history for a house')
        .addStringOption(option => option.setName('house')
            .setDescription('Enter the house name')
            .setRequired(true)
			.addChoices(...require('./houseChoices.json'))
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
        updateVoiceChannelPoints(guild, client);
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
    if (!interaction.isCommand() && !interaction.isButton()) return;
    if (interaction.isButton()){ 
      const buttonId = interaction.customId;
      if (buttonId.startsWith('paginate_')) {
         const parts = buttonId.split('_');
         const command = parts[1];
         const currentPage = parseInt(parts[2], 10);
         const totalPages = parseInt(parts[3], 10);
         const targetType = parts[4];
         const targetId = parts[5];
        console.log(`test`);
        if (command === 'prev') {
         if (currentPage > 0) {
          await sendPaginatedEmbed(interaction, targetType, targetId, currentPage - 1);
          }
       } else if (command === 'next') {
         if (currentPage < totalPages - 1) {
           await sendPaginatedEmbed(interaction, targetType, targetId, currentPage + 1);
        }
    }
    await interaction.deferUpdate();
    return;
  }}
    const userId = interaction.user.id;
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
    await logPoints(userId, house, points, selectedChoice.name);
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
}else if (commandName === 'point_history') {
    const subcommand = interaction.options.getSubcommand();
    let targetType;
    let targetId;

    if (subcommand === 'user') {
      targetType = 'user';
      targetId = interaction.options.getString('user');
    } else if (subcommand === 'house') {
      targetType = 'house';
      targetId = interaction.options.getString('house');
    } else {
      return interaction.reply({ content: 'Invalid target type.', ephemeral: true });
    }
    try {
      await sendPaginatedEmbed(interaction, targetType, targetId);
    } catch (error) {
      console.error('Error fetching point history:', error);
      await interaction.reply({ content: 'An error occurred while fetching point history.', ephemeral: true });
    }
  }});

function addPointsForUser(house, points) {
    if (house_points.hasOwnProperty(house)) {
        house_points[house] += points;
        save_points();
    }
}

async function logPoints(userId, house, points, reason) {
  const timestamp = Date.now();
  db.prepare(`INSERT INTO point_history (user_id, house, points, reason, timestamp) VALUES (?, ?, ?, ?, ?)`).run(userId, house, points, reason, timestamp);
}

function createTableIfNotExists(db) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      house TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `;

  db.exec(createTableQuery);
}

function calculatePoints(userId, house, message) {
  const now = Date.now();	
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

// Update the lastMessageTimestamp after processing the message.
  userPointsData[userId].lastMessageTimestamp = now;
  
  if (userPointsData[userId].points > 100) {
    userPointsData[userId].points = 100;
  }
  const earnedPoints = userPointsData[userId].points;
  userPointsData[userId].points = 0;
  addPointsForUser(house, earnedPoints);
  logPoints(userId, house, earnedPoints, 'Chat Message');
}

async function updateVoiceChannelPoints(guild, client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (oldChannel !== newChannel) {
      if (oldChannel) {
        // User left a voice channel or switched to another channel
        const house = await getUserHouse(guild, userId);
        if (house) {
          const startTime = userVoiceTimes[userId];
          const currentTime = Date.now();
		
	 if (startTime && !isNaN(startTime)) { // Check if startTime is valid
          const timeSpent = currentTime - startTime;

          // Calculate points based on time spent in the voice channel
          const points = Math.floor(timeSpent / timeInterval) * pointsPerInterval;

          // Add points and log them
          addPointsForUser(house, points);
          await logPoints(userId, house, points, 'Voice Channel Points');
	 }
          // Remove the user's entry from userVoiceTimes
          delete userVoiceTimes[userId];
        }
      }

      if (newChannel) {
        // User joined a voice channel
        const humanMembers = newChannel.members.filter(member => !member.user.bot && !member.voice.mute && !member.voice.deaf);
        if (humanMembers.size >= minimumVoice) {
          userVoiceTimes[userId] = Date.now();
        }
      }
    }
  });
}

async function sendPaginatedEmbed(interaction, targetType, targetId, currentPage = 0) {
  const limit = 10;
  const pointHistoryArray = await pointHistory(db, targetType, targetId);
  const totalPages = Math.ceil(pointHistoryArray / limit);
  const startIndex = currentPage * limit;
  const formattedHistory = pointHistoryArray
    .slice(startIndex, startIndex + limit)
    .map((entry, index) => {
      return `${index + 1 + startIndex}. User: ${entry.user_id}, House: ${entry.house}, Points: ${entry.points}, Timestamp: ${new Date(entry.timestamp).toLocaleString()}`;
    }).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Point History')
    .setDescription(formattedHistory);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`paginate_prev_${currentPage}_${totalPages}_${targetType}_${targetId}`)
        .setLabel('Previous')
        .setStyle('1')
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`paginate_next_${currentPage}_${totalPages}_${targetType}_${targetId}`)
        .setLabel('Next')
        .setStyle('1')
        .setDisabled(currentPage === totalPages - 1)
    );

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row] });
  }
}

async function pointHistory(db, targetType, targetId) {
  return new Promise((resolve, reject) => {
    let query = '';
    if (targetType === 'user') {
      query = `SELECT * FROM point_history WHERE user_id = ? ORDER BY timestamp`;
    } else if (targetType === 'house') {
      query = `SELECT * FROM point_history WHERE house = ? ORDER BY timestamp`;
    } else {
      reject(new Error('Invalid targetType'));
      return;
    }

    const rows = db.prepare(query).all(targetId);
    resolve(rows);
  });
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
