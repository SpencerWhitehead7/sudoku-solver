const composeMessage = (payload, isError) => ({
  payload,
  isError,
});

self.onmessage = (e) => {
  try {
    const solved = solveSudoku(e.data);
    if (solved) {
      self.postMessage(
        composeMessage(solved, false),
        solved.map((row) => row.buffer)
      );
    } else {
      throw Error("invalid board");
    }
  } catch (e) {
    self.postMessage(composeMessage(e, true));
  }
};

const isValidSudoku = (board) => {
  const isValidUnit = (items) => {
    const hashMap = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item !== 0 && hashMap[item]) {
        return false;
      } else {
        hashMap[item] = true;
      }
    }

    return true;
  };

  for (let i = 0; i < 9; i++) {
    const row = Array(9);
    const col = Array(9);
    const box = Array(9);

    for (let j = 0; j < 9; j++) {
      row[j] = board[i][j];
      col[j] = board[j][i];
      box[j] = board[i - (i % 3) + Math.floor(j / 3)][3 * (i % 3) + (j % 3)];
    }

    if (!isValidUnit(row) || !isValidUnit(col) || !isValidUnit(box))
      return false;
  }

  return true;
};

const solveSudoku = (board) => {
  const isValidGuess = (board, candidate, rowI, colI) => {
    for (let i = 0; i < 9; i++) {
      if (board[rowI][i] === candidate) return false;
      if (board[i][colI] === candidate) return false;
      if (
        board[3 * Math.floor(rowI / 3) + Math.floor(i / 3)][
          3 * Math.floor(colI / 3) + (i % 3)
        ] === candidate
      )
        return false;
    }

    return true;
  };

  const solver = (board, n = 0) => {
    if (n === 81) return true;

    const colI = n % 9;
    const rowI = (n - colI) / 9;

    if (board[rowI][colI] !== 0) return solver(board, n + 1);

    for (let candidate = 1; candidate < 10; candidate++) {
      if (isValidGuess(board, candidate, rowI, colI)) {
        board[rowI][colI] = candidate;
        const isDone = solver(board, n + 1);
        if (isDone) return true;
        board[rowI][colI] = 0;
      }
    }

    return false;
  };

  return isValidSudoku(board) && solver(board) ? board : null;
};
