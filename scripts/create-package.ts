import { execSync } from 'node:child_process'
import fs from 'node:fs'

const main = async () => {
  const packageName = process.argv[2]
  const packagePath = `packages/${packageName}`

  execSync(`cp -r templates/package ${packagePath}`, {
    stdio: 'inherit',
  })

  const packageJsonPath = `${packagePath}/package.json`
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8')
  const updatedPackageJsonContent = packageJsonContent.replace(
    /"name": "@bitcoinjs-demo\/to-be-replace"/,
    `"name": "@bitcoinjs-demo/${packageName}"`
  )
  fs.writeFileSync(packageJsonPath, updatedPackageJsonContent)
}

main()
