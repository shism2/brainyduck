import execa from 'execa'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import reset from '../../commands/reset'
import { setupEnvironment, amountOfFunctionsCreated, amountOfRolesCreated } from '../testUtils.js'

setupEnvironment(`define-roles`)

beforeEach(
  () =>
    Promise.all([
      reset({ functions: true, roles: true }),
      reset({ functions: true, roles: true }, true), // temporary @see https://github.com/zvictor/faugra/issues/1
    ]),
  10000
)

test('role definitions should not accept simplified formats', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../fixtures`, import.meta.url)))

  try {
    execa.sync('node', ['../../cli.js', 'define-roles', 'simplified.role'], {
      env: { DEBUG: 'faugra:*' },
      cwd,
    })

    fail('it should not reach here')
  } catch (error) {
    expect(error.message).toEqual(
      expect.stringContaining('Error: Incorrect syntax used in role definition')
    )
    expect(error.exitCode).toBe(1)
  }

  expect(await amountOfRolesCreated()).toBe(0)
  expect(await amountOfRolesCreated(true)).toBe(0)
})

test('role name should match file name', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../fixtures`, import.meta.url)))

  try {
    execa.sync('node', ['../../cli.js', 'define-roles', 'unmatched.role'], {
      env: { DEBUG: 'faugra:*' },
      cwd,
    })

    fail('it should not reach here')
  } catch (error) {
    expect(error.message).toEqual(
      expect.stringContaining('Error: File name does not match role name: unmatched')
    )
    expect(error.exitCode).toBe(1)
  }

  expect(await amountOfRolesCreated()).toBe(0)
  expect(await amountOfRolesCreated(true)).toBe(0)
})

test('upload all roles: publicAccess', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../../examples/with-UDF`, import.meta.url)))

  // the referred functions needs to be defined first
  const functions = execa.sync('node', ['../../cli.js', 'define-functions'], {
    env: { DEBUG: 'faugra:*' },
    cwd,
  })

  expect(functions.stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(functions.stdout).toEqual(expect.not.stringMatching(/error/i))
  expect(functions.stdout).toBe(
    `User-defined function(s) created or updated: [ 'sayHello', 'sayHi' ]`
  )

  expect(await amountOfFunctionsCreated()).toBe(2)
  expect(await amountOfFunctionsCreated(true)).toBe(0)

  // ... and only then their access permission can be defined
  const roles = execa.sync('node', ['../../cli.js', 'define-roles'], {
    env: { DEBUG: 'faugra:*' },
    cwd,
  })

  expect(roles.stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(roles.stdout).toEqual(expect.not.stringMatching(/error/i))

  expect(roles.stdout).toBe(`User-defined role(s) created or updated: [ 'publicAccess' ]`)
  expect(roles.exitCode).toBe(0)

  expect(await amountOfRolesCreated()).toBe(1)
  expect(await amountOfRolesCreated(true)).toBe(0)
}, 15000)

test('upload all roles: publicAccess [temporary @see https://github.com/zvictor/faugra/issues/1]', async () => {
  const cwd = resolve(fileURLToPath(new URL(`../../examples/with-UDF`, import.meta.url)))

  // the referred functions needs to be defined first
  const functions = execa.sync('node', ['../../cli.js', 'define-functions'], {
    env: {
      DEBUG: 'faugra:*',
      FAUGRA_USE_EPHEMERAL_DB: true, // temporary @see https://github.com/zvictor/faugra/issues/1
    },
    cwd,
  })

  expect(await amountOfFunctionsCreated()).toBe(0)
  expect(await amountOfFunctionsCreated(true)).toBe(2)

  expect(functions.stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(functions.stdout).toEqual(expect.not.stringMatching(/error/i))
  expect(functions.stdout).toBe(
    `User-defined function(s) created or updated: [ 'sayHello', 'sayHi' ]`
  )

  // ... and only then their access permission can be defined
  const roles = execa.sync('node', ['../../cli.js', 'define-roles'], {
    env: {
      DEBUG: 'faugra:*',
      FAUGRA_USE_EPHEMERAL_DB: true, // temporary @see https://github.com/zvictor/faugra/issues/1
    },
    cwd,
  })

  expect(roles.stderr).toEqual(expect.not.stringMatching(/error/i))
  expect(roles.stdout).toEqual(expect.not.stringMatching(/error/i))

  expect(roles.stdout).toBe(`User-defined role(s) created or updated: [ 'publicAccess' ]`)
  expect(roles.exitCode).toBe(0)

  expect(await amountOfRolesCreated()).toBe(0)
  expect(await amountOfRolesCreated(true)).toBe(1)
}, 15000)
