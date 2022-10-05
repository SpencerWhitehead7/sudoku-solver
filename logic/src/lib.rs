use std::collections::HashSet;
use wasm_bindgen::prelude::*;

fn is_valid_sudoku(board: &Vec<Vec<u8>>) -> bool {
  fn is_valid_unit(items: Vec<u8>) -> bool {
    let mut values = HashSet::new();
    for item in items {
      if item != 0 && !values.insert(item) {
        return false;
      }
    }

    true
  }

  for i in 0..9 {
    let mut row = vec![0; 9];
    let mut col = vec![0; 9];
    let mut boxx = vec![0; 9];

    for j in 0..9 {
      row[j] = board[i][j];
      col[j] = board[j][i];
      boxx[j] = board[i / 3 * 3 + j / 3][i % 3 * 3 + j % 3];
    }

    if !is_valid_unit(row) || !is_valid_unit(col) || !is_valid_unit(boxx) {
      return false;
    }
  }

  true
}

#[wasm_bindgen]
pub fn solve_sudoku(flat_board: Vec<u8>) -> Option<Vec<u8>> {
  fn is_valid_guess(board: &Vec<Vec<u8>>, candidate: u8, row_i: usize, col_i: usize) -> bool {
    for i in 0..9 {
      if board[row_i][i] == candidate {
        return false;
      }
      if board[i][col_i] == candidate {
        return false;
      }
      if board[row_i / 3 * 3 + i / 3][col_i / 3 * 3 + i % 3] == candidate {
        return false;
      }
    }
    true
  }

  fn solver(board: &mut Vec<Vec<u8>>, n: usize) -> Option<Vec<Vec<u8>>> {
    if n == 81 {
      return Some(board.to_vec());
    }

    let (row_i, col_i) = (n / 9, n % 9);

    if board[row_i][col_i] != 0 {
      return solver(board, n + 1);
    }

    for candidate in 1..10 {
      if is_valid_guess(board, candidate, row_i, col_i) {
        board[row_i][col_i] = candidate;
        let is_done = solver(board, n + 1);
        match is_done {
          Some(x) => return Some(x),
          None => board[row_i][col_i] = 0,
        }
        board[row_i][col_i] = 0
      }
    }

    return None;
  }

  let mut board = flat_board.chunks(9).map(|s| s.into()).collect();

  if !is_valid_sudoku(&board) {
    return None;
  }

  let result = solver(&mut board, 0);
  match result {
    Some(x) => return Some(x.into_iter().flatten().collect::<Vec<u8>>()),
    None => return None,
  }
}
