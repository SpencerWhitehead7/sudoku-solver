importScripts("./logic/pkg/logic.js");
const { solve_sudoku } = wasm_bindgen;

const wasm = wasm_bindgen("./logic/pkg/logic_bg.wasm");

const composeMessage = (payload, isError) => ({
  payload,
  isError,
});

self.onmessage = async (e) => {
  try {
    await wasm;
    // truly annoyingly, rust-wasm cannot take or return nested arrays
    // so you flatten it and pass it in
    // it re-nests it, does the logic, re-flattens it and returns it
    // and we re-nest it again
    const flatBoard = new Uint8Array(
      e.data.reduce((acc, row) => [...acc, ...row], [])
    );
    let flatSolved = solve_sudoku(flatBoard);

    if (flatSolved) {
      const solved = [];
      for (let i = 0; i < flatSolved.length; i += 9) {
        solved.push(new Uint8Array(flatSolved.slice(i, i + 9)));
      }

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
