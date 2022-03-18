'use strict'

const CodeRunner    = require('../index'),
      program       = require('commander').program,
      logger        = require('../util/logger'),
      utils         = require('./utils'),
      packageConfig = require(`${__dirname}/../../package.json`)

const getRunOptions = require('./options')

const modelWarningMsg = modelName => `IMPORTANT!
The business logic code will be deployed to model "${ modelName }".
Any business logic which is already deployed on the server in that model
will be removed and replaced with the code from your current project.`

const modelConfirmMsg = `If this is an undesired behavior, stop now and set a different deployment model
either by using the --model argument or changing the model name in coderunner.json.
Would you like to continue? (Y/N)`

process.on('unhandledRejection', r => logger.error(r))

const printVersion = () =>
  logger.info(`CodeRunner(tm) Backendless JavaScript CodeRunner v${packageConfig.version}`)

const printCopyright = () =>
  logger.info(`Copyright(C) ${new Date().getFullYear()} Backendless Corp. All rights reserved. `)

const exit = () => process.exit()

const exitWithError = err => {
  logger.error('Error:', (logger.verbose && err.stack) || err.message || err)

  process.exit()
}

const showModelAlert = async modelName => {
  logger.info(modelWarningMsg(modelName))

  if (program.opts().quiet) {
    return
  }

  const confirmed = await utils.confirmation(modelConfirmMsg)

  if (confirmed === false) {
    process.exit()
  }

  if (confirmed === undefined) {
    await showModelAlert(modelName)
  }
}

const setTerminationHook = runner => {
  async function handleTermination() {
    if (!runner || !runner.stopped) {
      logger.info('Termination signal received. Shutting down..')

      try {
        if (runner && runner.stop) {
          await runner.stop()
        }

        await exit()

      } catch (e) {
        exitWithError(e)
      }
    }
  }

  process.on('SIGINT', handleTermination)
  process.on('SIGTERM', handleTermination)
}

const startRunner = async params => {
  const { appRequired, repoPathRequired, createRunner, showVersion, showCopyright, showModelConfirm } = params

  if (showVersion) {
    printVersion()
  }

  if (showCopyright) {
    printCopyright()
  }

  try {
    const options = await getRunOptions(appRequired, repoPathRequired)

    logger.verbose = options.verbose
    logger.maxTextLength = options.loggers.maxTextLength

    logger.initWinston(options.loggers)

    logger.info('Run Options is: ', JSON.stringify(options, null, 2))

    if (showModelConfirm) {
      await showModelAlert(options.app.model)
    }

    const runner = await createRunner(options)

    setTerminationHook(runner)

    await runner.start()
  } catch (error) {
    exitWithError(error)
  }
}

const debug = () => startRunner({
  createRunner : CodeRunner.debug,
  appRequired  : true,
  showVersion  : true,
  showCopyright: true
})

const pro = () => startRunner({
  createRunner    : CodeRunner.pro,
  repoPathRequired: true,
  showVersion     : true
})

const cloud = () => startRunner({
  createRunner    : CodeRunner.cloud,
  repoPathRequired: true,
  showVersion     : true
})

const deploy = () => startRunner({
  createRunner    : CodeRunner.deploy,
  appRequired     : true,
  showVersion     : true,
  showCopyright   : true,
  showModelConfirm: true
})

process.title = 'Backendless JS CodeRunner - MASTER'

program
  .version(packageConfig.version)
  .option('-c, --config <path>', 'set config path. defaults to ./coderunner.json')
  .option('-a, --app-id <id>', 'Application Id')
  .option('-k, --app-key <key>', 'Application CodeRunner API Key')
  .option('-s, --api-server <url>', 'Backendless API Server URL')
  .option('-m, --model <model>', 'Business Logic model')
  .option('-q, --quiet', 'Don\'t show the confirmation dialog before deploy to Business Logic model')
  .option('--msg-broker-host <host>', 'Message Broker Host')
  .option('--msg-broker-port <port>', 'Message Broker Port')
  .option('--repo-path <path>', 'Backendless Repo Path')
  .option('--cache-limit <n>', 'Count for cached workers')
  .option('--keep-zip', 'Keep generated zip file after deploying')
  .option('--zip-size-confirmation', 'Confirm size of generated zip file before deploying')
  .option('--verbose', 'Verbose mode. More information output.')

program
  .command('debug')
  .description('debug business logic')
  .action(debug)

program
  .command('pro')
  .description('Pro CodeRunner')
  .action(pro)

program
  .command('cloud', null, { noHelp: true })
  .description('Cloud CodeRunner')
  .action(cloud)

program
  .command('deploy')
  .description('deploy business logic to production')
  .action(deploy)

program
  .command('*', null, { noHelp: true })
  .action(() => program.help())

program.parse(process.argv)

if (!program.args.length) {
  debug()
}
