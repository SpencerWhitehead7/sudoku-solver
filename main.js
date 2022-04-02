window.onload = () => {
  const DOM = {
    FORM: document.getElementById("solver"),
    INPUT: document.getElementById("boardInput"),
    CELLS: new Array(9).fill().map(() => new Array(9)),
    SUBMIT_BTN: document.getElementById("submitBtn"),
  };

  const BOARD = new Array(9).fill().map(() => new Uint8Array(9));
  const solverWorkerPool = createWorkerPool("worker.js", 9);

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

  DOM.FORM.onsubmit = async (e) => {
    e.preventDefault();
    DOM.SUBMIT_BTN.disabled = true;

    try {
      const start = performance.now();
      let firstEmptyCellRowI;
      let firstEmptyCellColI;
      for (let rowI = 0; rowI < 9; rowI++) {
        for (let colI = 0; colI < 9; colI++) {
          if (!BOARD[rowI][colI]) {
            firstEmptyCellRowI = rowI;
            firstEmptyCellColI = colI;
            break;
          }
        }
        if (firstEmptyCellRowI && firstEmptyCellColI) break;
      }

      let solved;
      if (!firstEmptyCellRowI && !firstEmptyCellColI) {
        solved = await solverWorkerPool(
          BOARD,
          BOARD.map((row) => row.buffer)
        );
      } else {
        solved = await Promise.any(
          new Array(9)
            .fill(1)
            .map((one, i) => i + one)
            .map((candidate) => {
              const candidateBoard = BOARD.map((row) => new Uint8Array(row));
              candidateBoard[firstEmptyCellRowI][firstEmptyCellColI] =
                candidate;

              return solverWorkerPool(
                candidateBoard,
                candidateBoard.map((row) => row.buffer)
              );
            })
        );
      }
      console.log(performance.now() - start);

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
    } catch (e) {
      console.error(e);
      DOM.SUBMIT_BTN.disabled = false;
      DOM.SUBMIT_BTN.innerText = "Unsolvable board";
    }
  };
};

const createWorkerPool = (script, count = navigator.hardwareConcurrency) => {
  const workerStack = [];
  const taskQueue = [];

  const free = (worker) => {
    if (taskQueue.length) {
      worker(taskQueue.shift());
    } else {
      workerStack.push(worker);
    }
  };

  for (let i = 0; i < count; i++) {
    workerStack.push(createWorker(script, free));
  }

  return (data, transferables) =>
    new Promise((resolve, reject) => {
      const task = { data, transferables, resolve, reject };
      const worker = workerStack.pop();
      worker ? worker(task) : taskQueue.push(task);
    });
};

const createWorker = (script, free) => {
  const worker = new Worker(script);

  let currTask = {
    data: undefined,
    transferables: undefined,
    resolve: () => {},
    reject: () => {},
  };

  const workerApi = (nextTask) => {
    currTask = nextTask;
    worker.postMessage(currTask.data, currTask.transferables);
  };

  worker.onmessage = (e) => {
    e.data.isError
      ? currTask.reject(e.data.payload)
      : currTask.resolve(e.data.payload);
    free(workerApi);
  };
  worker.onerror = (e) => {
    currTask.reject(e);
    free(workerApi);
  };

  return workerApi;
};

