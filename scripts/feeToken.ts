import env from "hardhat"
import contractNames from "../data/contractNames.json"
import { VestingManager } from "../typechain-types"

async function main() {
    const vestingAddress = (await env.deployments.get(contractNames.VestingManager)).address
    const v = (await env.ethers.getContractAt(contractNames.VestingManager, vestingAddress)) as unknown as VestingManager

    const faucet = (await env.deployments.get(contractNames.FaucetToken)).address
    const tx = await v.setFeeToken(faucet)
    console.log(tx)
}

main().catch(console.error)
