import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import {} from "../node_modules/@openzeppelin/contracts/build/contracts/ERC20.json"
import contractNames from "../data/contractNames.json"

const tag = "VestingToken"
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer, user } = await hre.getNamedAccounts();

    await hre.deployments.deploy(tag, {
        contract: contractNames.MockERC20,
        from: deployer,
        args: [[deployer, user]],
        log: true,
        autoMine: true,
    })

};

export default func;
func.tags = [tag];
