/**
 * 虚拟节点1
 */
const vnode1 = {
  type: 'div',
  children: 'hello world',
};


/**
 * 渲染器
 * 支持渲染到任意平台
 */
function createRenderer(options) {
  const {
    createElement,
    setElementText,
    insert,
    getParent,
    removeChild,
  } = options;

  /**
   * 挂载元素 
   */
  function mountElement(vnode, container) {
    const el = vnode.el = createElement(vnode.type);
    setElementText(el, vnode.children);

    insert(el, container);
  }

  /**
   * 卸载操作 
   */
  function unmount(vnode) {
    let parent = getParent(vnode.el)
    if (parent) {
      removeChild(vnode.el, parent);
    }
  }

  /**
   * render 渲染
   * 接受 vnode 虚拟节点，并将其转换成真实的 DOM 挂载到页面上
   */
  function render(vnode, container) {
    // 当前存在 vnode,则执行挂载操作
    if (vnode) {
      mountElement(vnode, container);
    } else {
      // 当前没有 vnode，移除上一次的 vnode
      if (container._vnode) {
        unmount(container._vnode);
      }
    }

    // 将当前的 vnode 缓存到 _vnode 上，以便下一次渲染使用
    container._vnode = vnode;
  }

  return {
    render,
  };
}

// 创建 Web 平台渲染器
const renderer = createRenderer({
  // 用于创建元素
  createElement(tag) {
    return document.createElement(tag);
  },
  // 给元素设置文本节点
  setElementText(el, text) {
    el.textContent = text;
  },
  // 用于在给定的 parent 下添加指定元素
  insert(el, parent, anchor) {
    parent.insertBefore(el, anchor);
  },
  // 获取父元素
  getParent(el) {
    return el.parentNode;
  },
  // 移除子元素
  removeChild(el, parent) {
    parent.removeChild(el);
  }
});

// 首次渲染
renderer.render(vnode1, document.querySelector('#app'));

// 第二次渲染
setTimeout(() => {
  console.log('元素卸载');
  renderer.render(null, document.querySelector('#app'));
}, 3000);
