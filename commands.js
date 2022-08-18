const { MessageEmbed } = require('discord.js');
const emojiRegex = require('emoji-regex/RGI_Emoji.js')();
const emojiRegex2 = require('emoji-regex/index.js')();
const emojiRegex3 = require('emoji-regex/text.js')();
const { badwords } = require('./DirtyWordList.json');
const music = require('./music.js');
const guilds = require('./guilds.json');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const musicCommands = [
    'play',
    'stop',
    'leave',
    'skip',
    'pause',
    'resume',
    'search',
    'np',
    'queue',
    'nowplaying',
    'q',
    'help',
    'remove',
    'alex',
    'vincent',
    'leon',
    'jonas',
    'loop',
    'fp',
    'shuffle',
    'save',
    'saveclear',
    'replay',
    'lyrics',
    'clearqueue',
    'qc',
    'join',
    'spotify',
    'sp',
    's',
    'role',
    'follow',
    'repeat',
    'test',
    'record',
];

function onCommand(message, client) {
    let prefix;
    if (guilds[message.guild.id]?.prefix !== undefined) {
        prefix = guilds[message.guild.id].prefix;
    } else {
        prefix = process.env.PREFIX;
    }

    let content = message.content;

    if (!content.startsWith(prefix)) {
        if (content == '?resetprefix') {
            updatePrefix(message.guild.id, '?');
        }
        return;
    }

    let args = content.substring(prefix.length).split(' ');

    if (args.length < 1) {
        return;
    }
    

    args[0] = args[0].toLowerCase();

    if (musicCommands.includes(args[0])) {
        music.onCommand(args, message, client);
        return;
    }

    switch (args[0]) {
        case 'changeprefix':
            if (
                message.member.roles.cache.some(
                    (role) => role.name === process.env.CHANGEPREFIXROLE
                ) ||
                message.author.id == '519534655620251690s'
            ) {
                if (args.length < 2) {
                    let embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Zu wenige Argumente');

                    message.channel.send({
                        embeds: [embed],
                    });
                    return;
                }
                updatePrefix(message.guild.id, args[1]);
                message.channel.send('**Prefix got change to: **' + args[1]);
            } else {
                message.channel.send(
                    "You don't have the permission to do that"
                );
            }

            break;

        case 'vote':
            if (args.length < 1) {
                return;
            }

            for (let i = 1; i < args.length && i < 10; i++) {
                if (
                    emojiRegex.exec(args[i]) ||
                    emojiRegex2.exec(args[i]) ||
                    emojiRegex3.exec(args[i])
                ) {
                    message.react(args[i]);
                } else {
                    console.log(args[i]);
                }
            }
            message.react('❌');
            break;
    }
}
module.exports.onCommand = onCommand;

function updatePrefix(guildID, newPrefix) {
    if (newPrefix == '?') {
        if (guilds[guildID]?.prefix !== '?') {
            delete guilds[guildID].prefix;
        }
    } else {
        if (!guilds[guildID]) {
            guilds[guildID] = {
                prefix: newPrefix,
            };
        } else {
            guilds[guildID].prefix = newPrefix;
        }
    }

    fs.writeFileSync(
        path.join(__dirname, 'guilds.json'),
        JSON.stringify(guilds)
    );
}
