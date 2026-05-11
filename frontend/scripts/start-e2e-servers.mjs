import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendDir, '..')
const backendDir = path.join(repoRoot, 'backend')

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173'
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:8002'
const FRONTEND_PORT = Number(new URL(FRONTEND_URL).port || '5173')
const BACKEND_PORT = Number(new URL(BACKEND_URL).port || '8002')

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now()
  for (;;) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
    } catch {
      // ignore
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timeout esperando ${url}`)
    }
    await wait(300)
  }
}

function spawnLogged(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false })
  child.on('exit', code => {
    if (code && code !== 0) {
      console.error(`[${name}] exit ${code}`)
    }
  })
  return child
}

const isWin = process.platform === 'win32'

const backendPython = isWin
  ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.join(backendDir, '.venv', 'bin', 'python')

const npmCmd = isWin ? 'npm.cmd' : 'npm'

const backendArgs = [
  '-m',
  'uvicorn',
  'main:app',
  '--host',
  '127.0.0.1',
  '--port',
  String(BACKEND_PORT),
]

const frontendArgs = [
  'run',
  'dev',
  '--',
  '--port',
  String(FRONTEND_PORT),
  '--strictPort',
]

const backend = spawnLogged('backend', backendPython, backendArgs, backendDir)
const frontend = spawnLogged('frontend', npmCmd, frontendArgs, frontendDir)

const killAll = () => {
  try { backend.kill('SIGTERM') } catch {}
  try { frontend.kill('SIGTERM') } catch {}
}

process.on('SIGINT', () => { killAll(); process.exit(130) })
process.on('SIGTERM', () => { killAll(); process.exit(143) })
process.on('exit', () => { killAll() })

await waitForHttp(`${BACKEND_URL}/`, 90_000)
await waitForHttp(FRONTEND_URL, 90_000)

while (true) {
  await wait(60_000)
}
