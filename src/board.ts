import { Entity, EntityManager, Player } from './entity.js';
import { BoardPosition, Position } from './types.js';

export enum BoardTile {
  Water,
  Land,
  Stump,
  Rock,
}

enum BoardColors {
  Blue = '#5e7bff',
  Green = '#67bf70',
  Brown = '#6d5635',
  LightBrown = '#db8062',
  Gray = 'gray',
  White = 'white',
}

export namespace BoardTile {
  const views: Map<
    BoardTile,
    (x: number, y: number, size: number, ctx: CanvasRenderingContext2D) => void
  > = new Map([
    [
      BoardTile.Water,
      (x, y, size, ctx) => {
        ctx.fillStyle = BoardColors.Blue;
        ctx.fillRect(x, y, size, size);
      },
    ],
    [
      BoardTile.Land,
      (x, y, size, ctx) => {
        ctx.fillStyle = BoardColors.Green;
        ctx.fillRect(x, y, size, size);
      },
    ],
    [
      BoardTile.Stump,
      (x, y, size, ctx) => {
        ctx.fillStyle = BoardColors.Brown;
        ctx.beginPath();
        ctx.arc(
          x + size / 2 - 0.25,
          y + size / 2 - 0.25,
          size / 3,
          0,
          2 * Math.PI
        );
        ctx.fill();
      },
    ],
    [
      BoardTile.Rock,
      (x, y, size, ctx) => {
        ctx.fillStyle = BoardColors.Gray;
        ctx.fillRect(
          x + size / 6,
          y + size / 6,
          (2 * size) / 3,
          (2 * size) / 3
        );
      },
    ],
  ]);

  export const draw = (
    tile: BoardTile,
    x: number,
    y: number,
    size: number,
    ctx: CanvasRenderingContext2D
  ) => {
    views.get(tile)!(x, y, size, ctx);
  };

  export const isSafe = (tile: Set<BoardTile>) => {
    return !tile.has(BoardTile.Rock);
  };
}

export class Board {
  board: Set<BoardTile>[][];
  ctx: CanvasRenderingContext2D;
  entities: EntityManager;

  position: BoardPosition = {
    offset: {
      x: 100,
      y: 100,
    },
    size: 40,
  };

  cameraVelocity: Position = {
    x: 0,
    y: 0,
  };

  constructor(
    board: Set<BoardTile>[][],
    player: Position,
    canvas: HTMLCanvasElement
  ) {
    this.board = board;
    this.ctx = canvas.getContext('2d')!;

    this.entities = new EntityManager(player);

    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j].has(BoardTile.Stump)) {
          this.entities.addLog({ x: j, y: i }, BoardColors.LightBrown);
        }
      }
    }
  }

  updateCamera(elapsed: number) {
    const { x, y } = this.entities.player.position;
    const canvasX = this.position.offset.x + x * this.position.size;
    const canvasY = this.position.offset.y + y * this.position.size;

    const canvas = this.ctx.canvas!;
    const width = canvas.parentElement!.clientWidth;
    const height = canvas.parentElement!.clientHeight;

    const size = this.position.size;

    this.cameraVelocity.x += 0.001 * (width - canvasX * 2 - size / 2);
    this.cameraVelocity.y += 0.001 * (height - canvasY * 2 - size / 2);

    this.cameraVelocity.x *= 0.7;
    this.cameraVelocity.y *= 0.7;

    this.position.offset.x += this.cameraVelocity.x * elapsed;
    this.position.offset.y += this.cameraVelocity.y * elapsed;
  }

  inBounds = (position: Position) => {
    return (
      position.x >= 0 &&
      position.x < this.board[0].length &&
      position.y >= 0 &&
      position.y < this.board.length
    );
  };

  movePlayer(x: number, y: number): void {
    const { position } = this.entities.player;

    const next = {
      x: position.x + x,
      y: position.y + y,
    };

    if (!this.inBounds(next)) {
      return;
    }

    if (!BoardTile.isSafe(this.board[next.y][next.x])) return;

    if (this.entities.handleCollision(this, position, next)) return;

    this.entities.setPlayerPosition(next);
  }

  draw(elapsed: number) {
    this.updateCamera(elapsed);

    this.ctx.fillStyle = BoardColors.Blue;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    for (let i = 0; i < this.board.length; i++) {
      for (let j = 0; j < this.board[i].length; j++) {
        const tiles = this.board[i][j];
        for (const value in BoardTile) {
          const tile = Number(value);
          if (isNaN(tile)) continue;

          if (tiles.has(tile)) {
            BoardTile.draw(
              tile,
              j * this.position.size - 0.5 + this.position.offset.x,
              i * this.position.size - 0.5 + this.position.offset.y,
              this.position.size + 1,
              this.ctx
            );
          }
        }
      }
    }

    this.entities.draw(this.position, elapsed, this.ctx);
  }
}
