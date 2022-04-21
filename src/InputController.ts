import { TimeoutTimer } from "parsegraph-timing";
import fuzzyEquals from "parsegraph-fuzzyequals";
import { INTERVAL } from "parsegraph-timingbelt";
import { Keystroke, CLICK_DELAY_MILLIS } from "parsegraph-input";
import { matrixTransform2D, makeInverse3x3 } from "parsegraph-matrix";
import { Direction, Alignment } from "parsegraph-direction";
import AnimatedSpotlight from "parsegraph-animatedspotlight";
import Method from "parsegraph-method";
import { logc } from "parsegraph-log";
import { PaintedNode } from "parsegraph-artist";
import Navport from "./Navport";
import { Projector } from "parsegraph-projector";

export const TOUCH_SENSITIVITY = 1;
export const MOUSE_SENSITIVITY = 1;

let impulseThreshold = 20;
let impulseDecay = 0.0;
export function getImpulse() {
  return [impulseThreshold, impulseDecay];
}

export function setImpulse(threshold: number, decay: number) {
  impulseThreshold = threshold;
  impulseDecay = decay;
}

let mouseImpulseAdjustment = -0.135;
export function getMouseImpulseAdjustment() {
  return mouseImpulseAdjustment;
}
export function setMouseImpulseAdjustment(value: number) {
  mouseImpulseAdjustment = value;
}

let wheelImpulseAdjustment = 0.75;
export function getWheelImpulseAdjustment() {
  return wheelImpulseAdjustment;
}
export function setWheelImpulseAdjustment(value: number) {
  wheelImpulseAdjustment = value;
}

let impulseRetention = 1;
export function getImpulseRetention() {
  return impulseRetention;
}
export function setImpulseRetention(value: number) {
  impulseRetention = value;
}

// The amount by which a slider is adjusted by keyboard and mouse events.
export const SLIDER_NUDGE = 0.01;

// How many milliseconds to commit a layout if an input event is detected.
export const INPUT_LAYOUT_TIME = INTERVAL;

const RESET_CAMERA_KEY = "Escape";
const CLICK_KEY = " ";

const WHEEL_MOVES_FOCUS = true;

const MOVE_UPWARD_KEY = "ArrowUp";
const MOVE_DOWNWARD_KEY = "ArrowDown";
const MOVE_BACKWARD_KEY = "ArrowLeft";
const MOVE_FORWARD_KEY = "ArrowRight";
const MOVE_TO_FORWARD_END_KEY = "End";
const MOVE_TO_BACKWARD_END_KEY = "Home";
const MOVE_TO_UPWARD_END_KEY = "PageUp";
const MOVE_TO_DOWNWARD_END_KEY = "PageDown";

const MIN_CAMERA_SCALE = 0.00125;

// const MOVE_UPWARD_KEY = "w";
// const MOVE_DOWNWARD_KEY = "s";
// const MOVE_BACKWARD_KEY = "a";
// const MOVE_FORWARD_KEY = "d";

const ZOOM_IN_KEY = "ZoomIn";
const ZOOM_OUT_KEY = "ZoomOut";

const minimum = 0.005;

export default class Input {
  _nav: Navport;
  _mousedownTime: number;
  _mouseupTimeout: TimeoutTimer;
  _updateRepeatedly: boolean;
  _focusedNode: PaintedNode;
  _focusedLabel: boolean;
  _clicksDetected: number;
  _spotlight: AnimatedSpotlight;
  _mouseVersion: number;
  keydowns: { [id: string]: Date };
  _zoomTouchDistance: number;
  _selectedSlider: PaintedNode;
  listener: Method;
  _attachedMouseListener: Function;
  _horizontalJerk: number;
  _verticalJerk: number;
  _horizontalImpulse: number;
  _verticalImpulse: number;
  _clickedNode: PaintedNode;

  constructor(nav: Navport) {
    this._nav = nav;
    this._mousedownTime = null;
    this._mouseupTimeout = new TimeoutTimer();
    this._mouseupTimeout.setListener(this.afterMouseTimeout, this);
    this._mouseupTimeout.setDelay(CLICK_DELAY_MILLIS);

    this._updateRepeatedly = false;

    this._focusedNode = null;
    this._focusedLabel = false;

    this._clicksDetected = 0;

    this._spotlight = new AnimatedSpotlight();

    this._mouseVersion = 0;

    // A map of keyName's to a true value.
    this.keydowns = {};

    this._zoomTouchDistance = 0;

    this._selectedSlider = null;

    this.listener = null;

    this.resetImpulse();
  }

