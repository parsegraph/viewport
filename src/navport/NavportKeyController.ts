import { Keystroke } from "parsegraph-input";
import { matrixTransform2D, makeInverse3x3 } from "parsegraph-matrix";
import NavportCursor from "./NavportCursor";
import { PaintedNode } from "parsegraph-artist";
import { Direction } from "parsegraph-direction";
import { KeyController } from "parsegraph-input";
import { MIN_CAMERA_SCALE } from "./Navport";

const RESET_CAMERA_KEY = "Escape";
const CLICK_KEY = " ";

const MOVE_UPWARD_KEY = "ArrowUp";
const MOVE_DOWNWARD_KEY = "ArrowDown";
const MOVE_BACKWARD_KEY = "ArrowLeft";
const MOVE_FORWARD_KEY = "ArrowRight";
const MOVE_TO_FORWARD_END_KEY = "End";
const MOVE_TO_BACKWARD_END_KEY = "Home";
const MOVE_TO_UPWARD_END_KEY = "PageUp";
const MOVE_TO_DOWNWARD_END_KEY = "PageDown";

// const MOVE_UPWARD_KEY = "w";
// const MOVE_DOWNWARD_KEY = "s";
// const MOVE_BACKWARD_KEY = "a";
// const MOVE_FORWARD_KEY = "d";

const ZOOM_IN_KEY = "ZoomIn";
const ZOOM_OUT_KEY = "ZoomOut";

const KEY_CAMERA_FREE_MOVE = true;

export default class NavportKeyController implements KeyController {
  keydowns: { [id: string]: Date };
  _cursor: NavportCursor;

  constructor(cursor: NavportCursor) {
    // A map of keyName's to a true value.
    this._cursor = cursor;
    this.keydowns = {};
  }

  lastMouseX() {
    return this.cursor().nav().input().mouse().lastMouseX();
  }

  lastMouseY() {
    return this.cursor().nav().input().mouse().lastMouseX();
  }

  getKey(key: string) {
    return this.keydowns[key] ? 1 : 0;
  }

  keyElapsed(key: string, t: Date) {
    const v = this.keydowns[key];
    if (!v) {
      return 0;
    }
    const elapsed = (t.getTime() - v.getTime()) / 1000;
    this.keydowns[key] = t;
    return elapsed;
  }

  cursor() {
    return this._cursor;
  }

  scheduleRepaint() {
    this._cursor.nav().scheduleRepaint();
  }

  carousel() {
    return this.cursor().carousel();
  }

  focusedNode(): PaintedNode {
    return this._cursor.focusedNode();
  }

  keydown(event: Keystroke) {
    if (!event.name().length) {
      return false;
    }
    // this.nav().showInCamera(null);

    if (this.carousel().carouselKey(event)) {
      return true;
    }

    if (this.focusedNode()) {
      return this.focusKey(event);
    }

    if (this.keydowns[event.name()]) {
      // Already processed.
      return true;
    }
    this.keydowns[event.name()] = new Date();

    if (this.navKey(event)) {
      this.scheduleRepaint();
      return true;
    }

    return false;
  }

