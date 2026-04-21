import { vi, describe, it, expect, beforeEach } from 'vitest'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    writeFileSync: vi.fn(),
    tmpdir: vi.fn()
  }
}))

vi.mock('fs', () => ({
  writeFileSync: mocks.writeFileSync
}))

vi.mock('os', () => ({
  tmpdir: mocks.tmpdir
}))

import { ClaudeCodeInfra } from '../../claudeCode.js'

type InfraWithPrivate = { writeMcpConfig(): string }

describe('ClaudeCodeInfra', () => {
  let infra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tmpdir.mockReturnValue('/tmp')
    infra = new ClaudeCodeInfra()
  })

  describe('writeMcpConfig', () => {
    it('should return a path located under the system temp directory', () => {
      const result = (infra as unknown as InfraWithPrivate).writeMcpConfig()

      expect(result.startsWith('/tmp')).toBe(true)
    })

    it('should embed the current process pid in the returned filename', () => {
      const result = (infra as unknown as InfraWithPrivate).writeMcpConfig()

      expect(result).toContain(String(process.pid))
    })

    it('should embed APP_NAME in the returned filename', () => {
      const result = (infra as unknown as InfraWithPrivate).writeMcpConfig()

      expect(result).toContain(APP_NAME)
    })

    it('should call writeFileSync with the returned path', () => {
      const result = (infra as unknown as InfraWithPrivate).writeMcpConfig()

      expect(mocks.writeFileSync).toHaveBeenCalledWith(result, expect.any(String), 'utf-8')
    })

    it('should write valid JSON to the config file', () => {
      ;(infra as unknown as InfraWithPrivate).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      expect(() => JSON.parse(written)).not.toThrow()
    })

    it('should include the MCP server name as a key under mcpServers in the written JSON', () => {
      ;(infra as unknown as InfraWithPrivate).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as { mcpServers: Record<string, unknown> }
      expect(config.mcpServers).toHaveProperty(MCP_SERVER_NAME)
    })

    it('should set the MCP server command to "node" in the written config', () => {
      ;(infra as unknown as InfraWithPrivate).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as { mcpServers: Record<string, { command: string }> }
      expect(config.mcpServers[MCP_SERVER_NAME].command).toBe('node')
    })
  })
})
