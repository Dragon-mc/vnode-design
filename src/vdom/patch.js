import { VNodeFlags, ChildrenFlags } from './flags'
import mount from './mount'
import options from './options'

const {
  removeChild,
  insertBefore
} = options

// 比较原则：同类比较
export default function patch(preVnode, nextVnode, container) {
  const preFlags = preVnode.flags
  const nextFlags = nextVnode.flags
  // 首先判断是否是同类vnode，同类才有比较意义，否则拆除换新
  if (preFlags & nextFlags) {
    if (preVnode.tag !== nextVnode.tag) {
      // 不是同类节点，直接替换
      mount(nextVnode, container, getRef(preVnode))
      removeChild(preVnode, container)
    } else {
      if (nextFlags & VNodeFlags.COMPONENT) {
        // 组件对比
        patchComponent(preVnode, nextVnode, container, nextFlags)
      } else if (nextFlags & VNodeFlags.TEXT_VNODE) {
        patchText(preVnode, nextVnode)
      } else if (nextFlags & VNodeFlags.FRAGMENT) {
        patchFragment(preVnode, nextVnode, container)
      } else if (nextFlags & VNodeFlags.PORTAL) {
        patchPortal(preVnode, nextVnode)
      } else {
        // 非组件时的情况
        const el = (nextVnode.el = preVnode.el)
        // 对比数据
        const preData = preVnode.data
        const nextData = nextVnode.data
        if (nextData) {
          for (let key in nextData) {
            patchData(el, key, preData[key], nextData[key])
          }
        }
        if (preData) {
          for (let key in preData) {
            const preValue = preData[key]
            if (preValue && !nextData.hasOwnProperty(key)) {
              // 删除新数据中不存在的属性
              patchData(el, key, preValue, null)
            }
          }
        }

        // 对比子节点
        patchChildren(preVnode.children, nextVnode.children, preVnode.childFlags, nextVnode.childFlags, el)
      }
    }
  } else {
    removeChild(preVnode, container)
    mount(nextVnode, container)
  }
}

const eventReg = /^on/
const domPropsReg = /^value|^checked|^selected|[A-Z]/
export function patchData(el, key, preValue, nextValue) {
  switch (key) {
    case 'style': {
      if (preValue && !nextValue) {
        for (let k in preValue) {
          el.style.removeProperty(k)
        }
      }
      if (nextValue) {
        for (let k in nextValue) {
          el.style.setProperty(k, nextValue[k])
        }
      }
      break
    }
    case 'class': {
      // 类名格式 { a: true, b: false }
      if (preValue && !nextValue) {
        for (let k in preValue) {
          preValue[k] && el.classList.remove(k)
        }
      }
      if (nextValue) {
        for (let k in nextValue) {
          nextValue[k] && el.classList.add(k)
        }
      }
      break
    }
    default: {
      if (eventReg.test(key)) {
        key = key.replace(evnetReg, '')
        if (preValue) {
          el.removeEventListener(key, preValue)
        }
        if (nextValue) {
          el.addEventListener(key, nextValue)
        }
      } else if (domPropsReg.test(key)) {
        if (preValue && !nextValue) {
          el[key] = ''
        }
        if (nextValue) {
          el[key] = nextValue
        }
      } else {
        // 普通attr
        if (preValue && !nextValue) {
          el.removeAttribute(key)
        }
        if (nextValue) {
          el.setAttribute(key, nextValue)
        }
      }
    }
  }
}

// 对比文本
function patchText(preVnode, nextVnode) {
  if (preVnode.children !== nextVnode.children) {
    const el = (nextVnode.el = preVnode.el)
    el.nodeValue = nextVnode.children
  }
}

