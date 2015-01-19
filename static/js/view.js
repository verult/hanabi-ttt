var view = {
    start: function(data) {
        $('#start-panel').hide();
        $('#in-progress-panel').show();
        console.log(data);
    },
    ready_changed: function(data, player_id) {
        $ready = $('#ready-btn');
        if (data[player_id].ready)
            $ready.text('Unready');
        else
            $ready.text('Ready!');
    },
    update: function(data) {
        console.log(data);
    },
    hint_update: function(data) {
        console.log('Hint from '+data.from+": "+data.hint_msg);
    },
    end: function(data) {
        console.log('Game over!');
        console.log(data);
    }
}

function view_init() {
    $('#in-progress-panel').hide();
    $('#end-panel').hide();
}

$(function() {
    view_init();
    controller(view);

    var $ready = $('#ready-btn');
    $ready.click(function() {
        if ($ready.text() == 'Ready!')
            ready();
        else if ($ready.text() == 'Unready')
            unready();
    });
});