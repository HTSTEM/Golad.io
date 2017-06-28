const B64 = '0123456789:;ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')//boardstate alphabet
const B20 = 'ABCDEFGHIJKLMNOPQRST'.split('')//move position alphabet

function parseRule(rulestring){
    rules = rulestring.split('/');//split into birth and survive
    births = [];
    survive = [];
    for(var i=0; i<rules[0].length; i++){
        var num = parseInt(rules[0].charAt(i))
        if (!isNaN(num)){
            births.push(num);
        }
    }
    for(var i=0; i<rules[1].length; i++){
        var num = parseInt(rules[1].charAt(i))
        if (!isNaN(num)){
            survive.push(num)
        }
    }
    return [births,survive]
}
function stringToBoard(boardString,size){
    grid=[];
    states = [];
    counter = 0;
    for (var y=0; y<size; y++) {
        grid.push([]);
        for (var x=0; x<size; x++) {
            grid[y].push({currentState: 0, nextState: 0});//fill board
        }
    }
    for (var i=0; i<boardString.length; i++){
        var num = B64.indexOf(boardString[i])
        for (var j=2; j>=0; j--){
            var state = Math.floor(num/Math.pow(4,j))//read states into 1d array
            state %= 4
            states.push(state)
        }
    }
    for (var y=0; y<size; y++) {
        for (var x=size-1; x>=0; x--) {
            grid[y][x].currentState = states[counter];//put states onto board
            counter++;
        }
    }
    return grid;
}

function newBoard(density,size){
    var board= [];

    for (var y = 0; y < Math.floor(size/2); y++) {//half the board
        board.push([]);
        for (var x = 0; x < size; x++) {
            var val;
            var r = Math.random();
            if ((2*r) < density){
                val = 1;
            }else if (r < density){
                val = 2;
            }else{
                val = 0;
            }
            board[y].push({currentState: val, nextState: 0});
        }
    }
    for (y = 0; y < Math.ceil(size/2); y ++) {//fill other half
        board.push([]); 
    }
    for (y = 0; y < Math.floor(size/2); y++) {//rotate board
        for (x = 0; x < size; x++) {
            if (board[y][size - x - 1].currentState == 2)
                val = 1;
            else if (board[y][size - x - 1].currentState == 1)
                val = 2;
            else
                val = 0;

            board[size-y-1].push({currentState: val, nextState: 0});
        }
    }
    if (size%2==1){//odd case
        centre = []
        centFlip = []
        for(var i=0; i < Math.floor(size/2); i++){//create array
            var val;
            var r = Math.random();
            if ((2*r) < density){
                centre.push({currentState: 1, nextState: 0});
                centFlip.push({currentState: 2, nextState: 0});
            }else if (r < density){
                centre.push({currentState: 2, nextState: 0});
                centFlip.push({currentState: 1, nextState: 0});
            }else{
                centre.push({currentState: 0, nextState: 0});
                centFlip.push({currentState: 0, nextState: 0});
            }
        }
        final = centre.concat([{currentState: 0, nextState: 0}]).concat(centFlip.reverse())
        board[Math.floor(size/2)]=final
    }
    return board

}

function boardToString(board){
    var count =0;
    var value =0;
    var string = '';
    for(var x=0;x<board.length;x++){
        for(var y=board[0].length-1; y>=0; y--){//invert y axis
            count++;
            value+= board[x][y].currentState*Math.pow(4,3-count);//base 4 cellstate stuff
            if (count==3){//base 4, 64 bit alphabet, 3 cells per digit
                count=0;
                string+=B64[value];
                value = 0;
            }
        }
    }
    if(count!=0){
        string+=B64[value];
    }
    return string
}

