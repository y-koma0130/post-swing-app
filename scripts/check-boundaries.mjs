// feature の境界を確かめる（Biome の noRestrictedImports では「自分以外の feature」を書けないため）
//
// - app/features/<a> から app/features/<b> を import しない（共有したいものは app/components・hooks・utils へ）
// - app/components・hooks・utils から app/features を import しない
// - server/features/<a> から server/features/<b> を使うときは domain/・application/dto/・public だけ
//   （docs/coding-rules.md の「feature の境界」）
// - server の共有の場所（auth・utils・db）から feature を使うときは public だけ
//   （feature の中身に頼らない。utils・db は feature に依存しないのが基本）
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const src = join(root, 'src')

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })

const importsOf = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])

const problems = []

for (const file of walk(src)) {
  const rel = relative(src, file).split(sep).join('/')
  const [area, group, feature] = rel.split('/')

  for (const spec of importsOf(file)) {
    if (area === 'app') {
      const target = spec.match(/^@\/app\/features\/([^/]+)/)?.[1]
      if (!target) continue
      if (group === 'features' && target !== feature) {
        problems.push(`${rel}: ほかの feature（${target}）を import しています → ${spec}`)
      } else if (group !== 'features' && ['components', 'hooks', 'utils'].includes(group)) {
        problems.push(`${rel}: 共有の場所から feature を import しています → ${spec}`)
      }
    }
    if (area === 'server' && ['auth', 'utils', 'db'].includes(group)) {
      const m = spec.match(/^@\/server\/features\/([^/]+)\/(.+)$/)
      if (m && m[2] !== 'public') {
        problems.push(
          `${rel}: 共有の場所から feature（${m[1]}）を使うときは public だけにしてください → ${spec}`
        )
      }
    }
    if (area === 'server' && group === 'features') {
      const m = spec.match(/^@\/server\/features\/([^/]+)\/(.+)$/)
      if (!m || m[1] === feature) continue
      const allowed =
        m[2] === 'public' || m[2].startsWith('domain/') || m[2].startsWith('application/dto/')
      if (!allowed) {
        problems.push(
          `${rel}: ほかの feature（${m[1]}）は domain・application/dto・public だけを使ってください → ${spec}`
        )
      }
    }
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join('\n')}\n`)
  process.stderr.write(
    `\nfeature の境界の違反が ${problems.length} 件あります（docs/coding-rules.md）\n`
  )
  process.exit(1)
}
process.stdout.write('feature の境界：問題なし\n')
