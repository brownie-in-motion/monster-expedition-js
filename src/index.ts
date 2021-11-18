import { BoardTile, Board } from './board.js';

const resize = (canvas: HTMLCanvasElement) => {
  const scale = window.devicePixelRatio;
  const parent = canvas.parentElement!;
  const size = [parent.clientWidth, parent.clientHeight];
  const ctx = canvas.getContext('2d')!;

  canvas.width = size[0] * scale;
  canvas.height = size[1] * scale;

  ctx.scale(scale, scale);
};

await new Promise((res) => {
  window.addEventListener('load', res);
});

const canvas = document.querySelector('canvas')!;

window.addEventListener('resize', () => resize(canvas));
resize(canvas);

const layers = [
  [
    '#####                                                       ',
    ' ##### ###                                                  ',
    '       ###                                                  ',
    ' ###### ##                                                  ',
    ' #####                                                      ',
    ' ###                                                        ',
    ' ### #                                                      ',
    ' ### ###                                                    ',
    '     ####                                                   ',
    '     ####                                                   ',
    '     ###                                                    ',
    '        ###                                                 ',
    '        ###                                                 ',
    '        ###                                                 ',
    '                                                            ',
    '                                                            ',
    '                                                            ',
    '                                                            ',
  ],
  [
    '............................................................',
    '.....@......................................................',
    '........@...................................................',
    '.........%..................................................',
    '...@........................................................',
    '............................................................',
    '............................................................',
    '.%%%........................................................',
    '......@.....................................................',
    '............................................................',
    '.....%%%....................................................',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
  ],
];

const chars = new Map([
  [' ', 0],
  ['#', 1],
  ['@', 2],
  ['%', 3],
  ['.', 9],
]);

const state: Set<BoardTile>[][] = new Array(layers[0].length)
  .fill(null)
  .map(() =>
    new Array(layers[0][0].length).fill(null).map(() => new Set<BoardTile>())
  );

for (const layer of layers) {
  for (let i = 0; i < layer.length; i++) {
    for (let j = 0; j < layer[i].length; j++) {
      state[i][j].add(chars.get(layer[i].charAt(j))!);
    }
  }
}

const board = new Board(state, { x: 0, y: 0 }, canvas);

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
      board.movePlayer(0, -1);
      break;
    case 'ArrowDown':
      board.movePlayer(0, 1);
      break;
    case 'ArrowLeft':
      board.movePlayer(-1, 0);
      break;
    case 'ArrowRight':
      board.movePlayer(1, 0);
      break;
  }
});

let previous: number;
const run = (timestamp: number) => {
  if (previous === undefined) previous = timestamp;
  board.draw(timestamp - previous);
  previous = timestamp;
  requestAnimationFrame(run);
};
requestAnimationFrame(run);
