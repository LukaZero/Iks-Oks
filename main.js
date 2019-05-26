(function init() {
  const P1 = 'X';
  const P2 = 'O';
  let player;
  let game;

  const socket = io.connect('http://localhost:5000');

  class Player {
    constructor(name, type) {
      this.name = name;
      this.type = type;
      this.currentTurn = true;
      this.playsArr = 0;
    }

    static get wins() {
      return [7, 56, 448, 73, 146, 292, 273, 84];
    }

    updatePlaysArr(tileValue) {
      this.playsArr += tileValue;
    }

    getPlaysArr() {
      return this.playsArr;
    }

    setCurrentTurn(turn) {
      this.currentTurn = turn;
      const message = turn ? 'Ti si na potezu' : 'Protivnik je na potezu';
      $('#turn').text(message);
    }

    getPlayerName() {
      return this.name;
    }

    getPlayerType() {
      return this.type;
    }

    getCurrentTurn() {
      return this.currentTurn;
    }
  }

  class Game {
    constructor(roomId) {
      this.roomId = roomId;
      this.board = [];
      this.moves = 0;
    }

    createGameBoard() {
      function tileClickHandler() {
        const row = parseInt(this.id.split('_')[1][0], 10);
        const col = parseInt(this.id.split('_')[1][1], 10);
        if (!player.getCurrentTurn() || !game) {
          alert('Protivnik je na potezu!');
          return;
        }

        if ($(this).prop('disabled')) {
          alert('Polje je vec popunjeno!');
          return;
        }

        game.playTurn(this);
        game.updateBoard(player.getPlayerType(), row, col, this.id);

        player.setCurrentTurn(false);
        player.updatePlaysArr(1 << ((row * 3) + col));

        game.checkWinner();
      }

      for (let i = 0; i < 3; i++) {
        this.board.push(['', '', '']);
        for (let j = 0; j < 3; j++) {
          $(`#button_${i}${j}`).on('click', tileClickHandler);
        }
      }
    }

    displayBoard(message) {
      $('.menu').css('display', 'none');
      $('.gameBoard').css('display', 'block');
      $('#userHello').html(message);
      this.createGameBoard();
    }

    updateBoard(type, row, col, tile) {
      $(`#${tile}`).text(type).prop('disabled', true);
      this.board[row][col] = type;
      this.moves++;
    }

    getRoomId() {
      return this.roomId;
    }

    playTurn(tile) {
      const clickedTile = $(tile).attr('id');

      socket.emit('playTurn', {
        tile: clickedTile,
        room: this.getRoomId(),
      });
    }

    checkWinner() {
      const currentPlayerPositions = player.getPlaysArr();

      Player.wins.forEach((winningPosition) => {
        if ((winningPosition & currentPlayerPositions) === winningPosition) {
          game.announceWinner();
        }
      });

      const tieMessage = 'Nereseno, pokusajte ponovo!';
      if (this.checkTie()) {
        socket.emit('gameEnded', {
          room: this.getRoomId(),
          message: tieMessage,
        });
        alert(tieMessage);
        location.reload();
      }
    }

    checkTie() {
      return this.moves >= 9;
    }

    announceWinner() {
      const message = `${player.getPlayerName()} je pobednik!`;
      socket.emit('gameEnded', {
        room: this.getRoomId(),
        message,
      });
      alert(message);
      location.reload();
    }

    endGame(message) {
      alert(message);
      location.reload();
    }
  }

  $('#new').on('click', () => {
    const name = $('#nameNew').val();
    if (!name) {
      alert('Unesi ime.');
      return;
    }
    socket.emit('createGame', { name });
    player = new Player(name, P1);
  });

  $('#join').on('click', () => {
    const name = $('#nameJoin').val();
    const roomID = $('#room').val();
    if (!name || !roomID) {
      alert('Unesi ime i sifru partije.');
      return;
    }
    socket.emit('joinGame', { name, room: roomID });
    player = new Player(name, P2);
  });

  socket.on('newGame', (data) => {
    const message =
      `Zdravo, ${data.name}. Pozovite prijatelja da igra s vama! Potrebno je da unese sifru partije: 
      ${data.room}. Cekamo na drugog igraca...`;

    game = new Game(data.room);
    game.displayBoard(message);
  });

  socket.on('player1', (data) => {
    const message = `Zdravo, ${player.getPlayerName()}`;
    $('#userHello').html(message);
    player.setCurrentTurn(true);
  });

  socket.on('player2', (data) => {
    const message = `Zdravo, ${data.name}`;

    game = new Game(data.room);
    game.displayBoard(message);
    player.setCurrentTurn(false);
  });

  socket.on('turnPlayed', (data) => {
    const row = data.tile.split('_')[1][0];
    const col = data.tile.split('_')[1][1];
    const opponentType = player.getPlayerType() === P1 ? P2 : P1;

    game.updateBoard(opponentType, row, col, data.tile);
    player.setCurrentTurn(true);
  });

  socket.on('gameEnd', (data) => {
    game.endGame(data.message);
    socket.leave(data.room);
  });

  socket.on('err', (data) => {
    game.endGame(data.message);
  });
}());
