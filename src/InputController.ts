import { TimeoutTimer } from "parsegraph-timing";
import fuzzyEquals from "parsegraph-fuzzyequals";
import { INTERVAL } from "parsegraph-timingbelt";
import { Keystroke } from "parsegraph-input";
import { matrixTransform2D, makeInverse3x3 } from "parsegraph-matrix";
import { Direction, Alignment } from "parsegraph-direction";
import AnimatedSpotlight from "parsegraph-animatedspotlight";
import Method from "parsegraph-method";
import { logc } from "parsegraph-log";
import { PaintedNode } from "parsegraph-artist";
import Navport from "./Navport";
import { Projector } from "parsegraph-projector";

import normalizeWheel from "parsegraph-normalizewheel";
import { midPoint } from "parsegraph-matrix";
import {TouchRecord} from "parsegraph-input";

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

const WHEEL_MOVES_FOCUS = false;

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

class Input {
  _isDoubleClick: boolean;
  _isDoubleTouch: boolean;
  _lastMouseX: number;
  _lastMouseY: number;
  _listener: InputListener;

  _monitoredTouches: TouchRecord[];
  _touchstartTime: number;
  _touchendTimeout: any;
  _mouseupTimeout: number;
  _mousedownTime: number;
  _focused: boolean;
  _mainContainer: HTMLElement;
  _domContainer: HTMLElement;

  constructor(
    mainContainer: HTMLElement,
    domContainer: HTMLElement,
    listener: InputListener
  ) {
    if (!mainContainer) {
      throw new Error("container must be provided");
    }
    if (!domContainer) {
      throw new Error("domContainer must be provided");
    }
    if (!listener) {
      throw new Error("Event listener must be provided");
    }
    this._mainContainer = mainContainer;
    this._domContainer = domContainer;
    this._isDoubleClick = false;
    this._isDoubleTouch = false;

    this._lastMouseX = 0;
    this._lastMouseY = 0;

    this._monitoredTouches = [];
    this._touchstartTime = null;

    this._isDoubleClick = false;
    this._mouseupTimeout = 0;

    // Whether the container is focused and not blurred.
    this._focused = false;
    this._listener = listener;

    this.mainContainer().setAttribute("tabIndex", "0");

    const addListeners = (
      elem: Element,
      listeners: [string, (event: Event) => void][]
    ) => {
      listeners.forEach((pair: [string, (event: Event) => void]) => {
        elem.addEventListener(pair[0] as string, (event) => {
          return (pair[1] as Function).call(this, event);
        });
      });
    };

    addListeners(this.mainContainer(), [
      ["blur", this.blurListener],
      ["focus", this.focusListener],
      ["keydown", this.keydownListener],
      ["keyup", this.keyupListener],
    ]);

    this.domContainer().style.pointerEvents = "auto";

    addListeners(this.domContainer(), [
      ["DOMMouseScroll", this.onWheel],
      ["mousewheel", this.onWheel],
      ["touchstart", this.touchstartListener],
      ["touchmove", this.touchmoveListener],
      ["touchend", this.removeTouchListener],
      ["touchcancel", this.removeTouchListener],
      ["mousedown", this.mousedownListener],
      ["mousemove", this.mousemoveListener],
      ["mouseup", this.mouseupListener],
      ["mouseout", this.mouseupListener],
    ]);
  }

  mainContainer() {
    return this._mainContainer;
  }

  domContainer() {
    return this._domContainer;
  }

  focusListener() {
    this._focused = true;
  }

  blurListener() {
    this._focused = false;
  }

  focused() {
    return this._focused;
  }

  numActiveTouches() {
    let realMonitoredTouches = 0;
    this._monitoredTouches.forEach(function (touchRec) {
      if (touchRec.touchstart) {
        realMonitoredTouches++;
      }
    }, this);
    return realMonitoredTouches;
  }

  lastMouseCoords() {
    return [this._lastMouseX, this._lastMouseY];
  }

  lastMouseX() {
    return this._lastMouseX;
  }

  lastMouseY() {
    return this._lastMouseY;
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
    this.handleEvent("wheel", {
      x: event.offsetX,
      y: event.offsetY,
      spinX: e.spinX,
      spinY: e.spinY,
      pixelX: e.pixelX,
      pixelY: e.pixelY,
    });
  }

  mousedownListener(event: MouseEvent) {
    this._focused = true;

    this._lastMouseX = event.offsetX;
    this._lastMouseY = event.offsetY;

    this._mousedownTime = Date.now();

    if (
      this.handleEvent("mousedown", {
        x: this._lastMouseX,
        y: this._lastMouseY,
        button: event.button,
        startTime: this._mousedownTime,
      })
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.mainContainer().focus();
    }

    // This click is a second click following
    // a recent click; it's a double-click.
    if (this._mouseupTimeout) {
      window.clearTimeout(this._mouseupTimeout);
      this._mouseupTimeout = null;
      this._isDoubleClick = true;
    }
  }

