import TexturePainter from "parsegraph-texturepainter";
import { matrixMultiply3x3I, makeTranslation3x3 } from "parsegraph-matrix";
import Viewport from "./Viewport";
import BlockPainter from "parsegraph-blockpainter";
import rainbackMenu from "./rainback-menu-icons.png";

const MENU_ICON_TEXTURE_SIZE = 32;
const MENU_ICON_SIZE = 32;
const MENU_ICON_PADDING = MENU_ICON_SIZE / 2;

export enum MenuIcon {
  MAIN = 0,
  UNDO,
  REDO,
  VSPLIT,
  HSPLIT,
  RESET_CAMERA,
  CLOSE,
  // DEBUG
}

const menuIcons = [
  MenuIcon.MAIN,
  MenuIcon.UNDO,
  MenuIcon.REDO,
  MenuIcon.VSPLIT,
  MenuIcon.HSPLIT,
  MenuIcon.RESET_CAMERA,
  MenuIcon.CLOSE,
  // MenuIcon.DEBUG
];

const MENU_ICON_MAIN = MenuIcon.MAIN;
const MENU_ICON_UNDO = MenuIcon.UNDO;
const MENU_ICON_REDO = MenuIcon.REDO;
const MENU_ICON_VSPLIT = MenuIcon.VSPLIT;
const MENU_ICON_HSPLIT = MenuIcon.HSPLIT;
const MENU_ICON_RESET_CAMERA = MenuIcon.RESET_CAMERA;
const MENU_ICON_CLOSE = MenuIcon.CLOSE;
// const MENU_ICON_DEBUG = MenuIcon.DEBUG;

class BurgerMenuLocation {
  icon: MenuIcon;
  location: number;
}

export default class BurgerMenu {
  _viewport: Viewport;
  _iconImage: HTMLImageElement;
  _iconReady: boolean;
  _needsRepaint: boolean;
  _menuOpened: boolean;
  _textInput: HTMLInputElement;
  _blockPainter: BlockPainter;
  _iconTexture: WebGLTexture;
  _iconPainter: TexturePainter;
  _menuHovered: MenuIcon;
  _iconLocations: BurgerMenuLocation[];
  _showSplit: boolean;

  constructor(viewport: Viewport) {
    this._viewport = viewport;

    this._iconImage = new Image(256, 32);
    const that = this;
    this._iconImage.onload = function () {
      that._iconReady = true;
      that.scheduleRepaint();
    };
    this._iconReady = false;
    this._iconImage.src = rainbackMenu;
    this._iconTexture = null;
    this._iconPainter = null;

    this._menuOpened = false;
    this._menuHovered = null;
    this._iconLocations = menuIcons.map((icon) => {
      const bl = new BurgerMenuLocation();
      bl.icon = icon;
      bl.location = NaN;
      return bl;
    });
    this._needsRepaint = true;

    this._textInput = document.createElement("input");
    this._textInput.style.display = "none";
    this._textInput.placeholder = "Search";
  }

  showSplit(show?: boolean): boolean {
    if (arguments.length !== 0) {
      this._showSplit = show;
    }
    return this._showSplit;
  }

  mount() {}

  scheduleRepaint() {
    // console.log("BurgerMenu is scheduling repaint");
    this._needsRepaint = true;
    this._viewport.scheduleRepaint();
  }

  scheduleRender() {
    // console.log("BurgerMenu is scheduling render");
    this._needsRepaint = true;
    this._viewport.scheduleRender();
  }

