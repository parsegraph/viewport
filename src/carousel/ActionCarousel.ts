import CarouselAction from "./CarouselAction";
import { PaintedNode } from "parsegraph-artist";
import { Keystroke } from "parsegraph-input";
import { BlockNode, BlockPalette, DefaultBlockPalette } from "parsegraph-block";
import Carousel from "./Carousel";

export default class ActionCarousel {
  _palette: BlockPalette;
  _actions: CarouselAction[];
  _uninstaller: Function;
  _carousel: Carousel;

  constructor(
    carousel: Carousel,
    palette: BlockPalette = new DefaultBlockPalette()
  ) {
    this._palette = palette;
    this._carousel = carousel;
    this._actions = [];
  }

  findHotkey(action: string) {
    const idx = action.indexOf("&");
    if (idx < 0 || idx == action.length - 1) {
      return null;
    }
    const hotkey = action[idx + 1].toLowerCase();
    const parsedAction = action.substring(0, idx) + action.substring(idx + 1);
    return {
      action: parsedAction,
      hotkey: hotkey,
    };
  }

  addAction(
    action: string | PaintedNode,
    listener: Function,
    listenerThisArg?: any,
    hotkey?: string
  ) {
    if (typeof action === "string") {
      let label = action;
      action = this._palette.spawn();
      const hotkeyInfo = this.findHotkey(label);
      if (hotkeyInfo) {
        label = hotkeyInfo.action;
        hotkey = hotkey || hotkeyInfo.hotkey;
      }
      (action as BlockNode).value().setLabel(label);
    }
    if (!listenerThisArg) {
      listenerThisArg = this;
    }
    const obj = new CarouselAction(
      action as PaintedNode,
      listener,
      listenerThisArg
    );
    if (hotkey) {
      obj.setHotkey(hotkey.toLowerCase());
    }
    this._actions.push(obj);
  }

  install(node: PaintedNode, nodeData?: any) {
    node
      .value()
      .interact()
      .setClickListener(() => {
        return this.onClick(node, nodeData);
      }, this);
    node
      .value()
      .interact()
      .setKeyListener((event: Keystroke) => {
        return this.carousel().isCarouselShown() && this.onKey(event);
      }, this);

    let uninstaller: Function = null;

    uninstaller = () => {
      node.value().interact().setClickListener(null);
      node.value().interact().setKeyListener(null);
    };
    this._uninstaller = () => {
      if (!uninstaller) {
        return;
      }
      uninstaller();
      uninstaller = null;
    };
    return this._uninstaller;
  }

  carousel() {
    return this._carousel;
  }

  uninstall() {
    if (!this._uninstaller) {
      return;
    }
    this._uninstaller();
    this._uninstaller = null;
  }

  onKey(_: Keystroke): boolean {
    const carousel = this.carousel();
    if (carousel.isCarouselShown()) {
      carousel.hideCarousel();
      return true;
    } else {
      return false;
    }
  }

  loadCarousel(node: PaintedNode, nodeData?: any) {
    const carousel = this.carousel();
    if (carousel.isCarouselShown()) {
      carousel.clearCarousel();
      carousel.hideCarousel();
      carousel.scheduleCarouselRepaint();
      return;
    }
    // console.log("Creating carousel");
    carousel.clearCarousel();

    for (let i = 0; i < this._actions.length; ++i) {
      const action = this._actions[i];
      action.setNodeData(node, nodeData);
      carousel.addToCarousel(action);
    }
    carousel.scheduleCarouselRepaint();
  }

  onClick(node: PaintedNode, nodeData?: any) {
    this.loadCarousel(node, nodeData);
    this.carousel().showCarousel();
    this.carousel().scheduleCarouselRepaint();
  }
}
