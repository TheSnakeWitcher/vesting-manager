import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import contractNames from "../data/contractNames.json"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();

    await hre.deployments.deploy(contractNames.FaucetToken, {
        from: deployer,
        log: true,
        autoMine: true,
    })

};

export default func;
func.tags = [contractNames.FaucetToken];
