import { PaintedNode } from "parsegraph-artist";
import Viewport from "./navport/Navport";
import SingleScreenViewportDisplayMode from "./navport/displaymode/single";
import render from "./render";

/**
 * Show a basic graph given a node.
 */
export default function showGraph(rootNode: PaintedNode) {
  const viewport = new Viewport(
    new SingleScreenViewportDisplayMode(),
    rootNode
  );
  return (container: Element) => {
    return render(container, viewport);
  };
}
