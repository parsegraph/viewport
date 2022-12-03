import Method from "parsegraph-method";
import { PaintedNode } from "parsegraph-artist";

export default class CarouselAction {
  _action: PaintedNode;
  _func: Method;
  _hotkey: string;
  _node: PaintedNode;
  _nodeData: any;

  constructor(action: PaintedNode, func: Function, thisArg?: any) {
    this._action = action;
    this._func = new Method(func, thisArg);
    this._hotkey = null;
    this._node = null;
    this._nodeData = null;
  }

  call() {
    this._func.call(this._nodeData);
  }

  setAction(action: PaintedNode) {
    this._action = action;
  }

  action(): PaintedNode {
    return this._action;
  }

  getCallback() {
    return this._func;
  }

  setNodeData(node: PaintedNode, nodeData?: any) {
    this._node = node;
    this._nodeData = nodeData;
  }

  nodeData() {
    return this._nodeData;
  }

  node(): PaintedNode {
    return this._node;
  }

  setHotkey(hotkey: string) {
    this._hotkey = hotkey;
  }

  hotkey() {
    return this._hotkey;
  }
}
