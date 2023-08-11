<script setup lang="ts">
import { nextTick, onMounted, ref, toRefs, watchEffect } from 'vue'
import { Pane, Splitpanes } from 'splitpanes'
import { syncCmHorizontalScrolling, useCodeMirror } from '../logic/codemirror'
import { guessMode } from '../logic/utils'
import { lineWrapping } from '../logic/state'
import { calculateDiffWithWorker } from '../worker/diff'
import { openInEditor, parseStack } from '../logic/error'

const props = defineProps<{
  from: string
  to: string
  oneColumn: boolean
  diff: boolean
  error: boolean
}>()
const { from, to, error } = toRefs(props)

const panelSize = useLocalStorage('vite-inspect-diff-panel-size', 30)

const widgets: CodeMirror.LineWidget[] = []
const handles: CodeMirror.LineHandle[] = []
const listeners: [el: HTMLSpanElement, l: EventListener][] = []

const fromEl = ref<HTMLTextAreaElement>()
const toEl = ref<HTMLTextAreaElement>()

function clearListeners() {
  listeners.forEach(([el, l]) => el.removeEventListener('click', l))
  listeners.length = 0
}

onMounted(() => {
  const cm1 = useCodeMirror(
    fromEl,
    from,
    {
      mode: 'javascript',
      readOnly: true,
      lineNumbers: true,
      scrollbarStyle: 'null',
    },
  )

  const cm2 = useCodeMirror(
    toEl,
    to,
    {
      mode: 'javascript',
      readOnly: true,
      lineNumbers: true,
      scrollbarStyle: 'null',
    },
  )

  syncCmHorizontalScrolling(cm1, cm2)

  watchEffect(() => {
    cm1.setOption('lineWrapping', lineWrapping.value)
    cm2.setOption('lineWrapping', lineWrapping.value)
  })

  watchEffect(() => {
    // @ts-expect-error untyped
    cm1.display.wrapper.style.display = props.oneColumn ? 'none' : ''
  })

  watchEffect(async () => {
    const l = from.value
    const r = to.value

    cm1.setOption('mode', guessMode(l))
    cm2.setOption('mode', guessMode(r))

    await nextTick()

    cm1.startOperation()
    cm2.startOperation()

    // clean up marks
    cm1.getAllMarks().forEach(i => i.clear())
    cm2.getAllMarks().forEach(i => i.clear())
    for (let i = 0; i < cm1.lineCount() + 2; i++)
      cm1.removeLineClass(i, 'background', 'diff-removed')
    for (let i = 0; i < cm2.lineCount() + 2; i++)
      cm2.removeLineClass(i, 'background', 'diff-added')

    // cleanup handles, widgets and listeners
    clearListeners()
    widgets.forEach(widget => widget.clear())
    handles.forEach(h => cm2.removeLineClass(h, 'zlevel'))
    widgets.length = 0
    handles.length = 0

    if (props.diff && from.value) {
      const changes = await calculateDiffWithWorker(l, r)

      const addedLines = new Set()
      const removedLines = new Set()

      let indexL = 0
      let indexR = 0
      changes.forEach(([type, change]) => {
        if (type === 1) {
          const start = cm2.posFromIndex(indexR)
          indexR += change.length
          const end = cm2.posFromIndex(indexR)
          cm2.markText(start, end, { className: 'diff-added-inline' })
          for (let i = start.line; i <= end.line; i++) addedLines.add(i)
        }
        else if (type === -1) {
          const start = cm1.posFromIndex(indexL)
          indexL += change.length
          const end = cm1.posFromIndex(indexL)
          cm1.markText(start, end, { className: 'diff-removed-inline' })
          for (let i = start.line; i <= end.line; i++) removedLines.add(i)
        }
        else {
          indexL += change.length
          indexR += change.length
        }
      })

      Array.from(removedLines).forEach(i =>
        cm1.addLineClass(i, 'background', 'diff-removed'),
      )
      Array.from(addedLines).forEach(i =>
        cm2.addLineClass(i, 'background', 'diff-added'),
      )
    }
    else if (error.value && r) {
      for (let i = cm2.firstLine(); i < cm2.lineCount(); i++) {
        const line = cm2.getLine(i)
        const stack = parseStack(line)
        if (!stack)
          continue

        const div = document.createElement('div')
        div.className = 'op80 flex gap-x-2 items-center hover:cursor-pointer'
        div.title = 'Open in Editor'
        div.tabIndex = 0
        const pre = document.createElement('pre')
        pre.className = 'c-red-600 dark:c-red-400'
        pre.textContent = `${' '.repeat(5)}^ Open in Editor`
        div.appendChild(pre)
        const span = document.createElement('span')
        span.className = 'i-carbon-launch c-red-600 dark:c-red-400 min-w-1em min-h-1em'
        div.appendChild(span)
        const el: EventListener = async () => {
          await openInEditor(stack.file, stack.line, stack.column)
        }
        div.addEventListener('click', el)
        listeners.push([div, el])
        handles.push(cm2.addLineClass(i, 'zlevel', 'bg-red-500/10'))
        widgets.push(cm2.addLineWidget(i, div))
      }
    }

    cm1.endOperation()
    cm2.endOperation()
  })
})

const leftPanelSize = computed(() => {
  return props.oneColumn
    ? 0
    : panelSize.value
})

function onUpdate(size: number) {
  if (props.oneColumn)
    return
  panelSize.value = size
}
</script>

<template>
  <Splitpanes @resize="onUpdate($event[0].size)">
    <Pane v-show="!oneColumn" min-size="10" :size="leftPanelSize" class="h-max min-h-screen" border="main r">
      <textarea ref="fromEl" v-text="from" />
    </Pane>
    <Pane min-size="10" :size="100 - leftPanelSize" class="h-max min-h-screen">
      <textarea ref="toEl" v-text="to" />
    </Pane>
  </Splitpanes>
</template>

<style lang="postcss">
.diff-added {
  --at-apply: bg-green-400/15;
}
.diff-removed {
  --at-apply: bg-red-400/15;
}
.diff-added-inline {
  --at-apply: bg-green-400/30;
}
.diff-removed-inline {
  --at-apply: bg-red-400/30;
}
</style>
