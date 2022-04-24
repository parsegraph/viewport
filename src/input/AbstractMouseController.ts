import { MouseController } from "./MouseInput";

export default class BasicMouseController implements MouseController {
  _lastMouseX: number;
  _lastMouseY: number;
  _focused: boolean;

  constructor() {
    this._focused = false;
    this.setLastMouseCoords(0, 0);
  }

  setLastMouseCoords(x: number, y: number) {
    this._lastMouseX = x;
    this._lastMouseY = y;
  }

  lastMouseX() {
    return this._lastMouseX;
  }

  lastMouseY() {
    return this._lastMouseY;
  }

  mousemove(x: number, y: number) {
    this.setLastMouseCoords(x, y);
  }

  wheel(_: number): boolean {
    return false;
  }

  mousedown(_: any, _2: number): boolean {
    return true;
  }

  mouseup(_: any) {}

  blur() {
    this._focused = false;
  }

  focus() {
    this._focused = true;
  }

  focused() {
    return this._focused;
  }
}
