const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteplaylist')
        .setDescription('Delete your playlist.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Playlist name.')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;

            const playlistName = interaction.options.getString('name');
            
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
                        textDisplay => textDisplay.setContent('**❌ NO PERMISSION**\nYou can only delete your own playlists.\n\nThis playlist belongs to another user.')
                    );

                const reply = await interaction.editReply({ 
                    components: [noPermissionContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
            
            await playlistCollection.deleteOne({ name: playlistName, owner: userId });
            
            const deletePlaylistContainer = new ContainerBuilder()
                .setAccentColor(0xe74c3c)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🗑️ PLAYLIST DELETED**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Playlist permanently removed!**\n\n**Deleted:** ${playlistName}\n**Songs Lost:** ${playlist.songs.length}\n**Type:** ${playlist.visibility} playlist\n\n**⚠️ This action cannot be undone.**\n\nYou can create a new playlist with the same name if needed.`)
                );

            const reply = await interaction.editReply({ 
                components: [deletePlaylistContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 10000);
        } catch (error) {
            console.error('Error deleting playlist:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ DELETE ERROR**\nFailed to delete playlist.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
