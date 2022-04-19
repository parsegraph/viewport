import { TimeoutTimer } from "parsegraph-timing";
import fuzzyEquals from "parsegraph-fuzzyequals";
import { Keystroke, CLICK_DELAY_MILLIS, INTERVAL } from "parsegraph-window";
import {
  matrixTransform2D,
  makeInverse3x3,
  Matrix3x3,
} from "parsegraph-matrix";
import { Direction, Alignment } from "parsegraph-direction";
import Color from "parsegraph-color";
import BlockPainter from "parsegraph-blockpainter";
import AnimatedSpotlight from "parsegraph-animatedspotlight";
import Viewport from "../viewport/Viewport";
import Method from "parsegraph-method";
import { logc } from "parsegraph-log";
import WindowNode from "../windownode/WindowNode";

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
const CARET_COLOR = new Color(0, 0, 0, 0.5);

const MIN_CAMERA_SCALE = 0.00125;

// const MOVE_UPWARD_KEY = "w";
// const MOVE_DOWNWARD_KEY = "s";
// const MOVE_BACKWARD_KEY = "a";
// const MOVE_FORWARD_KEY = "d";

const ZOOM_IN_KEY = "ZoomIn";
const ZOOM_OUT_KEY = "ZoomOut";

const minimum = 0.005;

export default class Input {
  _viewport: Viewport;
  _mousedownTime: number;
  _mouseupTimeout: TimeoutTimer;
  _updateRepeatedly: boolean;
  _caretPainter: BlockPainter;
  _caretPos: number[];
  _caretColor: Color;
  _focusedNode: WindowNode;
  _focusedLabel: boolean;
  _clicksDetected: number;
  _spotlight: AnimatedSpotlight;
  _mouseVersion: number;
  keydowns: { [id: string]: Date };
  _zoomTouchDistance: number;
  _selectedSlider: WindowNode;
  listener: Method;
  _attachedMouseListener: Function;
  _horizontalJerk: number;
  _verticalJerk: number;
  _horizontalImpulse: number;
  _verticalImpulse: number;
  _clickedNode: WindowNode;

  constructor(viewport: Viewport) {
    this._viewport = viewport;
    this._mousedownTime = null;
    this._mouseupTimeout = new TimeoutTimer();
    this._mouseupTimeout.setListener(this.afterMouseTimeout, this);
    this._mouseupTimeout.setDelay(CLICK_DELAY_MILLIS);

    this._updateRepeatedly = false;

    this._caretPainter = null;
    this._caretPos = [];
    this._caretColor = CARET_COLOR;
    this._focusedNode = null;
    this._focusedLabel = false;

    this._clicksDetected = 0;

    this._spotlight = new AnimatedSpotlight(viewport);

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
    this._selectedSlider.layoutWasChanged();
    this.scheduleRepaint();
  }

