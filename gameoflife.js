Players = new Meteor.Collection('players');
var currentPlayerId = '';

if (Meteor.isClient) {
    SessionAmplify = _.extend({}, Session, {
      keys: _.object(_.map(amplify.store(), function(value, key) {
        return [key, JSON.stringify(value)]
      })),
      set: function (key, value) {
        Session.set.apply(this, arguments);
        amplify.store(key, value);
      }
    });


    Template.leaderboard.players = function() {
        return Players.find({}, {sort: {'score': -1}});
    }
    Template.player_controls.player = function() {
        return Players.findOne({_id: SessionAmplify.get('playerId')});
    }
    Template.player_controls.events({
        'keypress input, keyup input, keydown input, blur input, focus input': function(event) {
            var name = $(event.target).val();
            if (!Players.find({name: name, _id: {$ne: SessionAmplify.get('playerId')}}).count()) {
                $(event.target).removeClass('error');
                Players.update({_id: SessionAmplify.get('playerId')}, {$set: {name: name}});
            } else {
                $(event.target).addClass('error');
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.publish("players", function() {
        var topPlayersArray = [];
        Players.find({}, {sort: {'score': -1}, limit: 20}).forEach(function(player) {
            topPlayersArray.push(player._id);
        });
        Players.remove({lastUpdated: {$lte: Date.now() - (60*1000)}, _id: {$nin: topPlayersArray}});
        return Players.find({}, {sort: {'score': -1}});
    });

    Meteor.publish("player", function(playerId) {
        currentPlayerId = playerId;
        this._session.socket.on("close", Meteor.bindEnvironment(function() {
            // socket disconnected
        }));
    });
}
