import leaflet from "leaflet";
import luck from "./luck.ts";

const CELL_GRANULARITY = 1e-4;
const luckModifier: string = "test!";
const cacheSpawnRate = 0.1;

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.round(point.lat / CELL_GRANULARITY),
      j: Math.round(point.lng / CELL_GRANULARITY),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const topCorner = leaflet.latLng(
      cell.i * CELL_GRANULARITY,
      cell.j * CELL_GRANULARITY,
    );
    const bottomCorner = leaflet.latLng(
      (cell.i + 1) * CELL_GRANULARITY,
      (cell.j + 1) * CELL_GRANULARITY,
    );
    return leaflet.latLngBounds(topCorner, bottomCorner);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i <= this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j <= this.tileVisibilityRadius;
        j++
      ) {
        const tmp = this.getCanonicalCell({
          i: originCell.i + i,
          j: originCell.j + j,
        });
        resultCells.push(tmp);
      }
    }
    return resultCells;
  }

  getCachesNearPoint(curLocation: leaflet.LatLng) {
    const nearbyCells = this.getCellsNearPoint(curLocation);
    const nearbyCaches: Cell[] = [];
    nearbyCells.forEach((cell) => {
      if (luck([cell.i, cell.j, luckModifier].toString()) < cacheSpawnRate) {
        nearbyCaches.push({ i: cell.i, j: cell.j });
      }
    });
    return nearbyCaches;
  }
}
