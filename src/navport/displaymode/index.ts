export interface ViewportDisplayMode {
  render(projector: Projector, nav: Navport): boolean;
  allowSplit(projector: Projector, nav: Navport): boolean;
  showMenu(projector: Projector, nav: Navport): boolean;
}
