"use strict";


const Discord = require("discord.js");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const {
	prefix,
  token,
  youtubeApi,
} = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();


client.on("ready", () => {
 console.log(`Logged in as ${client.user.tag}!`);
 client.user.setActivity("for !help", { type: "WATCHING" })
  .catch(console.error);
 });

client.on("message", async (msg) => {

  if(msg.author.bot) return;
  if (!msg.content.startsWith(prefix)) return;

  const serverQueue = queue.get(msg.guild.id);

  if (msg.content.startsWith(`${prefix}play`)) {
    execute(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}skip`)) {
    skip(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}stop`)) {
    stop(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}np`)) {
    np(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}queue`)) {
    queuemsg(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}volume`)) {
    volume(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}help`)) {
    help(msg, serverQueue);
    return;
  }
});


async function execute(msg, serverQueue) {


  const args = msg.content.split(" ");


  const voiceChannel = msg.member.voiceChannel;
  if (!voiceChannel) return msg.channel.send("You need to be in a voice channel to play music!");
  const permissions = voiceChannel.permissionsFor(msg.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return msg.channel.send("I need the permissions to join and speak in your voice channel!");
  }


  var argsSlice = args.slice(1, -1);
  var i;
  var video = "";
  for (i = 0; i < argsSlice.length; i++) {
    video += argsSlice[i] + " ";
  }


  video += args[args.length - 1];

  msg.channel.send({embed: {
    author: {
      name: client.user.username,
      icon_url: client.user.avatarURL
    },
  title: "🔍 Searching...",
  color: 16711680,
  description: `Please wait, we are searching youtube for a song called ${video}`,
  }});


  const urlGet = ("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=" + video + "&key=" + youtubeApi);


  var xmlhttp = new XMLHttpRequest();


  xmlhttp.onreadystatechange = async function() 
  {
      if (this.readyState === 4 && this.status === 200) 
      {
          //Use parse() method to convert JSON string to JSON object
        var str = this.responseText;
        var parse = JSON.parse(str);
        var videoID = parse["items"][0]["id"]["videoId"];
        var imgURL = parse["items"][0]["snippet"]["thumbnails"]["high"]["url"];
        var videoTitle = parse["items"][0]["snippet"]["title"];
        const videoURL = "https://www.youtube.com/watch?v=" + videoID;
          
        //Play song
        const songInfo = await ytdl.getInfo(videoURL);
        const song = {
          title: videoTitle,
          url: songInfo.url,
          imgurl: imgURL,
        };

        if (!serverQueue) {
          const queueContruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
          };

          queue.set(msg.guild.id, queueContruct);

          queueContruct.songs.push(song);


          try {
            
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(msg.guild, queueContruct.songs[0]);
            return msg.channel.send({embed: {
              author: {
                name: client.user.username,
                icon_url: client.user.avatarURL
              },
            title: song.title,
            url: videoURL,
            color: 16711680,
            description: `${song.title} is now playing!`,
            thumbnail: {
              url: song.imgurl
            }
            }});
          } catch (err) {
            console.log(err);
            queue.delete(msg.guild.id);
            return msg.channel.send(err);
          }
        } else {
          serverQueue.songs.push(song);
          return msg.channel.send({embed: {
            author: {
              name: client.user.username,
              icon_url: client.avatarURL
            },
          title: song.title,
          url: videoURL,
          color: 16711680,
          description: `${song.title} has been added to queue!`,
          thumbnail: {
            url: song.imgurl
          }
          }});
        }

            
      }
  };
  xmlhttp.open("GET", urlGet, true);
    
  xmlhttp.send();

  }

