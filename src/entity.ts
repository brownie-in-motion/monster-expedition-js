import { Position, BoardPosition } from './types.js';
import { Board, BoardTile } from './board.js';

export class EntityManager {
  player: {
    player: Player;
    position: Position;
  };
  logs: Map<number, Map<number, Log>>;

  constructor(position: Position) {
    this.player = {
      player: new Player(),
      position,
    };
    this.logs = new Map();
  }

  draw(
    boardPosition: BoardPosition,
    elapsed: number,
    ctx: CanvasRenderingContext2D
  ) {
    for (const [x, row] of this.logs.entries()) {
      for (const [y, log] of row.entries()) {
        log.draw({ x, y }, boardPosition, elapsed, ctx);
      }
    }

    this.player.player.draw(this.player.position, boardPosition, elapsed, ctx);
  }

  handleCollision(
    { board: state, inBounds }: Board,
    position: Position,
    target: Position
  ): boolean {
    const log = this.getLog(target);
    if (!log) return state[target.y][target.x].has(BoardTile.Water);

    const horizontal = position.x === target.x;

    const next = {
      x: target.x + (target.x - position.x),
      y: target.y + (target.y - position.y),
    };

    // case: log in water
    if (state[target.y][target.x].has(BoardTile.Water)) {
      if (horizontal === (log.direction === LogDirection.Horizontal)) {
        return false;
      } else {
        return true;
      }
    }

    // universally illegal blockers
    if (inBounds(next)) {
      const tile = state[next.y][next.x];
      if (tile.has(BoardTile.Stump)) return true;
      if (tile.has(BoardTile.Rock)) return true;
    }

    // case: pushing a log over
    if (log.direction === LogDirection.Up) {
      // blocked by log in the way
      if (!this.getLog(next)) {
        if (horizontal) log.direction = LogDirection.Horizontal;
        else log.direction = LogDirection.Vertical;
        this.setLogPosition(target, next);
      }
      return true;
    }

    // case: pushing a log in same direction
    if (horizontal === (log.direction === LogDirection.Horizontal)) {
      // case: pushing a log over water
      if (!inBounds(next) || state[next.y][next.x].has(BoardTile.Water)) {
        return false;
      } else {
        if (this.getLog(next)) return true;
        this.setLogPosition(target, next);
        log.direction = LogDirection.Up;
        return true;
      }
    } else {
      // case: rolling straight into water
      if (!inBounds(next) || state[next.y][next.x].has(BoardTile.Water)) {
        this.setLogPosition(target, next);
        return true;
      }
      // case: rolling a log over land
      let current = { ...next };
      let nextSearch = {
        x: current.x + (target.x - position.x),
        y: current.y + (target.y - position.y),
      };
      while (true) {
        // check if nextSearch is in board's bounds

        // everything past edge is water: go into it
        if (
          nextSearch.x < 0 ||
          nextSearch.x >= state[0].length ||
          nextSearch.y < 0 ||
          nextSearch.y >= state.length
        ) {
          current = nextSearch;
          break;
        }

        const tile = state[nextSearch.y][nextSearch.x];

        // if water, go into it
        if (!tile.has(BoardTile.Land)) {
          current = nextSearch;
          break;
        }

        // if rock, stump, or log, stop
        if (tile.has(BoardTile.Rock)) break;
        if (tile.has(BoardTile.Stump)) break;
        if (this.getLog(nextSearch)) break;

        // check next
        current = nextSearch;
        nextSearch = {
          x: current.x + (target.x - position.x),
          y: current.y + (target.y - position.y),
        };
      }
      this.setLogPosition(target, current);
      return true;
    }

    return true;
  }

  addLog(position: Position, color: string) {
    const log = new Log(color);
    log.animationState.oldPosition = { ...position };
    if (!this.logs.has(position.x)) this.logs.set(position.x, new Map());
    this.logs.get(position.x)!.set(position.y, log);
  }

  getLog(position: Position): Log | undefined {
    return this.logs.get(position.x)?.get(position.y);
  }

  setLogPosition(o: Position, n: Position) {
    const log = this.logs.get(o.x)?.get(o.y);
    if (!log) return;

    log.animationState.state = AnimationState.Ready;
    this.logs.get(o.x)!.delete(o.y);

    if (!this.logs.has(n.x)) this.logs.set(n.x, new Map());
    this.logs.get(n.x)!.set(n.y, log);
  }

