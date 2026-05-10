import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const webIfcSrcDir = path.join(rootDir, 'node_modules', 'web-ifc')
const webIfcDstDir = path.join(rootDir, 'public', 'web-ifc')

const fragmentsWorkerSrc = path.join(rootDir, 'node_modules', '@thatopen', 'fragments', 'dist', 'worker', 'worker.mjs')
const fragmentsWorkerDstDir = path.join(rootDir, 'public', 'fragments-worker')
const fragmentsWorkerDst = path.join(fragmentsWorkerDstDir, 'worker.mjs')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const hasWebIfc = await exists(webIfcSrcDir)
const hasFragmentsWorker = await exists(fragmentsWorkerSrc)

if (!hasWebIfc && !hasFragmentsWorker) {
  // Running before install, or dependencies missing. No-op.
  process.exit(0)
}

if (hasWebIfc) {
  await fs.mkdir(webIfcDstDir, { recursive: true })

  const entries = await fs.readdir(webIfcSrcDir, { withFileTypes: true })
  const wasmFiles = entries.filter(e => e.isFile() && e.name.endsWith('.wasm')).map(e => e.name)

  await Promise.all(
    wasmFiles.map(async name => {
      const from = path.join(webIfcSrcDir, name)
      const to = path.join(webIfcDstDir, name)
      await fs.copyFile(from, to)
    }),
  )
}

if (hasFragmentsWorker) {
  await fs.mkdir(fragmentsWorkerDstDir, { recursive: true })
  await fs.copyFile(fragmentsWorkerSrc, fragmentsWorkerDst)
}
