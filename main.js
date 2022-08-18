const { Client, Intents } = require('discord.js');
const commandHandler = require('./commands.js');
require('dotenv').config();

const ytdl = require('ytdl-core');

const botIntents = new Intents();
botIntents.add(
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES
);

const bot = new Client({ intents: botIntents });

bot.on('ready', () => {
    console.log('Bot connected');
});

bot.on('messageCreate', (message) => {
    commandHandler.onCommand(message, bot);

});

bot.login(process.env.TOKEN);
