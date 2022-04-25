import AbstractInput from "./AbstractInput";
import addListeners from "./addListeners";

export interface FocusController {
  blur(): void;
  focus(): void;
  focused(): boolean;
}

export default class FocusInput extends AbstractInput<FocusController> {
  addListeners(container: HTMLElement): () => void {
    container.setAttribute("tabIndex", "0");
    return addListeners(this, container, [
      ["blur", this.blur],
      ["focus", this.focus],
    ]);
  }

  focus() {
    if (this.control()) {
      this.control().focus();
    }
  }

  blur() {
    if (this.control()) {
      this.control().blur();
    }
  }
}
