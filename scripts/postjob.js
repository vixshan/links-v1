import fs from 'fs'
import * as core from '@actions/core'
import { exec } from 'child_process'
import { error } from 'console'

async function cleanup() {
  try {
    // 1. clear .env file
    fs.writeFileSync('.env', '')

    if (error) {
      console.warn('Warning: Failed to clear .env file:', error)
    } else {
      console.log('Cleared .env file')
    }

    // 2. Clear Bun cache
    await new Promise(resolve => {
      exec('bun pm cache rm', error => {
        if (error) {
          console.warn('Warning: Failed to clear Bun cache:', error)
        } else {
          console.log('Cleared Bun cache')
        }
        resolve()
      })
    })

    console.log('Cleanup completed successfully')
  } catch (error) {
    core.setFailed(`Cleanup failed: ${error.message}`)
  }
}

cleanup()
