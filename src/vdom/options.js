import { VNodeFlags } from './flags'

const options = {
  // 删除子节点
  removeChild(vnode, container) {
    const flags = vnode && vnode.flags
    if (Array.isArray(vnode)) {
      for (let i = 0; i < vnode.length; i++) {
        options.removeChild(vnode[i], container)
      }
    } else if (flags & VNodeFlags.FRAGMENT) {
      options.removeChild(vnode.children, container)
    } else if (flags & VNodeFlags.PORTAL) {
      options.removeChild(vnode.children, vnode.tag)
    } else if (flags & VNodeFlags.COMPONENT) {
      // 对于组件的移除
      if (flags & VNodeFlags.COMPONENT_STATEFUL) {
        // 类组件直接调用vnode的 _unmount方法
        vnode.children._unmount()
      } else {
        // 函数组件调用handle中的 _unmount
        vnode.handle.unmount()
      }
    } else {
      container.removeChild(vnode.el)
    }
  },

  // 插入节点
  insertBefore(vnode, container, refEl) {
    const flags = vnode && vnode.flags
    if (Array.isArray(vnode)) {
      for (let i = 0; i < vnode.length; i++) {
        options.insertBefore(vnode[i], container, refEl)
      }
    } else if (flags & VNodeFlags.COMPONENT) {
      // 对于组件的插入
      if (flags & VNodeFlags.COMPONENT_STATEFUL) {
        options.insertBefore(vnode.children._vnode, container, refEl)
      } else {
        options.insertBefore(vnode.handle.next, container, refEl)
      }
    } else if (flags & VNodeFlags.FRAGMENT) {
      options.insertBefore(vnode.children, container, refEl)
    } else if (flags & VNodeFlags.PORTAL) {
      options.insertBefore(vnode.children, vnode.tag, refEl)
    } else {
      container.insertBefore(vnode.el, refEl)
    }
  }
}

export default options