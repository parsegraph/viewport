import { Keystroke } from "parsegraph-input";
import AbstractInput from "./AbstractInput";
import addListeners from "./addListeners";

export interface KeyController {
  keydown(event: Keystroke): boolean;
  keyup(event: Keystroke): void;
  lastMouseX(): number;
  lastMouseY(): number;
}

export default class KeyInput extends AbstractInput<KeyController> {
  addListeners(container: HTMLElement) {
    return addListeners(this, container, [
      ["keydown", this.keydownListener],
      ["keyup", this.keyupListener],
    ]);
  }

  keydownListener(event: KeyboardEvent) {
    if (event.altKey || event.metaKey) {
      // console.log("Key event had ignored modifiers");
      return;
    }
    if (event.ctrlKey && event.shiftKey) {
      return;
    }
    if (!this.control()) {
      return;
    }

    return this.control().keydown(Keystroke.fromKeyboardEvent(event, NaN, NaN));
  }

  keyupListener(event: KeyboardEvent) {
    if (!this.control()) {
      return;
    }
    this.control().keyup(Keystroke.fromKeyboardEvent(event, NaN, NaN));
  }
}