// 对比Fragment
function patchFragment(preVnode, nextVnode, container) {
  // Fragment本质就是对比子节点，但挂载点为Fragment父节点
  const ref = getFragmentRef(preVnode)
  patchChildren(
    preVnode.children,
    nextVnode.children,
    preVnode.childFlags,
    nextVnode.childFlags,
    container,
    // 在Fragment的patch之前，Fragment中最后一个子节点的下一个元素，就是preVnode最后一个子节点的下一个元素
    // 这样做的目的是为了保证Fragment子节点的插入位置，因为不做ref标记，可能子节点在patch时会直接被插入父容器尾部
    ref
  )
  // 比较完成后设置nextValue的引用el
  const childFlags = nextVnode.childFlags
  if (childFlags & ChildrenFlags.NO_CHILDREN) {
    // 没有子节点，el用占位的空文本节点代替
    nextVnode.el = document.createTextNode('')
  } else if (childFlags & ChildrenFlags.SINGLE_CHILDREN) {
    nextVnode.el = nextVnode.children.el
  } else if (childFlags & ChildrenFlags.MULTI_CHILDREN) {
    nextVnode.el = nextVnode.children[0].el
  }
}
function getFragmentRef(vnode) {
  const childFlags = vnode.childFlags
  switch (childFlags) {
    case ChildrenFlags.NO_CHILDREN:
      return vnode.el
    case ChildrenFlags.SINGLE_CHILDREN:
      return getNextRef(vnode.children)
    case ChildrenFlags.MULTI_CHILDREN:
      return getNextRef(vnode.children[vnode.children.length - 1])
  }
}
function getNextRef(vnode) {
  return getRef(vnode).nextSibling
}
function getRef(vnode) {
  if (vnode.flags & VNodeFlags.COMPONENT) {
    if (vnode.flags & VNodeFlags.COMPONENT_STATEFUL) {
      return getRef(vnode.children._vnode)
    } else {
      return getRef(vnode.handle.next)
    }
  } else {
    return vnode.el
  }
}

function patchPortal(preVnode, nextVnode) {
  patchChildren(
    preVnode.children,
    nextVnode.children,
    preVnode.childFlags,
    nextVnode.childFlags,
    // 先在旧容器中进行更新
    preVnode.tag
  )
  nextVnode.el = preVnode.el
  // 更新完子节点后，如果新容器与旧容器不同，则转移元素
  const container = nextVnode.tag = document.querySelector(nextVnode.tag)
  if (preVnode.tag !== nextVnode.tag) {
    insertBefore(nextVnode.children, container, null)
  }
}

function patchChildren(preChildren, nextChildren, preFlags, nextFlags, container, refNext = null) {
  switch (preFlags) {
    case ChildrenFlags.NO_CHILDREN:
      switch (nextFlags) {
        case ChildrenFlags.SINGLE_CHILDREN:
          // 原本有没有节点，现在有一个子节点，直接挂载上去
          mount(nextChildren, container)
          break
        case ChildrenFlags.MULTI_CHILDREN:
          // 现在有多个子节点
          mount(nextChildren, container)
          break
      }
      break
    case ChildrenFlags.SINGLE_CHILDREN:
      switch (nextFlags) {
        case ChildrenFlags.NO_CHILDREN:
          // 原本有一个，现在没有，直接删除原本的节点
          removeChild(preChildren, container)
          break
        case ChildrenFlags.SINGLE_CHILDREN:
          // 原本有一个，现在也是一个，直接深度对比
          patch(preChildren, nextChildren, container)
          break
        case ChildrenFlags.MULTI_CHILDREN:
          // 原本是一个，现在是多个，拆除原本的，挂载新的
          removeChild(preChildren, container)
          mount(nextChildren, container)
          break
      }
      break
    case ChildrenFlags.MULTI_CHILDREN:
      switch (nextFlags) {
        case ChildrenFlags.NO_CHILDREN:
          // 原本多个，现在没有，删除原本的全部
          for (let i = 0; i < preChildren.length; i++) {
            removeChild(preChildren[i], container)
          }
          break
        case ChildrenFlags.SINGLE_CHILDREN:
          // 原本多个，现在一个，删除原本的全部，挂载新的
          for (let i = 0; i < preChildren.length; i++) {
            removeChild(preChildren[i], container)
          }
          mount(nextChildren, container)
          break
        case ChildrenFlags.MULTI_CHILDREN:
          // 前后都是多个子节点，核心diff算法
          patchMultiChildren(preChildren, nextChildren, container, refNext)
          break
      }
      break
  }
}

