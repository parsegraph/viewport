import TexturePainter from "parsegraph-texturepainter";
import { matrixMultiply3x3I, makeTranslation3x3 } from "parsegraph-matrix";
import rainbackMenu from "./rainback-menu-icons.png";
import Navport from "./Navport";
import { Projector } from "parsegraph-projector";
import Method from "parsegraph-method";

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
// const MENU_ICON_VSPLIT = MenuIcon.VSPLIT;
// const MENU_ICON_HSPLIT = MenuIcon.HSPLIT;
const MENU_ICON_RESET_CAMERA = MenuIcon.RESET_CAMERA;
// const MENU_ICON_CLOSE = MenuIcon.CLOSE;
// const MENU_ICON_DEBUG = MenuIcon.DEBUG;

class BurgerMenuLocation {
  icon: MenuIcon;
  location: number;
}

class BurgerMenuScene {
  _menu: BurgerMenu;
  _projector: Projector;
  _iconTexture: WebGLTexture;
  _iconPainter: TexturePainter;
  _iconImage: HTMLImageElement;
  _iconReady: boolean;
  _search: HTMLElement;

  constructor(menu: BurgerMenu, proj: Projector) {
    this._projector = proj;
    this._menu = menu;
    this._iconImage = new Image(256, 32);
    this._iconImage.onload = () => {
      this._iconReady = true;
      menu.scheduleRepaint();
    };
    this._iconReady = false;
    this._iconImage.src = rainbackMenu;
    this._iconTexture = null;
    this._iconPainter = null;

    this._search = document.createElement("form");
    this._search.style.display = "none";
    this._search.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!menu.search(input.value)) {
        input.value = "";
      }
    });

    const input = document.createElement("input");
    input.placeholder = menu.searchPlaceholder();
    this._search.appendChild(input);
  }

  menu() {
    return this._menu;
  }

  projector() {
    return this._projector;
  }

  drawIcon(iconIndex: MenuIcon, x: number, y?: number): void {
    if (arguments.length === 2) {
      y = MENU_ICON_SIZE;
    }
    for (let i = 0; i < this.menu()._iconLocations.length; ++i) {
      const iconLoc = this.menu()._iconLocations[i];
      if (iconLoc.icon === iconIndex) {
        iconLoc.location = x;
        break;
      }
    }
    x -= MENU_ICON_SIZE / 2;
    if (this.menu().hovered() == iconIndex) {
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
    const proj = this.projector();
    const gl = proj.glProvider().gl();
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
        proj.glProvider(),
        this._iconTexture,
        MENU_ICON_TEXTURE_SIZE * 8,
        MENU_ICON_TEXTURE_SIZE
      );
    }
    this._iconPainter.clear();
    this._iconPainter.setAlpha(0.5);
    this.menu().eachIcon((bl) => {
      bl.location = NaN;
    });
    this.drawIcon(MENU_ICON_MAIN, 0);
    if (this.menu().opened()) {
      this._iconPainter.setAlpha(0.9);
      const pad = MENU_ICON_PADDING;
      this.drawIcon(MENU_ICON_REDO, -MENU_ICON_SIZE - pad);
      this.drawIcon(MENU_ICON_UNDO, -2 * MENU_ICON_SIZE - pad);
      this._search.style.pointerEvents = "all";
      this._search.style.display = "block";
      this._search.style.position = "absolute";
      this._search.style.width = MENU_ICON_SIZE * 6 + "px";
      if (!proj.isOffscreen()) {
        if (this._search.parentElement !== proj.getDOMContainer()) {
          proj.getDOMContainer().appendChild(this._search);
        }
      }
    } else {
      if (!proj.isOffscreen()) {
        this._search.remove();
      }
    }
  }

  render() {
    if (!this._iconPainter) {
      return;
    }
    if (this.menu().opened()) {
      this._search.style.left =
        this.projector().width() / 2 + MENU_ICON_SIZE + "px";
      this._search.style.bottom =
        this.projector().height() - 6 - 1.5 * MENU_ICON_PADDING + "px";
    }
    const world = this.menu().viewport().camera().projectionMatrix();
    matrixMultiply3x3I(
      world,
      makeTranslation3x3(this.projector().width() / 2, 0),
      world
    );
    const gl = this.projector().glProvider().gl();
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this._iconPainter.render(world);
  }

  dispose() {
    if (this._search) {
      this._search.remove();
    }
    this._search = null;
  }
}

