var view = {
    start: function(data) {
        console.log(data);
    },
    ready_changed: function(data, player_id) {
        $ready = $('#ready');
        if (data[player_id].ready)
            $ready.text('Unready');
        else
            $ready.text('Ready!');
    },
    update: function(data) {
        console.log(data);
    }
}

$(function() {
    controller(view);

    var $ready = $('<button id="ready">Ready!</button>');
    $ready.click(function() {
        if ($ready.text() == 'Ready!')
            ready();
        else if ($ready.text() == 'Unready')
            unready();
    });
    $('body').append($ready);
});

// TODO ready button!