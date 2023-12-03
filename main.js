/**
 * 虚拟节点1
 */
const vnode1 = {
  type: 'div',
  props: {
    class: 'div1',
    id: 'vnode1',
  },
  children: [
    {
      type: 'p',
      children: 'hello1',
    },
    {
      type: 'p',
      children: 'hello2',
    }
  ]
};

/**
 * 虚拟节点2
 */
const vnode2 = {
  type: 'div',
  props: {
    class: 'div2',
    id: 'vnode2',
  },
  children: [
    {
      type: 'p',
      children: 'hello3',
    },
    {
      type: 'p',
      children: 'hello4',
    }
  ]
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
    patchProps,
  } = options;

  /**
   * 挂载 vnode
   */
  function mountElement(vnode, container) {
    const el = vnode.el = createElement(vnode.type);
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      // 如果children为数组，则 调用 patch 函数挂载到当前元素上
      vnode.children.forEach(child => patch(null, child, el));
    }

    // patch props
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }

    // 插入
    insert(el, container);
  }

  /**
   * 卸载 vnode
   */
  function unmount(vnode) {
    let parent = getParent(vnode.el)
    if (parent) {
      removeChild(vnode.el, parent);
    }
  }

  /**
   * 更新 vnode 
   * 负责元素挂载以及对比新旧 vnode
   */
  function patch(n1, n2, container) {
    // 如果没有旧节点，直接挂载新节点，不需要对比
    if (!n1) {
      mountElement(n2, container);
    } else {
      // 如果存在旧节点，则需要针对新旧节点进行对比
      // 简单实现对比算法,
      // 1. 移除旧的节点， 2. 挂载新的节点
      unmount(n1);
      patch(null, n2, container);
    }
  }

  /**
   * render 渲染
   * 接受 vnode 虚拟节点，并将其转换成真实的 DOM 挂载到页面上
   */
  function render(vnode, container) {
    // 当前存在 vnode,则执行挂载操作
    if (vnode) {
      // 传入新旧 vnode 进行 patch 操作
      patch(container._vnode, vnode, container);
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
  },
  patchProps(el, key, prevValue, nextValue) {
    // 有限使用 HTML Attrs 设置初始值
    if (key in el) {
      const type = typeof el[key];
      // 用户本意是禁用
      // <button disabled></button> => { props: { disabled: '' }}
      // vue 模板这样写是不禁用
      // <button :disabled="false"></button> => { props: { disabled: false }}
      // // 如果是布尔类型，并且 value 是空字符串，则将值矫正为 true
      if (type === 'boolean' && nextValue === '') {
        el[key] = true;
      } else {
        el[key] = nextValue;
      }
    } else {
      el.setAttribute(key, nextValue);
    }
  }
});

// 首次渲染
renderer.render(vnode1, document.querySelector('#app'));

// 第二次渲染
setTimeout(() => {
  console.log('元素更新');
  renderer.render(vnode2, document.querySelector('#app'));
}, 3000);


// 第三次次渲染
setTimeout(() => {
  console.log('元素卸载');
  renderer.render(null, document.querySelector('#app'));
}, 6000);
