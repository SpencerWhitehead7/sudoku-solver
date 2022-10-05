# Sudoku Solver

A browser-based [sudoku](https://en.wikipedia.org/wiki/Sudoku) solver. Heavily optimized.

## Optimizations

- Performs calculation off the main thread using a worker
- Performs calculation in parallel using a worker pool
- Performs calculation using a wasm module compiled from rust
  - the build is a little unconventional because I'm not using wasm-pack
  - make sure the machine's wasm-bindgen-cli version matches the project's required wasm-bindgen version
  - `cargo build --release --target wasm32-unknown-unknown && wasm-bindgen target/wasm32-unknown-unknown/release/logic.wasm --target no-modules --out-dir ./pkg` from `./logic`
