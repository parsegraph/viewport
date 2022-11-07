import { INTERVAL } from "parsegraph-timingbelt";
import { PaintedNode } from "parsegraph-artist";
import Navport from "./Navport";
import { Projector } from "parsegraph-projector";

import { FocusInput, TouchInput, MouseInput, KeyInput } from "parsegraph-input";
import NavportCursor from "./NavportCursor";
import NavportKeyController from "./NavportKeyController";
import NavportMouseController from "./NavportMouseController";
import NavportImpulse from "./NavportImpulse";
import log from "parsegraph-log";

export const TOUCH_SENSITIVITY = 1;
export const MOUSE_SENSITIVITY = 1;

// The amount by which a slider is adjusted by keyboard and mouse events.
export const SLIDER_NUDGE = 0.01;

// How many milliseconds to commit a layout if an input event is detected.
export const INPUT_LAYOUT_TIME = INTERVAL;

class Input {
  _mainContainer: HTMLElement;
  _domContainer: HTMLElement;

  _focus: FocusInput;
  _touch: TouchInput;
  _mouse: MouseInput;
  _key: KeyInput;

  constructor(mainContainer: HTMLElement, domContainer: HTMLElement) {
    if (!mainContainer) {
      throw new Error("container must be provided");
    }
    if (!domContainer) {
      throw new Error("domContainer must be provided");
    }
    this._mainContainer = mainContainer;
    this._domContainer = domContainer;

    this._focus = new FocusInput();
    this._focus.mount(this.mainContainer());

    this._key = new KeyInput();
    this._key.mount(this.mainContainer());

    this._mouse = new MouseInput();
    this._mouse.mount(this.domContainer());

    this._touch = new TouchInput();
    this._touch.mount(this.domContainer());
  }

  mouse() {
    return this._mouse;
  }

  touch() {
    return this._touch;
  }

  key() {
    return this._key;
  }

  focus() {
    return this._focus;
  }

  mainContainer() {
    return this._mainContainer;
  }

  domContainer() {
    return this._domContainer;
  }
}

export default class InputController {
  _nav: Navport;
  _cursor: NavportCursor;
  _key: NavportKeyController;
  _mouse: NavportMouseController;
  _showCursor: boolean;

  _inputs: Map<Projector, Input>;

  _impulse: NavportImpulse;

  constructor(nav: Navport) {
    this._nav = nav;
    this._inputs = new Map();

    this._cursor = new NavportCursor(nav);
    this._showCursor = true;

    this._key = new NavportKeyController(this._cursor);
    this._mouse = new NavportMouseController(nav);

    this._impulse = new NavportImpulse(this._cursor);
  }

  mouse() {
    return this._mouse;
  }

  key() {
    return this._key;
  }

  impulse() {
    return this._impulse;
  }

  cursor() {
    return this._cursor;
  }

  carousel() {
    return this.nav().carousel();
  }

  scheduleRepaint() {
    this.world().value().scheduleRepaint();
    this.nav().scheduleRepaint();
  }

  camera() {
    return this._nav.camera();
  }

  width() {
    return this.nav().camera().width();
  }

  height() {
    return this.nav().camera().height();
  }

  focusedNode(): PaintedNode {
    return this._cursor.focusedNode();
  }

  menu() {
    return this.nav().menu();
  }

  nav() {
    return this._nav;
  }

  world(): PaintedNode {
    return this.nav().root();
  }

  resetCamera(complete?: boolean) {
    const defaultScale = 0.25;
    const cam = this.camera();
    let x = this.width() / 2;
    let y = this.height() / 2;
    if (!complete && cam.x() === x && cam.y() === y) {
      cam.setScale(defaultScale);
    } else {
      if (complete) {
        cam.setScale(defaultScale);
      }
      x = this.width() / (2 * defaultScale);
      y = this.height() / (2 * defaultScale);
      cam.setOrigin(x, y);
    }
  }

  handleEvent(eventType: string, eventData: any, proj: Projector): boolean {
    // console.log(eventType, eventData);
    if (eventType === "blur") {
      this.nav().menu().closeMenu();
      return true;
    }
    console.log("Unhandled event type: " + eventType);
    return false;
  }

  update(t: Date) {
    let needsUpdate = this._mouse.update(t);
    if (needsUpdate) {
      log("Input tick needs update from mouse");
    }
    needsUpdate = this._key.update(t) || needsUpdate;
    if (needsUpdate) {
      log("Input tick needs update from key or mouse");
    }
    needsUpdate = this._cursor.update(t) || needsUpdate;
    if (needsUpdate) {
      log("Input tick needs update from key or mouse or cursor");
    }
    if (this.focusedNode() && this._impulse.update(t)) {
      needsUpdate = true;
    }
    if (needsUpdate) {
      log("Input tick needs update");
    }
    return needsUpdate;
  }

  paint(projector: Projector): boolean {
    if (!this._inputs.has(projector)) {
      const input = new Input(
        projector.glProvider().container(),
        projector.glProvider().container()
      );
      input.mouse().setControl(this._mouse);
      input.focus().setControl(this._mouse);
      input.touch().setControl(this._mouse);
      input.key().setControl(this._key);
      this._inputs.set(projector, input);
    }
    return this._cursor.paint(projector);
  }

  render(proj: Projector) {
    return this._cursor.render(proj);
  }
}
