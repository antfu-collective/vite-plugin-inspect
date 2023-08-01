import type { Ref, WritableComputedRef } from 'vue'
import { watch } from 'vue'
import CodeMirror from 'codemirror'
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
  textarea: Ref<HTMLTextAreaElement | null | undefined>,
  input: Ref<string> | WritableComputedRef<string>,
  options: CodeMirror.EditorConfiguration = {},
) {
  const cm = CodeMirror.fromTextArea(
    textarea.value!,
    {
      theme: 'vars',
      ...options,
    },
  )

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

export function syncCmHorizontalScrolling(
  cm1: CodeMirror.EditorFromTextArea,
  cm2: CodeMirror.EditorFromTextArea,
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
      cm2.scrollTo(editor.getScrollInfo().left)
  })
  cm2.on('scroll', (editor) => {
    if (activeCm === 2)
      cm1.scrollTo(editor.getScrollInfo().left)
  })
}