const SAMPLE_BOARDS = [
  {
    // leetcode
    i: [
      new Uint8Array([5, 3, 0, 0, 7, 0, 0, 0, 0]),
      new Uint8Array([6, 0, 0, 1, 9, 5, 0, 0, 0]),
      new Uint8Array([0, 9, 8, 0, 0, 0, 0, 6, 0]),
      new Uint8Array([8, 0, 0, 0, 6, 0, 0, 0, 3]),
      new Uint8Array([4, 0, 0, 8, 0, 3, 0, 0, 1]),
      new Uint8Array([7, 0, 0, 0, 2, 0, 0, 0, 6]),
      new Uint8Array([0, 6, 0, 0, 0, 0, 2, 8, 0]),
      new Uint8Array([0, 0, 0, 4, 1, 9, 0, 0, 5]),
      new Uint8Array([0, 0, 0, 0, 8, 0, 0, 7, 9]),
    ],
    o: [
      new Uint8Array([5, 3, 4, 6, 7, 8, 9, 1, 2]),
      new Uint8Array([6, 7, 2, 1, 9, 5, 3, 4, 8]),
      new Uint8Array([1, 9, 8, 3, 4, 2, 5, 6, 7]),
      new Uint8Array([8, 5, 9, 7, 6, 1, 4, 2, 3]),
      new Uint8Array([4, 2, 6, 8, 5, 3, 7, 9, 1]),
      new Uint8Array([7, 1, 3, 9, 2, 4, 8, 5, 6]),
      new Uint8Array([9, 6, 1, 5, 3, 7, 2, 8, 4]),
      new Uint8Array([2, 8, 7, 4, 1, 9, 6, 3, 5]),
      new Uint8Array([3, 4, 5, 2, 8, 6, 1, 7, 9]),
    ],
  },
  // https://www.websudoku.com/?level=4
  {
    i: [
      new Uint8Array([8, 0, 0, 0, 0, 6, 0, 0, 5]),
      new Uint8Array([0, 3, 0, 0, 2, 5, 0, 0, 0]),
      new Uint8Array([0, 2, 7, 0, 0, 0, 0, 3, 0]),
      new Uint8Array([0, 0, 0, 1, 0, 2, 0, 0, 3]),
      new Uint8Array([0, 8, 0, 0, 0, 0, 0, 5, 0]),
      new Uint8Array([6, 0, 0, 4, 0, 8, 0, 0, 0]),
      new Uint8Array([0, 1, 0, 0, 0, 0, 9, 6, 0]),
      new Uint8Array([0, 0, 0, 2, 1, 0, 0, 7, 0]),
      new Uint8Array([9, 0, 0, 6, 0, 0, 0, 0, 4]),
    ],
    o: [
      new Uint8Array([8, 4, 9, 3, 7, 6, 1, 2, 5]),
      new Uint8Array([1, 3, 6, 9, 2, 5, 8, 4, 7]),
      new Uint8Array([5, 2, 7, 8, 4, 1, 6, 3, 9]),
      new Uint8Array([4, 9, 5, 1, 6, 2, 7, 8, 3]),
      new Uint8Array([2, 8, 1, 7, 9, 3, 4, 5, 6]),
      new Uint8Array([6, 7, 3, 4, 5, 8, 2, 9, 1]),
      new Uint8Array([7, 1, 8, 5, 3, 4, 9, 6, 2]),
      new Uint8Array([3, 6, 4, 2, 1, 9, 5, 7, 8]),
      new Uint8Array([9, 5, 2, 6, 8, 7, 3, 1, 4]),
    ],
  },
  {
    i: [
      new Uint8Array([5, 0, 3, 0, 0, 0, 0, 8, 0]),
      new Uint8Array([0, 0, 0, 4, 0, 0, 0, 2, 0]),
      new Uint8Array([0, 0, 0, 0, 1, 0, 0, 6, 7]),
      new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 4]),
      new Uint8Array([8, 1, 0, 3, 0, 5, 0, 9, 6]),
      new Uint8Array([2, 0, 0, 0, 0, 6, 0, 0, 0]),
      new Uint8Array([6, 7, 0, 0, 2, 0, 0, 0, 0]),
      new Uint8Array([0, 8, 0, 0, 0, 4, 0, 0, 0]),
      new Uint8Array([0, 9, 0, 0, 0, 0, 7, 0, 2]),
    ],
    o: [
      new Uint8Array([5, 4, 3, 2, 6, 7, 9, 8, 1]),
      new Uint8Array([1, 6, 7, 4, 8, 9, 5, 2, 3]),
      new Uint8Array([9, 2, 8, 5, 1, 3, 4, 6, 7]),
      new Uint8Array([7, 5, 6, 1, 9, 2, 8, 3, 4]),
      new Uint8Array([8, 1, 4, 3, 7, 5, 2, 9, 6]),
      new Uint8Array([2, 3, 9, 8, 4, 6, 1, 7, 5]),
      new Uint8Array([6, 7, 5, 9, 2, 1, 3, 4, 8]),
      new Uint8Array([3, 8, 2, 7, 5, 4, 6, 1, 9]),
      new Uint8Array([4, 9, 1, 6, 3, 8, 7, 5, 2]),
    ],
  },
  {
    i: [
      new Uint8Array([0, 1, 0, 0, 0, 0, 3, 0, 0]),
      new Uint8Array([9, 0, 7, 6, 0, 0, 0, 2, 0]),
      new Uint8Array([0, 0, 8, 0, 0, 0, 0, 0, 4]),
      new Uint8Array([8, 3, 9, 0, 0, 2, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 9, 0, 5, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 7, 0, 0, 9, 6, 3]),
      new Uint8Array([5, 0, 0, 0, 0, 0, 4, 0, 0]),
      new Uint8Array([0, 2, 0, 0, 0, 4, 5, 0, 1]),
      new Uint8Array([0, 0, 4, 0, 0, 0, 0, 3, 0]),
    ],
    o: [
      new Uint8Array([2, 1, 5, 8, 4, 7, 3, 9, 6]),
      new Uint8Array([9, 4, 7, 6, 1, 3, 8, 2, 5]),
      new Uint8Array([3, 6, 8, 2, 5, 9, 7, 1, 4]),
      new Uint8Array([8, 3, 9, 4, 6, 2, 1, 5, 7]),
      new Uint8Array([6, 7, 1, 9, 3, 5, 2, 4, 8]),
      new Uint8Array([4, 5, 2, 7, 8, 1, 9, 6, 3]),
      new Uint8Array([5, 8, 3, 1, 2, 6, 4, 7, 9]),
      new Uint8Array([7, 2, 6, 3, 9, 4, 5, 8, 1]),
      new Uint8Array([1, 9, 4, 5, 7, 8, 6, 3, 2]),
    ],
  },
  // https://www.websudoku.com/?level=3
  {
    i: [
      new Uint8Array([0, 0, 0, 0, 0, 0, 8, 0, 0]),
      new Uint8Array([2, 0, 0, 0, 9, 0, 6, 7, 0]),
      new Uint8Array([0, 1, 5, 2, 0, 0, 4, 0, 0]),
      new Uint8Array([0, 0, 2, 0, 7, 0, 0, 0, 5]),
      new Uint8Array([0, 0, 0, 8, 2, 1, 0, 0, 0]),
      new Uint8Array([7, 0, 0, 0, 3, 0, 2, 0, 0]),
      new Uint8Array([0, 0, 1, 0, 0, 8, 3, 2, 0]),
      new Uint8Array([0, 9, 3, 0, 6, 0, 0, 0, 4]),
      new Uint8Array([0, 0, 7, 0, 0, 0, 0, 0, 0]),
    ],
    o: [
      new Uint8Array([9, 7, 4, 3, 1, 6, 8, 5, 2]),
      new Uint8Array([2, 3, 8, 4, 9, 5, 6, 7, 1]),
      new Uint8Array([6, 1, 5, 2, 8, 7, 4, 9, 3]),
      new Uint8Array([1, 8, 2, 6, 7, 4, 9, 3, 5]),
      new Uint8Array([3, 5, 9, 8, 2, 1, 7, 4, 6]),
      new Uint8Array([7, 4, 6, 5, 3, 9, 2, 1, 8]),
      new Uint8Array([4, 6, 1, 9, 5, 8, 3, 2, 7]),
      new Uint8Array([5, 9, 3, 7, 6, 2, 1, 8, 4]),
      new Uint8Array([8, 2, 7, 1, 4, 3, 5, 6, 9]),
    ],
  },
  {
    i: [
      new Uint8Array([7, 0, 0, 0, 1, 0, 0, 0, 2]),
      new Uint8Array([0, 0, 6, 0, 0, 9, 0, 0, 1]),
      new Uint8Array([0, 0, 4, 3, 0, 0, 0, 6, 0]),
      new Uint8Array([0, 0, 0, 7, 0, 4, 2, 0, 0]),
      new Uint8Array([6, 0, 0, 0, 0, 0, 0, 0, 9]),
      new Uint8Array([0, 0, 7, 8, 0, 2, 0, 0, 0]),
      new Uint8Array([0, 7, 0, 0, 0, 5, 1, 0, 0]),
      new Uint8Array([8, 0, 0, 1, 0, 0, 6, 0, 0]),
      new Uint8Array([3, 0, 0, 0, 7, 0, 0, 0, 4]),
    ],
    o: [
      new Uint8Array([7, 9, 8, 4, 1, 6, 3, 5, 2]),
      new Uint8Array([5, 3, 6, 2, 8, 9, 7, 4, 1]),
      new Uint8Array([2, 1, 4, 3, 5, 7, 9, 6, 8]),
      new Uint8Array([9, 8, 3, 7, 6, 4, 2, 1, 5]),
      new Uint8Array([6, 4, 2, 5, 3, 1, 8, 7, 9]),
      new Uint8Array([1, 5, 7, 8, 9, 2, 4, 3, 6]),
      new Uint8Array([4, 7, 9, 6, 2, 5, 1, 8, 3]),
      new Uint8Array([8, 2, 5, 1, 4, 3, 6, 9, 7]),
      new Uint8Array([3, 6, 1, 9, 7, 8, 5, 2, 4]),
    ],
  },
  {
    i: [
      new Uint8Array([7, 0, 0, 0, 1, 0, 0, 0, 2]),
      new Uint8Array([0, 0, 6, 0, 0, 9, 0, 0, 1]),
      new Uint8Array([0, 0, 4, 3, 0, 0, 0, 6, 0]),
      new Uint8Array([0, 0, 0, 7, 0, 4, 2, 0, 0]),
      new Uint8Array([6, 0, 0, 0, 0, 0, 0, 0, 9]),
      new Uint8Array([0, 0, 7, 8, 0, 2, 0, 0, 0]),
      new Uint8Array([0, 7, 0, 0, 0, 5, 1, 0, 0]),
      new Uint8Array([8, 0, 0, 1, 0, 0, 6, 0, 0]),
      new Uint8Array([3, 0, 0, 0, 7, 0, 0, 0, 4]),
    ],
    o: [
      new Uint8Array([7, 9, 8, 4, 1, 6, 3, 5, 2]),
      new Uint8Array([5, 3, 6, 2, 8, 9, 7, 4, 1]),
      new Uint8Array([2, 1, 4, 3, 5, 7, 9, 6, 8]),
      new Uint8Array([9, 8, 3, 7, 6, 4, 2, 1, 5]),
      new Uint8Array([6, 4, 2, 5, 3, 1, 8, 7, 9]),
      new Uint8Array([1, 5, 7, 8, 9, 2, 4, 3, 6]),
      new Uint8Array([4, 7, 9, 6, 2, 5, 1, 8, 3]),
      new Uint8Array([8, 2, 5, 1, 4, 3, 6, 9, 7]),
      new Uint8Array([3, 6, 1, 9, 7, 8, 5, 2, 4]),
    ],
  },
  // https://www.websudoku.com/?level=2
  {
    i: [
      new Uint8Array([6, 4, 9, 0, 0, 0, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 0, 0, 4, 0, 9, 0]),
      new Uint8Array([0, 0, 0, 9, 6, 1, 0, 0, 3]),
      new Uint8Array([4, 5, 0, 0, 0, 0, 7, 2, 0]),
      new Uint8Array([3, 9, 0, 0, 0, 0, 0, 1, 6]),
      new Uint8Array([0, 7, 2, 0, 0, 0, 0, 3, 9]),
      new Uint8Array([9, 0, 0, 7, 2, 3, 0, 0, 0]),
      new Uint8Array([0, 3, 0, 4, 0, 0, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 0, 0, 0, 3, 6, 2]),
    ],
    o: [
      new Uint8Array([6, 4, 9, 8, 3, 7, 2, 5, 1]),
      new Uint8Array([8, 1, 3, 2, 5, 4, 6, 9, 7]),
      new Uint8Array([5, 2, 7, 9, 6, 1, 8, 4, 3]),
      new Uint8Array([4, 5, 6, 3, 1, 9, 7, 2, 8]),
      new Uint8Array([3, 9, 8, 5, 7, 2, 4, 1, 6]),
      new Uint8Array([1, 7, 2, 6, 4, 8, 5, 3, 9]),
      new Uint8Array([9, 6, 5, 7, 2, 3, 1, 8, 4]),
      new Uint8Array([2, 3, 1, 4, 8, 6, 9, 7, 5]),
      new Uint8Array([7, 8, 4, 1, 9, 5, 3, 6, 2]),
    ],
  },
  {
    i: [
      new Uint8Array([0, 0, 0, 0, 0, 1, 0, 2, 0]),
      new Uint8Array([6, 0, 0, 7, 5, 0, 3, 0, 1]),
      new Uint8Array([1, 0, 4, 8, 0, 0, 0, 7, 0]),
      new Uint8Array([0, 0, 3, 0, 4, 0, 0, 0, 2]),
      new Uint8Array([0, 1, 0, 0, 9, 0, 0, 4, 0]),
      new Uint8Array([9, 0, 0, 0, 1, 0, 6, 0, 0]),
      new Uint8Array([0, 6, 0, 0, 0, 5, 7, 0, 9]),
      new Uint8Array([3, 0, 1, 0, 7, 9, 0, 0, 8]),
      new Uint8Array([0, 2, 0, 1, 0, 0, 0, 0, 0]),
    ],
    o: [
      new Uint8Array([8, 7, 5, 9, 3, 1, 4, 2, 6]),
      new Uint8Array([6, 9, 2, 7, 5, 4, 3, 8, 1]),
      new Uint8Array([1, 3, 4, 8, 6, 2, 9, 7, 5]),
      new Uint8Array([5, 8, 3, 6, 4, 7, 1, 9, 2]),
      new Uint8Array([2, 1, 6, 5, 9, 3, 8, 4, 7]),
      new Uint8Array([9, 4, 7, 2, 1, 8, 6, 5, 3]),
      new Uint8Array([4, 6, 8, 3, 2, 5, 7, 1, 9]),
      new Uint8Array([3, 5, 1, 4, 7, 9, 2, 6, 8]),
      new Uint8Array([7, 2, 9, 1, 8, 6, 5, 3, 4]),
    ],
  },
  {
    i: [
      new Uint8Array([6, 4, 9, 0, 0, 0, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 0, 0, 4, 0, 9, 0]),
      new Uint8Array([0, 0, 0, 9, 6, 1, 0, 0, 3]),
      new Uint8Array([4, 5, 0, 0, 0, 0, 7, 2, 0]),
      new Uint8Array([3, 9, 0, 0, 0, 0, 0, 1, 6]),
      new Uint8Array([0, 7, 2, 0, 0, 0, 0, 3, 9]),
      new Uint8Array([9, 0, 0, 7, 2, 3, 0, 0, 0]),
      new Uint8Array([0, 3, 0, 4, 0, 0, 0, 0, 0]),
      new Uint8Array([0, 0, 0, 0, 0, 0, 3, 6, 2]),
    ],
    o: [
      new Uint8Array([6, 4, 9, 8, 3, 7, 2, 5, 1]),
      new Uint8Array([8, 1, 3, 2, 5, 4, 6, 9, 7]),
      new Uint8Array([5, 2, 7, 9, 6, 1, 8, 4, 3]),
      new Uint8Array([4, 5, 6, 3, 1, 9, 7, 2, 8]),
      new Uint8Array([3, 9, 8, 5, 7, 2, 4, 1, 6]),
      new Uint8Array([1, 7, 2, 6, 4, 8, 5, 3, 9]),
      new Uint8Array([9, 6, 5, 7, 2, 3, 1, 8, 4]),
      new Uint8Array([2, 3, 1, 4, 8, 6, 9, 7, 5]),
      new Uint8Array([7, 8, 4, 1, 9, 5, 3, 6, 2]),
    ],
  },
  // https://www.websudoku.com/?level=1
  {
    i: [
      new Uint8Array([0, 0, 0, 5, 4, 0, 2, 0, 6]),
      new Uint8Array([0, 0, 0, 2, 0, 0, 0, 9, 0]),
      new Uint8Array([3, 2, 0, 9, 6, 0, 0, 0, 5]),
      new Uint8Array([0, 9, 4, 0, 2, 0, 3, 8, 7]),
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0]),
      new Uint8Array([5, 7, 8, 0, 3, 0, 4, 2, 0]),
      new Uint8Array([8, 0, 0, 0, 9, 2, 0, 3, 4]),
      new Uint8Array([0, 4, 0, 0, 0, 6, 0, 0, 0]),
      new Uint8Array([7, 0, 6, 0, 5, 8, 0, 0, 0]),
    ],
    o: [
      new Uint8Array([1, 8, 9, 5, 4, 3, 2, 7, 6]),
      new Uint8Array([4, 6, 5, 2, 8, 7, 1, 9, 3]),
      new Uint8Array([3, 2, 7, 9, 6, 1, 8, 4, 5]),
      new Uint8Array([6, 9, 4, 1, 2, 5, 3, 8, 7]),
      new Uint8Array([2, 1, 3, 8, 7, 4, 5, 6, 9]),
      new Uint8Array([5, 7, 8, 6, 3, 9, 4, 2, 1]),
      new Uint8Array([8, 5, 1, 7, 9, 2, 6, 3, 4]),
      new Uint8Array([9, 4, 2, 3, 1, 6, 7, 5, 8]),
      new Uint8Array([7, 3, 6, 4, 5, 8, 9, 1, 2]),
    ],
  },
  {
    i: [
      new Uint8Array([0, 7, 8, 0, 0, 2, 6, 0, 9]),
      new Uint8Array([0, 5, 0, 0, 8, 3, 1, 4, 0]),
      new Uint8Array([0, 0, 0, 0, 6, 0, 0, 0, 3]),
      new Uint8Array([0, 0, 0, 0, 0, 1, 9, 0, 6]),
      new Uint8Array([2, 3, 1, 0, 0, 0, 4, 7, 5]),
      new Uint8Array([9, 0, 7, 2, 0, 0, 0, 0, 0]),
      new Uint8Array([8, 0, 0, 0, 5, 0, 0, 0, 0]),
      new Uint8Array([0, 1, 4, 6, 7, 0, 0, 9, 0]),
      new Uint8Array([7, 0, 6, 3, 0, 0, 5, 1, 0]),
    ],
    o: [
      new Uint8Array([3, 7, 8, 4, 1, 2, 6, 5, 9]),
      new Uint8Array([6, 5, 2, 9, 8, 3, 1, 4, 7]),
      new Uint8Array([1, 4, 9, 5, 6, 7, 2, 8, 3]),
      new Uint8Array([4, 8, 5, 7, 3, 1, 9, 2, 6]),
      new Uint8Array([2, 3, 1, 8, 9, 6, 4, 7, 5]),
      new Uint8Array([9, 6, 7, 2, 4, 5, 8, 3, 1]),
      new Uint8Array([8, 2, 3, 1, 5, 9, 7, 6, 4]),
      new Uint8Array([5, 1, 4, 6, 7, 8, 3, 9, 2]),
      new Uint8Array([7, 9, 6, 3, 2, 4, 5, 1, 8]),
    ],
  },
  {
    i: [
      new Uint8Array([7, 4, 0, 0, 8, 0, 0, 0, 0]),
      new Uint8Array([8, 0, 0, 0, 0, 1, 9, 4, 7]),
      new Uint8Array([0, 0, 9, 0, 3, 4, 0, 0, 0]),
      new Uint8Array([0, 5, 0, 2, 9, 0, 0, 0, 1]),
      new Uint8Array([0, 6, 8, 0, 0, 0, 3, 9, 0]),
      new Uint8Array([1, 0, 0, 0, 4, 6, 0, 2, 0]),
      new Uint8Array([0, 0, 0, 8, 5, 0, 6, 0, 0]),
      new Uint8Array([5, 8, 2, 1, 0, 0, 0, 0, 3]),
      new Uint8Array([0, 0, 0, 0, 7, 0, 0, 8, 9]),
    ],
    o: [
      new Uint8Array([7, 4, 1, 9, 8, 5, 2, 3, 6]),
      new Uint8Array([8, 3, 5, 6, 2, 1, 9, 4, 7]),
      new Uint8Array([6, 2, 9, 7, 3, 4, 1, 5, 8]),
      new Uint8Array([4, 5, 3, 2, 9, 8, 7, 6, 1]),
      new Uint8Array([2, 6, 8, 5, 1, 7, 3, 9, 4]),
      new Uint8Array([1, 9, 7, 3, 4, 6, 8, 2, 5]),
      new Uint8Array([9, 7, 4, 8, 5, 3, 6, 1, 2]),
      new Uint8Array([5, 8, 2, 1, 6, 9, 4, 7, 3]),
      new Uint8Array([3, 1, 6, 4, 7, 2, 5, 8, 9]),
    ],
  },
];