  adjustSelectedSlider(newVal: number, isAbsolute?: boolean) {
    if (!this._selectedSlider) {
      return;
    }
    if (!isAbsolute) {
      newVal = this._selectedSlider.value() + newVal;
    }
    newVal = Math.max(0, Math.min(1, newVal));
    this._selectedSlider.setValue(newVal);
    this._selectedSlider.layoutChanged();
    this.scheduleRepaint();
  }

  setSelectedSlider() {
    if (this._selectedSlider) {
      this._selectedSlider.layoutChanged();
    }
    this._selectedSlider = null;
    this.scheduleRepaint();
  }

  sliderKey(event: Keystroke) {
    const diff = SLIDER_NUDGE;
    switch (event.name()) {
      case MOVE_BACKWARD_KEY:
        this.adjustSelectedSlider(-diff, false);
        return;
      case MOVE_FORWARD_KEY:
        this.adjustSelectedSlider(diff, false);
        return;
      case "Space":
      case "Spacebar":
      case " ":
      case RESET_CAMERA_KEY:
        this._selectedSlider.layoutChanged();
        this._attachedMouseListener = null;
        this._selectedSlider = null;
        this.scheduleRepaint();
        return;
      default:
        return false;
    }
  }

  focusMovementNavKey(event: Keystroke): boolean {
    switch (event.name()) {
      case MOVE_BACKWARD_KEY:
        this.clearImpulse();
        return this.moveOutwardly(Direction.BACKWARD);
      case MOVE_FORWARD_KEY:
        this.clearImpulse();
        return this.moveForwardly(true);
      case MOVE_TO_DOWNWARD_END_KEY:
        this.clearImpulse();
        return this.moveToEnd(Direction.DOWNWARD);
      case MOVE_TO_UPWARD_END_KEY:
        this.clearImpulse();
        return this.moveToEnd(Direction.UPWARD);
      case MOVE_TO_FORWARD_END_KEY:
        this.clearImpulse();
        return this.moveToEnd(Direction.FORWARD);
      case MOVE_TO_BACKWARD_END_KEY:
        this.clearImpulse();
        return this.moveToEnd(Direction.BACKWARD);
      case MOVE_DOWNWARD_KEY:
        this.clearImpulse();
        return this.moveInwardly(Direction.DOWNWARD);
      case MOVE_UPWARD_KEY:
        this.clearImpulse();
        return this.moveOutwardly(Direction.UPWARD);
      case "Backspace":
        return this.moveFocus(Direction.OUTWARD);
      default:
        return false;
    }
  }

  focusNavKey(event: Keystroke): boolean {
    if (this.focusMovementNavKey(event)) {
      return true;
    }
    switch (event.name()) {
      case "Tab":
        this.clearImpulse();
        const toNode = event.shiftKey()
          ? this._focusedNode.value().interact().prevInteractive()
          : this._focusedNode.value().interact().nextInteractive();
        if (toNode) {
          this.setFocusedNode(toNode as PaintedNode);
          return true;
        }
        break;
      case "Enter":
        this.clearImpulse();
        if (this._focusedNode.value().interact().hasKeyListener()) {
          if (this._focusedNode.value().interact().key(event)) {
            // Node handled it.
            return true;
          }
          // Nothing handled it.
        }
        if (this._focusedNode.hasNode(Direction.INWARD)) {
          return this.moveFocus(Direction.INWARD);
        } else if (this._focusedNode.hasNode(Direction.OUTWARD)) {
          return this.moveFocus(Direction.OUTWARD);
        } else if (this._focusedNode.value().interact().hasClickListener()) {
          this.scheduleRepaint();
          return this._focusedNode.value().interact().click();
        } else {
          // Nothing handled it.
          break;
        }
      case CLICK_KEY:
        this.clearImpulse();
        this._focusedNode.value().interact().click();
        this.scheduleRepaint();
        return true;
      case ZOOM_IN_KEY:
        this.clearImpulse();
        this._nav.setFocusScale((1 / 1.1) * this._nav.getFocusScale());
        this.scheduleRepaint();
        return true;
      case ZOOM_OUT_KEY:
        this.clearImpulse();
        this._nav.setFocusScale(1.1 * this._nav.getFocusScale());
        this.scheduleRepaint();
        return true;
      case RESET_CAMERA_KEY:
        this.scheduleRepaint();
        return true;
      default:
        return false;
    }
  }

