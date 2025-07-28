import { HardhatUserConfig, vars } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-deploy"
import "hardhat-inspect"
import "@solarity/hardhat-gobind"
import { polygon, bsc, polygonMumbai, bscTestnet } from "viem/chains"

const PRIVATE_KEY = vars.get("DEV_WALLET_KEY");
const PRIVATE_KEY2 = vars.get("DEV_WALLET_KEY2");
const ACCOUNT = vars.get("ACCOUNT","0xf830eeF4BB1F6F12eE6442B288f39Cd2772A9Bdc");

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.29",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
            },
        }
    },
    namedAccounts: {
        deployer: {
            default: ACCOUNT,
            hardhat: 0,
            localhost: 0,
        },
        user: {
            default: "0xE00ad59517d13C2944967a5221FfAEd35419DF90",
            hardhat: 1,
            localhost: 1,
        }
    },
    gobind: {
        outdir: "./data/bindings",
        onlyFiles: [
            "contracts/VestingManager.sol",
            "contracts/FaucetToken.sol"
        ],
    },
    networks: {
        bsc: {
            chainId: bsc.id,
            url: bsc.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
        polygon: {
            chainId: polygon.id,
            url: polygon.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },

        bscTestnet: {
            chainId: bscTestnet.id,
            url: bscTestnet.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
        polygonMumbai: {
            chainId: polygonMumbai.id,
            url: polygonMumbai.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
    }
};

export default config;
