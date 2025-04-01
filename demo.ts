import {
  Address,
  Client,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import "dotenv/config";

// Fee Currency address, here CCOP token address
const FEE_CURRENCY_ADDRESS =
  "0x8a567e2ae79ca692bd748ab832081c45de4041ea" as const;

// Set to 1 to show the error with eth_estimateGas
const BASE_FEE_MULTIPLIER = 1;

const MNEMONIC = process.env.MNEMONIC;

if (!MNEMONIC) {
  throw new Error("Please set MNEMONIC in .env file");
}

const account = mnemonicToAccount(MNEMONIC);
const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});
const walletClient = createWalletClient({
  chain: celo,
  transport: http(),
});

(async () => {
  console.log(`Determining balances for account: ${account.address}`);
  const celoBalance = await publicClient.getBalance({
    address: account.address,
  });
  const celoBalanceInDecimal = formatEther(celoBalance);
  console.log(`${celoBalanceInDecimal} CELO`);

  // Get fee currency balance
  const [feeCurrencySymbol, feeCurrencyDecimals, feeCurrencyBalance] =
    await Promise.all([
      publicClient.readContract({
        address: FEE_CURRENCY_ADDRESS,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: FEE_CURRENCY_ADDRESS,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: FEE_CURRENCY_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);
  const feeCurrencyBalanceInDecimal = formatUnits(
    feeCurrencyBalance,
    feeCurrencyDecimals
  );
  console.log(`${feeCurrencyBalanceInDecimal} ${feeCurrencySymbol}`);

  if (feeCurrencyBalance <= 0) {
    throw new Error(`Please add ${feeCurrencySymbol} to your account`);
  }

  console.log(`\n=> Sending 1 ${feeCurrencySymbol} transaction to self...`);

  const baseTx = {
    account,
    to: FEE_CURRENCY_ADDRESS,
    feeCurrency: FEE_CURRENCY_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      // sending to self
      args: [account.address, parseUnits("1", feeCurrencyDecimals)],
    }),
  };

  // const { maxFeePerGas, maxPriorityFeePerGas } =
  //   await publicClient.estimateFeesPerGas({ request: baseTx } as any);

  // Intentionally not using publicClient.estimateFeesPerGas to show the bug when multiplier is 1
  const [gasPrice, maxPriorityFeePerGas] = await Promise.all([
    getGasPrice(publicClient, baseTx.feeCurrency),
    getMaxPriorityFeePerGas(publicClient, baseTx.feeCurrency),
  ]);

  // eth_gasPrice for cel2 returns baseFeePerGas + maxPriorityFeePerGas
  const maxFeePerGas =
    multiplyBigIntByDecimal(
      gasPrice - maxPriorityFeePerGas,
      BASE_FEE_MULTIPLIER
    ) + maxPriorityFeePerGas;

  console.log(`Base fee multiplier applied: ${BASE_FEE_MULTIPLIER}`);
  console.log(`Max fee per gas: ${maxFeePerGas}`);
  console.log(`Max priority fee per gas: ${maxPriorityFeePerGas}`);

  const estimateTx = {
    ...baseTx,
    account: baseTx.account.address,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };

  console.log(`\n=> Estimating gas...`, estimateTx);

  const gas = await publicClient.estimateGas(estimateTx);

  console.log(`Gas: ${gas}`);

  const txHash = await walletClient.sendTransaction({
    ...baseTx,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gas,
  });

  console.log(`Waiting for transaction receipt for ${txHash}`);
  const txReceipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("Receipt:", txReceipt);
})();

async function getGasPrice(client: Client, feeCurrency: Address) {
  const fee = await client.request({
    method: "eth_gasPrice",
    params: [feeCurrency] as any,
  });
  return BigInt(fee);
}

async function getMaxPriorityFeePerGas(client: Client, feeCurrency: Address) {
  const feesPerGas = await client.request({
    method: "eth_maxPriorityFeePerGas",
    params: [feeCurrency] as any,
  });
  return BigInt(feesPerGas);
}

function multiplyBigIntByDecimal(value: bigint, multiplier: number): bigint {
  // Convert decimal to integer by multiplying by 10^decimals
  const decimals = 10;
  const multiplierInt = Math.round(multiplier * Math.pow(10, decimals));
  return (value * BigInt(multiplierInt)) / BigInt(Math.pow(10, decimals));
}
