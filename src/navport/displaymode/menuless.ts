import Navport, { ViewportDisplayMode } from "../Navport";
import { Projector } from "parsegraph-projector";

export default abstract class MenulessViewportDisplayMode
  implements ViewportDisplayMode
{
  allowSplit(): boolean {
    return false;
  }

  showMenu(): boolean {
    return false;
  }

  abstract render(proj: Projector, viewport: Navport): boolean;
}
