const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addsong')
        .setDescription('Add a song to a playlist.')
        .addStringOption(option =>
            option.setName('playlist')
                .setDescription('The playlist name.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Enter song name or URL.')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;

            const playlistName = interaction.options.getString('playlist');
            const songInput = interaction.options.getString('song');
        
            const playlist = await playlistCollection.findOne({ name: playlistName });
        
            if (!playlist) {
                const notFoundContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ PLAYLIST NOT FOUND**\nPlaylist **"${playlistName}"** doesn't exist.\n\nUse \`/viewmyplaylists\` to see available playlists.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [notFoundContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
        
            if (playlist.owner !== userId && playlist.visibility === 'private') {
                const noPermissionContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ ACCESS DENIED**\nYou don't have permission to add songs to this private playlist.\n\nOnly the owner can modify private playlists.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [noPermissionContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 7000);
                return;
            }
        
            await playlistCollection.updateOne(
                { name: playlistName },
                { 
                    $push: { songs: songInput },
                    $set: { updatedAt: new Date() }
                }
            );
        
            const addSongContainer = new ContainerBuilder()
                .setAccentColor(0x2ecc71)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**➕ SONG ADDED**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Successfully added to playlist!**\n\n**Song:** ${songInput}\n**Playlist:** ${playlistName}\n**Total Songs:** ${playlist.songs.length + 1}\n**Added by:** ${interaction.user.username}\n\n**Quick Actions:**\n• \`/playplaylist\` - Play this playlist\n• \`/viewmyplaylistsongs\` - View all songs`)
                );

            const reply = await interaction.editReply({ 
                components: [addSongContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 10000);
        } catch (error) {
            console.error('Error adding song to playlist:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ ADD ERROR**\nFailed to add song to playlist.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
