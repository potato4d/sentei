import * as util from 'util'
import * as child_process from 'child_process'
import * as Fuse from 'fuse.js'
import * as inquirer from 'inquirer'
import meow from 'meow'
import chalk from 'chalk'
import packageInfo from '../package.json'

const { rows } = process.stdout
const exec = util.promisify(child_process.exec)

const cli = meow(`
  Usage
    $ sentei

  Options
    --force, -f force delete
    --safety, -s protect branch if ['master', 'develop', 'release'].includes(branch)
`,
  {
    flags: {
      safety: {
        type: 'boolean',
        alias: 's'
      },
      force: {
        type: 'boolean',
        alias: 'f'
      }
    }
})

process.stdout.write('\x1Bc')


;(async ()=>{
  const APP_NAME = `Sentei v${packageInfo.version}`
  console.log(chalk.blueBright.bold(APP_NAME))

  try {
    await exec('which git')
  } catch {
    console.error(chalk.red.bold('Error: git is not installed.'))
    console.error(chalk.red('Please install use your system package manager.'))
    process.exit(1)
  }

  const branches = (await exec (`git branch | sed 's/ //g'`)).stdout.split("\n").filter((b)=> {
    return b && !b.includes('*') && (cli.flags.safety ? (!['master', 'develop', 'release'].includes(b)) : true)
  })
  try {
    const { target } = await inquirer.prompt({
      name: 'target',
      type: 'checkbox',
      message: 'Select branches to delete...',
      choices: branches,
      pageSize: rows - 3
    }) as { target: string[] }
    let isFail = false
    for (const branch of target) {
      try {
        await exec(`git branch -${cli.flags.force ? 'D' : 'd'} ${branch}`)
      } catch (e) {
        this.isFail = true
      }
    }
    if (!isFail) {
      console.log(chalk.greenBright.bold(`Delete ${target.length} branches.`))
    } else {
      console.error(chalk.red.bold('Error.'))
      process.exit(1)
    }
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
})()
