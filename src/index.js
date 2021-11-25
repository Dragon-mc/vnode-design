import { h } from './vdom/createElement'
import render from './vdom/render'
import { Fragment, Portal } from './vdom/flags'

class stateComp {
  render() {
    return h('div', null, [
      h(
        'div',
        { style: { color: 'red' }, class: { a: true, b: false, c: true } },
        'stateComp1'
      ),
      h('div', { style: { 'background-color': '#f00' } }, 'stateComp2'),
      h('div', null, 'stateComp3'),
    ])
  }
}

function funcComp() {
  return h('div', null, [
    h('div', null, 'funcComp1'),
    h('div', null, 'funcComp2'),
    h('div', null, 'funcComp3'),
  ])
}

const vnode = h('div', null, [
  h(Fragment, { key: 'frag' }, [
    '1',
    h('div', { key: 'd1', class: { a: true, b: false, c: true } }, '2')
  ]),
  h('div', { key: 'ref' }, 'hhh div')
])

console.log(vnode)

const app = document.getElementById('app')

render(vnode, app)

const nextVnode = h('div', {}, [
  h('div', null, '123'),
  h(Fragment, { key: 'frag' }, [
    'fragment',
    h('p', { key: 'd1', class: { b: true, c: false, d: true } }, '3'),
    'fragment end',
  ]),
  h('div', { key: 'ref'}, 'new div')
])

setTimeout(() => {
  console.log('patch')
  render(nextVnode, app)
}, 1000)
