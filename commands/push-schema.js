#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import _debug from 'debug'
import figures from 'figures'
import { fileURLToPath } from 'url'
import { patternMatch, importSchema } from '../utils.js'

const debug = _debug('faugra:push-schema')

const extendTypes = (schema) => {
  const regexp = /^[\s]*(?!#)[\s]*extend[\s]+type[\s]+([^\s]+)[\s]*\{([^\}]*)}/gm

  for (const [raw, name, content] of schema.matchAll(regexp)) {
    schema = schema
      .replace(raw, '')
      .replace(new RegExp(`(?<!extend )type[\\s]+${name}[\\s]*\\{`), `type ${name} {${content}\n`)

    if (!schema.match(new RegExp(`type[\\s]+${name}[\\s]*\\{`))) {
      console.error(`Make sure a type has been defined before trying to extend it 🍳`)
      throw new Error(`Type ${name} could not be extended`)
    }
  }

  return schema
}

const loadSchema = async (pattern) => {
  debug(`Looking for schemas matching '${pattern}'`)

  const files = (await patternMatch(Array.isArray(pattern) ? pattern : pattern.split(','))).map(
    (x) => path.resolve(x)
  )

  if (!files.length) {
    throw new Error(`no file could be found with pattern '${pattern}'`)
  }

  const content = files.map((x) => {
    debug(`\t${figures.pointer} found ${x}`)
    return fs.readFileSync(x)
  })

  return content.join('\n')
}

export default async function main(
  inputPath = '**/[A-Z]*.(graphql|gql)',
  override,
  ephemeralDB // temporary @see https://github.com/zvictor/faugra/issues/1
) {
  debug(`called with:`, { inputPath, override })
  const schema = extendTypes(await loadSchema(inputPath))

  const prettySchema = schema.replace(/^/gm, '\t')
  debug(`The resulting merged schema:\n${prettySchema}`)

  try {
    return await importSchema(
      schema,
      override,
      ephemeralDB // temporary @see https://github.com/zvictor/faugra/issues/1
    )
  } catch (error) {
    console.error(`The schema below could not be pushed to fauna:\n\n${prettySchema}`)

    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ;(async () => {
    const [inputPath] = process.argv.slice(2)

    if (process.env.FAUGRA_OVERWRITE) {
      const { default: reset } = await import('./reset.js')
      await reset({ collections: true, schemas: true })
    }

    console.log(
      await main(
        inputPath,
        false,
        process.env.FAUGRA_USE_EPHEMERAL_DB // temporary @see https://github.com/zvictor/faugra/issues/1
      )
    )
  })()
}
