// 文本节点
const Text = Symbol('text');
// 注释节点
const Comment = Symbol('comment');
// 文本碎片
const Fragment = Symbol('fragment');

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
 * 虚拟节点3
 */
const vnode3 = {
  type: Comment,
};

const vnode4 = {
  type: Text,
  children: 'text children',
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
    createText,
    setText,
    createComment,
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
    // 如果旧节点存在，但是新旧节点 type不同，没有对比的意义
    // 重置 n1，直接挂载 n2
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      n1 = null;
    }

    // 需要严格区分 n2 type 的类型
    // 他可能是普通节点、组件、或者注释节点等
    // 不同的节点，更新处理的方法应该是不同的
    const { type } = n2;
    // 普通标签
    if (typeof type === 'string') {
      // 如果没有旧节点，直接挂载新节点，不需要对比
      if (!n1) {
        mountElement(n2, container);
      } else {
        // 新旧节点都存在，则进入对比
        patchElement(n1, n2);
      }
    } else if (type === Text) {
      // 新节点为文本节点
      if (!n1) {
        // 旧节点不存在,不需要对其处理，只需要创建一个文本节点插入即可
        const textNode = n2.el = createText(n2.children);
        insert(textNode, container);
      } else {
        // 此时证明旧节点存在，只需要判断新旧文本节点的内容即可
        if (n1.children !== n2.children) {
          const el = n2.el = n1.el;
          setText(el, n2.children);
        }
      }
    } else if (type === Comment) {
      // 新节点为注释节点
      if (!n1) {
        // 旧节点不存在，不需要对其处理，只需要创建一个注释节点插入即可
        const commentNode = n2.el = createComment();
        insert(commentNode, container);
      } else {
        // 如果旧节点也为注释节点，此时只需要更新下虚拟DOM上挂载的元素el
        n2.el = n1.el;
      }
    } else if (type === Fragment) {
      // 新节点为文本碎片
      if (!n1) {
        // 旧节点不存在，只需要针对新节点的文本碎片逐个挂载
        n2.children.forEach(child => patch(null, n2, container));
      } else {
        // 如果存在的话，只需要更新碎片的 children 即可
        patchChildren(n1, n2, container);
      }
    } else if (typeof text === 'object') {
      // 如果新节点为组件
    }
  }

  /**
   * 更新新旧 vnode 
   */
  function patchElement(n1, n2) {
    const el = n2.el = n1.el;
    const oldProps = n1.props;
    const newProps = n2.props;

    // 更新 props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }

    // 更新 children
    patchChildren(n1, n2, el);
  }

  /**
   * patch 子节点
   */
  function patchChildren(n1, n2, container) {
    /**
     * 子节点更新的情况：
     * 新子节点有三种情况：没有子节点，文本子节点，一组子节点
     * 旧子节点有三种情况：没有子节点，文本子节点，一组子节点
     * 所以需要分别处理，上述总共有九中可能
     */
    // 新节点为文本节点
    if (typeof n2.children === 'string') {
      // 如果旧节点为一组子节点，则逐个卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach(child => unmount(child));
      }
      // 更新新节点的文本节点
      setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      // 新节点为一组子节点
      if (Array.isArray(n1.children)) {
        // 旧节点为一组子节点，
        // 此时需要 diff 算法
        // 先暴力实现，逐个卸载旧节点，再逐个挂载新节点
        n1.children.forEach(child => unmount(child));
        n2.children.forEach(child => patch(null, child, container));
      } else {
        // 此时旧节点要么为文本子节点，要么为没有子节点
        // 此时只需要清空旧节点即可，然后将新节点逐个挂载
        setElementText(container, '');
        n2.children.forEach(child => patch(null, child, container));
      }
    } else {
      // 新节点没有子节点，此时只需要按情况处理旧节点即可
      if (Array.isArray(n1.children)) {
        // 旧节点为一组子节点，逐个卸载
        n1.children.forEach(child => unmount(child));

        // 旧节点为文本节点，进行清空
        setElementText(container, '');
        // 旧节点没有子节点不需要处理
        // ...
      }
    }
  }

  /**
   * render 渲染
   * 接受 vnode 虚拟节点，并将其转换成真实的 DOM 挂载到页面上
   */
  function render(vnode, container) {
    // render 只有三种情况：
    // 1. 首次渲染 - 直接挂载
    // 2. 更新渲染 - 需要对比
    // 3. 卸载 - 直接卸载
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
  // patch props
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
  },
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text);
  },
  // 设置文本内容
  setText(el, text) {
    el.nodeValue = text;
  },
  // 创建注释节点
  createComment() {
    return document.createComment('');
  }
});

// 首次渲染
renderer.render(vnode1, document.querySelector('#app'));

// 第二次渲染
setTimeout(() => {
  console.log('元素更新');
  renderer.render(vnode3, document.querySelector('#app'));
}, 3000);


// 第三次次渲染
setTimeout(() => {
  console.log('元素卸载');
  renderer.render(null, document.querySelector('#app'));
}, 6000);
