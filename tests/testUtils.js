import fs from 'fs'
import _debug from 'debug'
import faunadb from 'faunadb'
import { paramCase } from 'param-case'
import { faunaClient, runFQL } from '../utils.js'

const { query: q } = faunadb
const debug = _debug('brainyduck:test')

export const createDatabase = (name, secret) =>
  runFQL(
    `CreateKey({
      database: Select('ref', CreateDatabase({ name: '${name}' })),
      role: 'admin',
    })`,
    secret
  )

export const deleteDatabase = (name, secret) => runFQL(`Delete(Database('${name}'))`, secret)

export const setupEnvironment = (name, options = {}) => {
  const timestamp = +new Date()
  const start = options.beforeEach ? beforeEach : beforeAll
  const end = options.beforeEach ? afterEach : afterAll
  let dbName = `${timestamp}_${name}`

  start(() => {
    const testName = expect.getState().currentTestName

    if (testName) {
      dbName = `${dbName}_${paramCase(testName)}`
    }

    process.env.FAUNA_SECRET = createDatabase(dbName, process.env.TESTS_SECRET).secret
    debug(`Using database ${timestamp}_${name}`)
  })

  end(() => {
    deleteDatabase(dbName, process.env.TESTS_SECRET)
    delete process.env.BRAINYDUCK_CACHE
    debug(`Deleted database ${timestamp}_${name}`)
  })

  afterAll(() => faunaClient().close())
}

export const amountOfFunctionsCreated = () => faunaClient().query(q.Count(q.Functions()))

export const amountOfRolesCreated = () => faunaClient().query(q.Count(q.Roles()))

export const amountOfCollectionsCreated = () => faunaClient().query(q.Count(q.Collections()))

export const listFiles = (directory) =>
  fs.existsSync(directory)
    ? fs
        .readdirSync(directory, { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((x) => x.name)
    : []

export const removeRetryMessages = (stdout) =>
  stdout
    .split('\n')
    .filter(
      (x) =>
        ![
          `Wiped data still found in fauna's cache.`,
          `Cooling down for 30s...`,
          `Retrying now...`,
        ].includes(x)
    )
    .join('\n')
