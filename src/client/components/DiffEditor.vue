<script setup lang="ts">
import { nextTick, onMounted, ref, toRefs, watchEffect } from 'vue'
import { Pane, Splitpanes } from 'splitpanes'
import { syncCmHorizontalScrolling, useCodeMirror } from '../logic/codemirror'
import { guessMode } from '../logic/utils'
import { calculateDiffWithWorker } from '../worker/diff'
import { useOptionsStore } from '../stores/options'

const props = defineProps<{
  from: string
  to: string
  oneColumn: boolean
  diff: boolean
}>()

const options = useOptionsStore()

const { from, to } = toRefs(props)

const fromEl = ref<HTMLTextAreaElement>()
const toEl = ref<HTMLTextAreaElement>()

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
    cm1.setOption('lineWrapping', options.view.lineWrapping)
    cm2.setOption('lineWrapping', options.view.lineWrapping)
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

    cm1.endOperation()
    cm2.endOperation()
  })
})

const leftPanelSize = computed(() => {
  return props.oneColumn
    ? 0
    : options.view.panelSizeDiff
})

function onUpdate(size: number) {
  if (props.oneColumn)
    return
  options.view.panelSizeDiff = size
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
