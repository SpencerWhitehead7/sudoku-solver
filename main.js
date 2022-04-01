window.onload = () => {
  const DOM = {
    FORM: document.getElementById("solver"),
    INPUT: document.getElementById("boardInput"),
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
    }
  }

  DOM.FORM.onchange = (e) => {
    e.preventDefault();
    BOARD[e.target.dataset.row_i][e.target.dataset.col_i] = e.target.value;
  };

  DOM.FORM.onsubmit = (e) => {
    e.preventDefault();
    console.log(BOARD);
  };
};
