const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allplaylists')
        .setDescription('View all public playlists.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const playlists = await playlistCollection.find({ visibility: 'public' }).toArray();
            if (playlists.length === 0) {
                const noPublicContainer = new ContainerBuilder()
                    .setAccentColor(0xffa500)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**🌍 NO PUBLIC PLAYLISTS**\nThere are currently no public playlists available.\n\nBe the first to create and share a public playlist!')
                    );

                const reply = await interaction.editReply({ 
                    components: [noPublicContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }

            const publicList = playlists.slice(0, 20).map(p => 
                `**📋 ${p.name}**\n> *Owner: <@${p.owner}> • ${p.songs.length} songs*`
            ).join('\n\n');

            const allPlaylistsContainer = new ContainerBuilder()
                .setAccentColor(0x2ecc71)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🌍 PUBLIC PLAYLISTS**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**${playlists.length} public playlist${playlists.length !== 1 ? 's' : ''} available**\n\nAnyone can play these playlists using \`/playplaylist\``)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📋 Available Playlists:**\n\n${publicList}${playlists.length > 20 ? `\n\n*...and ${playlists.length - 20} more playlists*` : ''}`)
                );

            const reply = await interaction.editReply({ 
                components: [allPlaylistsContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 25000);
        } catch (error) {
            console.error('Error retrieving public playlists:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ LOAD ERROR**\nFailed to retrieve public playlists.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
