// @vue/reactivity
const { effect, reactive, shallowReactive } = VueReactivity;
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
      children: '1',
      key: 1,
    },
    {
      type: 'p',
      children: '2',
      key: 2,
    },
    {
      type: 'p',
      children: '3',
      key: 3,
    },
    // {
    //   type: 'p',
    //   children: '3',
    //   key: 3
    // }
  ]
};

/**
 * 虚拟节点2
 */
const vnode2 = {
  type: 'div',
  props: {
    class: 'div1',
    id: 'vnode1',
  },
  children: [
    {
      type: 'p',
      children: '1',
      key: 1,
    },
    {
      type: 'p',
      children: '3',
      key: 3,
    },
    // {
    //   type: 'p',
    //   children: '2',
    //   key: 2,
    // },
    // {
    //   type: 'p',
    //   children: '3',
    //   key: 3
    // }
  ]
};

/**
 * 虚拟节点3
 */
const vnode3 = {
  type: Comment,
};

/**
 * 虚拟节点4
 */
const vnode4 = {
  type: Text,
  children: 'text children',
};

/**
 * 虚拟节点5
 * @example <myComponent title="This is Title props" />
 */
const myComponent = {
  name: 'myComponent',
  props: {
    title: String,
  },
  data() {
    return {
      msg: 'hello components',
    };
  },
  render(state) {
    return {
      type: 'div',
      children: `props：${this.title};data: ${this.msg}`,
    };
  },

  beforeCreate() {
    console.log('call before create');
  },

  created() {
    console.log('call created');
  },

  beforeMount() {
    console.log('call before mount');
  },

  mounted(state) {
    setTimeout(() => {
      this.msg = 'updated';
    }, 1000);
    console.log('call mounted');;
  },

  beforeUpdate() {
    console.log('call beforeUpdate');
  },

  updated() {
    console.log('call updated');
  }
};
const vnode5 = {
  type: myComponent,
  props: {
    title: 'This is Title props',
  },
};