  focusKey(event: Keystroke) {
    const focused = this._focusedNode.value().interact();
    if (focused.hasKeyListener() && focused.key(event) !== false) {
      this._focusedNode.layoutChanged();
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

  carousel() {
    return this.nav().carousel();
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
        return true;
    }
    return false;
  }

  nodeUnderCursor() {
    return this._focusedNode;
  }

  onKeydown(event: Keystroke) {
    console.log("Keydown", event);
    if (!event.name().length) {
      return false;
    }
    // this._viewport.showInCamera(null);

    if (this.carousel().carouselKey(event)) {
      // console.log("Carousel key processed.");
      return true;
    }

    if (this._selectedSlider && this.sliderKey(event)) {
      return true;
    }

    if (this._focusedNode) {
      return this.focusKey(event);
    }

    if (this.keydowns[event.name()]) {
      // Already processed.
      // console.log("Key event, but already processed.");
      return true;
    }
    this.keydowns[event.name()] = new Date();

    return this.navKey(event);
  }

  onKeyup(event: Keystroke) {
    console.log("Keyup", event);

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
          // console.log("Carousel processed event.");
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

  moveToEnd(dir: Direction): boolean {
    let moved = false;
    while (this.moveFocus(dir)) {
      moved = true;
    }
    return moved;
  }

  moveForwardly(skipHorizontalInward?: boolean, event?: any): boolean {
    let node = this._focusedNode;
    if (
      node.hasNode(Direction.INWARD) &&
      node.nodeAlignmentMode(Direction.INWARD) != Alignment.INWARD_VERTICAL &&
      !skipHorizontalInward
    ) {
      this.setFocusedNode(node.nodeAt(Direction.INWARD));
      return true;
    }
    // console.log("ArrowRight");
    let neighbor = node.nodeAt(Direction.FORWARD);
    if (neighbor) {
      this.setFocusedNode(neighbor);
      this._focusedLabel = !(event && event.ctrlKey);
      return true;
    }
    neighbor = node.nodeAt(Direction.OUTWARD);
    if (neighbor) {
      // console.log("Going outward");
      skipHorizontalInward = true;
      node = neighbor;
      return null;
    }
    // Search up the parents hoping that an inward node can be escaped.
    while (true) {
      if (node.isRoot()) {
        // The focused node is not within an inward node.
        return false;
      }
      const pdir = node.parentDirection();
      node = node.nodeAt(pdir);
      if (pdir === Direction.OUTWARD) {
        // Found the outward node to escape.
        skipHorizontalInward = true;
        break;
      }
    }
    // Continue traversing using the found node.
    return true;
  }

  moveInwardly(dir: Direction): boolean {
    return this.moveFocus(dir) || this.moveFocus(Direction.INWARD);
  }

  moveOutwardly(dir: Direction): boolean {
    return this.moveFocus(dir) || this.moveFocus(Direction.OUTWARD);
  }

  moveFocus(dir: Direction): boolean {
    if (!this._focusedNode) {
      return false;
    }
    const neighbor = this._focusedNode.nodeAt(dir);
    if (neighbor) {
      this.setFocusedNode(neighbor);
      return true;
    }
    return false;
  }

  scheduleRepaint() {
    this.world().value().scheduleUpdate();
    this.nav().scheduleRepaint();
  }

  addImpulse(x: number, y: number): void {
    this._horizontalJerk = this._horizontalJerk * getImpulseRetention() + x;
    this._verticalJerk = this._verticalJerk * getImpulseRetention() + y;
    this.scheduleRepaint();
  }

  clearImpulse() {
    console.log("Clearing impulse");
    this._horizontalJerk = 0;
    this._verticalJerk = 0;
    this._horizontalImpulse = 0;
    this._verticalImpulse = 0;
  }

  resetImpulse() {
    this.clearImpulse();
  }

  hasImpulse() {
    console.log(
      "Checking for impulse: " +
        this._horizontalImpulse +
        ", " +
        this._verticalImpulse
    );
    return (
      !fuzzyEquals(this._horizontalImpulse, 0, minimum) ||
      !fuzzyEquals(this._verticalImpulse, 0, minimum)
    );
  }

  hasJerk() {
    return (
      !fuzzyEquals(this._horizontalJerk, 0, minimum) ||
      !fuzzyEquals(this._verticalJerk, 0, minimum)
    );
  }

  checkImpulse(THRESHOLD: number, DECAY: number) {
    // console.log("Before jerk");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);
    this._horizontalImpulse += this._horizontalJerk;
    this._verticalImpulse += this._verticalJerk;
    // console.log("After jerk");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    this._horizontalJerk *= DECAY;
    this._verticalJerk *= DECAY;
    // console.log("After decay");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    const getImpulseDirection = () => {
      if (this._verticalImpulse < -THRESHOLD) {
        return Direction.UPWARD;
      } else if (this._verticalImpulse > THRESHOLD) {
        return Direction.DOWNWARD;
      } else if (this._horizontalImpulse > THRESHOLD) {
        return Direction.FORWARD;
      } else if (this._horizontalImpulse < -THRESHOLD) {
        return Direction.BACKWARD;
      } else {
        return Direction.NULL;
      }
    };

    const dir = getImpulseDirection();
    if (dir === Direction.NULL) {
      return false;
    }
    if (this.moveFocus(dir)) {
      this._horizontalImpulse *= DECAY;
      this._verticalImpulse *= DECAY;
      return true;
    }

    // console.log("Reversing");
    this._horizontalImpulse *= -DECAY;
    this._verticalImpulse *= -DECAY;
    this._horizontalJerk *= -DECAY;
    this._verticalJerk *= -DECAY;
    // console.log("After reversal");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    return false;
  }

  onWheel(event: any) {
    console.log(event);

    if (WHEEL_MOVES_FOCUS && this._focusedNode) {
      this.addImpulse(
        getWheelImpulseAdjustment() * event.spinX,
        getWheelImpulseAdjustment() * event.spinY
      );
      return true;
    }

    // Adjust the scale.
    const numSteps = event.spinY > 0 ? -1 : 1;
    if (this._selectedSlider) {
      this.adjustSelectedSlider(numSteps * SLIDER_NUDGE, false);
      return true;
    }
    const camera = this.camera();
    if (numSteps > 0 || camera.scale() >= MIN_CAMERA_SCALE) {
      this.nav().showInCamera(null);
      camera.zoomToPoint(Math.pow(1.1, numSteps), event.x, event.y);
    }
    this.mouseChanged();
    return true;
  }

  camera() {
    return this._nav.camera();
  }

  onTouchzoom(event: any) {
    // Zoom.
    const dist = Math.sqrt(Math.pow(event.dx, 2) + Math.pow(event.dy, 2));
    const cam = this.camera();
    if (dist != 0 && this._zoomTouchDistance != 0) {
      this.nav().showInCamera(null);
      cam.zoomToPoint(dist / this._zoomTouchDistance, event.x, event.y);
      this._zoomTouchDistance = dist;
      this.mouseChanged();
      return true;
    }
    this._zoomTouchDistance = dist;
    return false;
  }

  onTouchmove(event: any, proj: Projector) {
    if (event.multiple) {
      return false;
    }
    return this.onMousemove(event, proj);
  }

  mouseDragListener(x: number, y: number, dx: number, dy: number) {
    this.mouseChanged();
    // this._viewport.showInCamera(null);
    // const camera = this.camera();
    this.addImpulse(
      getMouseImpulseAdjustment() * -dx,
      getMouseImpulseAdjustment() * -dy
    );
    // camera.adjustOrigin(dx / camera.scale(), dy / camera.scale());
    return true;
  }

  onMousedown(event: any) {
    if (this.menu().onMousedown(event.x, event.y)) {
      // console.log("Menu click processed.");
      return;
    }

    console.log("Mouse is down");

    const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y
    );
    this.mouseChanged();

    if (this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)) {
      // console.log("Carousel click processed.");
      return;
    }

