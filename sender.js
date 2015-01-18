/**
 * The sender interface for transmitting server updates to clients.
 */

module.exports = function(io, player_sockets) {

    return {
        /**
         * Signal from the game that it's ready to start.
         */
        start: function(all_data) {
            for (var player_id in all_data) {
                player_sockets[player_id].emit('start', all_data[player_id]);
            }
        },

        ready_changed: function(ready_data) {
            for (var player_id in player_sockets) {
                player_sockets[player_id].emit('ready_changed', ready_data);
            }
        },

        update: function(all_data) {
            for (var player_id in all_data) {
                player_sockets[player_id].emit('update', all_data[player_id]);
            }
        }
    }
};