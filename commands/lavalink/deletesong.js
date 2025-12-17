const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletesong')
        .setDescription('Remove a song from your playlist.')
        .addStringOption(option =>
            option.setName('playlist')
                .setDescription('Playlist name.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('Song index to remove.')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;

            const playlistName = interaction.options.getString('playlist');
            const songIndex = interaction.options.getInteger('index') - 1;
            
            const playlist = await playlistCollection.findOne({ name: playlistName });
            
            if (!playlist) {
                const notFoundContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ PLAYLIST NOT FOUND**\nPlaylist **"${playlistName}"** doesn't exist.\n\nCheck the name and try again.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [notFoundContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
            
            if (playlist.owner !== userId) {
                const noPermissionContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ NO PERMISSION**\nYou can only delete songs from your own playlists.\n\nThis playlist belongs to another user.')
                    );

                const reply = await interaction.editReply({ 
                    components: [noPermissionContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
            
            if (songIndex < 0 || songIndex >= playlist.songs.length) {
                const invalidIndexContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ INVALID SONG INDEX**\nSong index must be between 1 and ${playlist.songs.length}.\n\nUse \`/viewmyplaylistsongs\` to see valid indices.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [invalidIndexContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 7000);
                return;
            }
            
            const removedSong = playlist.songs[songIndex];
            
            playlist.songs.splice(songIndex, 1);
            
            await playlistCollection.updateOne(
                { name: playlistName, owner: userId },
                { $set: { songs: playlist.songs } }
            );
            
            const deleteSongContainer = new ContainerBuilder()
                .setAccentColor(0xe74c3c)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🗑️ SONG REMOVED**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Successfully removed song from playlist!**\n\n**Removed Song:**\n${removedSong}\n\n**Playlist:** ${playlistName}\n**Remaining Songs:** ${playlist.songs.length}\n**Position:** #${songIndex + 1}`)
                );

            const reply = await interaction.editReply({ 
                components: [deleteSongContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 8000);
        } catch (error) {
            console.error('Error deleting song from playlist:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ DELETE ERROR**\nFailed to delete song from playlist.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
