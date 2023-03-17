# Sudoku Solver

A browser-based [sudoku](https://en.wikipedia.org/wiki/Sudoku) solver. Heavily optimized.

## Optimizations

- Performs calculation off the main thread using a worker
- Performs calculation in parallel using a worker pool
- Performs calculation using a wasm module compiled from rust
  - the build is a little unconventional because I'm not using wasm-pack
  - make sure the machine's wasm-bindgen-cli version matches the project's required wasm-bindgen version
  - `cargo build --release --target wasm32-unknown-unknown && wasm-bindgen target/wasm32-unknown-unknown/release/logic.wasm --target no-modules --out-dir ./pkg` from `./logic`

## Intro

This repo uses solving a sudoku puzzle to demonstrate performance optimizations, focusing on front end/browser specific optimizations.

You could ask why this stuff is worth learning, since in real projects, FE performance is dominated by network latency, asset size, and app architecture. Content sites almost never have to do anything computationally intensive, and even interactive apps have to only rarely (and when they do, it's usually a framework doing something under the hood). But tasks like this do come up (eg, very graphically intensive sites, audio/video editors, etc), the solutions are inherently interesting, and each FE specific optimization described here is a specific example of a general technique.

### What the repo demonstrates

The general techniques are:

1. optimizing the algorithm itself
2. multithreading
3. offloading onto something more performant

And the specific examples are:

1. avoiding unncessary work
2. webworkers
3. wasm

The README is meant to be read alongside the commits. I'll copy some of the relevant code and changes, but it will make the most sense side by side with the actual diffs.

### What the repo does **not** demonstrate

How to actually benchmark performance and come up with possible optimizations. Benchmarking and finding hot spots is vital so that you can make sure you're optimizing the right things and validate/track progress. But you won't learn that here.

## Setup the site (1st and 2nd commit)

The first two commits set up the repo and create everything we'll need for the sudoku solver (adding controls, wiring up event handlers, etc) except the actual solver function. The optimizations are what we care about, so I won't discuss setup.

## Initial implementation of the sudoku solver (3rd commit)

This is a completely unoptimized implementation of the sudoku solver algorithm. We'll optimize it as the post goes on.

```js
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
```

Don't worry too much about the details, but it's a recursive backtracking algo that blindly tries every allowable value for every blank cell, and backtracks when the board gets into an unsolvable state (when any remaining blank cell has no allowable values). `isValidSudoku` checks whether the board already has a repeated number in any row, column, or box. `isCompleteSudoku` checks that every value in the board is 1-9.

## Benchmark (4th commit)

We need a way to evaluate how fast the solver works. I have a bunch of sudoku puzzles I got off leetcode (which is also how I tested the algo) and a random sudoku websites. To benchmark the algo, the page solves each puzzle on load and tracks how long it takes. I won't go into the code because it's ugly and beside the point of the repo.

We can see that the initial implementation takes ~530ms on average (on my admittedly pretty souped up computer).

## Optimization #1: optimize the algo (5th commit)

Let's take a look at an optimized version of the same algo

```js
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
```

It's a little uglier, but a _lot_ faster. There are two improvements:

- The old implementation decided whether to prune candidate branches by validating the _entire_ board. The new implementation decides whether to prune candidate branches by validating just the candidate's row, column, and box. It doesn't even need to allocate a new stack frame to check. This is _much_ less work, and therefore much faster.
  - The insight here is that a candidate can only invalidate the board via its cell's row, column, and box. It cannot effect the rest of the board. Therefore, you only need to check the cell's row, column, and box to make sure the guess is valid (it can still make the board unsolvable later, which is what the backtracking part of the algo deals with in both implementations).
  - The whole board still needs to be validated to make sure the it didn't start in an invalid state, but it only needs to be validated once, at the beginning of the function.
- The old implementation iterated through every cell in the board looking for the first empty space on every invocation. The new implementation jumps straight to the next unchecked cell. This optimization makes much less of a difference, but it's still something.

This implementation takes only 5.6ms on average; nearly a 99% decrease!

## Optimization #2: multithreading

JS is inherently single threaded, and the main thread is responsible, for, well, everything the browser does in JS-land. It runs all the JS on the page, listens for and responds to events, paints the screen, etc. Therefore, if the main thread is busy doing something computationally intensive, the page will be unresponsive until the task is done. If you've ever had the frustrating user experience of clicking a button and having the whole site lock up on you, this is why.

If JS is single threaded, why is the main thread called "the main thread" instead of just "the thread"? It's because of [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), which allow you to get around this limitation of JS and run multiple independent JS threads concurrently.

### Multithreading part 1; web worker (6th commit)

This step is not actually an optimization for puzzle solving speed; in fact, raw performance is a little worse! But crucially, it moves the calculation off the browser's main thread and opens up multithreading later.

In this commit, we just move the algo into a worker. Due to the overhead of communicating back and forth with the worker, performance actually gets a little worse. But it no longer blocks the main thead, letting the site to continue reacting to user input. In this app, the task takes so little time (and there's so little user interaction) that moving it off the main thread is kind of pointless. However, not blocking the main thread is important for any long calculation in a real app.

This implementation takes 6.5ms on average; a huge relative increase, but a small absolute one.

### Multithreading part 2; web worker pool (7th commit)

We can run multiple threads, and we've used that to shift work off the main thread, but we aren't _really_ leveraging multithreading yet. We can parallelize our algorithm by creating a pool of web workers, each with its own JS thread, and passing the workers candidate boards where we have already taken the first step down each path from the first blank cell. Our algorithm, running independently and in parallel in their own theads, will eliminate any invalid attempts and begin working through the possible ones. A limitation of pooling is that we can only (usefully) have as many workers as the browser will give us threads to run them on. If we create more, they will block each other. You can find this number by checking `navigator.hardwareConcurrency`.

I implemented the pool by hand, but there are established JS libraries for this.

This implementation takes 6.1ms on average; a small decrease.

## Optimization #3: offload work into something more performant (8th commit)

Engine developers have done an amazing job with JS optimization and the JIT compiler, but even so, low level languages can achieve better performance than JS. Could we leverage this in the browser? The only programming language browsers run natively is JS, but they can also run [web assembly](https://developer.mozilla.org/en-US/docs/WebAssembly). Wasm is a low level compilation target for other languages, rather than a language you're intended to hand-write, and one of the languages which targets it is [rust](https://www.rust-lang.org/).

The 8th commit ports the algorithm into rust, imports and instantiates a wasm module in the webworkers, and uses it for the calculations instead of the JS algo.

This implementation takes 3ms on average; a small absolute decrease, but a massive 50+% relative one.

## Relative importance of optimizations

Readers who've been paying attention will notice that the final version, with its fancy multithreading and wasm modules, is only 2.6 ms faster than the algorithmically optimized vanilla JS version. A relatively simple main thread wasm module could be even faster since it would skip overhead of communicating with the workers.

In contrast, just optimizing the vanilla JS version gave us a massive speed up. Performance differences from multithreading and wasm would be more noticable if the task was more expensive, but this really shows how important it is to optimize algorithms / data structures. In my work and experiments, I've seen that these relatively straightforward optimizations have far more impact than more arcane techniques, and they add much less complexity.

## Conclusion

This post has illustrated three optimization techniques with examples from FE web development. Even though FE tasks like this are rare, we've seen how some common, general purpose optimization techniques can be applied to improve performance, even in the unusual context of a website. I learned a lot writing this and enjoyed it thoroughly, so I hope you'll find it similarly helpful/fun.
