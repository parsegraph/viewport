import addListeners from "./addListeners";
import normalizeWheel from "parsegraph-normalizewheel";
import AbstractInput from "./AbstractInput";
import { FocusController } from "./FocusInput";

export interface MouseController extends FocusController {
  wheel(mag: number): void;
  mousemove(x: number, y: number): void;
  mousedown(button: any, downStart: number): boolean;
  mouseup(button: any): void;
  lastMouseX(): number;
  lastMouseY(): number;
}

export default class MouseInput extends AbstractInput<MouseController> {
  _mousedownTime: number;
  _isDoubleClick: boolean;
  _mouseupTimeout: number;

  constructor() {
    super();
    this._isDoubleClick = false;
    this._mouseupTimeout = 0;
    this._mousedownTime = NaN;
  }

  addListeners(container: HTMLElement): () => void {
    container.style.pointerEvents = "auto";
    return addListeners(container, [
      ["DOMMouseScroll", this.onWheel],
      ["mousewheel", this.onWheel],
      ["mousedown", this.mousedownListener],
      ["mousemove", this.mousemoveListener],
      ["mouseup", this.mouseupListener],
      ["mouseout", this.mouseupListener],
    ]);
  }

  /**
   * The receiver of all canvas wheel events.
   *
   * @param {WheelEvent} event current wheel event
   */
  onWheel(event: WheelEvent) {
    event.preventDefault();

    // console.log("Wheel event", wheel);
    const e = normalizeWheel(event);
    if (this.control()) {
      this.control().wheel(e.spinY);
    }
  }

  mousemoveListener(event: MouseEvent) {
    this.control().mousemove(event.offsetX, event.offsetY);
  }

  mouseupListener(event: MouseEvent) {
    this.control().mouseup(event.button);
  }

  mousedownListener(event: MouseEvent) {
    this.control().focus();

    this._mousedownTime = Date.now();

    if (this.control().mousedown(event.button, this._mousedownTime)) {
      event.preventDefault();
      event.stopPropagation();
      this.container().focus();
    }

    // This click is a second click following
    // a recent click; it's a double-click.
    if (this._mouseupTimeout) {
      clearTimeout(this._mouseupTimeout);
      this._mouseupTimeout = null;
      this._isDoubleClick = true;
    }
  }
}
