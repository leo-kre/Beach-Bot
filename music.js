const ytdl = require('ytdl-core');
const ytly = require('ytly');
const spotifyToYT = require('spotify-to-yt');
const spotifyURLInfo = require('spotify-url-info');
const { badwords } = require('./DirtyWordList.json');
const YouEmbed = require ('youembed')
const path = require('path');
const { MessageEmbed, VoiceChannel, Typing } = require('discord.js');
const {
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
    generateDependencyReport,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
    AudioPlayerStatus,
    getVoiceConnection,
    AudioResource,
} = require('@discordjs/voice');
const YouTube = require('youtube-sr').default;
const { Video } = require('youtube-sr');
const embeds = require('./embeds.json');
const { error } = require('npmlog');

var queue = {};
let loop = false;
async function onCommand(args, message, client) {
    let onTop = false;

    switch (args[0]) {
        case 'test':
            console.log(YouEmbed('I9khEhPNbOc').get());
            break
        case 'fp':
            onTop = true;
        case 'play':
            if (!args[1]) {
                return;
            }
            let url = args[1];
            if (url.match(/(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/)) {
                let songinfo = await ytdl.getInfo(url);
                //TODO is song valid

                queueSong(
                    message,
                    client,
                    url,
                    songinfo.videoDetails.title,
                    onTop
                );
            }
            const isspotifyurlvalid = await spotifyToYT.validateURL(url);
            if (isspotifyurlvalid) {
                let songorplaylist = spotifyToYT.isTrackOrPlaylist(url);
                if (songorplaylist == 'track') {
                    playspotifysong(message, client, url);
                } else {
                    playspotifyplaylist(message, client, url);
                }
                break;
            }
        case 'search':
            let result = await YouTube.search(args.join(' '), {
                limit: 1,
                safeSearch: false,
            });
            if (result.length < 1) {
                message.reply({
                    embeds: [embeds.novid],
                });
                return;
            }

            let yturl = 'https://www.youtube.com/watch?v=' + result[0].id;

            message.reply(
                '**Added:                                                                                                                                                                                                                                                                                                                                                                                                        **' +
                    yturl
            );
            queueSong(message, client, yturl, result[0].title, onTop);
            break;
        case 'replay':
            let replayEmbed = new MessageEmbed()
                .setColor('GOLD')
                .setTitle(
                    'Playing following song again:' +
                        queue[message.guild.id].songs[0].title
                )
                .setDescription(queue[message.guild.id].songs[0].url, true);
            message.reply({
                embeds: [replayEmbed],
            });
            let song = {
                url: queue[message.guild.id].songs[0].url,
                title: queue[message.guild.id].songs[0].title,
            };
            queue[message.guild.id].songs.splice(1, 0, song);
            skip(message.guild.id);
            break;

        case 'pause':
        case 'stop':
            pause(message.guild.id);
            break;

        case 'lyrics':
            const lyrics = await ytly.get.lyrics(
                queue[message.guild.id].songs[0].url
            );

            let lyricsembed = new MessageEmbed()
                .setColor('#00D100')
                .setTitle('The lyrics for this song:')
                .setDescription(lyrics);
            message.reply({
                embeds: [lyricsembed],
            });
            break;

        case 'join':
            let vc = message.member.voice;
            let connection = await connect(vc.channel);
            connection.subscribe(queue[message.guild.id].player);
            break;

        case 'leave':
            if (queue[message.guild.id] !== undefined) {
                queue[message.guild.id].connection.destroy();
            }
            queue[message.guild.id];
            break;

        case 'shuffle':
            queue[message.guild.id].songs.sort((a, b) => {
                if (queue[message.guild.id].songs.indexOf(a) == 0) {
                    return -1;
                } else if (queue[message.guild.id].songs.indexOf(b) == 0) {
                    return 1;
                }

                return 0.5 - Math.random();
            });
            message.reply('Shuffled your queue');
            break;

        case 'resume':
            resume(message.guild.id);
            break;

        case 'skip':
            skip(message.guild.id);
            break;

        case 'np':
        case 'nowplaying':
            if (
                queue[message.guild.id] === undefined ||
                queue[message.guild.id].songs.length < 1
            ) {
                message.reply('Nothing playing right now');
                return;
            }

            message.reply(
                '**Now playing: **' + queue[message.guild.id].songs[0].url
            );

            break;

        case 'loop':
            queue[message.guild.id].loop = !queue[message.guild.id].loop;
            if (queue[message.guild.id].loop) {
                let loopEmbed = new MessageEmbed()
                    .setColor('DARK_GOLD')
                    .setTitle(
                        '*Looped:* ' + queue[message.guild.id].songs[0].title
                    );
                message.reply({
                    embeds: [loopEmbed],
                });
            } else {
                let loopremoveEmbed = new MessageEmbed()
                    .setColor('DARK_GOLD')
                    .setTitle(
                        '*Loop removed for:* ' +
                            queue[message.guild.id].songs[0].title
                    );
                message.reply({
                    embeds: [loopremoveEmbed],
                });
            }
            break;

        case 'q':
        case 'queue':
            let queueEmbed = new MessageEmbed()
                .setColor('#DFFF00 ')
                .setTitle('**Queue**');
            if (
                queue[message.guild.id] === undefined ||
                queue[message.guild.id].songs.length < 1
            ) {
                let queueemptyEmbed = new MessageEmbed().setTitle(
                    'The Queue ist empty'
                );
                message.reply({
                    embeds: [queueemptyEmbed],
                });
                return;
            }

            for (let i = 0; i < queue[message.guild.id].songs.length; i++) {
                let length = queueEmbed.length;
                if (
                    length +
                        queue[message.guild.id].songs[i].title.length +
                        queue[message.guild.id].songs[i].url.length >
                        5800 ||
                    i == 23
                ) {
                    queueEmbed.addField(
                        '...',
                        'And ' +
                            (queue[message.guild.id].songs.length - i + 1) +
                            ' more...',
                        false
                    );
                    break;
                } else {
                    queueEmbed.addField(
                        queue[message.guild.id].songs[i].title,
                        queue[message.guild.id].songs[i].url,
                        false
                    );
                }
            }

            var loopicon = queue[message.guild.id].loop ? '✅' : '❌';
            queueEmbed.addField('**Loop:** ', loopicon, false);

            message.reply({
                embeds: [queueEmbed],
            });

            break;

        case 'qc':
        case 'clearqueue':
            try {
                queue[message.guild.id].songs = [];
                message.reply('Your queue got cleared');
            } catch (error) {}

            break;

        case 'role':
            if (args[1] == 'add') {
                var role = message.member.roles.cache.find(
                    (role) => role.name === args[2]
                );
                if (!role) return;
                message.member.guild.roles.add(role);
            } else if (args[1] == 'remove') {
                var role = message.member.roles.cache.find(
                    (role) => role.name === args[2]
                );
                if (!role) return;
                message.member.guild.roles.remove(role);
            }
            message.delete();

        case 'saveclear':
            console.log('clear');
            message.author.delete.lastMessageEdit;
            // const dmCount = message.author.id.dmChannel;
            // var fetched = dmCount.fetchMessages({ limit: 9999 });
            // dmCount.bulkDelete(fetched);
            break;

        case 'help':
            let helpembed = new MessageEmbed()
                .setTitle('These are all the commands i know')
                .setURL('https://www.youtube.com')

                .setAuthor(
                    message.author.username,
                    message.author.avatarURL(),
                    'https://discordapp.com/users/' + message.author.id
                )
                .setDescription('To use these commands use the prefix')
                .setColor('DARK_BLUE')
                .setThumbnail(
                    'https://cdn.discordapp.com/attachments/832199234345762876/888876801152151602/1__c1C4ECpdsSi17KsIznRTQ.png'
                )
                .addFields(
                    {
                        name: 'play <url / search arguments>',
                        value: '```Play a song, livestream or playlist from Spotify or Youtube```',
                    },
                    {
                        name: 'stop / pause',
                        value: '```Stops playing music```',
                    },
                    {
                        name: 'resume',
                        value: '```Resumes playing music```',
                    },
                    {
                        name: 'skip',
                        value: '```Skips the current song```',
                    },
                    {
                        name: 'q / queue',
                        value: '```Lists all queued songs```',
                    },
                    {
                        name: 'np / nowplaying',
                        value: '```Shows the current song```',
                    },
                    {
                        name: 'lyrics',
                        value: '```Get the lyrics of the current song```',
                    },
                    {
                        name: 'leave',
                        value: "```Let the Bot leave the Voice Channel (Your queue does't get deleted)```",
                    },
                    {
                        name: 'loop',
                        value: '```Loops the current song```',
                    },
                    {
                        name: 'replay',
                        value: '```Plays the current song again```',
                    },
                    {
                        name: 'shuffle',
                        value: '```Shuffles your queue```',
                    },
                    {
                        name: 'qc / clearqueue',
                        value: '```Clears your queue (Your current song will continue playing)```',
                    },
                    {
                        name: 'remove <position>',
                        value: '```Removes the song at your privided position```',
                    }
                );

            message.reply({
                embeds: [helpembed],
            });
            break;

        case 'follow':
            if ((message.author.id == '519534655620251690')) {
                pause(message.guild.id)
                if (queue[message.guild.id] !== undefined) {
                    queue[message.guild.id].connection.destroy();
                }
                queue[message.guild.id];
                let vc = message.member.voice;
                let connection = await connect(vc.channel);
                connection.subscribe(queue[message.guild.id].player);
                resume(message.guild.id)
            }
            break;
        case 'remove':
            queue[message.guild.id].splice(args[1], args[1]);
            message.reply(
                'Removed song number ' + args[1] + ' from your queue'
            );
            break;

        case 'repeat':
            let repeat = args.join(' ');
            message.reply('You waned me to say' + repeat);
            break;

        case 'save':
            message.author.send(queue[message.guild.id].songs[0].url);
            message.reply("Got you")
            break;

        case 'record':
            // console.log(message.author.channel.name)
            // message.channel.setName('🌶 Pepper')
            // message.author.voice.channel.setName("Hui")
            console.log(message.member.voice)
            message.channel.send(message.author.voice)
            break        

        case 'alex':
            let AlexEmbed = new MessageEmbed()
                .setColor('#DFFF00 ')
                .setTitle('Hi there, Alex');
            message.reply({
                embeds: [AlexEmbed],
            });
            break;

        case 'vincent':
            let VincentEmbed = new MessageEmbed()
                .setColor('#DFFF00 ')
                .setTitle('Hi there, Vincent');
            message.reply({
                embeds: [VincentEmbed],
            });
            break;

        case 'leon':
            let LeonEmbed = new MessageEmbed()
                .setColor('#DFFF00 ')
                .setTitle('Hi there, Leon');
            message.reply({
                embeds: [LeonEmbed],
            });
            break;
    }
}
module.exports.onCommand = onCommand;

async function playspotifysong(message, client, url) {
    const validateurl = await spotifyToYT.validateURL(args[1]);
    if (validateurl) {
        let urlspotifysong = (await spotifyToYT.trackGet(url)).url;
        console.log(urlspotifysong);
        message.channel.send(urlspotifysong);
        let songinfo = await ytdl.getInfo(urlspotifysong);
        queueSong(
            message,
            client,
            urlspotifysong,
            songinfo.videoDetails.title,
            onTop
        );
    } else {
        console.log('❌**Url is invalid!**');
    }
}

async function playspotifyplaylist(message, client, url) {
    let spotifyData = await spotifyURLInfo.getTracks(url);

    let addedSongs = 0;

    let addingMessage = await message.channel.send(
        'Adding playlist... Added ' + addedSongs + ' songs.'
    );
    let lastMessageEdit = new Date().getTime();

    for (let i = 0; i <= spotifyData.length; i++) {
        try {
            if (!spotifyData[i].external_urls) {
                continue;
            }

            let ytInfo = await spotifyToYT.trackGet(
                spotifyData[i].external_urls.spotify
            );
            queueSong(message, client, ytInfo.url, ytInfo.info[0].title, false);
            addedSongs++;

            let now = new Date().getTime();
            if (now - lastMessageEdit > 5000) {
                addingMessage.edit(
                    'Adding playlist... Added ' + addedSongs + ' songs.'
                );
                lastMessageEdit = now;
            }
        } catch (err) {
            console.log(err);
        }
    }

    addingMessage.edit('Finished. Added ' + addedSongs + ' songs.');
}

function createPlayer(guildID) {
    let player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
            maxMissedFrames: Math.round(100000),
        },
    });

    player.on('error', (err) => {
        console.log(err);
        console.error('ERROR :( - Aber abgefangen, haha');
        skip(guildID);
    });

    player.on(AudioPlayerStatus.Idle, () => {
        skip(guildID);
    });
    return player;
}

