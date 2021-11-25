import { VNodeFlags, ChildrenFlags, Fragment, Portal } from './flags'

export function h(...args) {
  return createElement(...args)
}

// 创建节点
export default function createElement(tag, data, children) {
  // 对节点类型做判断
  let flags
  if (typeof tag === 'string') {
    flags = VNodeFlags.ELEMENT_VNODE
  } else if (tag === Fragment) {
    flags = VNodeFlags.FRAGMENT
  } else if (tag === Portal) {
    flags = VNodeFlags.PORTAL
    tag = data.target || 'body'
  } else {
    if (tag !== null && typeof tag === 'object') {
      flags = tag.functional
        ? VNodeFlags.COMPONENT_FUNCTIONAL
        : VNodeFlags.COMPONENT_STATEFUL
    } else if (typeof tag === 'function') {
      flags =
        tag.prototype && tag.prototype.render
          ? VNodeFlags.COMPONENT_STATEFUL
          : VNodeFlags.COMPONENT_FUNCTIONAL
    }
  }

  // 对子节点做扁平化处理
  children = Array.isArray(children) ? children.flat() : children
  // 标记子节点类型
  let childFlags
  if (Array.isArray(children)) {
    if (children.length === 0) {
      childFlags = ChildrenFlags.NO_CHILDREN
      children = null
    } else if (children.length === 1) {
      childFlags = ChildrenFlags.SINGLE_CHILDREN
      children = children[0]
    } else {
      childFlags = ChildrenFlags.MULTI_CHILDREN
    }
  } else {
    if (typeof children === 'undefined') {
      childFlags = ChildrenFlags.NO_CHILDREN
      children = null
    } else {
      childFlags = ChildrenFlags.SINGLE_CHILDREN
    }
  }

  // 对子节点标准化
  children = normalizeChildren(children)

  return {
    tag,
    flags,
    data: data || {},
    children,
    childFlags,
  }
}

export function createTextNode(text) {
  return {
    tag: null,
    flags: VNodeFlags.TEXT_VNODE,
    children: text,
  }
}

function normalizeChildren(children) {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      children[i] = normalizeChildren(children[i])
      children[i].key = (children[i].data && children[i].data.key) || `|${i + 1}`
      children[i].data && delete children[i].data.key
    }
  } else if (typeof children === 'string') {
    return createTextNode(children)
  }
  return children
}
