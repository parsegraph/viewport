import { Projector } from "parsegraph-projector";
import Navport, { ViewportDisplayMode } from "../Navport";

const MIN_SPLIT_THRESHOLD = 800;
const MIN_MENU_THRESHOLD = 400;

export default abstract class SplittingViewportDisplayMode
  implements ViewportDisplayMode
{
  abstract render(projector: Projector, nav: Navport): boolean;

  allowSplit(projector: Projector): boolean {
    return projector.width() > MIN_SPLIT_THRESHOLD;
  }

  showMenu(projector: Projector): boolean {
    return false; // return projector.width() > MIN_MENU_THRESHOLD;
  }
}
