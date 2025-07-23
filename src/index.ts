import { Contract, type ContractRunner } from "ethers"
import type { Deployments } from "hardhat-inspect"

import type { VestingManager as VestingManagerContract, ERC20 } from "../typechain-types"
import type { VestingPeriodStruct } from "../typechain-types/contracts/VestingManager"
import { VestingManager as VestingManagerDeployments } from "../data/deployments.json"
import { abi as  VestingManagerAbi } from "../artifacts/contracts/VestingManager.sol/VestingManager.json"
import { abi as  ERC20Abi } from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json"

export interface IVestingForm {
    token: string,
    beneficiaries: string[],
    amount: number, // total amount to vest
    startTime: number,
    endTime: number,
    cycleDuration: number,
}

export function vestingFormToPeriod(form: IVestingForm): VestingPeriodStruct {
    const cycleNumber = Math.round((form.endTime - form.startTime) / form.cycleDuration)
    return {
        ...form,
        cycleNumber,
        cycleAmount: Math.round(form.amount / cycleNumber),
        lastClaim: 0,
    }
}

export class VestingManager {

    public contract : VestingManagerContract ;

    constructor(chainId: number, runner: ContractRunner) {
        const address = (VestingManagerDeployments as Deployments)[chainId] as string
        if (address === "" || address === undefined) {
            throw new Error("No deployment for chainId " + chainId)
        }
        this.contract = new Contract(address, VestingManagerAbi, runner) as unknown as VestingManagerContract 
    }

    public async create(form: IVestingForm) {
        const period = vestingFormToPeriod(form)
        console.log(period)

        const feeToken = await this.contract.feeToken()
        const feeAmount = await this.contract.feeAmount()
        const erc20Fee = new Contract(feeToken,ERC20Abi, this.contract.runner) as unknown as ERC20
        const feeTx = (await erc20Fee.approve(this.contract.getAddress(), feeAmount)).hash
        console.log('approve fee tx: ', feeTx)

        const erc20Vesting = new Contract(period.token.toString(), ERC20Abi, this.contract.runner) as unknown as ERC20
        const vestingTx = await erc20Vesting.approve(await this.contract.getAddress(), form.amount)
        const vestingTxHash = (await vestingTx.wait(3))?.hash
        console.log('approve vestingTx tx: ', vestingTxHash)

        const tx = (await this.contract.create(period)).hash
        console.log('creation tx: ', tx)

        const chainId = Number((await this.contract.runner?.provider?.getNetwork())?.chainId)
        const body = JSON.stringify({ tx, chainId })

        try {
            const response = await fetch("https://opsljrtyq0.execute-api.us-east-2.amazonaws.com/schedule", { method: "POST", body });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            const json = await response.json();
            console.log(json);
        } catch (error) {
            console.error(error);
        }
    }
}
