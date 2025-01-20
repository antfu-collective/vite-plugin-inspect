import type { Ref, WritableComputedRef } from 'vue'
import CodeMirror from 'codemirror'
import { watch } from 'vue'

import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/css/css'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/pug/pug'
import 'codemirror/mode/sass/sass'
import 'codemirror/mode/vue/vue'
import 'codemirror/mode/handlebars/handlebars'
import 'codemirror/mode/htmlmixed/htmlmixed'
import 'codemirror/addon/display/placeholder'
import 'codemirror/lib/codemirror.css'

export function useCodeMirror(
  container: Ref<HTMLDivElement | null | undefined>,
  input: Ref<string> | WritableComputedRef<string>,
  options: CodeMirror.EditorConfiguration = {},
) {
  const cm = CodeMirror(container.value!, {
    theme: 'vars',
    value: input.value,
    ...options,
  })

  let skip = false

  cm.on('change', () => {
    if (skip) {
      skip = false
      return
    }
    input.value = cm.getValue()
  })

  watch(
    input,
    (v) => {
      if (v !== cm.getValue()) {
        skip = true
        const selections = cm.listSelections()
        cm.replaceRange(v, cm.posFromIndex(0), cm.posFromIndex(Number.POSITIVE_INFINITY))
        cm.setSelections(selections)
      }
    },
    { immediate: true },
  )

  return cm
}

export function syncEditorScrolls(primary: CodeMirror.Editor, target: CodeMirror.Editor) {
  const pInfo = primary.getScrollInfo()
  const tInfo = target.getScrollInfo()
  // Map scroll range
  const x = ((tInfo.width - tInfo.clientWidth) / (pInfo.width - pInfo.clientWidth)) * pInfo.left
  const y = ((tInfo.height - tInfo.clientHeight) / (pInfo.height - pInfo.clientHeight)) * pInfo.top
  target.scrollTo(x, y)
}

export function syncScrollListeners(
  cm1: CodeMirror.Editor,
  cm2: CodeMirror.Editor,
) {
  let activeCm = 1

  cm1.getWrapperElement().addEventListener('mouseenter', () => {
    activeCm = 1
  })
  cm2.getWrapperElement().addEventListener('mouseenter', () => {
    activeCm = 2
  })

  cm1.on('scroll', (editor) => {
    if (activeCm === 1)
      syncEditorScrolls(editor, cm2)
  })
  // Scroll cursor into view no matter which view is active
  cm1.on('scrollCursorIntoView', editor => syncEditorScrolls(editor, cm2))

  cm2.on('scroll', (editor) => {
    if (activeCm === 2)
      syncEditorScrolls(editor, cm1)
  })
  cm2.on('scrollCursorIntoView', editor => syncEditorScrolls(editor, cm1))
}