const vnode6 = {
  type: myComponent,
  props: {
    title: 'Title props updated',
  },
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
    nextSibling,
  } = options;

  /**
   * 挂载 vnode
   */
  function mountElement(vnode, container, anchor) {
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
    insert(el, container, anchor);
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
   * 解析 props
   * 将父组件的 props 传值和子组件的 props 定义进行映射，解析出 props 和 attrs
   */
  function resolveProps(options, propsData) {
    const props = {};
    const attrs = {};
    for (let key in propsData) {
      // 定义在 options 里面认为是 props，否则认为是 attrs
      if (key in options) {
        props[key] = propsData[key];
      } else {
        attrs = propsData[key];
      }
    }

    return [
      props,
      attrs,
    ];
  }

  /**
   * 挂载组件 
   */
  function mountComponent(vnode, container, anchor) {
    // 组件选项数据
    const componentOptions = vnode.type;
    // 组件选项
    const {
      render,
      data,
      props: propsOpts,
      beforeCreate,
      created,
      beforeMount,
      mounted,
      beforeUpdate,
      updated
    } = componentOptions;

    // 调用 beforeCreate 钩子
    beforeCreate && beforeCreate();

    // 组件状态
    // 转成响应式对象
    const state = reactive(data());
    // 解析 props
    const [props, attrs] = resolveProps(propsOpts, vnode.props)

    const instance = {
      state,
      // 将 props 转成响应式对象
      props: shallowReactive(props),
      // 组件是否挂载
      isMounted: false,
      // 占位 vnode
      subTree: null,
    };

    vnode.component = instance;

    const renderContext = new Proxy(instance, {
      get(t, k, r) {
        const { state, props } = t;
        if (state && k in state) {
          // 优先取 state 的值
          return state[k];
        } else if (k in props) {
          // 否则取 props 的值
          return props[k];
        } else {
          console.warn(`你在访问了一个未定义的值${k}`);
        }
      },
      set(t, k, v, r) {
        const { state, props } = t;
        if (state && k in state) {
          state[k] = vnode;
        } else if (k in props) {
          console.warn('props 不能改变');
        } else {
          console.warn(`你在访问了一个未定义的值${k}`);
        }
      }
    })

    created && created.call(renderContext);

    // 使用副作用函数, state 状态变化的时候重新 patch
    effect(() => {
      // 组件占位 vnode
      const subTree = render.call(renderContext);
      if (!instance.isMounted) {
        // 调用 beforeMount 钩子
        beforeMount && beforeMount.call(state);
        // 没有挂载直接 patch
        patch(null, subTree, container, anchor);
        // 调用 mounted 钩子
        mounted && mounted.call(state);
        instance.isMounted = true;
      } else {
        // 调用 beforeUpdate 钩子
        beforeUpdate && beforeUpdate.call(state);
        // 有挂载过需要对比
        patch(instance.subTree, subTree, container, anchor);
        // 调用 updated 钩子
        updated && updated.call(state)
      }
      instance.subTree = subTree;
      // 挂载
    }, {
      // 指定任务调度器
      scheduler: queueJob
    });
  }

  /**
   * 更新 vnode 
   * 负责元素挂载以及对比新旧 vnode
   */
  function patch(n1, n2, container, anchor) {
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
        mountElement(n2, container, anchor);
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
    } else if (typeof type === 'object') {
      // 如果新节点为组件
      if (!n1) {
        // 旧节点不存在，直接挂载当前新节点(组件)
        mountComponent(n2, container);
      } else {
        // patch 当前组件
        patchComponent(n1, n2, container);
      }
    }
  }

  /**
   * 组件 patch
   */
  function patchComponent(n1, n2, anchor) {
    // 组件
    const instance = n2.component = n1.component;
    const { props } = instance;

    // 是否有 props 更新
    if (hasPropsChanged(n1.props, n2.props)) {
      // 拿到新的 props
      const [ nextProps ] = resolveProps(n2.type.props, n2.props)
      // 更新 props
      // 将 nextProps 更新到 props 上
      for (let key in nextProps) {
        // 修改 props 的值会被 effect 监听到
        props[key] = nextProps[key];
      }

      // 删除 props
      // 循环原有 props，没有在 nextprops 里面的需要删除 
      for (let key in props) {
        if (!(key in nextProps)) {
          delete props[key];
        }
      }
    }
    // 次数应该还有 slots 等检测更新
  }

  /**
   * 检测 props 是否更新
   */
  function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    // 长度不一样，认为更新了
    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
    }

    // 值不一样认为更新了
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }

    return false;
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
        // patchChildrenDiff1(n1, n2, container);
        // patchChildrenDiff2(n1, n2, container);
        patchChildrenDiff3(n1, n2, container);
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
   * diff 算法 1
   * 暴力对比，对旧子节点逐个进行卸载，再对新节点逐个进行挂载 
   */
  function patchChildrenDiff1(n1, n2, container) {
    n1.children.forEach(child => unmount(child));
    n2.children.forEach(child => patch(null, child, container));
  }

  /**
   * diff 算法 2
   * 对比新旧节点长度，取最短的那个节点进行 patch，然后再判断新旧节点的长度
   * 如果新节点长度大于旧节点长度说明需要挂载新的多余街道
   * 如果旧节点长度大于新节点说明需要卸载多余的旧节点
   */
  function patchChildrenDiff2(n1, n2, container) {
    const oldLen = n1.children.length;
    const newLen = n2.children.length;
    // 共有的长度，逐个进行 patch
    const commLen = Math.min(oldLen, newLen);
    for (let i = 0; i < commLen; i++) {
      patch(n1.children[i], n2.children[i], container);
    }
    if (oldLen > newLen) {
      // 说明旧节点多，需要卸载
      for (let i = commLen; i < oldLen; i++) {
        unmount(n1.children[i]);
      }
    } else if (newLen > oldLen) {
      // 说明新节点多，需要挂载
      for (let i = commLen; i < newLen; i++) {
        patch(n1.children[i], n2.children[i], container);
      }
    }
  }

  /**
   * diff 算法 3
   * 双端对比算法，在新旧子节点头尾新增两个指针，然后一次头头、尾尾、头尾、尾头依次对比
   */
  function patchChildrenDiff3(n1, n2, container, anchor) {
    const oldChildren = n1.children;
    const newChildren = n2.children;

    let oldStartdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldChildren.length - 1;
    let newEndIdx = newChildren.length - 1;

    let oldStartVnode = oldChildren[oldStartdx];
    let newStartVnode = newChildren[newStartIdx];
    let oldEndVnode = oldChildren[oldEndIdx];
    let newEndVnode = newChildren[newEndIdx];

    while (newStartIdx <= newEndIdx && oldStartdx <= oldEndIdx) {
      // oldStartVnode 或者 oldEndVnode 这个不存在证明在非常规的对比中找到复用的了
      if (!oldStartVnode) {
        oldStartVnode = oldChildren[++oldStartdx];
      } else if (!oldEndVnode) {
        oldEndVnode = oldChildren[--oldStartdx];
      } else if (oldStartVnode.key === newStartVnode.key) {
        // 头头对比
        patch(oldStartVnode, newStartVnode, container);
        oldStartVnode = oldChildren[++oldStartdx];
        newStartVnode = newChildren[++newStartIdx];
      } else if (oldEndVnode.key === newEndVnode.key) {
        // 尾尾对比
        patch(oldEndVnode, newEndVnode, container);
        oldEndVnode = oldChildren[--oldEndIdx];
        newEndVnode = newChildren[--newEndIdx];
      } else if (oldStartVnode.key === newEndVnode.key) {
        // 头尾对比
        // 此时证明旧节点移动到尾部去了,需要将 oldStartVnode, 插入到 oldEndVnode 的后面
        patch(oldStartVnode, newEndVnode, container);
        insert(oldStartVnode.el, container, nextSibling(oldEndVnode.el));
        oldStartVnode = oldChildren[++oldStartdx];
        newEndVnode = newChildren[--newEndIdx];
      } else if (oldEndVnode.key === newStartVnode.key) {
        // 尾头对比
        // 此时证明旧节点被移动到前面去了，需要将 oldEndVnode 移动到 oldStartVnode 前面
        patch(oldEndVnode, newStartVnode, container);
        insert(oldEndVnode.el, container, oldStartVnode.el);
        oldEndVnode = oldChildren[--oldEndIdx];
        newStartVnode = newChildren[++newStartIdx];
      } else {
        // 如果上述无法匹配
        // 则查找非头部和非尾部是否有可复用的DOM
        // 遍历旧节点，查找其中是否有新节点开始节点的相同的KEY
        // 如果大于 0 则说明这个节点之前不是头部节点，但是现在尾头部节点，则需要把旧节点移动到oldStartVnode之前
        // @example
        // 新节点：1 2 3 4 （1这个节点在旧节点中的位置）
        // 旧节点：2 4 1 3
        const idxInOld = oldChildren.findIndex(
          node => node.key === newStartVnode.key
        );
        if (idxInOld > 0) {
          // 当前需要移动的旧节点
          const moveNode = oldChildren[idxInOld];
          patch(moveNode, newStartVnode, container);
          // 插入到旧节点的最前面位置
          insert(moveNode.el, container, oldStartVnode.el);
          // 旧节点当前的元素已经被移走了，此时需要重置下
          oldChildren[idxInOld] = undefined;
          // 更新新节点的开始位置
          newStartVnode = newChildren[++newStartIdx];
        } else {
          // 如果没有找到，说明新节点此时是新增的节点，只需要将他插入到旧节点最前面即可
          // @example
          // 新节点 4 3 1 2 （4 是新增的节点）
          // 旧节点 1 2 3
          patch(null, newStartVnode, container, oldStartVnode.el);
          newStartVnode = newChildren[++newStartIdx];
        }
      }
    }

    if (oldEndIdx < oldStartdx && newStartIdx <= newEndIdx) {
      // 此时说明旧节点已经被遍历完了，但是新节点还有遍历完，需要新增新节点
      // @example
      // 新节点：4 1 2 3
      // 旧节点：1 2 3
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        const anchor = newChildren[newEndIdx + 1] ? newChildren[newEndIdx + 1].el : null;
        patch(null, newChildren[i], container, anchor);
      }
    } else if (newEndIdx < newStartIdx && oldStartdx <= oldEndIdx) {
      // 此时说明新节点被遍历完了，但是旧节点还没有被遍历完，需要删除旧节点
      // @example
      // 新节点：1 3
      // 旧节点 1 2 3
      for (let i = oldStartdx; i <= oldEndIdx; i++) {
        unmount(oldChildren[i]);
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

const queue = new Set();
let isFlushing = false;
const p = Promise.resolve();
function queueJob(job) {
  queue.add(job);
  isFlushing = true;
  p.then(() => {
    try {
      queue.forEach(job => job())
    } finally {
      isFlushing = false;
      queue.clear = 0;
    }
  })
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
  },
  // 当前元素的相邻元素
  nextSibling(el) {
    return el.nextSibling;
  }
});

// 首次渲染
renderer.render(vnode5, document.querySelector('#app'));

// 第二次渲染
setTimeout(() => {
  console.log('元素更新');
  debugger;
  renderer.render(vnode6, document.querySelector('#app'));
}, 3000);


// 第三次次渲染
// setTimeout(() => {
//   console.log('元素卸载');
//   renderer.render(null, document.querySelector('#app'));
// }, 6000);
