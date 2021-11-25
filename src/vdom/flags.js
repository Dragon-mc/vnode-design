export const VNodeFlags = {
  ELEMENT_VNODE: 1,
  
  TEXT_VNODE: 1 << 1,
  
  COMPONENT_STATEFUL: 1 << 2,
  
  COMPONENT_FUNCTIONAL: 1 << 3,

  FRAGMENT: 1 << 4,
  
  PORTAL: 1 << 5
}

VNodeFlags.COMPONENT = VNodeFlags.COMPONENT_FUNCTIONAL | VNodeFlags.COMPONENT_STATEFUL

export const ChildrenFlags = {
  UNKNOW_CHILDREN: 0,

  NO_CHILDREN: 1,
  
  SINGLE_CHILDREN: 1 << 1,
  
  MULTI_CHILDREN: 1 << 2
}

export const Fragment = Symbol('Fragment')

export const Portal = Symbol('Portal')