    this._spotlight.dispose();

    // console.log("Checking for node");
    this._mousedownTime = Date.now();
    if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1])) {
      // console.log("Node clicked.");
      // return true;
    }

    if (this._selectedSlider) {
      this.setSelectedSlider();
    }

    this._attachedMouseListener = this.mouseDragListener;
    // console.log("Repainting graph");
    return true;
  }

  onMousemove(event: any, proj: Projector) {
    if (this._nav.menu().onMousemove(event.x, event.y)) {
      return true;
    }

    const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y
    );

    if (this.carousel().isCarouselShown()) {
      this.mouseChanged();

      const overClickable: number = this.carousel().mouseOverCarousel(
        proj,
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
      return this._attachedMouseListener(
        mouseInWorld[0],
        mouseInWorld[1],
        event.dx,
        event.dy
      );
    }

    // Just a mouse moving over the (focused) canvas.
    let overClickable;
    if (!this._nav.root().value().getLayout().commitLayout(INPUT_LAYOUT_TIME)) {
      // console.log("Couldn't commit layout in time");
      overClickable = 1;
    } else {
      overClickable = this._nav
        .root()
        .value()
        .interact()
        .mouseOver(mouseInWorld[0], mouseInWorld[1]);
    }
    switch (overClickable) {
      case 2:
        this._nav.setCursor("pointer");
        break;
      case 1:
        // console.log("World not ready");
        break;
      case 0:
        this._nav.setCursor("auto");
        break;
    }
    this.mouseChanged();
    return true;
  }

  onTouchstart(event: any) {
    if (event.multiple) {
      return false;
    }
    return this.onMousedown(event);
  }

  checkForNodeClick(x: number, y: number) {
    if (!this.world().value().getLayout().commitLayout(INPUT_LAYOUT_TIME)) {
      return null;
    }
    const selectedNode = this.world()
      .value()
      .getLayout()
      .nodeUnderCoords(x, y) as PaintedNode;
    if (!selectedNode) {
      logc("Mouse clicks", "No node found under coords:", x, y);
      this.setFocusedNode(null);
      this.nav().showInCamera(null);
      return null;
    }

    logc(
      "Mouse clicks",
      "Node {0} found for coords ({1}, {2})",
      selectedNode,
      x,
      y
    );

    // Check if the selected node has a click listener.
    if (selectedNode.value().interact().hasClickListener()) {
      // console.log("Selected Node has click listener", selectedNode);
      if (this._focusedNode === selectedNode) {
        const rv = selectedNode.value().interact().click();
        if (rv !== false) {
          return selectedNode;
        }
      } else {
        this.setFocusedNode(selectedNode);
        this.scheduleRepaint();
      }
    }

    if (selectedNode && !selectedNode.value().getLayout().ignoresMouse()) {
      this.setFocusedNode(selectedNode);
      // console.log("Selected Node has nothing", selectedNode);
    } else {
      this.setFocusedNode(selectedNode);
      this._clickedNode = selectedNode;
    }

    return null;
  }

  afterMouseTimeout() {
    // Cancel the timer if we have found a double click
    this._mouseupTimeout.cancel();

    if (this._clicksDetected >= 2) {
      // Double click ended.
      if (this._clickedNode) {
        this.nav().showInCamera(this._clickedNode);
        this._clickedNode = null;
      }
    }

    this._clicksDetected = 0;
  }

  onMouseup(event: any) {
    // console.log("MOUSEUP");
    const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y
    );

    if (
      this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false)
    ) {
      // console.log("Carousel handled event.");
      return true;
    }
    if (!this._attachedMouseListener) {
      // console.log("No attached listener");
      return false;
    }
    this._attachedMouseListener = null;
    this.resetImpulse();

    if (!this.world().value().getLayout().commitLayout(INPUT_LAYOUT_TIME)) {
      return true;
    }

    if (
      this._mousedownTime != null &&
      Date.now() - this._mousedownTime < CLICK_DELAY_MILLIS
    ) {
      ++this._clicksDetected;
      if (this._clicksDetected === 2) {
        this.afterMouseTimeout();
        return true;
      }
      this._mouseupTimeout.schedule();
    } else {
      // console.log("Click missed timeout");
    }
    return false;
  }

  onTouchend(event: any) {
    if (event.multiple) {
      return false;
    }
    this._zoomTouchDistance = 0;
    return this.onMouseup(event);
  }

  SetListener(listener: Function, thisArg?: object) {
    if (!listener) {
      this.listener = null;
      return;
    }
    if (!thisArg) {
      thisArg = this;
    }
    this.listener = new Method(listener, thisArg);
  }

  updateRepeatedly() {
    return this._updateRepeatedly || this.carousel().updateRepeatedly();
  }

  mouseVersion() {
    return this._mouseVersion;
  }

  mouseChanged() {
    ++this._mouseVersion;
  }

  width() {
    return this.nav().camera().width();
  }

  height() {
    return this.nav().camera().height();
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

  update(t: Date) {
    const cam = this.camera();

    const xSpeed = 1000 / cam.scale();
    const ySpeed = 1000 / cam.scale();
    const scaleSpeed = 20;

    let needsUpdate = this.nav().mouseVersion() !== this.mouseVersion();
    logc(
      "Input updates",
      "Input.update=" +
        (this.nav().mouseVersion() + " vs " + this.mouseVersion())
    );

    this._updateRepeatedly = false;

    if (this.getKey(RESET_CAMERA_KEY)) {
      this.resetCamera(false);
      needsUpdate = true;
    }

    if (
      this.getKey(MOVE_BACKWARD_KEY) ||
      this.getKey(MOVE_FORWARD_KEY) ||
      this.getKey(MOVE_UPWARD_KEY) ||
      this.getKey(MOVE_DOWNWARD_KEY)
    ) {
      console.log("Moving");
      this._updateRepeatedly = true;
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
      console.log("Continuing to zoom out");
      this._updateRepeatedly = true;
      needsUpdate = true;
      cam.zoomToPoint(
        Math.pow(1.1, scaleSpeed * this.keyElapsed(ZOOM_OUT_KEY, t)),
        this.width() / 2,
        this.height() / 2
      );
    }
    if (this.getKey(ZOOM_IN_KEY)) {
      console.log("Continuing to zoom in");
      this._updateRepeatedly = true;
      needsUpdate = true;
      if (cam.scale() >= MIN_CAMERA_SCALE) {
        cam.zoomToPoint(
          Math.pow(1.1, -scaleSpeed * this.keyElapsed(ZOOM_IN_KEY, t)),
          this.width() / 2,
          this.height() / 2
        );
      }
    }

    if (this._focusedNode) {
      if (this._spotlight.animating()) {
        this._updateRepeatedly = true;
        needsUpdate = true;
      }
      const impulseSettings = getImpulse();
      // console.log(this._viewport.getFocusScale()*this._focusedNode.absoluteScale());
      const THRESHOLD = impulseSettings[0];
      // const THRESHOLD = Math.min(3, impulseSettings[0]*(this._viewport.getFocusScale()*this._focusedNode.absoluteScale()));
      const DECAY = impulseSettings[1];
      // console.log("Impulse threshold=" + THRESHOLD);
      // console.log("Impulse decay=" + DECAY);
      if (this.checkImpulse(THRESHOLD, DECAY) || this.hasJerk()) {
        console.log("Impulse needs input update");
        this._updateRepeatedly = true;
        needsUpdate = true;
      }
    }

    // var x = cam.x();
    // var y = cam.y();
    // var r = this._viewport.world().boundingRect();
    // x = Math.max(x, r.x() - r.width()/2);
    // x = Math.min(x, r.x() + r.width()/2);
    // y = Math.max(y, r.y() - r.height()/2);
    // y = Math.min(y, r.y() + r.height()/2);
    // console.log("BR", x, y, r);
    // cam.setOrigin(x, y);

    // console.log("Input update repeatedly status is " + this._updateRepeatedly);
    return needsUpdate;
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

  paint(proj: Projector) {
    if (
      !this._focusedNode ||
      this._focusedNode.value().getLayout().needsPosition()
    ) {
      return;
    }

    this._spotlight.paint(proj);
  }

  focusedNode() {
    return this._focusedNode;
  }

  setFocusedNode(focusedNode: PaintedNode) {
    if (focusedNode === this._focusedNode) {
      return;
    }
    this._focusedNode = focusedNode;
    if (this._focusedNode) {
      this.nav().showInCamera(this._focusedNode);
      this.carousel().clearCarousel();
      this.carousel().hideCarousel();
      this.carousel().scheduleCarouselRepaint();
      this._spotlight.restart(this._focusedNode);
    }
    this.scheduleRepaint();
  }

  focusedLabel() {
    return this._focusedLabel;
  }

  menu() {
    return this.nav().menu();
  }

  nav() {
    return this._nav;
  }

  world() {
    return this.nav().root();
  }

  render(proj: Projector) {
    const gl = proj.glProvider().gl();
    if (this._spotlight) {
      gl.enable(gl.BLEND);
      return this._spotlight.render(proj);
    }
    return false;
  }
}
