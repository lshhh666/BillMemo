// 底部记账弹层的打开信号。tab 栏的中央 "+" 按钮与首页都可能在别的标签页上，
// 用一个极简的订阅把"请求打开"传给挂载着弹层的首页
type Listener = () => void;

let listeners: Listener[] = [];

export function openAddSheet() {
  listeners.forEach((listener) => listener());
}

export function onOpenAddSheet(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}
