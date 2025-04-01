# Celo fee currency estimation bug

This repository contains a TypeScript script that demonstrates a bug related to fee currency handling in the Celo blockchain.

## Description

The script demonstrates an issue that appears after the L2 hardfork affecting gas estimation with certain fee currencies (specifically confirmed with cCOP):

When using a base fee multiplier of 1 with an account that has sufficient fee currency balance, the `eth_estimateGas` call fails with an `ERC20: transfer amount exceeds balance` error. This happens even when the account clearly has enough fee tokens to cover the transaction.

**Workaround**: Using a base fee multiplier greater than 1 (e.g., 1.1 or 1.2) allows the `eth_estimateGas` call to work properly.

This was tested against mainnet (https://forno.celo.org) on April, 1st 2025.

## Usage

To run the script, follow these steps:

1. Install the necessary dependencies with `yarn install`.
2. `cp .env.example .env` and fill in the seed phrase of an account that has fee currencies (like cCOP) on the network you're testing.
3. Run the script with `yarn demo`.
4. To test the workaround, modify the `BASE_FEE_MULTIPLIER` constant in the script to a value greater than 1.

## Example output

```
❯ yarn --silent demo
Determining balances for account: 0xbBD379A63064e1795ccADB21da4c7ac1b2D47288
0 CELO
410.919399668106245183 cCOP

=> Sending 1 cCOP transaction to self...
Base fee multiplier applied: 1
Max fee per gas: 34801266603134
Max priority fee per gas: 1391994984

=> Estimating gas... {
  account: '0xbBD379A63064e1795ccADB21da4c7ac1b2D47288',
  to: '0x8a567e2ae79ca692bd748ab832081c45de4041ea',
  feeCurrency: '0x8a567e2ae79ca692bd748ab832081c45de4041ea',
  data: '0xa9059cbb000000000000000000000000bbd379a63064e1795ccadb21da4c7ac1b2d472880000000000000000000000000000000000000000000000000de0b6b3a7640000',
  maxFeePerGas: 34801266603134n,
  maxPriorityFeePerGas: 1391994984n
}
/Users/jean/src/github.com/jeanregisser/celo-fee-currency-bug/node_modules/viem/utils/errors/getEstimateGasError.ts:42
  return new EstimateGasExecutionError(cause, {
         ^
EstimateGasExecutionError: Execution reverted with reason: ERC20: transfer amount exceeds balance.

Estimate Gas Arguments:
  from:                  0xbBD379A63064e1795ccADB21da4c7ac1b2D47288
  to:                    0x8a567e2ae79ca692bd748ab832081c45de4041ea
  data:                  0xa9059cbb000000000000000000000000bbd379a63064e1795ccadb21da4c7ac1b2d472880000000000000000000000000000000000000000000000000de0b6b3a7640000
  maxFeePerGas:          34801.266603134 gwei
  maxPriorityFeePerGas:  1.391994984 gwei

Details: execution reverted: ERC20: transfer amount exceeds balance
```
