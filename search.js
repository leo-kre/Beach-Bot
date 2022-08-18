const search = require('yt-search');

exports.run = (client, message, args, ops) => {
        search(args.join('  '), function(err, res) => {
                if (err) return message.channel.send('Sorry, something went wrong!');
                let videos = res.videos.slice(0,10);
                let resp = ' ';
                for(var i in videos) {
                        resp += `**[${parseInt(i)+1}] :** \`{videos.[i].title}\`\n`;
                }

        });
}