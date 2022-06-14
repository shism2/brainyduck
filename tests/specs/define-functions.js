import execa from 'execa'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import reset from '../../commands/reset.js'
import { setupEnvironment, amountOfFunctionsCreated } from '../testUtils.js'

setupEnvironment(`define-functions`)

beforeEach(
  () =>
    Promise.all([
      reset({ functions: true }),
      reset({ functions: true }, true), // temporary @see https://github.com/zvictor/faugra/issues/1
    ]),
  10000
)

test('UDF name should match file name', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../fixtures`, import.meta.url)))

  try {
    execa.sync('node', ['../../cli.js', 'define-functions', 'unmatched.udf'], {
      env: { DEBUG: 'faugra:*' },
      cwd,
    })

    fail('it should not reach here')
  } catch (e) {
    expect(e.message).toEqual(
      expect.stringContaining('Error: File name does not match function name: unmatched')
    )
    expect(e.exitCode).toBe(1)
  }

  expect(await amountOfFunctionsCreated()).toBe(0)
  expect(await amountOfFunctionsCreated(true)).toBe(0)
})

test('upload simplified and extended UDFs: sayHi, sayHello', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../../examples/with-UDF`, import.meta.url)))

  const { stdout, stderr, exitCode } = execa.sync('node', ['../../cli.js', 'define-functions'], {
    env: { DEBUG: 'faugra:*' },
    cwd,
  })

  expect(stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(stdout).toEqual(expect.not.stringMatching(/error/i))

  expect(stdout).toBe(`User-defined function(s) created or updated: [ 'sayHello', 'sayHi' ]`)
  expect(exitCode).toBe(0)

  expect(await amountOfFunctionsCreated()).toBe(2)
  expect(await amountOfFunctionsCreated(true)).toBe(0)
}, 15000)

test('upload simplified and extended UDFs: sayHi, sayHello [temporary @see https://github.com/zvictor/faugra/issues/1]', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../../examples/with-UDF`, import.meta.url)))

  const { stdout, stderr, exitCode } = execa.sync('node', ['../../cli.js', 'define-functions'], {
    env: {
      DEBUG: 'faugra:*',
      FAUGRA_USE_EPHEMERAL_DB: true, // temporary @see https://github.com/zvictor/faugra/issues/1
    },
    cwd,
  })

  expect(stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(stdout).toEqual(expect.not.stringMatching(/error/i))

  expect(stdout).toBe(`User-defined function(s) created or updated: [ 'sayHello', 'sayHi' ]`)
  expect(exitCode).toBe(0)

  expect(await amountOfFunctionsCreated()).toBe(0)
  expect(await amountOfFunctionsCreated(true)).toBe(2)
}, 15000)
