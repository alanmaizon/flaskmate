document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('chess-board');
    const undoButton = document.getElementById('undo-button');
    const size = 8;
    const pieces = {
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟'
    };

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

    function isValidMove(fromRow, fromCol, toRow, toCol, piece, board) {
        if (fromRow === toRow && fromCol === toCol) return false;
        if (toRow < 0 || toRow >= size || toCol < 0 || toCol >= size) return false;

        const targetSquare = board[toRow][toCol];
        if (targetSquare && (piece === piece.toUpperCase()) === (targetSquare === targetSquare.toUpperCase())) return false;

        const direction = piece === piece.toUpperCase() ? -1 : 1; // White moves up (-1), black moves down (1)
        switch (piece.toLowerCase()) {
            case 'p': return isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board, direction);
            case 'r': return isValidRookMove(fromRow, fromCol, toRow, toCol, board);
            case 'n': return isValidKnightMove(fromRow, fromCol, toRow, toCol);
            case 'b': return isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
            case 'q': return isValidQueenMove(fromRow, fromCol, toRow, toCol, board);
            case 'k': return isValidKingMove(fromRow, fromCol, toRow, toCol, board);
            default: return false;
        }
    }

    function isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board, direction) {
        // En passant capture
        if (enPassantTarget && enPassantTarget[0] === toRow && enPassantTarget[1] === toCol) {
            return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, piece, board);
        }
        const startRow = piece === 'P' ? 6 : 1;
        if (fromCol === toCol) {
            if (board[toRow][toCol] === '' && (toRow === fromRow + direction || (fromRow === startRow && toRow === fromRow + 2 * direction && board[fromRow + direction][fromCol] === ''))) {
                return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, piece, board);
            }
        } else if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction && board[toRow][toCol] !== '' && (piece === piece.toUpperCase()) !== (board[toRow][toCol] === board[toRow][toCol].toUpperCase())) {
            return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, piece, board);
        }
        return false;
    }

    function isValidRookMove(fromRow, fromCol, toRow, toCol, board) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        if (isPathClear(fromRow, fromCol, toRow, toCol, board)) {
            return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, 'R', board);
        }
        return false;
    }

    function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);
        return (rowDiff === 2 && colDiff === 1 || rowDiff === 1 && colDiff === 2) && !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, 'N', board);
    }

    function isValidBishopMove(fromRow, fromCol, toRow, toCol, board) {
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        if (isPathClear(fromRow, fromCol, toRow, toCol, board)) {
            return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, 'B', board);
        }
        return false;
    }

    function isValidQueenMove(fromRow, fromCol, toRow, toCol, board) {
        return isValidRookMove(fromRow, fromCol, toRow, toCol, board) || isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
    }

    function isValidKingMove(fromRow, fromCol, toRow, toCol, board) {
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);
        if (rowDiff <= 1 && colDiff <= 1) {
            if (!isSquareAttacked(board, toRow, toCol, isPlayerTurn ? 'black' : 'white')) {
                return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, 'K', board);
            }
        }
        if (fromRow === toRow && rowDiff === 0 && colDiff === 2) {
            // Castling
            if (isPlayerTurn && (fromRow === 7 && (castlingRights.white.kingside || castlingRights.white.queenside)) ||
                !isPlayerTurn && (fromRow === 0 && (castlingRights.black.kingside || castlingRights.black.queenside))) {
                if (colDiff === 2 && isPathClear(fromRow, fromCol, toRow, toCol, board)) {
                    return !moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, 'K', board);
                }
            }
        }
        return false;
    }

    function isPathClear(fromRow, fromCol, toRow, toCol, board) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
        const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
        for (let i = 1; i < Math.max(Math.abs(rowDiff), Math.abs(colDiff)); i++) {
            if (board[fromRow + i * rowStep][fromCol + i * colStep] !== '') return false;
        }
        return true;
    }

    function moveLeavesKingInCheck(fromRow, fromCol, toRow, toCol, piece, board) {
        const tempBoard = board.map(row => row.slice());
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = '';
        return isInCheck(tempBoard, piece.toUpperCase() === piece ? 'white' : 'black');
    }

    function isInCheck(board, playerColor) {
        const king = playerColor === 'white' ? 'K' : 'k';
        let kingPosition;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === king) {
                    kingPosition = [row, col];
                    break;
                }
            }
            if (kingPosition) break;
        }
        if (!kingPosition) return true;
        return isSquareAttacked(board, kingPosition[0], kingPosition[1], playerColor === 'white' ? 'black' : 'white');
    }

    function isSquareAttacked(board, row, col, attackingColor) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const piece = board[r][c];
                if (piece && (piece === piece.toUpperCase()) === (attackingColor === 'white') && isValidMove(r, c, row, col, piece, board)) {
                    return true;
                }
            }
        }
        return false;
    }

    function isCheckmate(board, playerColor) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const piece = board[row][col];
                if (piece && (piece === piece.toUpperCase()) === (playerColor === 'white')) {
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            if (isValidMove(row, col, r, c, piece, board)) {
                                const tempBoard = board.map(row => row.slice());
                                tempBoard[r][c] = piece;
                                tempBoard[row][col] = '';
                                if (!isInCheck(tempBoard, playerColor)) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

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