function iterate(grid,birth,survive){
    if (typeof survive == "undefined"){
        survive = birth[1];
        birth = birth[0];
    }
    for (var x = 0; x < grid.length; x++) {
        for (var y = 0; y < grid[0].length; y++) {
            var reds = 0;
            var blues = 0;
            var total = 0;
            for(var i=-1; i<=1; i++){
                for(var j=-1; j<=1; j++){
                    try{
                        if (i==0&&j==0){
                            continue;
                        }
                        switch(grid[x+i][y+j].currentState){//continue loop if dead
                            case 0: break;
                            case 1: 
                                reds+=1;
                                total+=1;
                                break;//add to appropriate one
                            case 2: 
                                blues+=1; 
                                total+=1;
                                break;
                            default:
                                total+=1
                        }
                        //not dead, add to total
                    }catch(err){}//if out of bounds
                }
            }
            if (birth.includes(total) && grid[x][y].currentState == 0) {//birth cell
                if (reds > blues){
                    grid[x][y].nextState = 1;//red
                }else if(blues > reds){
                    grid[x][y].nextState = 2;//blue
                }else{
                    grid[x][y].nextState=3;//neutral
                }
            }
            else if (!survive.includes(total)) {
                grid[x][y].nextState = 0;
            }else{
                grid[x][y].nextState=grid[x][y].currentState;
            }
            
        }
    }
    for (var x = 0; x < grid.length; x++) {
        for (var y = 0; y < grid[0].length; y++) {
            grid[x][y].currentState=grid[x][y].nextState;          
        }
    }
    return grid;
}

function doMoves(board, moves, rules, player){//player is the player who's turn it is before any of the moves have been made
    var size = board.length-1;
    for(var i=0; i<moves.length; i++){
        if(moves[i] === ''){
            continue;
        }
        var move = moves[i].split('+')[0];
        var type = move.slice(-1);
        if(['A','B','C'].includes(type)){//kill or sacrifice
            var x = B20.indexOf(moves[i].charAt(0));
            var y = B20.indexOf(moves[i].charAt(1));
            board[x][y].currentState = 0;
        }
        else if(type === 'D'){//summon
            var x = B20.indexOf(moves[i].charAt(0));
            var y = B20.indexOf(moves[i].charAt(1));
            board[x][y].currentState = player;
        }
        else if(type === 'E'){
            board = iterate(board,rules);
            player = player%2+1;
        }
    }
    return board;
}

function countItems(array, item){
    var count = 0;
    for (var i=0; i<array.length; i++){
        if (array[i] === item){
            count++;
        }
    }
    return count;
}

function checkLegit(gamestring, board, player, move){//player is the player requesting the move
    var parts = gamestring.split(',');
    var rules = parseRule(parts[0]);
    var size = parseInt(parts[1]);
    var testBoard = stringToBoard(parts[5],size);
    var moves = parts.slice(6);
    var movesMade = countItems(moves,'E');
    var turn = movesMade%2+1;
    var type = move.slice(-1);
    var turnMoves = [];
    var turnMoveTypes = [];
    for (var i=moves.length-1; i>=0; i--){
        if (moves[i] != ''){
            if (moves[i]=='E'){
                break;
            }else{
                turnMoves.push(moves[i]);
                turnMoveTypes.push(moves[i].slice(-1))
            }
        }
    }
    turnMoves = turnMoves.reverse();
    
    if (turn!=player){
        console.log('Wrong player');
        return false
    }
    if (board.length != size || board[0].length != size){//different size than specified
        console.log('Wrong size');
        return false;
    }
    testBoard = doMoves(testBoard, moves, rules, 1);//game starts with player 1
    if (!checkEqual(testBoard,board)){//board does not represent gamestring
        console.log('Wrong board');
        return false;
    }
    if (turnMoves.length > 3){
        console.log(turnMoves);
        console.log('too many moves either way');
        return false;
    }    
    if (type === 'A'){
        if (turnMoves.length!=0){
            console.log(turnMoves);
            console.log('too many moves to kill');
            return false;
        }
        try{
            var x = B20.indexOf(move.charAt(0));
            var y = B20.indexOf(move.charAt(1));
            if (board[x][y].currentState==0){
                console.log('can\'t kill dead cell');
                return false;
            }
        }catch(err){//no coords are specified
            console.log('no coords kill');
            return false;
        }
    }else if(type === 'B'){
        if (turnMoves.length!=1 || turnMoves[0].slice(-1)!='D'){//wrong preceding moves
            console.log('need summon for 1st sacrifice');
            return false;
        }
        try{
            var x = B20.indexOf(move.charAt(0));
            var y = B20.indexOf(move.charAt(1));
            if (board[x][y].currentState!=player){//can only sacrifice self
                console.log('1st sacrafice must be self');
                return false;
            }
        }catch(err){//no coords are specified
            console.log('no coords sac 1');
            return false;
        }
    }else if(type === 'C'){
        if (turnMoves.length!=2 || 
            turnMoves[0].slice(-1)!='D' || turnMoves[1].slice(-1)!='B'){//wrong preceding moves
            console.log('must have summon and first sacrifice');
            return false;
        }
        try{
            var x = B20.indexOf(move.charAt(0));
            var y = B20.indexOf(move.charAt(1));
            if (board[x][y].currentState!=player){//can only sacrifice self
                console.log('2nd sacrifice must be self');
                return false;
            }
        }catch(err){//no coords are specified
            console.log('no coords sac 2');
            return false;
        }
    }else if(type === 'D'){
        if (turnMoves.length!=0){//wrong preceding moves
            console.log('can only sum once');
            return false;
        }
        try{
            var x = B20.indexOf(move.charAt(0));
            var y = B20.indexOf(move.charAt(1));
            if (board[x][y].currentState!=0){//can only sacrifice self
                console.log('can\'t summon non dead');
                return false;
            }
        }catch(err){//no coords are specified
            console.log('no coords sum');
            return false;
        }
    }else if(type === 'E'){
        if (turnMoves.length===3){
            if (!(turnMoveTypes.includes('B')&&turnMoveTypes.includes('C')&&turnMoveTypes.includes('D'))){
                console.log('summon not enough');
                return false;
            }
        }else if(turnMoves.length===1){
            if (!turnMoveTypes.includes('A')){
                console.log('kill not enough');
                return false;
            }
        }else{
            console.log('wrong number of moves');
            return false;
        }
    }else{
        console.log('not a move');
        return false;
    }
    return true;
}

