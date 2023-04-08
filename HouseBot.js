const fs = require('fs');
const { Client, GatewayIntentBits, Permissions, PermissionFlagsBits } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { token } = require('./config.json');
const pointChoices = require('./pointChoices.json');
const houseChoices = require('./houseChoices.json');


// Initialize the bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize house points. Change this depending on house names
let house_points = houseChoices.reduce((obj, choice) => {
    obj[choice.value] = 0;
    return obj;
}, {});

// Define slash commands to add and remove house points
const addPoints = new SlashCommandBuilder()
    .setName('add_points')
    .setDescription('Adds points to a house')
    .addStringOption(option =>
        option.setName('house')
        .setDescription('House name here')
        .setRequired(true)
        .addChoices(houseChoices)

    .addIntegerOption(option =>
        option.setName('points')
        .setDescription('Points here')
        .setRequired(true)
        .addChoices(pointChoices.map(choice => ({name: choice.name, value: choice.value}))))
    )
    .setDMPermission(false);

const remove_points = new SlashCommandBuilder()
    .setName("remove_points")
    .setDescription("Removes points from a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
    .addChoices(houseChoices)
    .addIntegerOption(option => option.setName("points").setDescription("Points here").setRequired(true))
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const add_point_amount = new SlashCommandBuilder()
    .setName("add_point_amount")
    .setDescription("Adds a certain amount of points to a house")
    .setDefaultPermission(false)
    .addStringOption(option => option.setName("house").setDescription("House name here").setRequired(true)
    .addChoices(houseChoices)
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
