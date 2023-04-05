const fs = require('fs');
const { Client, Intents, Permissions } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

// Initialize the bot
const bot = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_CONTENT] });
const token = "INSERT_TOKEN_HERE";

// Initialize house points. Change this depending on house names
let house_points = {
    'Necromancer': 0,
    'Herbalist': 0,
    'Mesmer': 0,
    'Philosopher': 0
};

// Define slash commands to add and remove house points
const add_points = new SlashCommandBuilder()
    .setName("add_points")
    .setDescription("Adds points to a house")
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
        .addChoice("Necromancer", "Necromancer")
        .addChoice("Herbalist", "Herbalist")
        .addChoice("Mesmer", "Mesmer")
        .addChoice("Philosopher", "Philosopher"))
    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true)
        .addChoice("Pinging the mods/Modmail", 1)
        .addChoice("Invite friends to the server", 2)
        .addChoice("Participate in events", 3)
        .addChoice("Boost the server", 4)
        .addChoice("Bump the server", 5)
        .addChoice("Welcome new people", 6)
        .addChoice("Posting Memes", 7)
        .addChoice("Host events", 8)
        .addChoice("Donate to the server", 9));

const remove_points = new SlashCommandBuilder()
    .setName("remove_points")
    .setDescription("Removes points from a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
        .addChoice("Necromancer", "Necromancer")
        .addChoice("Herbalist", "Herbalist")
        .addChoice("Mesmer", "Mesmer")
        .addChoice("Philosopher", "Philosopher"))
    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true));

const add_point_amount = new SlashCommandBuilder()
    .setName("add_point_amount")
    .setDescription("Adds a certain amount of points to a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
        .addChoice("Necromancer", "Necromancer")
        .addChoice("Herbalist", "Herbalist")
        .addChoice("Mesmer", "Mesmer")
        .addChoice("Philosopher", "Philosopher"))
    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true));

const show_points = new SlashCommandBuilder()
    .setName("points")
    .setDescription("Displays the current house points");

bot.on('ready', () => {
    console.log(`Bot has connected to Discord!`);
    load_points();
});

bot.on('interactionCreate', async interaction => {
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

function save_points() {
let data = '';
for (const [house, points] of Object.entries(house_points)) {
data += ${house}:${points}\n;
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

bot.login(token);