  removeTouchListener(event: TouchEvent) {
    // console.log("touchend");
    for (let i = 0; i < event.changedTouches.length; ++i) {
      const touch = event.changedTouches[i];
      this.removeTouchByIdentifier(touch.identifier);
    }

    if (
      this.numActiveTouches() > 0
    ) {
      return;
    }
    this._touchendTimeout = setTimeout(()=>{
      this._touchendTimeout = null;

      if (this._touchstartTime != null &&
        Date.now() - this._touchstartTime < 2 * CLICK_DELAY_MILLIS) {
        if (!this._isDoubleTouch) {
          // Single touch ended.
          this.handleEvent("mousedown", {
            x: this._lastMouseX,
            y: this._lastMouseY,
            startTime: this._touchstartTime,
            button: 0
          })
        }
      }
      this._isDoubleTouch = false;
      this._touchstartTime = null;
    }, CLICK_DELAY_MILLIS);
  }

  touchmoveListener(event: TouchEvent) {
    /*if (!this._focused) {
      return;
    }*/
    event.preventDefault();
    // console.log("touchmove", event);

    for (let i = 0; i < event.changedTouches.length; ++i) {
      const touch = event.changedTouches[i];
      const touchRecord = this.getTouchByIdentifier(touch.identifier);

      const touchX = touch.pageX;
      const touchY = touch.pageY;
      /*this.handleEvent("touchmove", {
        multiple: this._monitoredTouches.length != 1,
        x: touchX,
        y: touchY,
        dx: touchX - touchRecord.x,
        dy: touchY - touchRecord.y,
      });*/
      touchRecord.x = touchX;
      touchRecord.y = touchY;
      this._lastMouseX = touchX;
      this._lastMouseY = touchY;
    }

    if (this.numActiveTouches() > 1) {
      const zoomCenter = midPoint(
        this._monitoredTouches[0].x,
        this._monitoredTouches[0].y,
        this._monitoredTouches[1].x,
        this._monitoredTouches[1].y
      );

      const zoomSize = Math.sqrt(
        Math.pow(this._monitoredTouches[1].x - this._monitoredTouches[0].x, 2) +
        Math.pow(this._monitoredTouches[1].y - this._monitoredTouches[0].y, 2)
      );
      if (isNaN(this._zoomSize) || !fuzzyEquals(zoomSize, this._zoomSize, 40)) {
        this.handleEvent("wheel", {
          x: zoomCenter[0],
          y: zoomCenter[1],
          spinY: this._zoomSize > zoomSize ? 1 : -1,
        });
        this._zoomSize = zoomSize;
      }
    }
  }

  _zoomSize: number;

  touchstartListener(event: TouchEvent) {
    event.preventDefault();
    this._focused = true;
    if(this._touchendTimeout) {
      clearTimeout(this._touchendTimeout);
      this._touchendTimeout = null;
    }
    for (let i = 0; i < event.changedTouches.length; ++i) {
      const touch = event.changedTouches[i];
      const touchX = touch.pageX;
      const touchY = touch.pageY;
      const touchRec = new TouchRecord(
        touch.identifier,
        touchX,
        touchY,
        touchX,
        touchY
      );
      this._monitoredTouches.push(touchRec);
      this._lastMouseX = touchX;
      this._lastMouseY = touchY;

      touchRec.touchstart = Date.now();
      if (!this._touchstartTime) {
        this._touchstartTime = Date.now();
        this._isDoubleTouch = false;
      } else {
        this._isDoubleTouch = true;
      }
    }

    if (this.numActiveTouches() > 1) {
      this._touchstartTime = null;
      this._isDoubleTouch = false;
      // Zoom.
      const zoomCenter = midPoint(
        this._monitoredTouches[0].x,
        this._monitoredTouches[0].y,
        this._monitoredTouches[1].x,
        this._monitoredTouches[1].y
      );
      this.handleEvent("touchzoom", {
        x: zoomCenter[0],
        y: zoomCenter[1],
        dx: this._monitoredTouches[1].x - this._monitoredTouches[0].x,
        dy: this._monitoredTouches[1].y - this._monitoredTouches[0].y,
      });
    }
  }

  getTouchByIdentifier(identifier: number): TouchRecord {
    for (let i = 0; i < this._monitoredTouches.length; ++i) {
      if (this._monitoredTouches[i].identifier == identifier) {
        return this._monitoredTouches[i];
      }
    }
    return null;
  }

  removeTouchByIdentifier(identifier: number) {
    let touch = null;
    for (let i = 0; i < this._monitoredTouches.length; ++i) {
      if (this._monitoredTouches[i].identifier == identifier) {
        touch = this._monitoredTouches.splice(i--, 1)[0];
        break;
      }
    }
    return touch;
  }

