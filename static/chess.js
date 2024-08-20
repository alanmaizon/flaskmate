document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('chess-board');
    const undoButton = document.getElementById('undo-button');
    const size = 8;
    const pieces = {
        'R': 'r', 'N': 'h', 'B': 'b', 'Q': 'q', 'K': 'k', 'P': 'p',
        'r': 't', 'n': 'j', 'b': 'n', 'q': 'w', 'k': 'l', 'p': 'o'
    };

    // This can be dynamically set based on the user, for now we hardcode
    const playerId = 1;  // Assume 1 for Player 1, 2 for Player 2

    const initialBoard = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    let board = initialBoard.map(row => row.slice());
    let moveHistory = [];
    let isPlayerTurn = true; // true for white, false for black
    let enPassantTarget = null;
    let castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };

    function renderBoard(board) {
        boardElement.innerHTML = '';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const square = document.createElement('div');
                square.className = (row + col) % 2 === 0 ? 'white' : 'black';
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.innerText = pieces[piece];
                    pieceElement.draggable = isPlayerTurn ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
                    pieceElement.dataset.piece = piece;
                    pieceElement.dataset.row = row;
                    pieceElement.dataset.col = col;
                    pieceElement.addEventListener('dragstart', handleDragStart);
                    pieceElement.addEventListener('dragend', handleDragEnd);
                    square.appendChild(pieceElement);
                }
                square.addEventListener('dragover', handleDragOver);
                square.addEventListener('drop', handleDrop);
                boardElement.appendChild(square);
            }
        }
    }

    function handleDragStart(event) {
        event.dataTransfer.setData('text/plain', JSON.stringify({
            piece: event.target.dataset.piece,
            fromRow: event.target.dataset.row,
            fromCol: event.target.dataset.col
        }));
    }

    function handleDragEnd(event) {
        // Logic to clean up after the drag, if needed
    }

    function handleDragOver(event) {
        event.preventDefault();  // Necessary to allow a drop
    }

    function handleDrop(event) {
        event.preventDefault();

        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        const fromRow = parseInt(data.fromRow);
        const fromCol = parseInt(data.fromCol);
        const toRow = parseInt(event.target.dataset.row);
        const toCol = parseInt(event.target.dataset.col);

        if (isValidMove(fromRow, fromCol, toRow, toCol, data.piece, board)) {
            // Record the move
            moveHistory.push({
                fromRow, fromCol, toRow, toCol,
                piece: data.piece,
                capturedPiece: board[toRow][toCol]
            });

            // Handle en passant capture
            if (data.piece.toLowerCase() === 'p' && enPassantTarget && toRow === enPassantTarget[0] && toCol === enPassantTarget[1]) {
                board[enPassantTarget[0] + (data.piece === 'P' ? 1 : -1)][enPassantTarget[1]] = '';
            }

            // Handle castling
            if (data.piece.toLowerCase() === 'k' && Math.abs(fromCol - toCol) === 2) {
                if (toCol === 2) {
                    // Queenside castling
                    board[toRow][0] = '';
                    board[toRow][3] = data.piece === 'K' ? 'R' : 'r';
                } else if (toCol === 6) {
                    // Kingside castling
                    board[toRow][7] = '';
                    board[toRow][5] = data.piece === 'K' ? 'R' : 'r';
                }
            }

            // Move the piece
            board[toRow][toCol] = data.piece;
            board[fromRow][fromCol] = '';

            // Handle pawn promotion
            if ((data.piece === 'P' && toRow === 0) || (data.piece === 'p' && toRow === 7)) {
                const promotionPiece = prompt('Promote to (Q, R, B, N):', 'Q');
                board[toRow][toCol] = (data.piece === 'P' ? promotionPiece.toUpperCase() : promotionPiece.toLowerCase());
            }

            // Update en passant target
            enPassantTarget = (data.piece.toLowerCase() === 'p' && Math.abs(fromRow - toRow) === 2) ? [toRow, toCol] : null;

            // Update castling rights
            if (data.piece === 'K') castlingRights.white = { kingside: false, queenside: false };
            if (data.piece === 'k') castlingRights.black = { kingside: false, queenside: false };
            if (data.piece === 'R' && fromRow === 7) {
                if (fromCol === 0) castlingRights.white.queenside = false;
                if (fromCol === 7) castlingRights.white.kingside = false;
            }
            if (data.piece === 'r' && fromRow === 0) {
                if (fromCol === 0) castlingRights.black.queenside = false;
                if (fromCol === 7) castlingRights.black.kingside = false;
            }

            // Send the move to the server with player_id
            sendMoveToServer({
                player_id: playerId,
                from_row: fromRow,
                from_col: fromCol,
                to_row: toRow,
                to_col: toCol,
                piece: data.piece
            });

            if (isCheckmate(board, !isPlayerTurn ? 'black' : 'white')) {
                alert('Checkmate!');
            } else {
                isPlayerTurn = !isPlayerTurn;
                renderBoard(board);
                if (isInCheck(board, isPlayerTurn ? 'white' : 'black')) {
                    alert('Check!');
                }
            }
        }
    }

    function sendMoveToServer(moveData) {
        fetch('/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(moveData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Move processed successfully');
            } else {
                console.error('Error processing move:', data.error);
            }
        })
        .catch(error => {
            console.error('Network error:', error);
        });
    }

    // Existing validation and helper functions (isValidMove, isValidPawnMove, etc.) remain unchanged.

    undoButton.addEventListener('click', () => {
        if (moveHistory.length > 0) {
            const lastMove = moveHistory.pop();
            board[lastMove.fromRow][lastMove.fromCol] = lastMove.piece;
            board[lastMove.toRow][lastMove.toCol] = lastMove.capturedPiece;
            isPlayerTurn = !isPlayerTurn;
            renderBoard(board);
        }
    });

    renderBoard(board);
});
