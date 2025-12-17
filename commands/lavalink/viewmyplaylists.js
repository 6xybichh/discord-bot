const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viewmyplaylists')
        .setDescription('View your saved playlists.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;

            const playlists = await playlistCollection.find({ owner: userId }).toArray();
            if (playlists.length === 0) {
                const noPlaylistsContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**📋 NO PLAYLISTS FOUND**\nYou haven\'t created any playlists yet.\n\nUse `/createplaylist` to create your first playlist!')
                    );

                const reply = await interaction.editReply({ 
                    components: [noPlaylistsContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }

            const playlistList = playlists.map(p => 
                `**📋 ${p.name}**\n> *${p.visibility === 'public' ? '🌍 Public' : '🔒 Private'} • ${p.songs.length} songs*`
            ).join('\n\n');

            const myPlaylistsContainer = new ContainerBuilder()
                .setAccentColor(0x3498db)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🎶 YOUR PLAYLISTS**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**You have ${playlists.length} playlist${playlists.length !== 1 ? 's' : ''}**\n\n${playlistList}`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**💡 Quick Actions:**\n• `/playplaylist` - Play a playlist\n• `/viewmyplaylistsongs` - View songs\n• `/addsong` - Add more tracks\n• `/deleteplaylist` - Remove playlist')
                );

            const reply = await interaction.editReply({ 
                components: [myPlaylistsContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 15000);
        } catch (error) {
            console.error('Error viewing playlists:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ LOAD ERROR**\nFailed to retrieve your playlists.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
