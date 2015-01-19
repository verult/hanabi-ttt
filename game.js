var _ = require('underscore');

/**
 * Constructor takes in a server-called API for client update events
 * as a dependency.
 */
module.exports = function(api) {

    ALLOWED_PLAYERS = 4;
    CARDS_PER_HAND = 4;
    NUM_SUITS = 5;

    var room_state = 'waiting'; // waiting, in progress, end

    /* Connection states */
    var players = {};
    var avail_player_id = 0;
    var ready_count = 0;

    /* Game progression states */
    var drawing_deck, player_hands, discard_pile, play_pile;
    var turn; // incremented every time a player completes an action.
              // Math.floor(turn / ALLOWED_PLAYERS) = # of turn loops
              // turn % ALLOWED_PLAYERS = id of the player at the current turn.
    var hint_count, fuse_count; // value equal to a player ID.
    var completed_suits;

    /* Game ending states */
    var ending_player;
    var score;

    function start_game() {
        // Reset "waiting" states
        ready_count = 0;
        for (var player_id in players)
            players[player_id].ready = false;

        // Initialize "in progress" states
        room_state = 'in progress';
        drawing_deck = generate_deck('regular');
        player_hands = distribute_cards();
        discard_pile = CardPile();
        play_pile = CardPile();
        turn = 0;
        hint_count = 8;
        fuse_count = 3;
        completed_suits = [];
        ending_player = -1;
        score = 0;

        // Signal clients that game has started.
        var all_data = {};
        for (var player_id in players) {
            all_data[player_id] = to_json(player_id);
        }
        api.start(all_data);
    }

    /**
     * Returns a shuffled deck of Hanabi cards.
     * play_level is either 'regular' (no multicolor suit)
     * or 'advanced' (with multicolor suit)

     * Each card is an object with suit and number attributes.
     */
    function generate_deck(play_level) {
        // Create all cards
        var cards = [];
        var suits = ['red', 'green', 'yellow', 'blue', 'white'];
        var numbers = [1,1,1,2,2,3,3,4,4,5];
        for (var i = 0; i < suits.length; i++)
            for (var j = 0; j < numbers.length; j++)
                cards[i*numbers.length+j] = { suit: suits[i], number: numbers[j] };

        // Shuffle
        return _.shuffle(cards);
    }

    function distribute_cards() {
        // First draws all of first player's cards, then all of next players,
        // and so on.
        // But, card draw is done asynchronously, so the above cannot always be
        // guaranteed.
        // WARNING: this assumes that Array.shift() is thread-safe.
        // In the rare occasion that two iterations try to shift at the same
        // time, this would be a problem.
        var hands = {}
        for (var i = 0; i < ALLOWED_PLAYERS; i++) {
            hands[i] = [];
            for (var j = 0; j < CARDS_PER_HAND; j++)
                hands[i][j] = drawing_deck.shift();
        }
        return hands;
    }

    /**
     * Checks if the card played is correct, i.e. belongs in the played pile
     */
    function is_play_correct(card) {
        if (card.suit in play_pile.pile) {
            var pile = play_pile.pile[card.suit];
            return pile[pile.length-1]+1 == card.number;
        } else
            return card.number == 1;
    }

    /**
     * When the last card is drawn, a call to this function will not draw
     * another card, and when the last player who drew the last card tries to
     * draw again, the game ends.
     */
    function draw_next_card(hand, card_id) {
        if (ending_player == -1) {
            hand[card_id] = drawing_deck.shift();
            if (drawing_deck.length == 0)
                ending_player = turn % ALLOWED_PLAYERS;
        } else if (turn % ALLOWED_PLAYERS == ending_player)
            // Ending condition 2:
            // Drawing deck empty, player who draws card last gets to play
            // one more turn.
            end_game();
    }

    function update() {
        var all_data = {};
        for (var player_id in players) {
            all_data[player_id] = to_json(player_id);
        }
        api.update(all_data);
    }

    function end_game() {
        room_state = 'end';

        // Count score
        score = _.reduce(play_pile.pile, function(memo, pile, suit) {
            return memo + pile[pile.length-1];
        }, 0);

        api.end(to_json());
    }

    // Experiment: pass objects as they are instead of stringifying them.
    function to_json(player_id) {
        if (room_state == 'in progress') {
            var hands = {};

            for (var i = 0; i < ALLOWED_PLAYERS; i++)
                hands[i] = player_hands[i];
            if (player_id != undefined)
                // TODO: what if the given player_id is not valid?
                delete hands[player_id];

            return {
                visible_hands: hands,
                discard: discard_pile.pile,
                play: play_pile.pile,
                hint_count: hint_count,
                fuse_count: fuse_count,
                turn_count: Math.floor(turn / ALLOWED_PLAYERS),
                player_turn: turn % ALLOWED_PLAYERS
            }
        } else if (room_state == 'end') {
            return {
                all_hands: player_hands,
                discard: discard_pile.pile,
                play: play_pile.pile,
                hint_count: hint_count,
                fuse_count: fuse_count,
                turn_count: Math.floor((turn - 1) / ALLOWED_PLAYERS),
                score: score
            }
        } else { // room_state == 'waiting'
            return players;
        }
    }

    return {

        /**
         * A client connects. Returns a player ID.
         */
        connect: function() {
            if (room_state == 'waiting' && 
                _.size(players) < ALLOWED_PLAYERS) {
                var new_id = avail_player_id;
                players[new_id] = {
                    ready: false
                };
                avail_player_id++;
                return new_id;
            } else
                return -1;
        },

        /**
         * Handles player disconnect notifications
         */
        disconnect: function() {

        },

        ready: function(player_id) {
            if (player_id in players) {
                players[player_id].ready = true;
                ready_count++;
                api.ready_changed(to_json());
                if (ready_count == ALLOWED_PLAYERS)
                    start_game();
            } else 
                return -1;
        },

        unready: function(player_id) {
            if (player_id in players) {
                players[player_id].ready = false;
                ready_count--;
                api.ready_changed(to_json());
            } else
                return -1;
        },

        discard: function(player_id, card_id) {
            if (room_state != 'in progress' || 
                turn % ALLOWED_PLAYERS != player_id)
                return -1;
            if (card_id < 0 || card_id >= CARDS_PER_HAND)
                return -1;

            if (hint_count == 8) return -1;
            var hand = player_hands[player_id];
            discard_pile.add(hand[card_id]);
            draw_next_card(hand, card_id);
            hint_count++;

            turn++;

            update();
        },

        hint: function(player_id, hint) {
            if (room_state != 'in progress' || 
                turn % ALLOWED_PLAYERS != player_id)
                return -1;

            if (hint_count == 0) return -1;
            // broadcast hint
            hint_count--;

            turn++;

            api.hint_update(player_id, hint);
            update();
        },

        play: function(player_id, card_id) {
            if (room_state != 'in progress' || 
                turn % ALLOWED_PLAYERS != player_id)
                return -1;
            if (card_id < 0 || card_id >= CARDS_PER_HAND)
                return -1;

            var hand = player_hands[player_id];
            var card = hand[card_id];
            if (is_play_correct(card)) {
                play_pile.add(card);
                if (card.number == 5) {
                    completed_suits.push(card.suit);
                    if (completed_suits.length == NUM_SUITS) {
                        // Ending condition 3:
                        // All fireworks are complete.
                        end_game();
                        return;
                    }
                    if (hint_count < 8)
                        hint_count++;
                }
            } else {
                discard_pile.add(hand[card_id]);
                fuse_count--;
                if (fuse_count == 0)
                    // Ending condition 1:
                    // Fuse is completely burnt up.
                    end_game();
            }
            draw_next_card(hand, card_id);

            turn++;

            update();
        },

        /**
         * player_id specifies which player's perspective to return,
         * i.e. all player hands are returned except the player's.
         *
         * Can only be called when the game is in progress.
         */
        json: to_json

    };
}

var CardPile = function() {

    /**
     * Adds the given number to the pile, keeping the pile sorted in ascending
     * order.
     */
    function add_in_order(colorpile, number) {
        var i;
        for (i = 0; colorpile[i] < number; i++);
        colorpile.splice(i, 0, number);
    }

    return {
        pile: {},

        add: function(card) {
            if (card.suit in this.pile)
                add_in_order(this.pile[card.suit], card.number);
            else
                this.pile[card.suit] = [card.number];
        }
    }
}