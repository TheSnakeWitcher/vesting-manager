import env from "hardhat"
import { parseEther } from "ethers"
import contractNames from "../data/contractNames.json"
import { VestingManager } from "../typechain-types"

async function main() {
    const vestingAddress = (await env.deployments.get(contractNames.VestingManager)).address
    const v = (await env.ethers.getContractAt(contractNames.VestingManager, vestingAddress)) as unknown as VestingManager
    const tx = await v.setFeeAmount(parseEther("1"))
    console.log(tx)
}

main().catch(console.error)
