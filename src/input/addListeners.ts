const addListeners = (
  that: object,
  elem: Element,
  listeners: [string, (event: Event) => void][]
) => {
  const removers: (() => void)[] = [];
  listeners.forEach((pair: [string, (event: Event) => void]) => {
    const thunk = (event: any) => {
      return (pair[1] as Function).call(that, event);
    };
    const name = pair[0] as string;
    elem.addEventListener(name, thunk);
    removers.push(() => {
      elem.removeEventListener(name, thunk);
    });
  });
  return () => {
    while (removers.length > 0) {
      const remover = removers.pop();
      remover();
    }
  };
};

export default addListeners;
