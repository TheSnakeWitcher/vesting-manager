import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import env from "hardhat";
import { Signer, BigNumberish, ZeroAddress } from "ethers";

import { getIdFromReceipt } from "../src"
import contractNames from "../data/contractNames.json"
import { VestingManager as events } from "../data/events.json"
import { VestingManager as errors } from "../data/errors.json"
import { ERC20, VestingManager as VestingManagerContract } from "../typechain-types"
import { VestingPeriodStruct } from "../typechain-types/contracts/IVestingManager"

describe("VestingManager contract", function () {

    let testContract: VestingManagerContract ;
    let feeToken: ERC20 ;
    let vestingToken: ERC20 ;
    let owner: Signer ;
    let user: Signer ;
    let feeAmount: bigint ;
    let period:VestingPeriodStruct; 

    async function deployFixture () {
        const [owner_, user_] = await env.ethers.getSigners()
        owner = owner_
        user = user_

        await env.deployments.fixture(contractNames.VestingManager);
        const vestingManager = await env.deployments.get(contractNames.VestingManager)
        const mockER20 = await env.deployments.get(contractNames.MockERC20)
        const vestingER20 = await env.deployments.deploy("VestingToken", {
            args: [[await owner.getAddress(), await user.getAddress()]],
            from: await owner.getAddress(),
            contract: contractNames.MockERC20
        })

        testContract = await env.ethers.getContractAt(vestingManager.abi, vestingManager.address) as unknown as VestingManagerContract
        vestingToken = await env.ethers.getContractAt(vestingER20.abi, vestingER20.address) as unknown as ERC20
        feeToken = await env.ethers.getContractAt(mockER20.abi, mockER20.address) as unknown as ERC20
        
        const startTime = (await time.latest()) + 100e3
        const cycleDuration = 1800 // 30 min in seconds
        const cycleAmount = env.ethers.parseEther("100")
        period = {
            startTime,
            // endTime: startDate + cycleDuration * 10,
            cycleNumber: 10,
            cycleDuration,
            beneficiaries: [await owner.getAddress()],
            cycleAmount,
            token: await vestingToken.getAddress(),
            lastClaim: 0,
        } as VestingPeriodStruct

        feeAmount = await testContract.feeAmount()
        await feeToken.connect(owner).transfer(await user.getAddress(), feeAmount * BigInt(10))
    }

    beforeEach( async () => loadFixture(deployFixture))

    describe("fee()", () => {

        it("feeToken()", async () => {
            const feeTokenAddr = await testContract.feeToken()
            expect(feeTokenAddr).to.equal(await feeToken.getAddress())
        })

        it("setFeeToken() fails change fee correctly", async () => {
            await testContract.connect(owner).setFeeToken(await vestingToken.getAddress())
            const feeTokenAddr = await testContract.feeToken()
            expect(feeTokenAddr).to.equal(await vestingToken.getAddress())
        })

        it("setFeeToken() fails to be called by user", async () => {
            await expect(testContract.connect(user).setFeeToken(await vestingToken.getAddress()))
                .to.be.revertedWithCustomError(testContract, errors.OwnableUnauthorizedAccount)
        })

        it("setFeeAmount() fails change fee correctly", async () => {
            const fee = 10
            await testContract.connect(owner).setFeeAmount(fee)
            expect(await testContract.feeAmount()).to.equal(fee)
        })

        it("setFeeAmount() fails to be called by user", async () => {
            await expect(testContract.connect(user).setFeeAmount(await vestingToken.getAddress()))
                .to.be.revertedWithCustomError(testContract, errors.OwnableUnauthorizedAccount)
        })
    })

    describe("create()", () => {

        it("charge fees", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            await expect(testContract.connect(user).create(period)).to.changeTokenBalances(
                feeToken,
                [await user.getAddress(), await owner.getAddress()],
                [-feeAmount, feeAmount],
            )
        })

        it("transfer vesting asset", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const vestingAmount = BigInt(period.cycleAmount) * BigInt(period.cycleNumber)
            await expect(testContract.connect(user).create(period)).to.changeTokenBalances(
                vestingToken,
                [await user.getAddress(), await testContract.getAddress()],
                [-vestingAmount, vestingAmount],
            )
        })

        it("register vesting period", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const tx = await testContract.connect(user).create(period)
            const id = getIdFromReceipt(await tx.wait())
            const p = await testContract.vestingPeriods(id)
            expect([p.token, p.startTime, p.cycleAmount, p.cycleNumber, p.cycleDuration])
                .to.deep.equal([period.token, period.startTime, period.cycleAmount, period.cycleNumber, period.cycleDuration])
        })

        it("emit VestingCreated event", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            await expect(testContract.connect(user).create(period)).to
                .emit(testContract, events.VestingCreated)
        })

        it("fails if fee balance is insufficient", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            await expect(testContract.connect(user).create(period)).to
                .emit(testContract, events.VestingCreated)
        })

        it("fails if fee allowance is insufficient", async () => {
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            await expect(testContract.connect(user).create(period)).to.be.reverted
        })

        it("fails if beneficiaries is empty", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const p = { ...period, beneficiaries: [] }
            await expect(testContract.connect(user).create(p)).to.be.reverted
        })

        it("fails if vesting asset amount is insufficient")
        it("fails if vesting asset amount is address(zero)")
        it("fails if startTime isn't a future timestamp", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const startTime = await time.latest() - 1
            const p = { ...period, startTime }
            await expect(testContract.connect(user).create(p)).to.be.reverted
        })

        it("fails if cycle duration isn't bigger than 0", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const p = { ...period, cycleDuration: 0 }
            await expect(testContract.connect(user).create(p)).to.be.reverted

        })

        it("fails if cycle number isn't bigger than 0", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const p = { ...period, cycleNumber: 0 }
            await expect(testContract.connect(user).create(p)).to.be.reverted
        })

        it("fails if cycle amount isn't bigger than 0", async () => {
            await feeToken.connect(user).approve(await testContract.getAddress(), feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(period.cycleAmount) * BigInt(period.cycleNumber))
            const p = { ...period, cycleAmount: 0 }
            await expect(testContract.connect(user).create(p)).to.be.reverted

        })

    })

    describe("release()", () => {
        let idSingle: BigNumberish ;
        let idMultiple: BigNumberish ;
        let endTime : BigNumberish ; 

        async function releaseFixture() {
            await feeToken.connect(user).approve(await testContract.getAddress(), BigInt(2)*feeAmount)
            await vestingToken.connect(user).approve(await testContract.getAddress(), BigInt(2) * BigInt(period.cycleAmount) * BigInt(period.cycleNumber))

            const tx1 = await testContract.connect(user).create(period)
            idSingle = getIdFromReceipt(await tx1.wait())

            const tx2 = await testContract.connect(user).create({ ... period, beneficiaries: [await owner.getAddress(), await user.getAddress()] })
            idMultiple = getIdFromReceipt(await tx2.wait())

            endTime = BigInt(period.startTime) + BigInt(period.cycleDuration) * BigInt(period.cycleNumber)
        }

        beforeEach(async () => loadFixture(releaseFixture) )

        it("release the vested amount in the end", async () => {
            const vestingAmount = BigInt(period.cycleAmount) * BigInt(period.cycleNumber)
            await time.setNextBlockTimestamp(BigInt(endTime) + BigInt(1) )
            await expect(testContract.release(idSingle)).to.changeTokenBalances(
                vestingToken,
                [await testContract.getAddress(), await owner.getAddress()],
                [-vestingAmount, vestingAmount],
            )
        })

        it("transfer a single cycle to a single beneficiary", async  () => {
            await time.setNextBlockTimestamp(BigInt(period.startTime) + BigInt(1) )
            await expect(testContract.release(idSingle)).to.changeTokenBalances(
                vestingToken,
                [await testContract.getAddress(), await owner.getAddress()],
                [-period.cycleAmount, period.cycleAmount],
            )
        })

        it("transfer a single cycle to multiples beneficiaries", async  () => {
            const halfCycle = BigInt(period.cycleAmount) / BigInt(2)
            await time.setNextBlockTimestamp(BigInt(period.startTime) + BigInt(1) )
            await expect(testContract.release(idMultiple)).to.changeTokenBalances(
                vestingToken,
                [await testContract.getAddress(), await owner.getAddress(), await user.getAddress()],
                [-period.cycleAmount, halfCycle, halfCycle],
            )
        })

        it("emit VestingClaimed() event", async () => {
            await time.setNextBlockTimestamp(BigInt(period.startTime) + BigInt(1) )
            await expect(testContract.release(idSingle))
                .to.emit(testContract, events.VestingClaimed).withArgs(idSingle)
        })

        it("delete vesting period in the last release", async () => {
            await time.setNextBlockTimestamp(BigInt(endTime) + BigInt(1))
            await testContract.release(idSingle)
            const p = await testContract.vestingPeriods(idSingle)
            await expect(p.token).to.be.equal(ZeroAddress)
            await expect(testContract.release(idSingle)).to.revertedWithCustomError(testContract, errors.InvalidPeriod)

        })

        it("emit VestingEnded() in the last release", async () => {
            await time.setNextBlockTimestamp(BigInt(endTime) + BigInt(1))
            await expect(testContract.release(idSingle))
                .to.emit(testContract, events.VestingEnded).withArgs(idSingle)
        })

        it("fails if vesting isn't started", async () => {
            await time.setNextBlockTimestamp(BigInt(period.startTime) - BigInt(1))
            await expect(testContract.release(idSingle))
                .to.revertedWithCustomError(testContract, errors.InvalidRelease)
        })

        it("fails if period doesn't exists", async () => {
            await expect(testContract.release(0))
                .to.revertedWithCustomError(testContract, errors.InvalidPeriod)
        })

        it("fails to claim twice in the same period", async () => {
            await time.setNextBlockTimestamp(BigInt(period.startTime) + BigInt(1))
            await testContract.release(idSingle)
            await expect(testContract.release(idSingle))
                .to.revertedWithCustomError(testContract, errors.InvalidRelease)
        })
    })
});