function pause(guildID) {
    queue[guildID].player.pause();
}

function resume(guildID) {
    queue[guildID].player.unpause();
}

function skip(guildID) {
    queue[guildID].player.stop();
    if (!queue[guildID].loop) {
        queue[guildID].songs.splice(0, 1);
    }
    playSong(guildID);
}

async function connect(channel) {
    try {
        let connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }
    } catch (error) {
        console.log(error);
    }
}

function playSong(guildID) {
    if (queue[guildID].songs.length == 0) {
        return;
    }

    queue[guildID].player.play(
        createAudioResource(ytdl(queue[guildID].songs[0].url))
    );
}

async function queueSong(message, client, url, title, onTop) {
    let guildID = message.guild.id;
    let vc = message.member.voice;

    if (!vc) {
        return message.channel.send('You are not in a Voice Channel!');
    }
    if (
        !vc.channel.permissionsFor(client.user).has('CONNECT') ||
        !vc.channel.permissionsFor(client.user).has('SPEAK')
    ) {
        return message.channel.send("You don't have a permission to do that!");
    }

    let song = {
        url: url,
        title: title,
    };

    if (queue[guildID] === undefined || queue[guildID]?.songs?.length == 0) {
        let connection = await connect(vc.channel);
        queue[guildID] = {
            songs: [song],
            player: createPlayer(guildID),
            loop: false,
            connection: connection,
        };
        connection.subscribe(queue[guildID].player);
        playSong(guildID);
        return;
    }

    if (onTop) {
        queue[guildID].songs.splice(1, 0, song);
    } else {
        queue[guildID].songs.push(song);
    }
}
