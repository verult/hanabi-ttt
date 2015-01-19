var socket;
var player_id;

function controller(view) {
    socket = io();
    
    socket.on('connected', function(data) {
        player_id = data.player_id;
    });

    socket.on('start', view.start);
    socket.on('ready_changed', function(data) {
        view.ready_changed(data, player_id);
    });
    socket.on('update', view.update);
    socket.on('hint_update', view.hint_update);
    socket.on('end', view.end)
}

function ready() {
    socket.emit('ready', { player_id: player_id });
}

function unready() {
    socket.emit('unready', { player_id: player_id });
}

function discard(card_id) {
    socket.emit('discard', { player_id: player_id, card_id: card_id });
}

function hint(hint_msg) {
    socket.emit('hint', { player_id: player_id, hint: hint_msg });
}

function play(card_id) {
    socket.emit('play', { player_id: player_id, card_id: card_id });
}