  setPlayerPosition(position: Position) {
    const { player } = this.player;
    if (player.animationState.state === AnimationState.Moving) return;
    player.animationState.state = AnimationState.Ready;
    this.player.position = position;
  }
}

export abstract class Entity {
  animationState: {
    state: AnimationState;
    elapsed: number;
    duration: number;
    oldPosition: Position;
  } = {
    state: AnimationState.None,
    elapsed: 0,
    duration: 60,
    oldPosition: { x: 0, y: 0 },
  };

  color = 'white';

  constructor(color?: string) {
    if (typeof color === 'string') this.color = color;
  }

  updateAnimationState(position: Position, elapsed: number) {
    const animationState = this.animationState;
    switch (animationState.state) {
      case AnimationState.None:
        break;
      case AnimationState.Ready:
        animationState.state = AnimationState.Moving;
        animationState.elapsed = elapsed;
        break;
      case AnimationState.Moving:
        animationState.elapsed += elapsed;
        if (animationState.elapsed > animationState.duration) {
          animationState.state = AnimationState.None;
          animationState.oldPosition = { ...position };
          break;
        }
        break;
    }
  }

  abstract draw(
    position: Position,
    boardPosition: BoardPosition,
    elapsed: number,
    ctx: CanvasRenderingContext2D
  ): void;
}

enum AnimationState {
  None,
  Ready,
  Moving,
}

enum LogDirection {
  Up,
  Horizontal,
  Vertical,
}

export class Log extends Entity {
  direction: LogDirection = LogDirection.Up;

  draw(
    position: Position,
    { offset, size }: BoardPosition,
    elapsed: number,
    ctx: CanvasRenderingContext2D
  ): void {
    this.updateAnimationState(position, elapsed);

    const animationState = this.animationState;

    animationState.duration =
      60 *
      Math.abs(
        animationState.oldPosition.x -
          position.x +
          animationState.oldPosition.y -
          position.y
      );

    let animatedPosition = position;
    if (animationState.duration != 0) {
      animatedPosition = {
        x:
          (position.x * animationState.elapsed +
            animationState.oldPosition.x *
              (animationState.duration - animationState.elapsed)) /
          animationState.duration,
        y:
          (position.y * animationState.elapsed +
            animationState.oldPosition.y *
              (animationState.duration - animationState.elapsed)) /
          animationState.duration,
      };
    }

    switch (this.direction) {
      case LogDirection.Up:
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
          animatedPosition.x * size + offset.x + (size - 0.5) / 2,
          animatedPosition.y * size + offset.y + (size - 0.5) / 2,
          size / 6,
          0,
          2 * Math.PI
        );
        ctx.fill();
        break;
      case LogDirection.Horizontal:
        ctx.fillStyle = this.color;
        ctx.fillRect(
          animatedPosition.x * size + offset.x + (size - 0.5) / 3,
          animatedPosition.y * size + offset.y + (size - 0.5) / 6,
          size / 3,
          (2 * size) / 3
        );
        break;
      case LogDirection.Vertical:
        ctx.fillStyle = this.color;
        ctx.fillRect(
          animatedPosition.x * size + offset.x + (size - 0.5) / 6,
          animatedPosition.y * size + offset.y + (size - 0.5) / 3,
          (2 * size) / 3,
          size / 3
        );
        break;
    }
  }
}

export class Player extends Entity {
  draw(
    position: Position,
    { offset, size }: BoardPosition,
    elapsed: number,
    ctx: CanvasRenderingContext2D
  ): void {
    this.updateAnimationState(position, elapsed);

    const animationState = this.animationState;

    const animatedPosition: Position = {
      x:
        (position.x * animationState.elapsed +
          animationState.oldPosition.x *
            (animationState.duration - animationState.elapsed)) /
        animationState.duration,
      y:
        (position.y * animationState.elapsed +
          animationState.oldPosition.y *
            (animationState.duration - animationState.elapsed)) /
        animationState.duration,
    };

    ctx.fillStyle = this.color;
    ctx.fillRect(
      animatedPosition.x * size + offset.x + (size - 0.5) / 3,
      animatedPosition.y * size + offset.y + (size - 0.5) / 3,
      size / 3,
      size / 3
    );
  }
}
