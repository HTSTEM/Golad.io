const B64 = '0123456789:;ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')//boardstate alphabet
const B20 = 'ABCDEFGHIJKLMNOPQRST'.split('')//move position alphabet

function parseRule(rulestring){
    rules = rulestring.split('/');//split into birth and survive
    births = [];
    survive = [];
    for(var i=0; i<rules[0].length; i++){
        var num = parseInt(rules[0].charAt(i))
        if (num!=NaN){
            births.push(num)
        }
    }
    for(var i=0; i<rules[1].length; i++){
        var num = parseInt(rules[1].charAt(i))
        if (num!=NaN){
            survive.push(num)
        }
    }
    return [births,survive]
}
function stringToBoard(boardString){
    grid=[];
    states = [];
    counter = 0;
    for (var y=0; y<GRID_HEIGHT; y++) {
        grid.push([]);
        for (var x=0; x<GRID_WIDTH; x++) {
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
    for (var y=0; y<GRID_HEIGHT; y++) {
        for (var x=GRID_WIDTH-1; x>=0; x--) {
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

function iterate(grid,birth,survive){//UNTESTED
    if (typeof survive == "undefined"){
        survive = birth[1];
        birth = birth[0];
    }
    for (var x = 0; x < board.length; x++) {
        for (var y = 0; y < board[0].length; y++) {
            var reds = 0;
            var blues = 0;
            var total = 0;
            for(var i=-1; i<=1; i++){
                for(var j=-1; j<=1; j++){
                    try{
                        if (i==0&&j==0){
                            continue;
                        }
                        switch(board[x+i][y+j].currentState){//continue loop if dead
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
    for (var x = 0; x < board.length; x++) {
        for (var y = 0; y < board[0].length; y++) {
            grid[x][y].currentState=grid[x][y].nextState  ;          
        }
    }
    return grid;
}
try{
    module.exports.parseRule = parseRule;
    module.exports.newBoard = newBoard;
    module.exports.stringToBoard = stringToBoard;
    module.exports.boardToString = boardToString;
    module.exports.iterate = iterate;
}catch(err){}
