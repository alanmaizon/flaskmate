from flask import Flask, render_template, session, request, jsonify

app = Flask(__name__)
app.secret_key = "Replace me with a real secret key for production use"

@app.route('/')
def index():
    if 'player1' not in session:
        session['player1'] = initialize_player_state(is_white=True)
    
    if 'player2' not in session:
        session['player2'] = initialize_player_state(is_white=False)

    return render_template('index.html')

def initialize_player_state(is_white):
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ]
    
    return {
        'board': board,
        'is_player_turn': is_white,  # White starts first
        'move_history': [],
        'en_passant_target': None,
        'castling_rights': {
            'white': {'kingside': True, 'queenside': True},
            'black': {'kingside': True, 'queenside': True}
        }
    }

@app.route('/move', methods=['POST'])
def move():
    player_id = request.json.get('player_id')
    player_key = f'player{player_id}'
    
    if player_key not in session:
        return jsonify({'success': False, 'error': 'Player not found'}), 400

    # Retrieve the current player's state
    player_state = session[player_key]
    other_player_key = 'player2' if player_key == 'player1' else 'player1'
    other_player_state = session.get(other_player_key)
    
    # Handle the move (simplified example; you'd need proper move validation here)
    move_data = request.json
    from_row = move_data['from_row']
    from_col = move_data['from_col']
    to_row = move_data['to_row']
    to_col = move_data['to_col']
    piece = move_data['piece']
    
    # Update the board for both players
    player_state['board'][to_row][to_col] = piece
    player_state['board'][from_row][from_col] = ''
    
    if other_player_state:
        other_player_state['board'] = player_state['board']

    # Update the move history and any other relevant state
    player_state['move_history'].append(move_data)
    if other_player_state:
        other_player_state['move_history'].append(move_data)

    # Update the session data
    session[player_key] = player_state
    if other_player_state:
        session[other_player_key] = other_player_state
    
    return jsonify({'success': True, 'board': player_state['board']})

if __name__ == '__main__':
    app.run(debug=True)
