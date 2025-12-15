const { ActivityType } = require('discord.js');

module.exports = {
  ownerId: '1160574083398914189',
  status: {
    rotateDefault: [
      { name: 'with users!', type: ActivityType.Playing },
      { name: 'on youtube', type: ActivityType.Streaming, url: 'https://cloudox-bot-v2.onrender.com/' },
      { name: '/help', type: ActivityType.Listening },
      { name: 'CloudOX.space', type: ActivityType.Watching },
      { name: '🧬Made by Scary awaz wala!', type: ActivityType.Custom },
      { name: 'market🔥', type: ActivityType.Competing },
    ],
    songStatus: true
  },
  spotifyClientId: "f71a3da30e254962965ca2a89d6f74b9",
  spotifyClientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63",
}