  setSelectedSlider() {
    if (this._selectedSlider) {
      this._selectedSlider.layoutWasChanged();
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
        this._selectedSlider.layoutWasChanged();
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
        if (!this._focusedNode._extended) {
          return false;
        }
        this.clearImpulse();
        const toNode = event.shiftKey()
          ? this._focusedNode._extended.prevTabNode
          : this._focusedNode._extended.nextTabNode;
        if (toNode) {
          this.setFocusedNode(toNode as Node<DefaultNodeType>);
          return true;
        }
        break;
      case "Enter":
        this.clearImpulse();
        if (this._focusedNode.hasKeyListener()) {
          if (this._focusedNode.key(event, this.viewport())) {
            // Node handled it.
            return true;
          }
          // Nothing handled it.
        }
        if (this._focusedNode.hasNode(Direction.INWARD)) {
          return this.moveFocus(Direction.INWARD);
        } else if (this._focusedNode.hasNode(Direction.OUTWARD)) {
          return this.moveFocus(Direction.OUTWARD);
        } else if (this._viewport && this._focusedNode.hasClickListener()) {
          this.scheduleRepaint();
          return this._focusedNode.click(this._viewport);
        } else {
          // Nothing handled it.
          break;
        }
      case CLICK_KEY:
        this.clearImpulse();
        this._focusedNode.click(this._viewport);
        this.scheduleRepaint();
        return true;
      case ZOOM_IN_KEY:
        this.clearImpulse();
        this._viewport.setFocusScale(
          (1 / 1.1) * this._viewport.getFocusScale()
        );
        this.scheduleRepaint();
        return true;
      case ZOOM_OUT_KEY:
        this.clearImpulse();
        this._viewport.setFocusScale(1.1 * this._viewport.getFocusScale());
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
    console.log("focusKey", event);
    if (this._focusedNode._label && event.ctrlKey()) {
      if (this._focusedNode._label.ctrlKey(event)) {
        // console.log("LAYOUT CHANGED");
        this._focusedNode.layoutWasChanged();
        this.scheduleRepaint();
        return true;
      }
    } else if (
      this._focusedNode.hasKeyListener() &&
      this._focusedNode.key(event, this.viewport()) !== false
    ) {
      console.log("KEY PRESSED FOR LISTENER; LAYOUT CHANGED");
      this._focusedNode.layoutWasChanged();
      this.scheduleRepaint();
      return true;
    } else if (
      this._focusedNode._label &&
      this._focusedNode._label.editable() &&
      this._focusedNode._label.key(event)
    ) {
      console.log("LABEL ACCEPTS KEY; LAYOUT CHANGED");
      this._focusedNode.layoutWasChanged();
      this.scheduleRepaint();
      return true;
    }
    // Didn't move the caret, so interpret it as a key move
    // on the node itself.
    else if (this.focusNavKey(event)) {
      return true;
    } else {
      this._focusedNode.click(this._viewport);
      this._focusedNode.key(event, this._viewport);
      this._focusedNode.click(this._viewport);
    }
  }

  carousel() {
    return this.viewport().carousel();
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
        if (this._viewport.world().nodeUnderCursor()) {
          this._viewport.world().nodeUnderCursor().click(this._viewport);
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
    this.world().scheduleRepaint();
    this._viewport.scheduleRepaint();
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
      this._viewport.showInCamera(null);
      camera.zoomToPoint(Math.pow(1.1, numSteps), event.x, event.y);
    }
    this.mouseChanged();
    return true;
  }

  camera() {
    return this._viewport.camera();
  }

  onTouchzoom(event: any) {
    // Zoom.
    const dist = Math.sqrt(Math.pow(event.dx, 2) + Math.pow(event.dy, 2));
    const cam = this.camera();
    if (dist != 0 && this._zoomTouchDistance != 0) {
      this._viewport.showInCamera(null);
      cam.zoomToPoint(dist / this._zoomTouchDistance, event.x, event.y);
      this._zoomTouchDistance = dist;
      this.mouseChanged();
      return true;
    }
    this._zoomTouchDistance = dist;
    return false;
  }

  onTouchmove(event: any) {
    if (event.multiple) {
      return false;
    }
    return this.onMousemove(event);
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

    if (this._caretPainter) {
      this._caretPainter.initBuffer(1);
    }
    this._spotlight.clear();

    // console.log("Checking for node");
    this._mousedownTime = Date.now();
    if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1], true)) {
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

  onMousemove(event: any) {
    if (this._viewport.menu().onMousemove(event.x, event.y)) {
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
        mouseInWorld[0],
        mouseInWorld[1]
      );
      switch (overClickable) {
        case 2:
          this._viewport.setCursor("pointer");
          break;
        case 1:
          break;
        case 0:
          this._viewport.setCursor("auto");
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
    if (!this._viewport.world().commitLayout(INPUT_LAYOUT_TIME)) {
      // console.log("Couldn't commit layout in time");
      overClickable = 1;
    } else {
      overClickable = this._viewport
        .world()
        .mouseOver(mouseInWorld[0], mouseInWorld[1], this._viewport);
    }
    switch (overClickable) {
      case 2:
        this._viewport.setCursor("pointer");
        break;
      case 1:
        // console.log("World not ready");
        break;
      case 0:
        this._viewport.setCursor("auto");
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

  sliderListener(x: number) {
    // if(isVerticalDirection(this._selectedSlider.parentDirection())) {
    const nodeWidth = this._selectedSlider.absoluteSize().width();
    let newVal;
    if (x <= this._selectedSlider.absoluteX() - nodeWidth / 2) {
      // To the left!
      newVal = 0;
    } else if (x >= this._selectedSlider.absoluteX() + nodeWidth / 2) {
      // To the right!
      newVal = 1;
    } else {
      // In between.
      // console.log("x=" + x);
      // console.log("selectedSlider.absoluteX()=" +
      //   this._selectedSlider.absoluteX());
      // console.log("PCT: " + (x - this._selectedSlider.absoluteX()));
      // console.log("In between: " + ((nodeWidth/2 +
      //   x - this._selectedSlider.absoluteX()) / nodeWidth));
      newVal =
        (nodeWidth / 2 + x - this._selectedSlider.absoluteX()) / nodeWidth;
    }
    this.adjustSelectedSlider(newVal, true);
    this._selectedSlider.layoutWasChanged();
    this.scheduleRepaint();
    // }
    if (this._selectedSlider.hasClickListener()) {
      this._selectedSlider.click(this._viewport);
    }
    this.mouseChanged();

    return true;
  }

  checkForNodeClick(x: number, y: number, onlySlider?: boolean) {
    if (!this.world().commitLayout(INPUT_LAYOUT_TIME)) {
      return null;
    }
    const selectedNode = this.world().nodeUnderCoords(x, y) as Node<
      DefaultNodeType
    >;
    if (!selectedNode) {
      logc("Mouse clicks", "No node found under coords:", x, y);
      this.setFocusedNode(null);
      this.viewport().showInCamera(null);
      return null;
    }

    logc(
      "Mouse clicks",
      "Node {0} found for coords ({1}, {2})",
      selectedNode,
      x,
      y
    );

    // Check if the selected node was a slider.
    if (selectedNode.type().type() == Type.SLIDER) {
      if (!onlySlider && selectedNode === this._selectedSlider) {
        // console.log(new Error("Removing slider listener"));
        this._selectedSlider = null;
        this._attachedMouseListener = null;
        this.scheduleRepaint();
        return null;
      }
      // console.log("Slider node!");
      this.setFocusedNode(selectedNode);
      this._selectedSlider = selectedNode;
      this._attachedMouseListener = this.sliderListener;
      this._attachedMouseListener(x, y, 0, 0);
      this.scheduleRepaint();
      return selectedNode;
    }

    // if(onlySlider) {
    // return null;
    // }

    // Check if the selected node has a click listener.
    if (selectedNode.hasClickListener()) {
      // console.log("Selected Node has click listener", selectedNode);
      if (this._focusedNode === selectedNode) {
        const rv = selectedNode.click(this._viewport);
        if (rv !== false) {
          return selectedNode;
        }
      } else {
        this.setFocusedNode(selectedNode);
        this.scheduleRepaint();
      }
    }

    // Check if the label was clicked.
    // console.log("Clicked");
    const selectedLabel = selectedNode._label;
    if (
      selectedLabel &&
      !Number.isNaN(selectedLabel._x) &&
      selectedLabel.editable()
    ) {
      // console.log("Clicked label");
      selectedLabel.click(
        (x - selectedLabel._x) / selectedLabel._scale,
        (y - selectedLabel._y) / selectedLabel._scale
      );
      this.scheduleRepaint();
      // console.log(selectedLabel.caretLine());
      // console.log(selectedLabel.caretPos());
      this.setFocusedNode(selectedNode);
      return selectedNode;
    }
    if (selectedNode && !selectedNode.ignoresMouse()) {
      console.log("Setting focusedNode to ", selectedNode);
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
        this._viewport.showInCamera(this._clickedNode);
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

    if (!this._viewport.world().commitLayout(INPUT_LAYOUT_TIME)) {
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

  resetCamera(complete?: boolean) {
    const defaultScale = 0.25;
    const cam = this.camera();
    let x = this._viewport.gl().drawingBufferWidth / 2;
    let y = this._viewport.gl().drawingBufferHeight / 2;
    if (!complete && cam.x() === x && cam.y() === y) {
      cam.setScale(defaultScale);
    } else {
      if (complete) {
        cam.setScale(defaultScale);
      }
      x = this._viewport.width() / (2 * defaultScale);
      y = this._viewport.height() / (2 * defaultScale);
      cam.setOrigin(x, y);
    }
  }

  update(t: Date) {
    const cam = this.camera();

    const xSpeed = 1000 / cam.scale();
    const ySpeed = 1000 / cam.scale();
    const scaleSpeed = 20;

    let needsUpdate = this._viewport.mouseVersion() !== this.mouseVersion();
    this.window().log(
      "Input.update=" +
        (this._viewport.mouseVersion() + " vs " + this.mouseVersion())
    );

    this._updateRepeatedly = false;

    if (this.getKey(RESET_CAMERA_KEY) && this._viewport.gl()) {
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
        this._viewport.gl().drawingBufferWidth / 2,
        this._viewport.gl().drawingBufferHeight / 2
      );
    }
    if (this.getKey(ZOOM_IN_KEY)) {
      console.log("Continuing to zoom in");
      this._updateRepeatedly = true;
      needsUpdate = true;
      if (cam.scale() >= MIN_CAMERA_SCALE) {
        cam.zoomToPoint(
          Math.pow(1.1, -scaleSpeed * this.keyElapsed(ZOOM_IN_KEY, t)),
          this._viewport.gl().drawingBufferWidth / 2,
          this._viewport.gl().drawingBufferHeight / 2
        );
      }
    }

    if (this._focusedNode) {
      if (this._spotlight.animating() || this.showingCaret()) {
        const animationPct = (t.getTime() % 1000) / 1000;
        this._caretColor.setA(
          (1 + Math.cos(Math.PI + 2 * Math.PI * animationPct)) / 2
        );
        console.log(this._caretColor);
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

  window() {
    return this._viewport.window();
  }

  viewport() {
    return this._viewport;
  }

  showingCaret() {
    if (!this._focusedNode || this._focusedNode.needsPosition()) {
      return false;
    }
    const label = this._focusedNode._label;
    return label && label._x != null && label._y != null;
  }

  paint() {
    const window = this.window();

    if (this._caretPainter) {
      this._caretPainter.clear();
    }

    if (!this._focusedNode || this._focusedNode.needsPosition()) {
      return;
    }

    const label = this._focusedNode._label;
    if (!label || !label.editable() || !this._focusedLabel) {
      this._spotlight.paint();
      return;
    }

    const cr = label.getCaretRect();
    if (this.showingCaret()) {
      if (!this._caretPainter) {
        this._caretPainter = new BlockPainter(window);
      }
      this._caretPainter.initBuffer(1);
      this._caretPainter.setBorderColor(this._caretColor);
      this._caretPainter.setBackgroundColor(this._caretColor);
      this._caretPainter.drawBlock(
        label._x + cr.x() * label._scale,
        label._y + cr.y() * label._scale,
        label._scale * cr.width(),
        label._scale * cr.height(),
        0.01,
        0.02
      );
    }
  }

  focusedNode() {
    return this._focusedNode;
  }

  setFocusedNode(focusedNode: Node<DefaultNodeType>) {
    if (focusedNode === this._focusedNode) {
      return;
    }
    this._focusedNode = focusedNode;
    const selectedNode = this._focusedNode;
    // console.log("Clicked");
    this._focusedLabel =
      selectedNode &&
      selectedNode._label &&
      !Number.isNaN(selectedNode._label._x) &&
      selectedNode._label.editable();

    if (this._focusedNode && this._viewport) {
      this._viewport.showInCamera(this._focusedNode);
      this.carousel().clearCarousel();
      this.carousel().hideCarousel();
      this.carousel().scheduleCarouselRepaint();
      this._spotlight.restart(this._focusedNode);
      this._focusedNode.events().emit("carousel-load", this._viewport);
    }
    this.scheduleRepaint();
  }

  focusedLabel() {
    return this._focusedLabel;
  }

  menu() {
    return this._viewport.menu();
  }

  world() {
    return this._viewport.world();
  }

  contextChanged(isLost: boolean) {
    if (this._caretPainter) {
      this._caretPainter.contextChanged(isLost);
    }
    this._spotlight.contextChanged(isLost);
  }

  render(world: Matrix3x3, scale: number) {
    const gl = this._viewport.gl();
    if (this._caretPainter) {
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.DEPTH_TEST);
      // gl.disable(gl.BLEND);
      this._caretPainter.render(world, scale);
    }
    if (this._spotlight) {
      gl.enable(gl.BLEND);
      return this._spotlight.render(world);
    }
    return false;
  }
}
