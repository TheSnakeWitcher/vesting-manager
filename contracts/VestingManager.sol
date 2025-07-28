// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 ;
pragma abicoder v2 ;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol" ;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol" ;
import { FeeChargerERC20 } from "@thesnakewitcher/contracts-fees/contracts/FeeChargerERC20.sol" ;
import "./VestingMath.sol" ;

/**
 * @title VestingManager
 * @author Alejandro Virelles <thesnakewitcher@gmail.com>
 * @notice A contract to manage vestings of ERC20 tokens 
 * @dev Each vesting occupies 5+b slots in memory, where b is the number of beneficiaries
 */
contract VestingManager is Ownable, FeeChargerERC20 {

    using VestingMath for VestingPeriod ;

    mapping (uint256 id => VestingPeriod) public vestingPeriods ;

    event VestingCreated(uint256 indexed id, address indexed owner, VestingPeriod vestingPeriod);
    event VestingClaimed(uint256 indexed id);
    event VestingEnded(uint256 indexed id);

    error InvalidCreationParams();
    error InvalidPeriod();
    error InvalidRelease();

    constructor(address feeToken_, uint256 feeAmount_) Ownable(_msgSender()) FeeChargerERC20(feeToken_, feeAmount_) {}

    function create(VestingPeriod calldata period) external {
        require(period.checkCreation(), InvalidCreationParams()) ;
        _chargeFees(owner());

        uint256 id = _getVestingId() ;
        period.pay(msg.sender, address(this)) ;
        vestingPeriods[id] = period ;
        emit VestingCreated(id, msg.sender, period) ;
    }

    /// @dev to use it as getter use it with `staticCall` or check https://github.com/gnosis/util-contracts/blob/main/contracts/storage/StorageAccessible.sol
    function release(uint256 id) external {
        VestingPeriod memory period = vestingPeriods[id] ;
        require(period.checkExists(), InvalidPeriod());
        require(period.checkRelease(), InvalidRelease()) ;

        vestingPeriods[id].lastClaim = block.timestamp  ;
        period.release() ;
        emit VestingClaimed(id) ;

        if (period.endedAt(block.timestamp)) {
            delete vestingPeriods[id] ;
            emit VestingEnded(id) ;
        }
    }

    function setFeeToken(address feeToken_) external onlyOwner {
        _setFeeToken(feeToken_);
    }

    function setFeeAmount(uint256 feeAmount_) external onlyOwner {
        _setFeeAmount(feeAmount_);
    }

    function releasable(uint256 id, uint256 timestamp) external view returns (uint256) {
        VestingPeriod memory period = vestingPeriods[id] ;
        uint256 amount = period.toReleaseAt(timestamp) - period.toReleaseAt(period.lastClaim) ;
        return amount ;
    }

    function feeAmount() external view returns (uint256) {
        return _feeAmount ;
    }

    /// @dev Note that `id` doesn't need to be unpredictable, just collision resistant
    function _getVestingId() private view returns (uint256) {
        return uint256(keccak256(bytes.concat(
            bytes32(block.chainid),
            bytes32(block.number),
            bytes32(block.timestamp),
            bytes32(block.prevrandao),
            bytes32(bytes20(msg.sender))
        ))) ;
    }

}
