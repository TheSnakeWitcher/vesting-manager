// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FaucetToken is ERC20, ERC20Burnable, Ownable {

    constructor() ERC20("ProtocolFaucetToken", "PFT") Ownable(_msgSender()){
        _mint(_msgSender(), 100_000_000_000 * 10 ** decimals());
    }

    function mintBatch(address[] memory beneficiaries, uint256 amount) external onlyOwner {
        uint256 beneficiarieNumber = beneficiaries.length ;
        for(uint256 i ; i < beneficiarieNumber ; ++i ) {
            _mint(beneficiaries[i], amount) ;
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burnOfBatch(address[] memory beneficiaries, uint256 amount) external onlyOwner {
        uint256 beneficiarieNumber = beneficiaries.length ;
        for(uint256 i ; i < beneficiarieNumber ; ++i ) {
            _burn(beneficiaries[i], amount) ;
        }
    }

    function burnOf(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
