import fs from 'fs/promises'
import execa from 'execa'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import reset from '../../commands/reset'
import { setupEnvironment, amountOfCollectionsCreated, removeRetryMessages } from '../testUtils.js'

setupEnvironment(`generate-types`)

beforeEach(
  () =>
    Promise.all([
      reset({ schemas: true, collections: true }),
      reset({ schemas: true, collections: true }, true),
    ]),
  240000
)

test('generate types for a schema without imports', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../../examples/basic`, import.meta.url)))

  const { stdout, stderr, exitCode } = execa.sync(
    'node',
    ['../../cli.js', 'generate-types', 'Schema.graphql'],
    { env: { DEBUG: 'faugra:*' }, cwd }
  )

  expect(stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(stdout).toEqual(expect.not.stringMatching(/error/i))

  expect(removeRetryMessages(stdout)).toEqual(
    await fs.readFile(fileURLToPath(new URL(`../fixtures/basic.d.ts`, import.meta.url)), {
      encoding: 'utf8',
    })
  )
  expect(exitCode).toBe(0)

  expect(await amountOfCollectionsCreated()).toBe(0)
  expect(await amountOfCollectionsCreated(true)).toBe(1)
}, 240000)
