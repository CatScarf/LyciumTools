export function readableElapse(ms: number) {
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  const seconds = ms / 1000
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24

  if (days >= 1) {
    return rtf.format(days, 'day')
  } else if (hours >= 1) {
    return rtf.format(hours, 'hour')
  } else if (minutes >= 1) {
    return rtf.format(minutes, 'minute')
  } else {
    return rtf.format(seconds, 'second')
  }
}

export function readableSize(bytes: number) {
  const K = 1000
  const KB = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  for (let i = 0; i < units.length; i++) {
    if (bytes < K ** (i + 1)) {
      return (bytes / KB ** i).toFixed(2) + units[i]
    }
  }
  return (bytes / KB ** 5).toFixed(2) + 'PB'
}
