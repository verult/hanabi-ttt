/**
 * The receiver interface for client-triggered events.
 * Interacts with the game object to update game state.
 */

module.exports = function(io, player_sockets, H) {

    io.on('connection', function(socket) {
        var player_id = H.connect();
        player_sockets[player_id] = socket;
        console.log('Player connected with id ' + player_id);
        socket.emit('connected', { player_id: player_id });

        socket.on('ready', function(data) {
            H.ready(data.player_id);
        });

        socket.on('unready', function(data) {
            H.unready(data.player_id);
        });

        socket.on('discard', function(data) {
            H.discard(data.player_id, data.card_id);
        });

        socket.on('hint', function(data) {
            H.hint(data.player_id, data.hint);
        });

        socket.on('play', function(data) {
            H.play(data.player_id, data.card_id);
        });
    });

}