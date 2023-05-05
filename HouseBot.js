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
    .addStringOption(option => option.setName('User')
		     .setDescription('Adding points for another user?  Enter their username here')
		     .setRequired(false)
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
    .addStringOption(option => option.setName("reasoning").setDescription("Put Reason here").setRequired(true))
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
    .addStringOption(option => option.setName('User')
		     .setDescription('Adding points for another user?  Enter their username here')
		     .setRequired(false)
    )
    .addStringOption(option => option.setName("reasoning").setDescription("Put Reason here").setRequired(true))
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
const leaderboard = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the leaderboard of contributed points per house')
    .addStringOption(option => option.setName('house')
           .setDescription('Enter the house name')
	   .setRequired(true)
	          .addChoices(...require('./houseChoices.json'))
    );
    
const commands = [
    addPoints.toJSON(),
    remove_points.toJSON(),
    show_points.toJSON(),
    add_point_amount.toJSON(),
    displayPointHistory.toJSON(), 
    leaderboard.toJSON(),
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
        const [action, direction, currentPage, totalPages, targetType, targetId, userId] = interaction.customId.split('_');
  if (action === 'paginate') {
	const newPage = direction === 'prev' ? parseInt(currentPage) - 1 : parseInt(currentPage) + 1;
    const paginatedEmbed = await createPaginatedEmbed(client, interaction, targetType, targetId, newPage);

    await interaction.deferUpdate();
    await interaction.editReply(paginatedEmbed);
	
  } else if (action === 'leaderboard'){
    const newPage = direction === 'prev' ? parseInt(currentPage) - 1 : parseInt(currentPage) + 1;
    const leaderboardUpdate = await displayLeaderboard(interaction, targetId, client, newPage);

    await interaction.deferUpdate();
    await interaction.editReply(leaderboardUpdate);
	
  }
    return;
	}
    const userId = interaction.user.id;
    const { commandName } = interaction;
    if (commandName === 'leaderboard'){
        const house = interaction.options.getString('house');
 // Call the displayLeaderboard function and display the leaderboard for the specified house
        try{
          const showLeaderboard = await displayLeaderboard(interaction, house, client, 0);
          await interaction.reply(showLeaderboard);
        }catch{
          await interaction.reply("It doesn't appear that this house has history yet.");
      }
    } else if (commandName === 'add_points') {
        const house = interaction.options.getString('house');
        let points = interaction.options.getInteger('points');
	const user = interaction.options.getString('User');
	console.log(User);
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
    const removePointsReason = interaction.options.getString('reasoning');

    if (!house_points.hasOwnProperty(house)) {
        await interaction.reply(`Invalid house name: ${house}`);
        return;
    }

    house_points[house] -= points;
    await interaction.reply(`${points} points removed from ${house}.`);
    await logPoints(userId, house, points, removePointsReason);
    save_points();
} else if (commandName === 'add_point_amount') {
    const house = interaction.options.getString('house');
    const points = interaction.options.getInteger('points');
    const addPointsReason = interaction.options.getString('reasoning');

    if (!house_points.hasOwnProperty(house)) {
        await interaction.reply(`Invalid house name: ${house}`);
        return;
    }

    house_points[house] += points;
    await interaction.reply(`${points} points added to ${house}.`);
    await logPoints(userId, house, points, addPointsReason);
    save_points();
} else if (commandName === 'points') {
    let message = 'Current house points:\n';
    for (const [house, points] of Object.entries(house_points)) {
        message += `${house}: ${points}\n`;
    }
    await interaction.reply(message);
}else if (commandName === 'point_history') {
   try{
   const subcommand = interaction.options.getSubcommand();
    let targetType;
    let targetId;

    if (subcommand === 'user') {
      targetType = 'user';
      const userInput = interaction.options.getString('user');
      const userId = userInput.match(/<@!?(\d+)>/) ? userInput.match(/<@!?(\d+)>/)[1] : userInput;
      targetId = userId;
    } else if (subcommand === 'house') {
      targetType = 'house';
      targetId = interaction.options.getString('house');
    } else {
      return interaction.reply({ content: 'Invalid target type.', ephemeral: true });
    }
    // Call createPaginatedEmbed function and send the result as a reply
    const paginatedEmbed = await createPaginatedEmbed(client, interaction, targetType, targetId, 0);
    await interaction.reply(paginatedEmbed);
   }catch{
		await interaction.reply("It doesn't appear that this house has history yet.");
		}
  }});

function addPointsForUser(house, points) {
    if (house_points.hasOwnProperty(house)) {
        house_points[house] += points;
        save_points();
    }
}

