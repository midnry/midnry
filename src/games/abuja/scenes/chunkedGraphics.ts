import Phaser from "phaser";

/** The area a ground-drawing tile covers, so the camera can skip it when it's off screen. */
export type CullBounds = { x: number; y: number; r: number; b: number };

/**
 * Drawing for the whole city split into tiles. One Graphics object holding
 * every road marking and drain on the map is redrawn in full every frame,
 * even the parts miles off screen; split into tiles, the scene only draws
 * the tiles near the camera (WorldScene.cull). Same calls as a Graphics.
 */
export class ChunkedGraphics {
  private tiles = new Map<string, { g: Phaser.GameObjects.Graphics; fill: string; line: string }>();
  private fill: [number, number] = [0xffffff, 1];
  private line: [number, number, number] = [1, 0xffffff, 1];

  constructor(
    private scene: Phaser.Scene,
    private depth = 0,
    private size = 600,
  ) {}

  private at(x0: number, y0: number, x1: number, y1: number, kind: "fill" | "line") {
    const key = `${Math.floor((x0 + x1) / 2 / this.size)}_${Math.floor((y0 + y1) / 2 / this.size)}`;
    let tile = this.tiles.get(key);
    if (!tile) {
      const g = this.scene.add.graphics().setDepth(this.depth);
      (g as Phaser.GameObjects.Graphics & { cullBounds?: CullBounds }).cullBounds = { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity };
      tile = { g, fill: "", line: "" };
      this.tiles.set(key, tile);
    }
    const bounds = (tile.g as Phaser.GameObjects.Graphics & { cullBounds: CullBounds }).cullBounds;
    bounds.x = Math.min(bounds.x, x0);
    bounds.y = Math.min(bounds.y, y0);
    bounds.r = Math.max(bounds.r, x1);
    bounds.b = Math.max(bounds.b, y1);
    // Each tile keeps its own style: set it again only when it changed.
    if (kind === "fill" && tile.fill !== String(this.fill)) {
      tile.fill = String(this.fill);
      tile.g.fillStyle(...this.fill);
    }
    if (kind === "line" && tile.line !== String(this.line)) {
      tile.line = String(this.line);
      tile.g.lineStyle(...this.line);
    }
    return tile.g;
  }

  fillStyle(color: number, alpha = 1) {
    this.fill = [color, alpha];
    return this;
  }

  lineStyle(width: number, color: number, alpha = 1) {
    this.line = [width, color, alpha];
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.at(x, y, x + w, y + h, "fill").fillRect(x, y, w, h);
    return this;
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.at(x, y, x + w, y + h, "line").strokeRect(x, y, w, h);
    return this;
  }

  lineBetween(x1: number, y1: number, x2: number, y2: number) {
    this.at(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), "line").lineBetween(x1, y1, x2, y2);
    return this;
  }

  fillCircle(x: number, y: number, r: number) {
    this.at(x - r, y - r, x + r, y + r, "fill").fillCircle(x, y, r);
    return this;
  }

  strokeCircle(x: number, y: number, r: number) {
    this.at(x - r, y - r, x + r, y + r, "line").strokeCircle(x, y, r);
    return this;
  }
}
