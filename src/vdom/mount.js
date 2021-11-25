import { VNodeFlags, ChildrenFlags } from './flags'
import patch, { patchData } from './patch'
import options from './options'
import { createTextNode } from './createElement'

const { removeChild } = options

export default function mount(vnode, container, refEl = null) {
  if (Array.isArray(vnode)) {
    for (let i = 0; i < vnode.length; i++) {
      mount(vnode[i], container)
    }
  } else if (vnode.flags & VNodeFlags.ELEMENT_VNODE) {
    mountElement(vnode, container, refEl)
  } else if (vnode.flags & VNodeFlags.COMPONENT) {
    mountComponent(vnode, container, refEl)
  } else if (vnode.flags & VNodeFlags.FRAGMENT) {
    mountFragment(vnode, container, refEl)
  } else if (vnode.flags & VNodeFlags.PORTAL) {
    mountPortal(vnode, container, refEl)
  } else if (vnode.flags & VNodeFlags.TEXT_VNODE) {
    mountText(vnode, container, refEl)
  }
}

// 挂载元素节点
function mountElement(vnode, container, refEl) {
  const el = document.createElement(vnode.tag)
  mountChildren(vnode.children, el, vnode.childFlags)
  // 添加属性
  for (let key in vnode.data) {
    patchData(el, key, null, vnode.data[key])
  }
  container.insertBefore(el, refEl)
  vnode.el = el
}
function mountChildren(children, container, childFlags, refEl) {
  if (childFlags & ChildrenFlags.SINGLE_CHILDREN) {
    mount(children, container, refEl)
  } else if (childFlags & ChildrenFlags.MULTI_CHILDREN) {
    for (let i = 0; i < children.length; i++) {
      mount(children[i], container, refEl)
    }
  }
}

function mountText(vnode, container, refEl) {
  // 创建文本节点
  const el = document.createTextNode(vnode.children)
  container.insertBefore(el, refEl)
  vnode.el = el
}

// 挂载组件
function mountComponent(vnode, container, refEl) {
  if (vnode.flags & VNodeFlags.COMPONENT_STATEFUL) {
    // 有状态组件
    mountStatefulComponent(vnode, container, refEl)
  } else {
    // 函数组件
    mountFunctionalComponent(vnode, container, refEl)
  }
}
function mountStatefulComponent(vnode, container, refEl) {
  // 有状态组件，本质是实例化组件，然后将组件产物挂载到container，组件自己维护一套更新流程
  const instance = vnode.children = new vnode.tag()
  instance._isMounted = false
  instance._update = function () {
    if (!this._isMounted) {
      this._isMounted = true
      const instanceVnode = this._vnode = this.render()
      mount(instanceVnode, container, refEl)
    } else {
      const preVnode = this._vnode
      const nextVnode = this._vnode = this.render()
      patch(preVnode, nextVnode, container)
    }
  }
  instance._unmount = function () {
    if (this._isMounted) {
      removeChild(this._vnode, container)
      this._isMounted = false
    }
  }
  instance._update()
}
function mountFunctionalComponent(vnode, container, refEl) {
  // 函数式组件也差不多，只不过需要自己维护函数组件产出的vnode
  vnode.handle = {
    pre: null,
    next: null,
    container,
    update() {
      if (!this.pre) {
        this.pre = this.next = vnode.children = vnode.tag()
        mount(this.next, this.container, refEl)
      } else {
        this.pre = this.next
        this.next = vnode.tag()
        patch(this.pre, this.next, this.container)
      }
    },
    unmount() {
      removeChild(this.next, container)
    }
  }
  vnode.handle.update()
}

function mountFragment(vnode, container, refEl) {
  // 本质上就是挂载所有子节点到container上
  const childFlags = vnode.childFlags
  mountChildren(vnode.children, container, childFlags, refEl)
  
  // 用第一个子节点或者空节点的目的，是为了前面节点找refEl时能正确找到参照的位置
  if (childFlags & ChildrenFlags.NO_CHILDREN) {
    // 没有子节点，el用占位的空文本节点代替
    const placeholder = createTextNode('')
    mountText(placeholder, container, refEl)
    vnode.el = placeholder.el
  } else if (childFlags & ChildrenFlags.SINGLE_CHILDREN) {
    vnode.el = vnode.children.el
  } else if (childFlags & ChildrenFlags.MULTI_CHILDREN) {
    vnode.el = vnode.children[0].el
  }
}

function mountPortal(vnode, container, refEl) {
  // 本质上是挂载所有子节点到target指定的容器上
  const target = document.querySelector(vnode.tag)
  vnode.tag = target
  const childFlags = vnode.childFlags
  mountChildren(vnode.children, target, childFlags)
  
  const placeholder = createTextNode('')
  mountText(placeholder, container, refEl)
  vnode.el = placeholder.el
}