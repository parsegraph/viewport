import { Projected, Projector } from "parsegraph-projector";
import Method from "parsegraph-method";

export default class NavportWebOverlay implements Projected {
  _iframes: Map<Projector, [HTMLDivElement, HTMLIFrameElement, () => void]>;
  _update: Method;
  _size: number;

  constructor(size: number = 1) {
    this._iframes = new Map();
    this._update = new Method();
    this.setSize(size);
  }

  scheduleUpdate() {
    this._update.call();
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  setSize(pct: number = 1) {
    this._size = pct;
  }

  tick(startDate: number): boolean {
    return false;
  }

  _url: string | ((parElem: HTMLDivElement) => void);
  show(url: string | ((parElem: HTMLDivElement) => void)) {
    if (!url) {
      this.hide();
      return;
    }
    if (this._url === url) {
      return;
    }
    this._url = url;
  }

  hide() {
    this._url = null;
  }

  unmount(projector: Projector) {
    const iframe = this._iframes.get(projector);
    if (iframe) {
      iframe[0].remove();
      iframe[2]?.();
      this._iframes.delete(projector);
    }
  }

  dispose() {
    this._iframes.forEach((iframe) => {
      iframe[0].remove();
      iframe[2]?.();
    });
    this._iframes.clear();
  }

  close() {
    this.hide();
    this.dispose();
    this.scheduleUpdate();
  }

  paint(projector: Projector, timeout?: number) {
    if (!this.url()) {
      return false;
    }
    if (this._iframes.get(projector)) {
      return false;
    }

    const border = document.createElement("div");
    border.style.position = "absolute";
    border.style.width = "100%";
    border.style.height = "100%";
    border.style.background = "rgba(0, 0, 0, 0.5)";
    border.style.backgroundBlendMode = "luminosity";
    border.style.display = "flex";
    border.style.justifyContent = "center";
    border.style.alignItems = "center";
    border.style.pointerEvents = "auto";
    border.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });
    if (typeof this.url() === "string") {
      const iframe = document.createElement("iframe");
      iframe.style.border = "0";
      iframe.src = this.url() as string;
      border.appendChild(iframe);
      this._iframes.set(projector, [border, iframe, null]);
    } else {
      const remover = (this.url() as Function)(border);
      this._iframes.set(projector, [border, null, remover]);
    }
    projector.getDOMContainer().appendChild(border);
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
    if (iframe[1]) {
      // console.log("Web overlay render", this._size, this.url());
      const margin =
        projector.width() > projector.height()
          ? projector.height() - this._size * projector.height()
          : projector.width() - this._size * projector.width();
      iframe[1].width = Math.round(projector.width() - margin) + "px";
      iframe[1].height = Math.round(projector.height() - margin) + "px";
    }
    return false;
  }
}