function checkEqual(board1, board2){
    if (board1.length != board2.length){
        console.log('bad length',board1.length,board2.length);
        return false;
    }
    if (board1[0].length != board2[0].length){
        console.log('bad width')
        return false;
    }
    for (var i=0; i<board1.length; i++){
        for (var j=0; j<board1[0].length; j++){
            if (board1[i][j].currentState != board2[i][j].currentState){
                console.log('unequal cell',i,j)
                return false;
            }
        }
    }
    return true;
}

function remakeBoard(gamestring){
    var parts = gamestring.split(",");
    var rules = parseRule(parts[0]);
    var size = parseInt(parts[1]);
    var board = stringToBoard(parts[5], size);
    var moves = parts.slice(6);
    board = doMoves(board, moves, rules, 1);
    return board;
}

function tryUndo(gamestring, undo, player){
    var parts = gamestring.split(',');
    var moves = parts.slice(6);
    var index = moves.indexOf("");
    if (index!=-1){
        moves.splice(index, 1);
    }
    
    var turn = countItems(moves,'E')%2+1;
    if (turn!=player || moves.slice(-1)[0]=='E'){//move commited or move just started
        return gamestring;
    }
    
    var turnMoves = [];
    for (var i=moves.length-1; i>=0; i--){
        if (moves[i] != ''){
            if (moves[i]=='E'){
                break;
            }else{
                turnMoves.push(moves[i]);
            }
        }
    }
    turnMoves.reverse();
    moves.splice(-turnMoves.length,turnMoves.length)
    if(undo=='all'){
        turnMoves = [];
    }else if(undo.length == 2){
        for(var i=0; i<turnMoves.length; i++){
            if (turnMoves[i].slice(0,2)==undo){
                index = i;
                break;
            }
        }
        var type = turnMoves[i].slice(-1)[0];
        if (type=='A' || type=='D'){
            turnMoves = [];
        }else if(type=='C' || type=='B'){
            turnMoves.splice(index,1);
            for (var i=0; i<turnMoves.length; i++){
                if (turnMoves[i].slice(-1)[0] == 'C'){
                    turnMoves[i] = turnMoves[i].slice(0,2)+'B';
                }
            }
        }
    }

    parts = parts.slice(0,6).concat(moves).concat(turnMoves);
    return parts.join()+",";
}

try{
    module.exports.parseRule = parseRule;
    module.exports.newBoard = newBoard;
    module.exports.stringToBoard = stringToBoard;
    module.exports.boardToString = boardToString;
    module.exports.iterate = iterate;
    module.exports.checkLegit = checkLegit;
    module.exports.doMoves = doMoves;
    module.exports.tryUndo = tryUndo;
    module.exports.remakeBoard = remakeBoard;
}catch(err){}
