import { Projected, Projector } from "parsegraph-projector";

export default class NavportWebOverlay implements Projected {
  _navport: Navport;
  _iframes: Map<Projector, HTMLIFrameElement>;
  _update: Method;

  constructor(navport: Navport) {
    this._navport = navport;
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
    this._url = url;
  }

  hide() {
    this._url = null;
  }

  unmount(proj: Projector) {
    const iframe = this._iframes.get(projector);
    if (iframe) {
      iframe.remove();
      this._iframes.delete(projector);
    }
  }

  dispose() {
    this._iframes.values().forEach((iframe) => {
      iframe.remove();
    });
    this._iframes.clear();
  }

  paint(projector: Projector, timeout?: number) {
    const iframe = document.createElement("iframe");
    iframe.src = this.url();
    iframe.style.position = "absolute";
    iframe.style.top = 0;
    iframe.style.left = 0;
    container.appendChild(iframe);
    this._iframes.set(projector, iframe);
    return false;
  }

  url() {
    return this._url;
  }

  render(projector: Projector): boolean {
    const iframe = this._iframes.get(projector);
    if (!iframe) {
      return true;
    }
    iframe.width = projector.width();
    iframe.height = projector.height();
    return false;
  }
}
