import { HardhatUserConfig, vars } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox-viem"
import { polygon, bsc, polygonMumbai, bscTestnet } from "viem/chains"

const PRIVATE_KEY = vars.get("DEV_WALLET_KEY")

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
    networks: {
        bsc: {
            chainId: bsc.id,
            url: bsc.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY!],
        },
        polygon: {
            chainId: polygon.id,
            url: polygon.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY!],
        },

        bscTestnet: {
            chainId: bscTestnet.id,
            url: bscTestnet.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY!],
        },
        polygonMumbai: {
            chainId: polygonMumbai.id,
            url: polygonMumbai.rpcUrls.default.http[0],
            accounts: [PRIVATE_KEY!],
        },
    }
};

export default config;
