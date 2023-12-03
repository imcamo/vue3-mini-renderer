/**
 * 虚拟节点1
 */
const vnode1 = {
  type: 'div',
  children: 'hello world',
};


/**
 * render 渲染
 * 接受 vnode 虚拟节点，并将其转换成真实的 DOM 挂载到页面上
 */
function render(vnode, container) {
  const el = document.createElement(vnode.type);
  el.textContent = vnode.children;

  container.appendChild(el);
}

// 首次渲染
render(vnode1, document.querySelector('#app'));