function getLeaderboardData(house) {
  const query = `
    SELECT user_id, house, SUM(points) as points
    FROM point_history
    WHERE house = ?
    GROUP BY user_id, house
    ORDER BY points DESC
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all(house);
  return rows;
}


async function logPoints(userId, house, points, reason) {
  const timestamp = Date.now();
  if (points == 0) return;
  db.prepare(`INSERT INTO point_history (user_id, house, points, reason, timestamp) VALUES (?, ?, ?, ?, ?)`).run(userId, house, points, reason, timestamp);
}

async function displayLeaderboard(interaction, house, client, currentPage) {
    // Retrieve the leaderboard data from the database
  const leaderboardData = await getLeaderboardData(house);

  // Sort the data in decreasing order of points contributed
  leaderboardData.sort((a, b) => b.points - a.points);
  const limit = 10;
  const totalPages = Math.ceil(leaderboardData.length / limit);
  const startIndex = currentPage * limit;
  const footer = { text: `Page ${currentPage + 1} of ${totalPages}` };
  const userID = interaction.user.id;
  // Format the leaderboard data
  const splitLeaderboardPromises = leaderboardData
    .slice(startIndex, startIndex + limit)
    .map(async (entry, index) => {
      const user = await client.users.fetch(entry.user_id);
      return `${index + 1 + startIndex}. User: ${user}, Points: ${entry.points}`;
    });
  const splitLeaderboard = await Promise.all(splitLeaderboardPromises);
  const formattedLeaderboard = splitLeaderboard.join('\n\n');

  // Create the embed
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`${house} Leaderboard`)
    .setDescription(formattedLeaderboard)
    .setFooter(footer);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`leaderboard_prev_${currentPage}_${totalPages}_${house}_${house}_${userID}`)
        .setLabel('Previous')
        .setStyle('1')
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`leaderboard_next_${currentPage}_${totalPages}_${house}_${house}_${userID}`)
        .setLabel('Next')
        .setStyle('1')
        .setDisabled(currentPage === totalPages - 1)
    );

  // Send the embed as a reply
  return { embeds: [embed], components: [row] };
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
  const pointsPerMessage = [25, 20, 15, 10, 10, 5, 5, 5, 5];

  if (!userPointsData.hasOwnProperty(userId)) {
    userPointsData[userId] = {
      lastMessageTimestamp: Date.now() - 60000,
      points: 0,
      messagesInCurrentInterval: 0,
      pointsScheduled: false,
    };
  }
  if (message.length < 10) {
    userPointsData[userId].lastMessageTimestamp = now;
    return;
  }
  const elapsedTime = now - userPointsData[userId].lastMessageTimestamp;
  if (elapsedTime < 30000) { //The minimum interval between messages.  If the user spams out a bunch, the system will update the time of their last message in order to prevent attempts to spam until they are rewarded.
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
  // Schedule the addition of points every hour
  if (!userPointsData[userId].pointsScheduled) {
    scheduleAddPoints(userId, house);
  }
}

function scheduleAddPoints(userId, house) {
  userPointsData[userId].pointsScheduled = true;
  setTimeout(() => {
    const earnedPoints = userPointsData[userId].points;
    userPointsData[userId].points = 0;
    userPointsData[userId].messagesInCurrentInterval = 0;
    addPointsForUser(house, earnedPoints);
    logPoints(userId, house, earnedPoints, 'Chat Messages');
    userPointsData[userId].pointsScheduled = false;
  }, 3600000); // 1 hour in milliseconds
}


async function updateVoiceChannelPoints(guild, client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (oldChannel !== newChannel || oldState.mute !== newState.mute || oldState.deaf !== newState.deaf) {
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


async function createPaginatedEmbed(client, interaction, targetType, targetId, currentPage) {
  const limit = 10;
  const pointHistoryArray = await pointHistory(db, targetType, targetId);
  const totalPages = Math.ceil(pointHistoryArray.length / limit);
  const startIndex = currentPage * limit;
  const userID = interaction.user.id;
  const footer = { text: `Page ${currentPage + 1} of ${totalPages}` };
  const formattedHistory = await Promise.all(pointHistoryArray
    .slice(startIndex, startIndex + limit)
    .map( async (entry, index) => {
	  const user = await client.users.fetch(entry.user_id);
      return `${index + 1 + startIndex}. User: ${user}, House: ${entry.house}, Points: ${entry.points}, Timestamp: ${new Date(entry.timestamp).toLocaleString()}, Reason: ${entry.reason}`;
    }));
	const joinedHistory = formattedHistory.join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Point History')
	.setFooter(footer)
    .setDescription(joinedHistory);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`paginate_prev_${currentPage}_${totalPages}_${targetType}_${targetId}_${userID}`)
        .setLabel('Previous')
        .setStyle('1')
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`paginate_next_${currentPage}_${totalPages}_${targetType}_${targetId}_${userID}`)
        .setLabel('Next')
        .setStyle('1')
        .setDisabled(currentPage === totalPages - 1)
    );

  return { embeds: [embed], components: [row] };
}

async function pointHistory(db, targetType, targetId) {
  return new Promise((resolve, reject) => {
    let query = '';
    if (targetType === 'user') {
      query = `SELECT * FROM point_history WHERE user_id = ? ORDER BY timestamp DESC`;
    } else if (targetType === 'house') {
      query = `SELECT * FROM point_history WHERE house = ? ORDER BY timestamp DESC`;
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