  mousemoveListener(event: MouseEvent) {
    this.handleEvent("mousemove", {
      x: event.offsetX,
      y: event.offsetY,
      dx: event.offsetX - this._lastMouseX,
      dy: event.offsetY - this._lastMouseY,
    });
    this._lastMouseX = event.offsetX;
    this._lastMouseY = event.offsetY;
  }

  mouseupListener() {
    this.handleEvent("mouseup", {
      x: this._lastMouseX,
      y: this._lastMouseY,
    });
  }

  keydownListener(event: KeyboardEvent) {
    if (event.altKey || event.metaKey) {
      // console.log("Key event had ignored modifiers");
      return;
    }
    if (event.ctrlKey && event.shiftKey) {
      return;
    }

    return this.handleEvent(
      "keydown",
      Keystroke.fromKeyboardEvent(event, this._lastMouseX, this._lastMouseY)
    );
  }

  keyupListener(event: KeyboardEvent) {
    return this.handleEvent(
      "keyup",
      Keystroke.fromKeyboardEvent(event, this._lastMouseX, this._lastMouseY)
    );
  }

  handleEvent(eventType: string, inputData: any) {
    return this._listener(eventType, inputData);
  }
}

export default class InputController {
  _nav: Navport;
  _mousedownTime: number;
  _mouseupTimeout: TimeoutTimer;
  _updateRepeatedly: boolean;
  _focusedNode: PaintedNode;
  _clicksDetected: number;
  _spotlight: AnimatedSpotlight;
  _mouseVersion: number;
  keydowns: { [id: string]: Date };
  listener: Method;
  _attachedMouseListener: Function;
  _horizontalJerk: number;
  _verticalJerk: number;
  _horizontalImpulse: number;
  _verticalImpulse: number;
  _clickedNode: PaintedNode;
  _inputs: Map<Projector, Input>;
  _mousePos: [number, number];

  constructor(nav: Navport) {
    this._nav = nav;
    this._mousePos = [0, 0];
    this._mousedownTime = null;
    this._mouseupTimeout = new TimeoutTimer();
    this._mouseupTimeout.setListener(this.afterMouseTimeout, this);
    this._mouseupTimeout.setDelay(CLICK_DELAY_MILLIS);
    this._inputs = new Map();

    this._updateRepeatedly = false;

    this._focusedNode = null;

    this._clicksDetected = 0;

    this._spotlight = new AnimatedSpotlight();

    this._mouseVersion = 0;

    // A map of keyName's to a true value.
    this.keydowns = {};

    this.listener = null;

    this.resetImpulse();
  }

  handleEvent(eventType: string, eventData: any, proj: Projector): boolean {
    // console.log(eventType, eventData);
    if (eventType === "blur") {
      this.nav().menu().closeMenu();
      return true;
    }
    if (eventType === "wheel") {
      return this.onWheel(eventData);
    }
    if (eventType === "mousedown") {
      return this.onMousedown(eventData);
    }
    if (eventType === "mousemove") {
      return this.onMousemove(eventData, proj);
    }
    if (eventType === "mouseup") {
      return this.onMouseup(eventData);
    }
    if (eventType === "keydown") {
      return this.onKeydown(eventData);
    }
    if (eventType === "keyup") {
      return this.onKeyup(eventData);
    }
    console.log("Unhandled event type: " + eventType);
    return false;
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

  nodeUnderCursor():PaintedNode {
    return this._focusedNode;
  }

  onKeydown(event: Keystroke) {
    console.log("Keydown", event);
    if (!event.name().length) {
      return false;
    }
    // this.nav().showInCamera(null);

    if (this.carousel().carouselKey(event)) {
      // console.log("Carousel key processed.");
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
    this.world().value().scheduleRepaint();
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
    const camera = this.camera();
    if (numSteps > 0 || camera.scale() >= MIN_CAMERA_SCALE) {
      if (this.focusedNode()) {
        camera.zoomToPoint(
          Math.pow(1.1, numSteps),
          event.x,
          event.y
        );
      } else {
        //this.nav().showInCamera(null);
        //camera.zoomToPoint(Math.pow(1.1, numSteps), event.x, event.y);
        camera.zoomToPoint(
          Math.pow(1.1, numSteps),
          this.width() / 2,
          this.height() / 2
        );
      }
    }
    this.mouseChanged();
    return true;
  }

  camera() {
    return this._nav.camera();
  }

  mouseDragListener(x: number, y: number, dx: number, dy: number) {
    this.mouseChanged();
    // this.nav().showInCamera(null);
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

    if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1])) {
      // console.log("Node clicked.");
      // return true;
      this.savePos(
        mouseInWorld[0],
        mouseInWorld[1]
      );
      this._spotlight.dispose();
      if (!this._mousedownTime) {
        // console.log("Checking for node");
        this._mousedownTime = Date.now();
      }
    }

