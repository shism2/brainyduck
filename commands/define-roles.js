#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import _debug from 'debug'
import figures from 'figures'
import faunadb from 'faunadb'
import logSymbols from 'log-symbols'
import { fileURLToPath } from 'url'
import { faunaClient, patternMatch, runFQL } from '../utils.js'

const { query: q } = faunadb
const debug = _debug('faugra:define-roles')

export default async function main(
  pattern = '**/*.role',
  ephemeralDB // temporary @see https://github.com/zvictor/faugra/issues/1
) {
  debug(`Looking for files matching '${pattern}'`)
  const files = await patternMatch(pattern)

  return await Promise.all(
    files.map(async (file) => {
      debug(`\t${figures.pointer} found ${file}`)
      const name = path.basename(file, path.extname(file))
      const content = fs.readFileSync(file).toString('utf8')
      const replacing = await faunaClient(
        ephemeralDB // temporary @see https://github.com/zvictor/faugra/issues/1
      ).query(q.IsRole(q.Role(name)))

      debug(`${replacing ? 'Replacing' : 'Creating'} role '${name}' from file ${file}:`)

      // remove comments
      let query = content.replace(/#[^!].*$([\s]*)?/gm, '')

      // forbid simplified definitions (only available for UDFs)
      if (!query.match(/^[\s]*\{/)) {
        throw new Error(`Incorrect syntax used in role definition`)
      }

      // infer role name only if it has not been declared
      if (!query.includes('name:')) {
        query = query.replace('{', `{ name: "${name}", `)
      }

      if (name !== query.match(/name:[\s]*(['"])(.*?)\1/)[2]) {
        throw new Error(`File name does not match role name: ${name}`)
      }

      query = replacing ? `Update(Role('${name}'), ${query})` : `CreateRole(${query})`

      const data = await runFQL(
        query,
        ephemeralDB // temporary @see https://github.com/zvictor/faugra/issues/1
      )
      debug(`${logSymbols.success} role has been created/updated: ${data.name}`)

      return data
    })
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pattern] = process.argv.slice(2)

  ;(async () => {
    if (process.env.FAUGRA_OVERWRITE) {
      const { default: reset } = await import('./reset.js')
      await reset({ roles: true })
    }

    const refs = await main(
      pattern,
      process.env.FAUGRA_USE_EPHEMERAL_DB // temporary @see https://github.com/zvictor/faugra/issues/1
    )

    console.log(
      `User-defined role(s) created or updated:`,
      refs.map((x) => x.name)
    )
  })()
}
