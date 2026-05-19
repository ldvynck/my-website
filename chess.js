const canvas = document.getElementById("chessCanvas");
const ctx = canvas.getContext("2d");
const message = document.getElementById("chessMessage");

const boardSize = 640;
const tile = boardSize / 8;
const panelX = 690;

let selected = null;
let turn = "white";
let enPassantTarget = null;

let capturedWhite = [];
let capturedBlack = [];

let board = [
    ["br","bn","bb","bq","bk","bb","bn","br"],
    ["bp","bp","bp","bp","bp","bp","bp","bp"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["wp","wp","wp","wp","wp","wp","wp","wp"],
    ["wr","wn","wb","wq","wk","wb","wn","wr"]
];

const pieceValues = {
    p:1,
    n:3,
    b:3,
    r:5,
    q:9,
    k:0
};

const symbols = {
    wp: "P", wr: "R", wn: "Kn", wb: "B", wq: "Q", wk: "K",
    bp: "P", br: "R", bn: "Kn", bb: "B", bq: "Q", bk: "K"
};

const movedPieces = new Set();

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawBoard();
    drawPanels();
}

function drawBoard() {
    for(let r=0;r<8;r++) {
        for(let c=0;c<8;c++) {

            const x = c * tile;
            const y = r * tile;

            ctx.fillStyle = (r+c)%2===0 ? "#ffffff" : "#000000";
            ctx.fillRect(x,y,tile,tile);

            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
            ctx.strokeRect(x,y,tile,tile);

            if(selected && selected.r===r && selected.c===c) {
                ctx.strokeStyle = (r+c)%2===0 ? "#000000" : "#ffffff";
                ctx.lineWidth = 5;
                ctx.strokeRect(x+4,y+4,tile-8,tile-8);
            }

            const piece = board[r][c];

            if(piece) {
                drawPiece(piece,x+tile/2,y+tile/2);
            }
        }
    }
}

function drawPiece(piece, x, y) {
    const isWhite = piece[0] === "w";

    ctx.font = "bold 42px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = isWhite ? "#ffffff" : "#000000";
    ctx.strokeStyle = isWhite ? "#000000" : "#ffffff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isWhite ? "#000000" : "#ffffff";
    ctx.fillText(symbols[piece], x, y + 2);
}

function drawPanels() {
    const x = boardSize + 30;
    const width = canvas.width - x - 30;

    drawPlayerPanel("BLACK", capturedBlack, calculateScore("black"), x, 0, width, 90, turn === "black");
    drawPlayerPanel("WHITE", capturedWhite, calculateScore("white"), x, boardSize - 90, width, 90, turn === "white");
}

function drawPlayerPanel(name, captured, score, x, y, width, height, active) {
    ctx.fillStyle = active ? "#000000" : "#ffffff";
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = active ? "#ffffff" : "#000000";
    ctx.font = "bold 18px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(`${name}`, x + 16, y + 24);
    ctx.fillText(`score: ${score}`, x + 16, y + 52);

    ctx.font = "bold 14px Courier New";
    ctx.fillText(`captured: ${captured.map(p => symbols[p]).join(" ")}`, x + 16, y + 76);
}

function calculateScore(color) {

    const captured = color==="white" ? capturedWhite : capturedBlack;

    let total = 0;

    for(const p of captured) {
        total += pieceValues[p[1]];
    }

    return total;
}

function getSquare(event) {

    const rect = canvas.getBoundingClientRect();

    return {
        r: Math.floor((event.clientY - rect.top)/tile),
        c: Math.floor((event.clientX - rect.left)/tile)
    };
}

function pieceColor(piece) {
    if(!piece) return null;
    return piece[0]==="w" ? "white" : "black";
}

function inside(r,c) {
    return r>=0 && r<8 && c>=0 && c<8;
}

function validMove(from,to,ignoreCheck=false) {

    if(!inside(to.r,to.c)) return false;

    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];

    if(!piece) return false;

    if(pieceColor(piece)!==turn && !ignoreCheck) return false;

    if(target && pieceColor(target)===pieceColor(piece)) return false;

    const dr = to.r-from.r;
    const dc = to.c-from.c;

    const type = piece[1];

    let valid = false;

    if(type==="p") valid = validPawn(piece,from,to,dr,dc,target);
    if(type==="r") valid = (dr===0 || dc===0) && clearPath(from,to);
    if(type==="b") valid = Math.abs(dr)===Math.abs(dc) && clearPath(from,to);
    if(type==="q") valid = (dr===0 || dc===0 || Math.abs(dr)===Math.abs(dc)) && clearPath(from,to);
    if(type==="n") valid = (Math.abs(dr)===2 && Math.abs(dc)===1)||(Math.abs(dr)===1 && Math.abs(dc)===2);
    if(type==="k") valid = kingMove(piece,from,to,dr,dc);

    if(!valid) return false;

    if(ignoreCheck) return true;

    return !moveCausesCheck(from,to);
}

