import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROCEDURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../procedures')
