import * as util from 'util'
import * as child_process from 'child_process'
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

  if (!branches.length) {
    console.log(chalk.bold('No deleteable branches.'))
    process.exit(0)
  }

  try {
    const { target } = await inquirer.prompt({
      name: 'target',
      type: 'checkbox',
      message: 'Select branches to delete...',
      choices: branches,
      pageSize: rows - 3
    }) as { target: string[] }
    const results = {}
    target.forEach((b)=> results[b] = null)
    for (const branch of target) {
      try {
        const { stderr } = await exec(`git branch -${cli.flags.force ? 'D' : 'd'} ${branch}`)
        results[branch] = true
      } catch (e) {
        results[branch] = false
      }
    }
    const successLength = Object.values(results).filter(r => !!r).length
    const failLength = Object.values(results).filter(r => !r).length

    if (successLength) {
      console.log(chalk.greenBright.bold(`Delete ${successLength} branches.`))
    }
    if (failLength) {
      console.error(chalk.red.bold(`Failed delete ${failLength} branches.`))
    }
    console.log(chalk.bold('results:'))
    console.log(
      Object.entries(results).map(([name, result]) => {
        if (result) {
          return `  ${chalk.green('✓')} ${name}`
        } else {
          return `  ${chalk.red('✘')} ${name}`
        }
      }).join("\n")
    )
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
})()
