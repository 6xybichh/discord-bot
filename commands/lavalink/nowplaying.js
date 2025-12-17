const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Get information about the currently playing song.'),

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guild.id;
            const client = interaction.client;

            const checkPlayerExists = async () => {
                const player = client.riffy.players.get(guildId);
                
                if (!player) {
                    const noPlayerContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ NO ACTIVE PLAYER**')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('There is no active music player in this server.\n\n**💡 Quick Fix:**\nUse `/play` to start playing music and initialize the player.')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**🎵 Get Started:**\n• Join a voice channel\n• Use `/play <song name>` to begin\n• Enjoy high-quality audio streaming')
                        );
                
                    const reply = await interaction.editReply({ 
                        components: [noPlayerContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
                    return false;
                }
                
                return player;
            };

            const player = await checkPlayerExists();
            if (!player) return;
            
            const currentTrack = player.current;
            if (!currentTrack) {
                const noTrackContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ NO TRACK PLAYING**\nNo track is currently active.\n\nUse `/play` to start playing music.')
                    );

                const reply = await interaction.editReply({ 
                    components: [noTrackContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }
            
            const nowPlayingContainer = new ContainerBuilder()
                .setAccentColor(0xdc92ff)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🎵 NOW PLAYING**')
                )
                .addSeparatorComponents(separator => separator)
                .addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**${currentTrack.info.title}**\n\n${currentTrack.info.uri ? `**🔗 [Listen on Platform](${currentTrack.info.uri})**` : ''}\n\n**Track Details:**\n• Duration: ${this.formatDuration(currentTrack.info.length)}\n• Position: ${this.formatDuration(player.position)} / ${this.formatDuration(currentTrack.info.length)}\n• Volume: ${player.volume}%\n• Loop: ${player.loop || 'None'}\n\n**Requested by:** ${currentTrack.requester?.username || 'Unknown'}`)
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                                .setURL(currentTrack.info.artwork || currentTrack.requester?.avatarURL || 'https://via.placeholder.com/300x300')
                                .setDescription('Now Playing')
                        )
                );
            
            const reply = await interaction.editReply({ 
                components: [nowPlayingContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 12000);
        } catch (error) {
            console.error('Now playing command error:', error);
        }
    }
};
