// import { TimeoutTimer } from "parsegraph-timing";
import { makeInverse3x3, matrixTransform2D } from "parsegraph-matrix";
import { BasicMouseController } from "parsegraph-input";
import Navport from "./Navport";
import {
  getMouseImpulseAdjustment,
  getWheelImpulseAdjustment,
} from "./impulse";
import { PaintedNode } from "parsegraph-artist";
import { logc } from "parsegraph-log";
import { INTERVAL } from "parsegraph-timingbelt";
import { MIN_CAMERA_SCALE } from "./Navport";

// How many milliseconds to commit a layout if an input event is detected.
export const INPUT_LAYOUT_TIME = INTERVAL;

export const WHEEL_MOVES_FOCUS = false;

export enum DefaultClickBehavior {
  SHOW_ALL,
  DO_NOTHING,
}

export default class NavportMouseController extends BasicMouseController {
  _defaultClick: DefaultClickBehavior;
  _attachedMouseListener: Function;
  _mouseVersion: number;
  _mousePos: [number, number];
  _nav: Navport;
  _clickedNode: PaintedNode;

  constructor(nav: Navport) {
    super();
    this._mousePos = [0, 0];
    this._mouseVersion = 0;
    this._nav = nav;
    this._clickedNode = null;
    this._defaultClick = DefaultClickBehavior.DO_NOTHING;
  }

  nav() {
    return this._nav;
  }

  savePos(x: number, y: number) {
    this._mousePos[0] = x;
    this._mousePos[1] = y;
  }

  carousel() {
    return this.nav().carousel();
  }

  update(t: Date) {
    const needsUpdate = this.nav().mouseVersion() !== this.mouseVersion();
    return needsUpdate;
  }

  mouseDragListener(x: number, y: number, dx: number, dy: number) {
    this.mouseChanged();
    this.nav().showInCamera(null);
    /* this.nav()
      .input()
      .impulse()
      .addImpulse(
        getMouseImpulseAdjustment() * -dx,
        getMouseImpulseAdjustment() * -dy
      );*/
    const camera = this.nav().camera();
    camera.adjustOrigin(dx / camera.scale(), dy / camera.scale());
    return true;
  }