    this._attachedMouseListener = this.mouseDragListener;
    // console.log("Repainting graph");
    return true;
  }

  savePos(x:number, y:number) {
    this._mousePos[0] = x;
    this._mousePos[1] = y;
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
    if (this._nav.root().value().getLayout().commitLayoutIteratively(INPUT_LAYOUT_TIME)) {
      // console.log("Couldn't commit layout in time");
      overClickable = 1;
    } else {
      /*overClickable = this._nav
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
        // console.log("World not ready");
        break;
      case 0:
        this._nav.setCursor("auto");
        break;
    }
    this.mouseChanged();
    return true;
  }

  checkForNodeClick(x: number, y: number):boolean {
    if (this.world().value().getLayout().commitLayoutIteratively(INPUT_LAYOUT_TIME)) {
      this._clickedNode = null;
      this.setFocusedNode(null);
      this.nav().showInCamera(null);
      return false;
    }
    const selectedNode = this.world()
      .value()
      .getLayout()
      .nodeUnderCoords(x, y) as PaintedNode;
    if (!selectedNode) {
      logc("Mouse clicks", "No node found under coords:", x, y);
      this._clickedNode = null;
      this.setFocusedNode(null);
      this.nav().showInCamera(null);
      return false;
    }

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
    this.setFocusedNode(selectedNode);

    return true;
  }

  afterMouseTimeout() {
    // Cancel the timer if we have found a double click
    this._mouseupTimeout.cancel();

    const selectedNode = this.focusedNode();
    if (selectedNode) {
      if (this._clicksDetected >= 2) {
        // Double click ended.
        this.nav().showInCamera(selectedNode);
      } else if (this._clicksDetected > 0) {
        // Check if the selected node has a click listener.
        if (this._clickedNode === selectedNode) {
          if (selectedNode.value().interact().hasClickListener()) {
            // console.log("Selected Node has click listener", selectedNode);
            if (selectedNode.value().interact().click()) {
              this._clickedNode = null;
            }
            this.scheduleRepaint();
          }
        } else {
          this._clickedNode = selectedNode;
        }
      }
    }

    this._clicksDetected = 0;
    this._mousedownTime = null;
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

    if (this.world().value().getLayout().commitLayoutIteratively(INPUT_LAYOUT_TIME)) {
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
      //console.log("Moving");
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
      //console.log("Continuing to zoom out");
      this._updateRepeatedly = true;
      needsUpdate = true;
      cam.zoomToPoint(
        Math.pow(1.1, scaleSpeed * this.keyElapsed(ZOOM_OUT_KEY, t)),
        this.width() / 2,
        this.height() / 2
      );
    }
    if (this.getKey(ZOOM_IN_KEY)) {
      //console.log("Continuing to zoom in");
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

  focusedNode():PaintedNode {
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

  menu() {
    return this.nav().menu();
  }

  nav() {
    return this._nav;
  }

  world():PaintedNode {
    return this.nav().root();
  }

  paint(projector: Projector):boolean {
    if (!this._inputs.has(projector)) {
      this._inputs.set(
        projector,
        new Input(
          projector.glProvider().container(),
          projector.glProvider().container(),
          (eventType: string, inputData?: any) => {
            if (this.handleEvent(eventType, inputData, projector)) {
              this.scheduleRepaint();
              return true;
            }
            return false;
          }
        )
      );
    }
    if (
      !this._focusedNode ||
      this._focusedNode.value().getLayout().needsPosition()
    ) {
      return false;
    }

    this._spotlight.paint(projector);
    return false;
  }

  render(proj: Projector) {
    const gl = proj.glProvider().gl();
    if (this.focusedNode()) {
      const layout = this.focusedNode().value().getLayout();
      const ctx = proj.overlay();
      proj.overlay().strokeStyle = "white";
      proj.overlay().lineWidth = 4;
      proj.overlay().lineJoin = "round";
      ctx.setLineDash([5]);
      const rect = layout.absoluteSizeRect();
      proj.overlay().save();
      proj.overlay().resetTransform();
      const sc = this.camera().scale();
      proj.overlay().scale(sc, sc);
      proj.overlay().translate(this.camera().x(), this.camera().y());
      proj.overlay().strokeRect(
        rect.x() - rect.width()/2, rect.y() - rect.height()/2, rect.width(), rect.height()
      );
      proj.overlay().restore();
    }
    if (this._spotlight) {
      gl.enable(gl.BLEND);
      this._spotlight.setWorldTransform(this.camera().project());
      return this._spotlight.render(proj);
    }
    return false;
  }
}

const CLICK_DELAY_MILLIS: number = 200;
type InputListener = (eventType: string, inputData?: any) => boolean;

