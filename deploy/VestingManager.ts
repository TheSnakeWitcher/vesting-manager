import { network } from "hardhat";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import {} from "../node_modules/@openzeppelin/contracts/build/contracts/ERC20.json"
import contractNames from "../data/contractNames.json"
import { ethers } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer, user } = await hre.getNamedAccounts();

    const feeTokens: any = {
        bsc: {
            address: "0x55d398326f99059fF775485246999027B3197955",
            decimals: 18,
        },
        polygon: {
            address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            decimals: 10,
        }
    }
    const feeToken = feeTokens[network.name] !== undefined ?
        feeTokens[network.name] :
        (await hre.deployments.deploy(contractNames.MockERC20, {
            from: deployer,
            args: [[deployer, user]],
            log: true,
            autoMine: true,
        })).address;
    const feeAmount = ethers.parseUnits("200", feeToken.decimals) 

    await hre.deployments.deploy(contractNames.VestingManager, {
        from: deployer,
        args: [feeToken, feeAmount],
        log: true,
        autoMine: true,
    });

};

export default func;
func.tags = [contractNames.VestingManager];