function help(msg, serverQueue) {
const helpTitle = client.user.username + " help";


  return msg.channel.send({
    "embed": {
      "title": helpTitle,
      "author": {
        "name": client.user.username,
        "icon_url": client.user.avatarURL,
      },
      "color": 16711680,
      "fields": [
        {
          "name": "!help",
          "value": "Displays this command"
        },
        {
          "name": "!play [song name or url]",
          "value": "This command will play a song. If a song is currently playing it will add it to the queue. You can type a song name or paste a link to the YouTube video."
        },
        {
          "name": "!skip",
          "value": "Will skip the current song."
        },
        {
          "name": "!stop",
          "value": "Will stop all music and delete the queue."
        },
        {
          "name": "!np",
          "value": "Displays what song is currently playing."
        },
        {
          "name": "!queue",
          "value": "Displays current queue."
        },
        {
          "name": "!volume",
          "value": "Set's the volume. Use a number between 1 and 5."
        }
      ]
    }
  });
  }

function skip(msg, serverQueue) {
if (!msg.member.voiceChannel) return msg.channel.send("You have to be in a voice channel to skip the music!");
if (!serverQueue) return msg.channel.send("There is no song that I could skip!");
serverQueue.connection.dispatcher.end(msg);
}

function stop(msg, serverQueue) {
if (!msg.member.voiceChannel) return msg.channel.send("You have to be in a voice channel to stop the music!");
serverQueue.songs = [];
serverQueue.connection.dispatcher.end(msg);
}

function volume(msg, serverQueue) {
  if (!msg.member.voiceChannel) return msg.channel.send("You have to be in a voice channel to change the volume!");
  if (!serverQueue) return msg.channel.send("There is no song playing.");
  const args = msg.content.split(" ");
  if (args[1] >= 6 || args[1] <= 0) {
    return msg.channel.send("Please select a number between 1 and 5.");
  }
  serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
  msg.channel.send("I have set the volume to" + args[1]);
  }

function np(msg, serverQueue) {
  if (!msg.member.voiceChannel) return msg.channel.send("You have to be in a voice channel to see what is currently playing!");
  if(!serverQueue) return msg.channel.send("There is currently no song playing!");
  return msg.channel.send({embed: {
    author: {
      name: client.user.username,
      icon_url: client.user.avatarURL
    },
   title: "Currnet song playing",
   color: 16711680,
   description: serverQueue.songs[0]["title"] + " is currently playing!",
   thumbnail: {
    url: serverQueue.songs["0"]["imgurl"]
   }
  }});
}


function queuemsg(msg, serverQueue) {
  if (!msg.member.voiceChannel) return msg.channel.send("You have to be in a voice channel to request the queue.");
  if(!serverQueue) return msg.channel.send("There is currently no songs in the queue!");
  return msg.channel.send({embed: {
    author: {
      name: client.user.username,
      icon_url: client.user.avatarURL
    },
   title: "Current Songs in the Queue",
   color: 16711680,
   description: showObject(serverQueue.songs),
   thumbnail: {
    url: serverQueue.songs["0"]["imgurl"]
   }
  }});
}


function showObject(obj) {
  var result = "";
  var i;
  for (i = 0; i < obj.length; i++) {
    result += obj[i]["title"] + "\n" + "\n";
  }
  return result;
}


function play(guild, song) {

const serverQueue = queue.get(guild.id);

if (!song) {
  serverQueue.voiceChannel.leave();
  queue.delete(guild.id);
  return;
  
}

const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
  .on("end", (msg) => {
    serverQueue.songs.shift();
    play(guild, serverQueue.songs[0]);
    if (!serverQueue.songs[0]) {
      return msg.channel.send("No more songs in the queue! Leaving voice channel.");

    } else {
      return msg.channel.send({embed: {
        author: {
          name: client.user.username,
          icon_url: client.user.avatarURL
        },
       title: serverQueue.songs[0]["title"],
       url: serverQueue.songs[0]["url"],
       color: 16711680,
       description: `${serverQueue.songs[0]["title"]} is now playing!`,
       thumbnail: {
        url: serverQueue.songs["0"]["imgurl"]
       }
      }});
    }
    
  })
  .on("error", (error) => {
    console.error(error);
  });
  

dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);


 }


client.login(token);