const NoHandle = Symbol('NoHandle')
// 算法思想：尽可能少的移动元素，即找出需要移动元素的最小数量
function patchMultiChildren(preChildren, nextChildren, container, refNext) {
  let j = 0,
    preLast = preChildren.length - 1,
    nextLast = nextChildren.length - 1
  
  // 首先处理相同的前半部分
  while (j <= preLast && j <= nextLast && preChildren[j].key === nextChildren[j].key) {
    patch(preChildren[j], nextChildren[j], container)
    j++
  }
  // 然后处理相同的后半部分
  while (preLast >= j && nextLast >= j && preChildren[preLast].key === nextChildren[nextLast].key) {
    patch(preChildren[preLast], nextChildren[nextLast], container)
    preLast--
    nextLast--
  }

  // 判断边界情况，如果 j > preLast && j <= nextLast 则说明有新增的节点
  if (j > preLast && j <= nextLast) {
    for (let i = nextLast; i >= j; i--) {
      const refEl = nextChildren[i + 1] && getRef(nextChildren[i + 1]) || refNext
      mount(nextChildren[i], container, refEl)
    }
  } else if (j <= preLast && j > nextLast) {
    // 有旧节点需要删除
    for (let i = j; j <= preLast; j++) {
      removeChild(preChildren[i], container)
    }
  } else {
    // 从 j ~ nextLast 中找到最长递增子序列，最长递增子序列就是不需要移动的元素，其余元素需要增加或移动，这样可以保证操作数量达到最小
    const nextSeq = new Array(nextLast - j + 1)
    // 填充-1表示没有在旧列表找到匹配元素
    nextSeq.fill(-1)
    // 建立新列表map，方便旧列表查找可复用索引
    const nextIndexMap = Object.create(null)
    for (let i = j; i <= nextLast; i++) {
      nextIndexMap[nextChildren[i].key] = i - j
    }
    // 遍历旧列表，查看元素是否可以复用
    let reverseFlag = false,
      lastMaxIndex = 0
    for (let i = j; i <= preLast; i++) {
      const finded = nextIndexMap[preChildren[i].key]
      if (typeof finded !== 'undefined') {
        // 如果可以找到匹配的，需要判断是否存在逆序，如果存在逆序，则需要调整元素位置关系
        if (finded < lastMaxIndex) {
          reverseFlag = true
        } else {
          lastMaxIndex = finded
        }
        // 为新列表的匹配列表增加映射
        nextSeq[finded] = i - j
        // 找到匹配元素应该进行patch
        patch(preChildren[i], nextChildren[finded + j], container)
      } else {
        // 如果未在新列表找到匹配的，则直接删除即可
        removeChild(preChildren[i], container)
      }
    }

    // 如果有逆序，利用nextSeq求出最长递增子序列，并做上不需要处理的标记
    reverseFlag && getLongestIncreacingSubSeq(nextSeq, NoHandle)

    // 处理后最长递增子序列已做上NoHandle标记
    for (let i = nextSeq.length - 1; i >= 0; i--) {
      if (nextSeq[i] === NoHandle) {
        continue
      } else if (nextSeq[i] === -1) {
        // 代表需要挂载的新元素
        const refEl = nextChildren[i + j + 1] && getRef(nextChildren[i + j + 1]) || refNext
        mount(nextChildren[i + j], container, refEl)
      } else {
        // 需要调整位置的元素
        const refEl = nextChildren[i + j + 1] && getRef(nextChildren[i + j + 1]) || refNext
        insertBefore(nextChildren[i + j], container, refEl)
      }
    }
  }
}

function getLongestIncreacingSubSeq(nextSeq, NoHandle) {
  // res记录以每一位结尾的最大长度
  const res = new Array(nextSeq.length)
  res.fill(1)
  // greedyLen[i] 存储子序列长度为i的最后一位的最小值
  const greedyLen = new Array(nextSeq.length)
  greedyLen.fill(0)
  greedyLen[0] = -1
  let len = 0, maxEndIdx
  // 求出每一位最大能接到长度为几的序列后
  for (let i = 0; i < nextSeq.length; i++) {
    if (nextSeq[i] === -1) continue
    let l = 0, r = len, mid
    while (l < r) {
      mid = l + r + 1 >> 1
      if (greedyLen[mid] < nextSeq[i]) {
        l = mid
      } else {
        r = mid - 1
      }
    }
    greedyLen[l + 1] = nextSeq[i]
    res[i] = l + 1
    if (l + 1 > len) {
      len = l + 1
      maxEndIdx = i
    }
  }
  // 开始对最大序列标记
  while (len) {
    while (res[maxEndIdx] !== len) maxEndIdx--
    nextSeq[maxEndIdx] = NoHandle
    len--
  }
}

function patchComponent(preVnode, nextVnode, container, flags) {
  // 组件更新原理就是更新组件数据，剩下流程交给组件本身
  if (flags & VNodeFlags.COMPONENT_STATEFUL) {
    const instance = nextVnode.children = preVnode.children
    instance._update()
  } else {
    const handle = nextVnode.handle = preVnode.handle
    handle.update()
  }
}