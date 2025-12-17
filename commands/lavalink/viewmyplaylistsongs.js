const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viewmyplaylistsongs')
        .setDescription('View songs in your playlist.')
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
        
            if (playlist.visibility === 'private' && playlist.owner !== userId) {
                const privateContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ ACCESS DENIED**\nYou don't have permission to view this private playlist.\n\nOnly the owner can view private playlist contents.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [privateContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
        
            if (playlist.songs.length === 0) {
                const emptyContainer = new ContainerBuilder()
                    .setAccentColor(0xffa500)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**📋 EMPTY PLAYLIST**\nPlaylist **"${playlistName}"** contains no songs yet.\n\nUse \`/addsong\` to add some tracks!`)
                    );

                const reply = await interaction.editReply({ 
                    components: [emptyContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
        
            const songList = playlist.songs.slice(0, 15).map((song, index) => 
                `**${index + 1}.** ${song}`
            ).join('\n');
        
            const songsContainer = new ContainerBuilder()
                .setAccentColor(0x3498db)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**🎵 SONGS IN "${playlistName.toUpperCase()}"**`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Playlist Details:**\n• Total Songs: **${playlist.songs.length}**\n• Owner: ${playlist.owner === userId ? 'You' : '<@' + playlist.owner + '>'}\n• Visibility: **${playlist.visibility === 'public' ? '🌍 Public' : '🔒 Private'}**\n• Created: ${playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString() : 'Unknown'}`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📋 Track List:**\n\n${songList}${playlist.songs.length > 15 ? `\n\n*...and ${playlist.songs.length - 15} more songs*` : ''}`)
                );
        
            const reply = await interaction.editReply({ 
                components: [songsContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 20000);
        } catch (error) {
            console.error('Error viewing playlist songs:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ LOAD ERROR**\nFailed to retrieve playlist songs.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
