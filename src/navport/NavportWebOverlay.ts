import { Projected, Projector } from "parsegraph-projector";
import Method from "parsegraph-method";

export default class NavportWebOverlay implements Projected {
  _iframes: Map<Projector, HTMLIFrameElement>;
  _update: Method;

  constructor() {
    this._iframes = new Map();
    this._update = new Method();
  }

  scheduleUpdate() {
    this._update.call();
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  tick(startDate: number): boolean {
    return false;
  }

  _url: string;
  show(url: string) {
    if (!url) {
      this.hide();
      return;
    }
    if (this._url === url) {
      return;
    }
    this._url = url;
    this._iframes.forEach((iframe) => {
      if (iframe.src !== this.url()) {
        iframe.src = this.url();
      }
    });
  }

  hide() {
    this._url = null;
  }

  unmount(projector: Projector) {
    const iframe = this._iframes.get(projector);
    if (iframe) {
      iframe.remove();
      this._iframes.delete(projector);
    }
  }

  dispose() {
    this._iframes.forEach((iframe) => {
      iframe.remove();
    });
    this._iframes.clear();
  }

  paint(projector: Projector, timeout?: number) {
    if (!this.url()) {
      return false;
    }
    if (this._iframes.get(projector)) {
      return false;
    }
    const iframe = document.createElement("iframe");
    iframe.src = this.url();
    iframe.style.position = "absolute";
    iframe.style.top = "0px";
    iframe.style.left = "0px";
    iframe.style.pointerEvents = "auto";
    projector.getDOMContainer().appendChild(iframe);
    this._iframes.set(projector, iframe);
    return false;
  }

  url() {
    return this._url;
  }

  render(projector: Projector): boolean {
    if (!this.url()) {
      return false;
    }
    const iframe = this._iframes.get(projector);
    if (!iframe) {
      return true;
    }
    iframe.width = projector.width() + "px";
    iframe.height = projector.height() + "px";
    return false;
  }
}
