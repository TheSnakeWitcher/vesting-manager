import env from "hardhat"
import { VestingManager, IVestingForm } from "../src"

async function main() {
    const { deployer, user } = await env.getNamedAccounts()
    const userSigner = await env.ethers.getSigner(user)
    
    const vestingToken = (await env.deployments.get("VestingToken")).address
    const vestingManager = new VestingManager(env.network.config.chainId!, userSigner)

    const startTime = 1753133877
    const cycleDuration = 300 // 5 min in seconds
    const endTime = startTime + cycleDuration * 3
    const cycleAmount = 100

    const period = {
        startTime,
        endTime,
        beneficiaries: [deployer],
        token: vestingToken,
        amount: cycleAmount * 3,
        cycleDuration,
    } as IVestingForm
    console.log(period)

    await vestingManager.create(period)
}

main().catch(console.error)
