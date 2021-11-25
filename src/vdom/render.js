import mount from './mount'
import patch from './patch'

export default function render(vnode, container) {
  const preVnode = container.vnode
  container.vnode = vnode
  if (!preVnode) {
    mount(vnode, container)
  } else {
    if (vnode) {
      patch(preVnode, vnode, container)
    } else {
      container.removeChild(preVnode.el)
      container.vnode = null
    }
  }
}