  keyup(event: Keystroke) {
    if (!this.keydowns[event.name()]) {
      // Already processed.
      return;
    }
    delete this.keydowns[event.name()];

    switch (event.name()) {
      case CLICK_KEY:
        const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x(),
          event.y()
        );
        if (
          this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false)
        ) {
          return;
        }
      // fall through
      case ZOOM_IN_KEY:
      case ZOOM_OUT_KEY:
      case RESET_CAMERA_KEY:
      case MOVE_DOWNWARD_KEY:
      case MOVE_UPWARD_KEY:
      case MOVE_BACKWARD_KEY:
      case MOVE_FORWARD_KEY:
        return true;
    }
    return false;
  }

  clearImpulse() {
    this.nav().input().impulse().clearImpulse();
  }

  focusMovementNavKey(event: Keystroke): boolean {
    switch (event.name()) {
      case MOVE_BACKWARD_KEY:
        this.clearImpulse();
        this.cursor().moveOutwardly(Direction.BACKWARD);
        break;
      case MOVE_FORWARD_KEY:
        this.clearImpulse();
        this.cursor().moveForwardly(true);
        break;
      case MOVE_TO_DOWNWARD_END_KEY:
        this.clearImpulse();
        this.cursor().moveToEnd(Direction.DOWNWARD);
        break;
      case MOVE_TO_UPWARD_END_KEY:
        this.clearImpulse();
        this.cursor().moveToEnd(Direction.UPWARD);
        break;
      case MOVE_TO_FORWARD_END_KEY:
        this.clearImpulse();
        this.cursor().moveToEnd(Direction.FORWARD);
        break;
      case MOVE_TO_BACKWARD_END_KEY:
        this.clearImpulse();
        this.cursor().moveToEnd(Direction.BACKWARD);
        break;
      case MOVE_DOWNWARD_KEY:
        this.clearImpulse();
        this.cursor().moveInwardly(Direction.DOWNWARD);
        break;
      case MOVE_UPWARD_KEY:
        this.clearImpulse();
        this.cursor().moveOutwardly(Direction.UPWARD);
        break;
      case "Backspace":
        this.cursor().moveFocus(Direction.OUTWARD);
        break;
      default:
        return false;
    }
    return true;
  }

  focusNavKey(event: Keystroke): boolean {
    if (this.focusMovementNavKey(event)) {
      return true;
    }
    switch (event.name()) {
      case "Tab":
        this.clearImpulse();
        const toNode = event.shiftKey()
          ? this.focusedNode().value().interact().prevInteractive()
          : this.focusedNode().value().interact().nextInteractive();
        if (toNode) {
          this.cursor().setFocusedNode(toNode as PaintedNode);
          return true;
        }
        break;
      case "Enter":
        this.clearImpulse();
        if (this.focusedNode().value().interact().hasKeyListener()) {
          if (this.focusedNode().value().interact().key(event)) {
            // Node handled it.
            return true;
          }
          // Nothing handled it.
        }
        if (this.focusedNode().hasNode(Direction.INWARD)) {
          return this.cursor().moveFocus(Direction.INWARD);
        } else if (this.focusedNode().hasNode(Direction.OUTWARD)) {
          return this.cursor().moveFocus(Direction.OUTWARD);
        } else if (this.focusedNode().value().interact().hasClickListener()) {
          this.scheduleRepaint();
          return this.focusedNode().value().interact().click();
        } else {
          // Nothing handled it.
          break;
        }
      case CLICK_KEY:
        this.clearImpulse();
        this.focusedNode().value().interact().click();
        this.scheduleRepaint();
        return true;
      case ZOOM_IN_KEY:
        this.clearImpulse();
        this.nav().setFocusScale((1 / 1.1) * this.nav().getFocusScale());
        this.scheduleRepaint();
        return true;
      case ZOOM_OUT_KEY:
        this.clearImpulse();
        this.nav().setFocusScale(1.1 * this.nav().getFocusScale());
        this.scheduleRepaint();
        return true;
      case RESET_CAMERA_KEY:
        this.scheduleRepaint();
        return true;
      default:
        return false;
    }
  }

  nav() {
    return this.cursor().nav();
  }

  focusKey(event: Keystroke) {
    const focused = this.focusedNode().value().interact();
    if (focused.hasKeyListener() && focused.key(event) !== false) {
      this.focusedNode().layoutChanged();
      this.scheduleRepaint();
      return true;
    } else if (this.focusNavKey(event)) {
      // Didn't move the caret, so interpret it as a key move
      // on the node itself.
      return true;
    } else {
      focused.click();
      focused.key(event);
      focused.click();
    }
  }

  navKey(event: Keystroke) {
    switch (event.name()) {
      case CLICK_KEY:
        // console.log("Q key for click pressed!");
        const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x(),
          event.y()
        );
        if (
          this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)
        ) {
          return;
        }
        if (this.nodeUnderCursor()) {
          this.nodeUnderCursor().value().interact().click();
          this.scheduleRepaint();
        }
      // fall through
      case RESET_CAMERA_KEY:
        if (this.carousel().isCarouselShown()) {
          this.carousel().hideCarousel();
          break;
        }
      case ZOOM_IN_KEY:
      case ZOOM_OUT_KEY:
      case MOVE_DOWNWARD_KEY:
      case MOVE_UPWARD_KEY:
      case MOVE_BACKWARD_KEY:
      case MOVE_FORWARD_KEY:
        return KEY_CAMERA_FREE_MOVE;
    }
    return false;
  }

  camera() {
    return this.nav().camera();
  }

  nodeUnderCursor(): PaintedNode {
    return this.focusedNode();
  }

  update(t: Date) {
    const cam = this.camera();
    const xSpeed = 1000 / cam.scale();
    const ySpeed = 1000 / cam.scale();
    const scaleSpeed = 20;

    let needsUpdate = false;

    if (this.getKey(RESET_CAMERA_KEY)) {
      this.nav().input().resetCamera(false);
      needsUpdate = true;
    }

    if (
      this.getKey(MOVE_BACKWARD_KEY) ||
      this.getKey(MOVE_FORWARD_KEY) ||
      this.getKey(MOVE_UPWARD_KEY) ||
      this.getKey(MOVE_DOWNWARD_KEY)
    ) {
      // console.log("Moving");
      const x =
        cam.x() +
        (this.keyElapsed(MOVE_BACKWARD_KEY, t) * xSpeed +
          this.keyElapsed(MOVE_FORWARD_KEY, t) * -xSpeed);
      const y =
        cam.y() +
        (this.keyElapsed(MOVE_UPWARD_KEY, t) * ySpeed +
          this.keyElapsed(MOVE_DOWNWARD_KEY, t) * -ySpeed);
      cam.setOrigin(x, y);
      needsUpdate = true;
    }

    if (this.getKey(ZOOM_OUT_KEY)) {
      // console.log("Continuing to zoom out");
      needsUpdate = true;
      cam.zoomToPoint(
        Math.pow(1.1, scaleSpeed * this.keyElapsed(ZOOM_OUT_KEY, t)),
        cam.width() / 2,
        cam.height() / 2
      );
    }
    if (this.getKey(ZOOM_IN_KEY)) {
      // console.log("Continuing to zoom in");
      needsUpdate = true;
      if (cam.scale() >= MIN_CAMERA_SCALE) {
        cam.zoomToPoint(
          Math.pow(1.1, -scaleSpeed * this.keyElapsed(ZOOM_IN_KEY, t)),
          cam.width() / 2,
          cam.height() / 2
        );
      }
    }

    return needsUpdate;
  }
}
