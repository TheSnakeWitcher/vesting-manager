import env from "hardhat"
import contractNames from "../data/contractNames.json"
import { ERC20 } from "../typechain-types"

async function main() {
    const { deployer, user } = await env.getNamedAccounts()

    const feeToken = (await env.deployments.get(contractNames.MockERC20)).address
    const vestingToken = (await env.deployments.get("VestingToken")).address

    const erc20 = (await env.ethers.getContractAt(contractNames.MockERC20, feeToken)) as unknown as ERC20
    const vestingErc20 = (await env.ethers.getContractAt(contractNames.MockERC20, vestingToken)) as unknown as ERC20

    const deployerFee = await erc20.balanceOf(deployer)
    console.log("deployerFee: ",deployerFee)

    const userFee = await erc20.balanceOf(deployer)
    console.log("userFee: ",userFee)

    const deployerVesting = await vestingErc20.balanceOf(deployer)
    console.log("deployerVesting: ", deployerVesting)

    const userVesting = await vestingErc20.balanceOf(user)
    console.log("userVesting: ",userVesting)
}

main().catch(console.error)
