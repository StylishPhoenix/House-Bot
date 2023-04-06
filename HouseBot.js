const fs = require('fs');
const { Client, GatewayIntentBits, Permissions, PermissionFlagsBits } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

// Initialize the bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = "INSERT_TOKEN_HERE";
const userVoiceJoinTime = new Map();
const voiceActivityCheckInterval = 60000; // 60000 ms = 1 minute

// Initialize house points. Change this depending on house names
let house_points = {
    'Necromancer' : 0,
    'Herbalist' : 0,
    'Mesmer' : 0,
    'Philosopher' : 0
};

// Define slash commands to add and remove house points
const addPoints = new SlashCommandBuilder()
    .setName('add_points')
    .setDescription('Adds points to a house')
    .addStringOption(option =>
        option.setName('house')
        .setDescription('House name here')
        .setRequired(true)
        .addChoices(
            {name: "Necromancer", value: "Necromancer"},
            {name: "Herbalist", value: "Herbalist"},
            {name: "Mesmer", value: "Mesmer"},
            {name: "Philosopher", value: "Philosopher"}
        )
    )
    .addIntegerOption(option =>
        option.setName('points')
        .setDescription('Points here')
        .setRequired(true)
        .addChoices(
            // Add choices for the bot here. Please use a unique value, then add it to the nested ifs below
            {name: "Pinging the mods/Modmail", value: 1},
            {name: "Invite friends to the server", value: 2},
            {name: "Participate in events", value: 3},
            {name: "Boost the server", value: 4},
            {name: "Bump the server", value: 5},
            {name: "Welcome new people", value: 6},
            {name: "Posting Memes", value: 7},
            {name: "Host events", value: 8},
            {name: "Donate to the server", value: 9}
        )
    )
    .setDMPermission(false);

const remove_points = new SlashCommandBuilder()
    .setName("remove_points")
    .setDescription("Removes points from a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
    .addChoices(
            {name: "Necromancer", value: "Necromancer"},
            {name: "Herbalist", value: "Herbalist"},
            {name: "Mesmer", value: "Mesmer"},
            {name: "Philosopher", value: "Philosopher"}
        ))
    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const add_point_amount = new SlashCommandBuilder()
    .setName("add_point_amount")
    .setDescription("Adds a certain amount of points to a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
    .addChoices(
            {name: "Necromancer", value: "Necromancer"},
            {name: "Herbalist", value: "Herbalist"},
            {name: "Mesmer", value: "Mesmer"},
            {name: "Philosopher", value: "Philosopher"}
        ))
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
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (oldChannelId === newChannelId) return;

  if (!oldChannelId && newChannelId) {
    userVoiceJoinTime.set(userId, Date.now());
  } else if (oldChannelId && !newChannelId) {
    const joinTime = userVoiceJoinTime.get(userId);
    if (joinTime) {
      const timeSpent = (Date.now() - joinTime) / 60000;
      const userHouse = getUserHouse(userId); // You'll need to implement this function
      updateUserHousePoints(userId, userHouse, Math.floor(timeSpent));
      userVoiceJoinTime.delete(userId);
    }
  }
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
    if (points === 1) {
        points = 50;
    } else if (points === 2) {
        points = 100;
    } else if (points === 3) {
        points = 100;
    } else if (points === 4) {
        points = 100;
    } else if (points === 5) {
        points = 100;
    } else if (points === 6) {
        points = 100;
    } else if (points === 7) {
        points = 100;
    } else if (points === 8) {
        points = 1000;
    } else if (points === 9) {
        points = 2000;
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

function updateUserHousePoints(userId, house, minutes) {
  if (!house_points.hasOwnProperty(house)) {
    console.log(`Invalid house name: ${house}`);
    return;
  }

  const points = minutes * 3; // Change this number to adjust the points per minute
  house_points[house] += points;
  save_points();
  console.log(`${points} points added to ${house} for user ${userId} voice activity.`);
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

function save_points() {
let data = '';
for (const [house, points] of Object.entries(house_points)) {
data += `${house}:${points}\n`;
}
fs.writeFileSync('house_points.txt', data);
}

function load_points() {
if (fs.existsSync('house_points.txt')) {
const lines = fs.readFileSync('house_points.txt', 'utf-8').split('\n');
for (const line of lines) {
const [house, points] = line.split(':');
if (house && points) {
house_points[house] = parseInt(points, 10);
}
}
}
}

client.login(token);

setInterval(() => {
  client.guilds.cache.forEach((guild) => {
    guild.voiceStates.cache.forEach((voiceState) => {
      if (voiceState.channelId && userVoiceJoinTime.has(voiceState.id)) {
        const joinTime = userVoiceJoinTime.get(voiceState.id);
        const timeSpent = (Date.now() - joinTime) / 60000;
        const userHouse = getUserHouse(guild, userId);
        updateUserHousePoints(voiceState.id, userHouse, Math.floor(timeSpent));
        userVoiceJoinTime.set(voiceState.id, Date.now());
      }
    });
  });
}, voiceActivityCheckInterval);
