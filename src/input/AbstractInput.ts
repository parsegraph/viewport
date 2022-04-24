export default abstract class AbstractInput<Controller> {
  private _container: HTMLElement;
  private _control: Controller;
  private _unmount: () => void;

  mount(container: HTMLElement) {
    if (this._container === container) {
      return;
    }
    this.unmount();
    this._container = container;
    this._unmount = this.addListeners(container);
  }

  protected abstract addListeners(container: HTMLElement): () => void;

  setControl(controller: Controller) {
    this._control = controller;
  }

  container() {
    return this._container;
  }

  control() {
    return this._control;
  }

  unmount() {
    if (this._unmount) {
      this._unmount();
      this._unmount = null;
    }
    this._container = null;
  }
}