export default class BurgerMenu {
  _viewport: Navport;
  _scenes: Map<Projector, BurgerMenuScene>;
  _menuOpened: boolean;
  _menuHovered: MenuIcon;
  _iconLocations: BurgerMenuLocation[];
  _showSplit: boolean;
  _undoAction: Method;
  _redoAction: Method;
  _searchCallback: Method;
  _searchPlaceholder: string;

  viewport() {
    return this._viewport;
  }

  opened() {
    return this._menuOpened;
  }

  hovered() {
    return this._menuHovered;
  }

  eachIcon(cb: (bl: BurgerMenuLocation) => void): void {
    this._iconLocations.forEach(cb);
  }

  constructor(viewport: Navport) {
    this._viewport = viewport;
    this._scenes = new Map();

    this._menuOpened = false;
    this._menuHovered = null;
    this._iconLocations = menuIcons.map((icon) => {
      const bl = new BurgerMenuLocation();
      bl.icon = icon;
      bl.location = NaN;
      return bl;
    });

    this._undoAction = new Method();
    this._redoAction = new Method();
    this._searchCallback = new Method();
    this._searchPlaceholder = "Search";
  }

  search(cmd: string): boolean {
    return this._searchCallback.call(cmd);
  }

  setSearchPlaceholder(text: string) {
    this._searchPlaceholder = text;
    this.scheduleRepaint();
  }

  setSearchCallback(cb: Function, obj?: object) {
    this._searchCallback.set(cb, obj);
  }

  searchPlaceholder() {
    return this._searchPlaceholder;
  }

  setRedoAction(cb: Function, obj?: object) {
    this._redoAction.set(cb, obj);
  }

  setUndoAction(cb: Function, obj?: object) {
    this._undoAction.set(cb, obj);
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
    this._viewport.scheduleRepaint();
  }

  scheduleRender() {
    // console.log("BurgerMenu is scheduling render");
    this._viewport.scheduleRender();
  }

  getIcon(x: number, y: number): MenuIcon {
    if (y < 0 || y > MENU_ICON_SIZE) {
      return null;
    }
    if (!this._menuOpened) {
      const center = this._viewport.camera().width() / 2;
      if (x < center - MENU_ICON_SIZE / 2 || x > center + MENU_ICON_SIZE / 2) {
        return null;
      }
      return MENU_ICON_MAIN;
    }

    // Menu is opened.
    x -= this._viewport.camera().width() / 2;
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
    this.scheduleRepaint();
    this._menuHovered = iconIndex;
    return true;
  }

  onMousedown(x: number, y: number) {
    if (y < 0 || y > MENU_ICON_SIZE) {
      return false;
    }
    if (!this._menuOpened) {
      const center = this._viewport.camera().width() / 2;
      if (x < center - MENU_ICON_SIZE / 2 || x > center + MENU_ICON_SIZE / 2) {
        return false;
      }
      this._menuOpened = true;
      this.scheduleRepaint();
      return true;
    }

    // Menu is opened.
    x -= this._viewport.camera().width() / 2;
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
        this._undoAction.call();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_REDO) {
        this._redoAction.call();
        return true;
      }
      if (iconLocation.icon == MENU_ICON_RESET_CAMERA) {
        this._viewport.input().resetCamera(true);
        this._viewport.scheduleRender();
        return true;
      }
    }
    return false;
  }

  unmount() {
    this._scenes.forEach((scene) => scene.dispose());
  }

  dispose() {
    this.unmount();
  }

  closeMenu() {
    if (!this._menuOpened) {
      return;
    }
    this._menuOpened = false;
    this.scheduleRepaint();
  }

  paint(proj: Projector) {
    if (!this._scenes.has(proj)) {
      this._scenes.set(proj, new BurgerMenuScene(this, proj));
    }
    this._scenes.get(proj).paint();
  }

  render(proj: Projector) {
    if (!this._scenes.has(proj)) {
      return true;
    }
    this._scenes.get(proj).render();
  }
}