  mousedown(button: any, downTime: number, x: number, y: number): boolean {
    super.mousedown(button, downTime, x, y);

    if (this.nav().menu().onMousedown(x, y)) {
      return true;
    }

    let mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.carousel().camera().worldMatrix()),
      x,
      y
    );
    this.mouseChanged();

    if (this.nav().carousel().isCarouselShown()) {
      if (
        this.nav()
          .carousel()
          .clickCarousel(mouseInWorld[0], mouseInWorld[1], true)
      ) {
        return true;
      } else {
        this.nav().carousel().hideCarousel();
        this.nav().carousel().scheduleCarouselRepaint();
        return true;
      }
    }

    mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.nav().camera().worldMatrix()),
      x,
      y
    );

    if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1])) {
      // return true;
      this.savePos(mouseInWorld[0], mouseInWorld[1]);
      this.nav().input().cursor().spotlight().dispose();
    }

    this._attachedMouseListener = this.mouseDragListener;
    return true;
  }

  mousemove(x: number, y: number): boolean {
    const dx = x - this.lastMouseX();
    const dy = y - this.lastMouseY();
    super.mousemove(x, y);

    if (this._nav.menu().onMousemove(x, y)) {
      return true;
    }

    if (this.carousel().isCarouselShown()) {
      this.mouseChanged();

      const mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.carousel().camera().worldMatrix()),
        x,
        y
      );

      const overClickable: number = this.carousel().mouseOverCarousel(
        mouseInWorld[0],
        mouseInWorld[1]
      );
      switch (overClickable) {
        case 2:
          this._nav.setCursor("pointer");
          break;
        case 1:
          break;
        case 0:
          this._nav.setCursor("auto");
          break;
      }

      return true;
    }

    // Moving during a mousedown i.e. dragging (or zooming)
    if (this._attachedMouseListener) {
      const mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.nav().camera().worldMatrix()),
        x,
        y
      );
      return this._attachedMouseListener(
        mouseInWorld[0],
        mouseInWorld[1],
        dx,
        dy
      );
    }

    // Just a mouse moving over the (focused) canvas.
    let overClickable;
    if (
      !this._nav.root() ||
      this._nav
        .root()
        .value()
        .getLayout()
        .commitLayoutIteratively(INPUT_LAYOUT_TIME)
    ) {
      overClickable = 1;
    } else {
      /* overClickable = this._nav
        .root()
        .value()
        .interact()
        .mouseOver(mouseInWorld[0], mouseInWorld[1]);*/
    }
    switch (overClickable) {
      case 2:
        this._nav.setCursor("pointer");
        break;
      case 1:
        break;
      case 0:
        this._nav.setCursor("auto");
        break;
    }
    this.mouseChanged();
    return true;
  }

  defaultClickBehavior() {
    return this._defaultClick;
  }

  setDefaultClickBehavior(behavior: DefaultClickBehavior) {
    this._defaultClick = behavior;
  }

  checkForNodeClick(x: number, y: number): boolean {
    if (
      !this.nav().root()?.value() ||
      this.nav()
        .root()
        .value()
        .getLayout()
        .commitLayoutIteratively(INPUT_LAYOUT_TIME)
    ) {
      this._clickedNode = null;
      this.nav().input().cursor().setFocusedNode(null);
      this.nav().showInCamera(null);
      return false;
    }
    const selectedNode = this.nav()
      .root()
      ?.value()
      ?.getLayout()
      .nodeUnderCoords(x, y) as PaintedNode;

    if (selectedNode) {
      logc(
        "Mouse clicks",
        "Node {0} found for coords ({1}, {2})",
        selectedNode,
        x,
        y
      );

      if (selectedNode !== this._clickedNode) {
        this._clickedNode = null;
      }
      this.nav().input().cursor().setFocusedNode(selectedNode);

      return true;
    }

    logc("Mouse clicks", "No node found under coords:", x, y);
    switch (this.defaultClickBehavior()) {
      case DefaultClickBehavior.SHOW_ALL:
        this._clickedNode = null;
        this.nav().input().cursor().setFocusedNode(null);
        this.nav().showInCamera(null);
        return false;
      default:
        this._clickedNode = null;
        return false;
    }
    return false;
  }

  focusedNode(): PaintedNode {
    return this.nav().input().cursor().focusedNode();
  }

  scheduleRepaint() {
    this.nav().scheduleRepaint();
  }

  mouseup(button: any, downTime: number, x: number, y: number) {
    const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.carousel().camera().worldMatrix()),
      x,
      y
    );

    super.mouseup(button, downTime, x, y);

    if (
      this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false)
    ) {
      return true;
    } else if (this.carousel().isCarouselShown()) {
      this.nav().carousel().hideCarousel();
      this.nav().carousel().scheduleCarouselRepaint();
      return true;
    }
    if (!this._attachedMouseListener) {
      return false;
    }
    this._attachedMouseListener = null;
    this.nav().input().impulse().resetImpulse();

    if (
      !this.nav().root()?.value() ||
      this.nav()
        .root()
        .value()
        .getLayout()
        .commitLayoutIteratively(INPUT_LAYOUT_TIME)
    ) {
      return true;
    }

    const selectedNode = this.focusedNode();
    if (selectedNode) {
      // Check if the selected node has a click listener.
      if (this._clickedNode === selectedNode) {
        if (selectedNode.value().interact().hasClickListener()) {
          if (selectedNode.value().interact().click()) {
            this._clickedNode = null;
          }
          this.scheduleRepaint();
        }
      } else {
        this._clickedNode = selectedNode;
      }
    }

    return false;
  }

  wheel(mag: number, x: number, y: number): boolean {
    super.wheel(mag, x, y);

    if (WHEEL_MOVES_FOCUS && this.focusedNode()) {
      this.nav()
        .input()
        .impulse()
        .addImpulse(0, getWheelImpulseAdjustment() * mag);
      return true;
    }

    // Adjust the scale.
    const numSteps = mag > 0 ? -1 : 1;
    const camera = this.nav().camera();
    if (numSteps > 0 || camera.scale() >= MIN_CAMERA_SCALE) {
      if (this.focusedNode()) {
        camera.zoomToPoint(Math.pow(1.1, numSteps), x, y);
      } else {
        this.nav().showInCamera(null);
        camera.zoomToPoint(Math.pow(1.1, numSteps), x, y);
        /* camera.zoomToPoint(
          Math.pow(1.1, numSteps),
          this.nav().width() / 2,
          this.nav().height() / 2
        );*/
      }
    }
    this.mouseChanged();
    return true;
  }

  mouseVersion() {
    return this._mouseVersion;
  }

  mouseChanged() {
    ++this._mouseVersion;
  }
}