function validPawn(piece,from,to,dr,dc,target) {

    const dir = piece[0]==="w" ? -1 : 1;
    const start = piece[0]==="w" ? 6 : 1;

    if(dc===0 && dr===dir && !target) return true;

    if(dc===0 && from.r===start && dr===dir*2 && !target &&
       !board[from.r+dir][from.c]) {

        enPassantTarget = {
            r: from.r+dir,
            c: from.c
        };

        return true;
    }

    if(Math.abs(dc)===1 && dr===dir && target) return true;

    if(Math.abs(dc)===1 && dr===dir &&
       enPassantTarget &&
       enPassantTarget.r===to.r &&
       enPassantTarget.c===to.c) {

        return true;
    }

    return false;
}

function kingMove(piece,from,to,dr,dc) {

    if(Math.abs(dr)<=1 && Math.abs(dc)<=1) return true;

    if(dr===0 && Math.abs(dc)===2) {

        const rookCol = dc>0 ? 7 : 0;
        const rook = board[from.r][rookCol];

        if(!rook || rook[1]!=="r") return false;

        if(movedPieces.has(`${from.r}${from.c}`)) return false;
        if(movedPieces.has(`${from.r}${rookCol}`)) return false;

        const step = dc>0 ? 1 : -1;

        for(let c=from.c+step;c!==rookCol;c+=step) {
            if(board[from.r][c]) return false;
        }

        return true;
    }

    return false;
}

function clearPath(from,to) {

    const dr = Math.sign(to.r-from.r);
    const dc = Math.sign(to.c-from.c);

    let r = from.r+dr;
    let c = from.c+dc;

    while(r!==to.r || c!==to.c) {

        if(board[r][c]) return false;

        r += dr;
        c += dc;
    }

    return true;
}

function moveCausesCheck(from,to) {

    const tempFrom = board[from.r][from.c];
    const tempTo = board[to.r][to.c];

    board[to.r][to.c] = tempFrom;
    board[from.r][from.c] = null;

    const check = inCheck(turn);

    board[from.r][from.c] = tempFrom;
    board[to.r][to.c] = tempTo;

    return check;
}

function inCheck(color) {

    let kingPos = null;

    for(let r=0;r<8;r++) {
        for(let c=0;c<8;c++) {

            const p = board[r][c];

            if(p===`${color[0]}k`) {
                kingPos = {r,c};
            }
        }
    }

    for(let r=0;r<8;r++) {
        for(let c=0;c<8;c++) {

            const p = board[r][c];

            if(p && pieceColor(p)!==color) {

                if(validMove({r,c},kingPos,true)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function hasLegalMoves(color) {

    const oldTurn = turn;
    turn = color;

    for(let r=0;r<8;r++) {
        for(let c=0;c<8;c++) {

            const p = board[r][c];

            if(p && pieceColor(p)===color) {

                for(let rr=0;rr<8;rr++) {
                    for(let cc=0;cc<8;cc++) {

                        if(validMove({r,c},{r:rr,c:cc})) {
                            turn = oldTurn;
                            return true;
                        }
                    }
                }
            }
        }
    }

    turn = oldTurn;
    return false;
}

function performMove(from,to) {

    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];

    if(target) {

        if(turn==="white") capturedWhite.push(target);
        else capturedBlack.push(target);
    }

    // en passant
    if(piece[1]==="p" &&
       from.c!==to.c &&
       !target) {

        const captureRow = piece[0]==="w" ? to.r+1 : to.r-1;

        const captured = board[captureRow][to.c];

        if(captured) {

            if(turn==="white") capturedWhite.push(captured);
            else capturedBlack.push(captured);

            board[captureRow][to.c]=null;
        }
    }

    board[to.r][to.c]=piece;
    board[from.r][from.c]=null;

    movedPieces.add(`${from.r}${from.c}`);

    // castling
    if(piece[1]==="k" && Math.abs(to.c-from.c)===2) {

        if(to.c===6) {
            board[to.r][5]=board[to.r][7];
            board[to.r][7]=null;
        }

        if(to.c===2) {
            board[to.r][3]=board[to.r][0];
            board[to.r][0]=null;
        }
    }

    // promotion
    if(piece==="wp" && to.r===0) {
        board[to.r][to.c]="wq";
    }

    if(piece==="bp" && to.r===7) {
        board[to.r][to.c]="bq";
    }

    turn = turn==="white" ? "black" : "white";

    if(inCheck(turn)) {

        if(!hasLegalMoves(turn)) {
            message.textContent = `CHECKMATE`;
        } else {
            message.textContent = `${turn} in check`;
        }

    } else {

        if(!hasLegalMoves(turn)) {
            message.textContent = "STALEMATE";
        } else {
            message.textContent = `${turn} to move`;
        }
    }
}

canvas.addEventListener("click",function(event){

    const sq = getSquare(event);

    if(sq.c>=8) return;

    if(!selected) {

        const piece = board[sq.r][sq.c];

        if(piece && pieceColor(piece)===turn) {
            selected = sq;
        }

    } else {

        if(validMove(selected,sq)) {
            performMove(selected,sq);
        }

        selected = null;
    }

    draw();
});

draw();