var cells = [],
    cellsList = [],
    timeout = 50,
    toToggle = [],
    started = false,
    score = 0,
    previousIterationScore = 0;
    iterationScore = 0,
    player = {},
    playerId = '',
    cellSize = 10,
    input = {
        size: 100,
        alive: [[2,3], [5,6], [5,7], [6,5], [10, 10], [11, 10], [12, 10],
                [15, 20], [16, 21], [16, 22], [15, 22], [14, 22],
                [40, 40], [41, 40], [41, 41], [40, 41],
                [60, 50], [60, 51], [61, 51], [62, 51], [61, 52]]
    };

var createNewPlayer = function() {
    for (var i=1; i<1000; i++) {
        if (!Players.find({name: 'Anonymous ' +  i}).count()) {
            score = 0;
            player = {name: 'Anonymous ' + i, score: 0, lastUpdated: Date.now() };
            playerId = Players.insert(player);
            SessionAmplify.set('playerId', playerId);
            break;
        }
    }
}

Meteor.startup(function() {
    Meteor.subscribe('players', function() {
        playerId = SessionAmplify.get('playerId');
        if (playerId) {
            score = Players.findOne({_id: playerId}).score;
        } else {
            createNewPlayer();
        }
    });

    Meteor.subscribe('player', SessionAmplify.get('playerId'));
});

$(document).ready(function() {

    // do setup
    var canvas = $("canvas")[0];
    var context = canvas.getContext("2d");

    var setup = function() {
        canvas.width = cellSize * input.size;
        canvas.height = cellSize * input.size;

        function renderGrid(gridPixelSize, color)
        {
            context.save();
            context.lineWidth = 1;
            context.strokeStyle = '#000';

            // horizontal grid lines
            for(var i = 0; i <= input.size; i++)
            {
                context.beginPath();
                context.moveTo(0, i*gridPixelSize);
                context.lineTo(input.size*gridPixelSize, i*gridPixelSize);
                context.stroke();
                context.closePath();
            }

            // vertical grid lines
            for(var j = 0; j <= input.size; j++)
            {
                context.beginPath();
                context.moveTo(j*gridPixelSize, 0);
                context.lineTo(j*gridPixelSize, input.size*gridPixelSize);
                context.stroke();
                context.closePath();
            }

            context.restore();
        }

        renderGrid(cellSize, "red");

        _.each(_.range(input.size), function(row_index) {
            cells[row_index] = [];
            _.each(_.range(input.size), function(col_index) {
                var isAlive = input.alive.filter(function(alive) { return alive[0] == row_index && alive[1] == col_index } ).length > 0;
                cells[row_index][col_index] = (isAlive ? 1 : 0);
                if (isAlive) {
                    context.moveTo(0, 0)
                    context.rect(col_index*cellSize, row_index*cellSize, cellSize, cellSize);
                    context.fillStyle = "black";
                    context.fill();
                }
                cellsList.push({
                    row: row_index,
                    col: col_index
                });
            });
        });
    }
    setup();

    var toggleState = function(args, next) {
        var row = args[0], col = args[1];
        cells[row][col] = Number(!cells[row][col]);

        if (!!cells[row][col])
            color = "black";
        else
            color = "white";

        context.moveTo(0, 0)
        context.rect(col*cellSize, row*cellSize, cellSize, cellSize);
        context.fillStyle = color;
        context.fill();

        if (next) next();
    }

    var getState = function(row, col) {
        return !!cells[row] ? !!cells[row][col] ? 1 : 0 : 0;
    };

    var checkRules = function(row, col, next) {
        var score =  getState(row-1, col-1) + getState(row-1, col) + getState(row-1, col+1)
                   + getState(row, col-1) + getState(row, col+1)
                   + getState(row+1, col-1) + getState(row+1, col) + getState(row+1, col+1);

        if (!!cells[row][col]) {
            // live cell
            if (score < 2 || score > 3) {
                // dies by under population or over population
                toToggle.push([row, col]);
            }
        } else {
            if (score == 3) {
                // lives by reproduction
                toToggle.push([row, col]);
            }
        }
        iterationScore += score;
        if (next) next();
    }

    // start game
    var iterate =  function() {
        toToggle = [];
        iterationScore = 0;
        async.each(cellsList, function(cellList, next) {
            checkRules(cellList.row, cellList.col, next);
        }, function(err) {
            var currentScore = (iterationScore - previousIterationScore) / (input.size*input.size) * 100;
            if (currentScore > 0) score += currentScore;
            previousIterationScore = iterationScore;
            async.each(toToggle, toggleState, function(err) {
                Players.update({_id: playerId}, {$set: { score: Math.round(score), lastUpdated: Date.now() }});
                if (started) {
                    setTimeout(iterate, timeout);
                }
            });
        });
    }

    $('#start').on('click', function() {
        if (!started) {
            started = true;
            iterate();
            $(this).text('Stop');
        } else {
            started = false;
            $(this).text('Start');
        }
    });

    $('#newPlayer').on('click', function() {
        createNewPlayer();
    });

    var toggleCell = function(td) {
        var row = Number(td.attr('loc').split(',')[0]);
        var col = Number(td.attr('loc').split(',')[1]);
        toggleState([row, col]);
    }

    $('#reset').on('click', function() {
        started = false;
        $('#start').text('Start');
        $('td.alive').each(function(e) {
            toggleCell($(this));
        });
    });

    $('td').on('click', function(e) {
        if (!started) {
            toggleCell($(e.target));
        }
    });

    $('#facebook').on('click', function() {
        FB.ui(
            {
                method: 'feed',
                name: 'Conway\'s game of life',
                caption: 'I scored '+ Math.round(score) + ' points on Conway\'s Game of Life!',
                description: 'Dare you to beat my score :P',
                link: 'http://gameoflife.ramseydsilva.com'
            }
        );
    });
});
