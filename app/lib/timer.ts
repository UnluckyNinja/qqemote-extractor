
type DoOptions = {
  /**
   * in milliseconds
   */
  delta: number
  mark?: boolean
  markPosition?: 'before' | 'after'
}

export function createTimer() {
  let timestamp = performance.now()
  function mark() {
    timestamp = performance.now()
  }
  function doIfPassed<T extends ()=>void>(callback: T, {delta, mark: shouldMark = false, markPosition = 'before'}: DoOptions) {
    if (now() - timestamp >= delta) {
      if(shouldMark && markPosition !== 'after') {
        mark()
      }
      callback()
      if (shouldMark && markPosition === 'after') {
        mark()
      }
    }
  }
  function last() {
    return timestamp
  }
  function now() {
    return performance.now()
  }
  return {
    mark,
    doIfPassed,
    last,
    now,
  }
}