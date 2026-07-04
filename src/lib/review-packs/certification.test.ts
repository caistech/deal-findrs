import { describe, it, expect } from 'vitest'
import { BANKABLE_REQUIRED, missingForBankable, isBankableReady } from './certification'

describe('certification — bankable gate', () => {
  it('requires QS + valuer', () => {
    expect(BANKABLE_REQUIRED).toEqual(['qs', 'valuer'])
  })

  it('reports what is missing', () => {
    expect(missingForBankable([])).toEqual(['qs', 'valuer'])
    expect(missingForBankable(['qs'])).toEqual(['valuer'])
    expect(missingForBankable(['qs', 'valuer'])).toEqual([])
    // engineer alone doesn't help the financial gate
    expect(missingForBankable(['engineer'])).toEqual(['qs', 'valuer'])
  })

  it('is ready only when both financial packs are certified', () => {
    expect(isBankableReady(['qs'])).toBe(false)
    expect(isBankableReady(['qs', 'valuer'])).toBe(true)
    expect(isBankableReady(['engineer', 'qs', 'valuer'])).toBe(true)
  })
})
