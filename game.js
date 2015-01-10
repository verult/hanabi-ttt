var _ = require('underscore');

/**
 * Constructor takes in a server-called API for client update events
 * as a dependency.
 */
module.exports = function(api) {

    ALLOWED_PLAYERS = 4;
    CARDS_PER_HAND = 4;

    var room_state = 'waiting';
    var connected_players = 0;
    var avail_player_id = 0;
    var drawing_deck, player_hands, discard_pile, play_pile;
    var turn, hint_count, fuse_count; // value equal to a player ID.

    function start_game() {
        drawing_deck = generate_deck('regular');
        player_hands = distribute_cards();
        discard_pile = CardPile();
        play_pile = CardPile();
        turn = 0;
        hint_count = 8;
        fuse_count = 3;
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

    function advance_turn() {
        if (turn == ALLOWED_PLAYERS - 1)
            turn = 0;
        else
            turn++;
    }

    /**
     * Checks if the card played is correct, i.e. belongs in the played pile
     */
    function is_play_correct(card) {
        if (card.suit in play_pile.pile)
            return play_pile.pile[card.suit]+1 == card.number;
        else
            return card.number == 1;
    }

    function draw_next_card(hand, card_id) {
        hand[card_id] = drawing_deck.shift();
    }

    return {

        /**
         * A client connects. Returns a player ID.
         */
        connect: function() {
            if (room_state == 'waiting') {
                if (++connected_players == ALLOWED_PLAYERS) {
                    room_state = 'in progress';
                    start_game();
                }
                return avail_player_id++;
            } else
                return -1;
        },

        /**
         * Handles player disconnect notifications
         */
        disconnect: function() {

        },

        discard: function(player_id, card_id) {
            if (room_state != 'in progress' || turn != player_id)
                return -1;
            if (card_id < 0 || card_id >= CARDS_PER_HAND)
                return -1;

            if (hint_count == 8) return -1;
            var hand = player_hands[player_id];
            discard_pile.add(hand[card_id]);
            draw_next_card(hand, card_id);
            hint_count++;

            advance_turn();
            // update()
        },

        hint: function(player_id, hint) {
            if (room_state != 'in progress' || turn != player_id)
                return -1;

            if (hint_count == 0) return -1;
            // broadcast hint
            hint_count--;

            advance_turn();
            // update()
        },

        play: function(player_id, card_id) {
            if (room_state != 'in progress' || turn != player_id)
                return -1;
            if (card_id < 0 || card_id >= CARDS_PER_HAND)
                return -1;

            var hand = player_hands[player_id];
            if (is_play_correct(hand[card_id])) {
                play_pile.add(hand[card_id]);
            } else {
                discard_pile.add(hand[card_id]);
                fuse_count--;
            }
            draw_next_card(hand, card_id);

            advance_turn();
            // update()
        }

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