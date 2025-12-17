const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');
const { getData } = require('spotify-url-info')(fetch);
const config = require('../../config.js');

const spotifyApi = new SpotifyWebApi({
    clientId: config.spotifyClientId,
    clientSecret: config.spotifyClientSecret,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist in the voice channel.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Enter the song name or URL.')
                .setRequired(true)),

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
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const member = interaction.member;
            const { channel } = member.voice;
            const client = interaction.client;

            const checkVoiceChannel = async () => {
                if (!channel) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ VOICE CHANNEL REQUIRED**\nYou must be connected to a voice channel to use music commands.\n\nPlease join a voice channel and try again.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }
        
                const botVoiceChannel = interaction.guild.members.me?.voice.channel;
                
                if (botVoiceChannel && botVoiceChannel.id !== channel.id) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ CHANNEL CONFLICT**\nI\'m currently active in a different voice channel.\n\nPlease join the same channel or wait for the current session to end.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }
                
                const permissions = channel.permissionsFor(client.user);
                if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ INSUFFICIENT PERMISSIONS**\nI need permission to connect and speak in the voice channel.\n\nPlease check my permissions and try again.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }

                return true;
            };

            const getOrCreatePlayer = async () => {
                let player = client.riffy.players.get(guildId);
                
                if (!player) {
                    try {
                        player = await client.riffy.createConnection({
                            guildId,
                            voiceChannel: channel.id,
                            textChannel: interaction.channel.id,
                            deaf: true
                        });
                    } catch (error) {
                        console.error('Error creating player:', error);
                        
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ CONNECTION FAILED**\nUnable to connect to the voice channel.\n\nPlease try again or contact support.')
                            );

                        await interaction.editReply({ 
                            components: [errorContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        return null;
                    }
                }
                
                return player;
            };

            try {
                if (!await checkVoiceChannel()) return;
            
                const query = interaction.options.getString('query');
                const user = interaction.user;
                let player = await getOrCreatePlayer();
                if (!player) return;
        
                if (query.includes('spotify.com')) {
                    try {
                        const spotifyData = await getData(query);
                        const token = await spotifyApi.clientCredentialsGrant();
                        spotifyApi.setAccessToken(token.body.access_token);
                
                        let trackList = [];
                
                        if (spotifyData.type === 'track') {
                            const searchQuery = `${spotifyData.name} - ${spotifyData.artists.map(a => a.name).join(', ')}`;
                            trackList.push(searchQuery);
                        } else if (spotifyData.type === 'playlist') {
                            const playlistId = query.split('/playlist/')[1].split('?')[0];
                            let offset = 0;
                            const limit = 100;
                            let fetched = [];
                
                            do {
                                const data = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
                                fetched = data.body.items.filter(item => item.track).map(item =>
                                    `${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}`
                                );
                                trackList.push(...fetched);
                                offset += limit;
                            } while (fetched.length === limit);
                        }
            
                        if (trackList.length === 0) {
                            const noTracksContainer = new ContainerBuilder()
                                .setAccentColor(0xff4757)
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay.setContent('**❌ NO TRACKS FOUND**\nNo valid tracks found in this Spotify link.\n\nPlease verify the URL and try again.')
                                );

                            const reply = await interaction.editReply({ 
                                components: [noTracksContainer], 
                                flags: MessageFlags.IsComponentsV2 
                            });
                            setTimeout(() => reply.delete().catch(() => {}), 5000);
                            return;
                        }
            
                        let added = 0;
                        for (const trackQuery of trackList) {
                            const result = await client.riffy.resolve({ query: trackQuery, requester: user });
                            if (result && result.tracks && result.tracks.length > 0) {
                                const resolvedTrack = result.tracks[0];
                                resolvedTrack.requester = {
                                    id: user.id,
                                    username: user.username,
                                    avatarURL: user.displayAvatarURL()
                                };
                                player.queue.add(resolvedTrack);
                                added++;
                            }
                        }
            
                        const spotifyContainer = new ContainerBuilder()
                            .setAccentColor(0x1db954)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**🎵 SPOTIFY INTEGRATION**')
                            )
                            .addSeparatorComponents(separator => separator)
                            .addSectionComponents(
                                section => section
                                    .addTextDisplayComponents(
                                        textDisplay => textDisplay.setContent(`**${spotifyData.type === 'track' ? '🎵 Track' : '📋 Playlist'} Added Successfully**\n\nAdded **${added}** track${added !== 1 ? 's' : ''} from Spotify to the queue.\n\n**Source:** ${spotifyData.name || 'Spotify Content'}`)
                                    )
                                    .setThumbnailAccessory(
                                        thumbnail => thumbnail
                                            .setURL(user.displayAvatarURL({ dynamic: true }))
                                            .setDescription('Requested by')
                                    )
                            )
                            .addSeparatorComponents(separator => separator)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent(`**🎧 Queue Status:**\n• Tracks in Queue: **${player.queue.length}**\n• Now Playing: ${player.current ? '✅ Active' : '⏸️ Starting...'}\n• Estimated Time: ~${Math.round(added * 3.5)} minutes`)
                            );
            
                        const reply = await interaction.editReply({ 
                            components: [spotifyContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 8000);
            
                        if (!player.playing && !player.paused) player.play();
                    } catch (spotifyError) {
                        console.error('Spotify error:', spotifyError);
                        
                        const spotifyErrorContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ SPOTIFY ERROR**')
                            )
                            .addSeparatorComponents(separator => separator)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**Failed to process Spotify link**\n\nThis could be due to:\n• Invalid or private Spotify URL\n• API rate limiting\n• Spotify service issues\n• Configuration problems')
                            )
                            .addSeparatorComponents(separator => separator)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**💡 Solutions:**\n• Try a different Spotify link\n• Ensure the playlist/track is public\n• Use YouTube or direct search instead\n• Contact support if issue persists')
                            );
                        
                        const reply = await interaction.editReply({ 
                            components: [spotifyErrorContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 10000);
                        return;
                    }
                }  
            
                else if (query.includes('youtube.com') || query.includes('youtu.be')) {
                    let isPlaylist = query.includes('list=');
                    let isMix = query.includes('list=RD');
            
                    if (isMix) {
                        const mixContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ UNSUPPORTED CONTENT**\nYouTube mixes and auto-generated playlists are not supported.\n\nPlease use regular playlists, individual videos, or search queries.')
                            );
                    
                        const reply = await interaction.editReply({ 
                            components: [mixContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 5000);
                        return;
                    }
                    
                    const resolve = await client.riffy.resolve({ query, requester: user });
                    if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                        const noResultsContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ NO RESULTS FOUND**\nCouldn\'t find any tracks matching your YouTube link.\n\nPlease check the URL and try again.')
                            );

                        const reply = await interaction.editReply({ 
                            components: [noResultsContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 5000);
                        return;
                    }
                    
                    if (isPlaylist) {
                        for (const track of resolve.tracks) {
                            track.requester = {
                                id: user.id,
                                username: user.username,
                                avatarURL: user.displayAvatarURL()
                            };
                            player.queue.add(track);
                        }
            
                        const playlistContainer = new ContainerBuilder()
                            .setAccentColor(0xdc92ff)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**📋 YOUTUBE PLAYLIST ADDED**')
                            )
                            .addSeparatorComponents(separator => separator)
                            .addSectionComponents(
                                section => section
                                    .addTextDisplayComponents(
                                        textDisplay => textDisplay.setContent(`**Playlist successfully queued!**\n\nAdded **${resolve.tracks.length}** tracks from YouTube playlist.\n\n**Queue Status:**\n• Total Tracks: ${player.queue.length}\n• Estimated Duration: ~${Math.round(resolve.tracks.length * 3.5)} minutes`)
                                    )
                                    .setThumbnailAccessory(
                                        thumbnail => thumbnail
                                            .setURL(user.displayAvatarURL({ dynamic: true }))
                                            .setDescription('Requested by')
                                    )
                            );
            
                        const reply = await interaction.editReply({ 
                            components: [playlistContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 6000);
                    } else {
                        const track = resolve.tracks[0];
                        track.requester = {
                            id: user.id,
                            username: user.username,
                            avatarURL: user.displayAvatarURL()
                        };
                        player.queue.add(track);
            
                        const trackContainer = new ContainerBuilder()
                            .setAccentColor(0xdc92ff)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**🎵 TRACK ADDED TO QUEUE**')
                            )
                            .addSeparatorComponents(separator => separator)
                            .addSectionComponents(
                                section => section
                                    .addTextDisplayComponents(
                                        textDisplay => textDisplay.setContent(`**${track.info.title}**\n\nSuccessfully added to queue!\n\n**Details:**\n• Duration: ${this.formatDuration(track.info.length)}\n• Position: #${player.queue.length}\n• Source: YouTube`)
                                    )
                                    .setThumbnailAccessory(
                                        thumbnail => thumbnail
                                            .setURL(user.displayAvatarURL({ dynamic: true }))
                                            .setDescription('Requested by')
                                    )
                            );
            
                        const reply = await interaction.editReply({ 
                            components: [trackContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 6000);
                    }
            
                    if (!player.playing && !player.paused) player.play();
                }
          
                else {
                    const resolve = await client.riffy.resolve({ query, requester: user });
                    
                    if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                        const noResultsContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ NO SEARCH RESULTS**\nNo tracks found matching your search query.\n\n**💡 Tips:**\n• Try different keywords\n• Include artist name\n• Check spelling\n• Use more specific terms')
                            );
                    
                        const reply = await interaction.editReply({ 
                            components: [noResultsContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        setTimeout(() => reply.delete().catch(() => {}), 6000);
                        return;
                    }
        
                    const track = resolve.tracks[0];
                    track.requester = {
                        id: user.id,
                        username: user.username,
                        avatarURL: user.displayAvatarURL()
                    };
                    player.queue.add(track);
        
                    const searchContainer = new ContainerBuilder()
                        .setAccentColor(0xdc92ff)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**🎵 SEARCH RESULT ADDED**')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addSectionComponents(
                            section => section
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay.setContent(`**${track.info.title}**\n\nTrack found and added to queue!\n\n**Queue Info:**\n• Position: #${player.queue.length}\n• Duration: ${this.formatDuration(track.info.length)}\n• Quality: High Definition`)
                                )
                                .setThumbnailAccessory(
                                    thumbnail => thumbnail
                                        .setURL(user.displayAvatarURL({ dynamic: true }))
                                        .setDescription('Requested by')
                                )
                        );
        
                    const reply = await interaction.editReply({ 
                        components: [searchContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
        
                    if (!player.playing && !player.paused) player.play();
                }
            } catch (error) {
                console.error('Error resolving query:', error);
            
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ PLAYBACK ERROR**')
                    )
                    .addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**Something went wrong while processing your request.**\n\nThis could be due to:\n• Network connectivity issues\n• Invalid or restricted content\n• Lavalink server problems\n• Rate limiting')
                    )
                    .addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**🔧 Troubleshooting:**\n• Try a different song or URL\n• Check your internet connection\n• Wait a moment and try again\n• Contact support if issues persist\n\n*Advanced users: Check Lavalink configuration*')
                    );
            
                const reply = await interaction.editReply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 10000);
            }
        } catch (error) {
            console.error('Play command error:', error);
        }
    }
};