  getIcon(x: number, y: number): MenuIcon {
    if (y < 0 || y > MENU_ICON_SIZE) {
      return null;
    }
    if (!this._menuOpened) {
      const center = this._viewport.width() / 2;
      if (x < center - MENU_ICON_SIZE / 2 || x > center + MENU_ICON_SIZE / 2) {
        return null;
      }
      return MENU_ICON_MAIN;
    }

    // Menu is opened.
    x -= this._viewport.width() / 2;
    for (let i = 0; i < this._iconLocations.length; ++i) {
      const iconLocation = this._iconLocations[i];
      if (
        x < iconLocation.location - MENU_ICON_SIZE / 2 ||
        x > iconLocation.location + MENU_ICON_SIZE / 2
      ) {
        continue;
      }
      return iconLocation.icon;
    }
    return null;
  }

  onMousemove(x: number, y: number): boolean {
    const iconIndex = this.getIcon(x, y);
    // console.log(iconIndex);
    if (iconIndex === null && this._menuHovered === null) {
      return false;
    }
    if (this._menuHovered == iconIndex) {
      return false;
    }
    console.log("Repainting");
    this.scheduleRepaint();
    this._menuHovered = iconIndex;
    return true;
  }

  onMousedown(x: number, y: number) {
    if (y < 0 || y > MENU_ICON_SIZE) {
      return false;
    }
    if (!this._menuOpened) {
      const center = this._viewport.width() / 2;
      if (x < center - MENU_ICON_SIZE / 2 || x > center + MENU_ICON_SIZE / 2) {
        return false;
      }
      this._menuOpened = true;
      this.scheduleRepaint();
      return true;
    }

    // Menu is opened.
    x -= this._viewport.width() / 2;
    for (let i = 0; i < this._iconLocations.length; ++i) {
      const iconLocation = this._iconLocations[i];
      if (
        x < iconLocation.location - MENU_ICON_SIZE / 2 ||
        x > iconLocation.location + MENU_ICON_SIZE / 2
      ) {
        continue;
      }
      if (iconLocation.icon == MENU_ICON_MAIN) {
        // Hide menu.
        this._menuOpened = false;
        this.scheduleRepaint();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_UNDO) {
        console.log("Undo!");
        return true;
      }
      if (iconLocation.icon == MENU_ICON_REDO) {
        console.log("Redo!");
        return true;
      }
      if (iconLocation.icon == MENU_ICON_RESET_CAMERA) {
        this._viewport.input().resetCamera(true);
        this._viewport.scheduleRender();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_HSPLIT) {
        const newViewport = new Viewport(this._viewport.world());
        newViewport.camera().copy(this._viewport.camera());
        newViewport
          .camera()
          .setSize(
            this._viewport.camera().width(),
            this._viewport.camera().height()
          );
        (this.window() as GraphicsWindow).addHorizontal(
          newViewport.component(),
          this._viewport.component()
        );
        this.scheduleRepaint();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_VSPLIT) {
        const newViewport = new Viewport(this._viewport.world());
        newViewport.camera().copy(this._viewport.camera());
        newViewport
          .camera()
          .setSize(
            this._viewport.camera().width(),
            this._viewport.camera().height()
          );
        (this.window() as GraphicsWindow).addVertical(
          newViewport.component(),
          this._viewport.component()
        );
        this.scheduleRepaint();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_CLOSE) {
        console.log("Closing widget");
        this.window().removeComponent(this._viewport.component());
        this._viewport.dispose();
        this.scheduleRepaint();
        return true;
      }
      throw new Error("Unhandled menu icon type: " + iconLocation.icon);
    }
    return false;
  }

  unmount() {
    this._textInput.parentNode.removeChild(this._textInput);
  }

  dispose() {
    this.unmount();
    this._textInput = null;
  }

  contextChanged(isLost: boolean) {
    if (this._blockPainter) {
      this._blockPainter.contextChanged(isLost);
    }
  }

  closeMenu() {
    if (!this._menuOpened) {
      return;
    }
    this._menuOpened = false;
    this.scheduleRepaint();
  }