const bench = async () => {
  const benchPool = createWorkerPool("worker.js", 9);

  const times = [];

  for (let j = 0; j < SAMPLE_BOARDS.length; j++) {
    const { i, o } = SAMPLE_BOARDS[j];
    const icpy = i.map((row) => new Uint8Array(row));

    try {
      const start = performance.now();
      let firstEmptyCellRowI;
      let firstEmptyCellColI;
      for (let rowI = 0; rowI < 9; rowI++) {
        for (let colI = 0; colI < 9; colI++) {
          if (!i[rowI][colI]) {
            firstEmptyCellRowI = rowI;
            firstEmptyCellColI = colI;
            break;
          }
        }
        if (firstEmptyCellRowI && firstEmptyCellColI) break;
      }

      let solved;
      if (!firstEmptyCellRowI && !firstEmptyCellColI) {
        solved = await benchPool(
          icpy,
          icpy.map((row) => row.buffer)
        );
      } else {
        solved = await Promise.any(
          new Array(9)
            .fill(1)
            .map((one, i) => i + one)
            .map((candidate) => {
              const candidateBoard = icpy.map((row) => new Uint8Array(row));
              candidateBoard[firstEmptyCellRowI][firstEmptyCellColI] =
                candidate;

              return benchPool(
                candidateBoard,
                candidateBoard.map((row) => row.buffer)
              );
            })
        );
      }
      times.push(performance.now() - start);

      if (o.some((row, ri) => row.some((v, ci) => v !== solved[ri][ci]))) {
        console.error("incorrect answer", i, icpy, o);
      }
    } catch (e) {
      console.error("bench error", e);
    }
  }

  const total = times.reduce((acc, curr) => acc + curr, 0);
  const avg = total / times.length;

  console.log(times);
  console.log({ total, avg });
};

setTimeout(() => {
  bench();
}, 1000);
