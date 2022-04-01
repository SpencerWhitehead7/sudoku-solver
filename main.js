window.onload = () => {
  const DOM = {
    FORM: document.getElementById("solver"),
    INPUT: document.getElementById("boardInput"),
    CELLS: new Array(9).fill().map(() => new Array(9)),
    SUBMIT_BTN: document.getElementById("submitBtn"),
  };

  const BOARD = new Array(9).fill().map(() => new Uint8Array(9));

  for (let rowI = 0; rowI < 9; rowI++) {
    for (let colI = 0; colI < 9; colI++) {
      const input = document.createElement("input");
      input.setAttribute("name", `row: ${rowI + 1} col: ${colI + 1}`);
      input.setAttribute("type", "number");
      input.setAttribute("min", 1);
      input.setAttribute("max", 9);
      input.setAttribute("data-row_i", rowI);
      input.setAttribute("data-col_i", colI);

      DOM.INPUT.append(input);
      DOM.CELLS[rowI][colI] = input;
    }
  }

  DOM.FORM.onchange = (e) => {
    e.preventDefault();
    BOARD[e.target.dataset.row_i][e.target.dataset.col_i] = e.target.value;
  };

  DOM.FORM.onsubmit = (e) => {
    e.preventDefault();
    DOM.SUBMIT_BTN.disabled = true;

    const start = performance.now();
    const solved = solveSudoku(BOARD);
    console.log(performance.now() - start);

    if (solved) {
      for (let rowI = 0; rowI < 9; rowI++) {
        for (let colI = 0; colI < 9; colI++) {
          const cell = DOM.CELLS[rowI][colI];
          if (!cell.value) {
            cell.value = solved[rowI][colI];
            cell.setAttribute("class", "solved");
          }
          cell.disabled = true;
        }
      }
      DOM.SUBMIT_BTN.innerText = "Solved!";
    } else {
      DOM.SUBMIT_BTN.disabled = false;
      DOM.SUBMIT_BTN.innerText = "Unsolvable board";
    }
  };
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

const isCompleteSudoku = (board) =>
  board.every((row) => row.every((cell) => cell !== 0));

const solveSudoku = (board) => {
  if (!isValidSudoku(board)) return null;

  for (let rowI = 0; rowI < 9; rowI++) {
    for (let colI = 0; colI < 9; colI++) {
      if (board[rowI][colI] === 0) {
        for (let candidate = 1; candidate < 10; candidate++) {
          board[rowI][colI] = candidate;
          solveSudoku(board);
          if (isCompleteSudoku(board) && isValidSudoku(board)) return board;
        }
        board[rowI][colI] = 0;
        return null;
      }
    }
  }

  return null;
};