  drawIcon(iconIndex: MenuIcon, x: number, y?: number): void {
    if (arguments.length === 2) {
      y = MENU_ICON_SIZE;
    }
    for (let i = 0; i < this._iconLocations.length; ++i) {
      const iconLoc = this._iconLocations[i];
      if (iconLoc.icon === iconIndex) {
        iconLoc.location = x;
        break;
      }
    }
    x -= MENU_ICON_SIZE / 2;
    if (this._menuHovered == iconIndex) {
      this._iconPainter.setAlpha(0.9);
    } else {
      this._iconPainter.setAlpha(0.5);
    }
    this._iconPainter.drawTexture(
      iconIndex * MENU_ICON_TEXTURE_SIZE,
      0, // iconX, iconY
      MENU_ICON_TEXTURE_SIZE,
      MENU_ICON_TEXTURE_SIZE, // iconWidth, iconHeight
      x,
      y,
      MENU_ICON_SIZE,
      -MENU_ICON_SIZE, // width, height
      1
    );
  }

  paint() {
    if (!this._iconReady) {
      return;
    }
    const gl = this.gl();
    if (!this._iconTexture) {
      this._iconTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._iconTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this._iconImage
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    if (!this._iconPainter) {
      this._iconPainter = new TexturePainter(
        this.window(),
        this._iconTexture,
        MENU_ICON_TEXTURE_SIZE * 8,
        MENU_ICON_TEXTURE_SIZE
      );
    }
    this._iconPainter.clear();
    this._iconPainter.setAlpha(0.5);
    for (let i = 0; i < this._iconLocations.length; ++i) {
      const bl = this._iconLocations[i];
      bl.location = NaN;
    }
    this.drawIcon(MENU_ICON_MAIN, 0);
    if (this._menuOpened) {
      const viewportWidth = this._viewport.width();
      this._iconPainter.setAlpha(0.9);
      const pad = MENU_ICON_PADDING;
      this.drawIcon(MENU_ICON_REDO, -MENU_ICON_SIZE - pad);
      this.drawIcon(MENU_ICON_UNDO, -2 * MENU_ICON_SIZE - pad);
      if (this.showSplit()) {
        this.drawIcon(MENU_ICON_VSPLIT, pad + 2 * MENU_ICON_SIZE);
        this.drawIcon(MENU_ICON_HSPLIT, pad + MENU_ICON_SIZE);
        this.drawIcon(MENU_ICON_RESET_CAMERA, pad + 3 * MENU_ICON_SIZE);
      }
      if (this.window().numComponents() > 1) {
        this.drawIcon(
          MENU_ICON_CLOSE,
          viewportWidth - viewportWidth / 2 - MENU_ICON_SIZE / 2
        );
      }
      this._textInput.style.display = "block";
      this._textInput.style.position = "absolute";
      this._textInput.style.width = MENU_ICON_SIZE * 6 + "px";
      this._textInput.style.transform = "translateX(-50%)";
      if (!this.window().isOffscreen()) {
        this._viewport.window().container().appendChild(this._textInput);
      }
    } else {
      if (!this.window().isOffscreen()) {
        this._textInput.remove();
      }
    }
    this._needsRepaint = false;
  }

  render() {
    if (!this._iconPainter) {
      return;
    }
    if (this._menuOpened) {
      this._textInput.style.left =
        this._viewport.x() + this._viewport.width() / 2 + "px";
      this._textInput.style.bottom =
        this._viewport.y() +
        this._viewport.height() -
        MENU_ICON_SIZE -
        1.5 * MENU_ICON_PADDING +
        "px";
    }
    const world = this._viewport.camera().projectionMatrix();
    matrixMultiply3x3I(
      world,
      makeTranslation3x3(this._viewport.width() / 2, 0),
      world
    );
    const gl = this.gl();
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this._iconPainter.render(world);
  }

  needsRepaint() {
    return (this._iconReady && !this._iconTexture) || this._needsRepaint;
  }

  gl() {
    return this._viewport.window().gl();
  }

  window() {
    return this._viewport.window();
  }
}
