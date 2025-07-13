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
 * @dev Each vesting occupies 4+3p slots in memory, where p is the amount of periods
 */
contract VestingManager is Ownable, FeeChargerERC20 {

    using VestingMath for VestingPeriod ;
    using SafeERC20 for IERC20 ;

    // TODO: consider to use uint128 for lastClaim and latestTimestamp
    struct VestingData {
        IERC20 token ;
        uint256 lastClaim ;
        address beneficiary ;
        uint256 latestTimestamp ;
    }

    mapping (uint256 id => VestingData) public vestingData ;
    mapping (uint256 id => VestingPeriod[]) public vestingPeriods ;

    event VestingCreated(uint256 indexed id, address indexed beneficiary, IERC20 indexed token);
    event VestingClaimed(uint256 indexed id, uint256 indexed amount);

    error InvalidCreationParams();
    error InvalidBeneficiary(address sender);
    error VestingNotStarted();

    constructor(address feeToken, uint256 feeAmount) Ownable(_msgSender()) FeeChargerERC20(feeToken, feeAmount) {}

    function create(IERC20 token, VestingPeriod[] calldata periods, address beneficiary) external {
        _chargeFees(owner());
        uint256 periodNumber = periods.length ;
        require(
            beneficiary != address(0) &&
            address(token) != address(0) &&
            periodNumber > 0,
            InvalidCreationParams()
        ) ;

        (uint256 id, uint256 latestTimestamp, uint256 maxToRelease) = (_getVestingId(),0,0) ;
        for(uint256 i ; i < periodNumber ; ++i ) {
            maxToRelease += periods[i].maxToRelease() ;
            vestingPeriods[id].push(periods[i]) ;
            if (periods[i].endTime() > latestTimestamp) latestTimestamp = periods[i].endTime() ;
        }
        require(maxToRelease != 0, InvalidCreationParams());

        token.safeTransferFrom(msg.sender, address(this), maxToRelease) ;
        vestingData[id] = VestingData({
            beneficiary: beneficiary,
            token: token,
            lastClaim: 0,
            latestTimestamp: latestTimestamp 
        }) ;
        emit VestingCreated(id, msg.sender, token) ;
    }

    /**
     * @dev to use it as getter use it with `staticCall` or check
     *      https://github.com/gnosis/util-contracts/blob/main/contracts/storage/StorageAccessible.sol
     */
    function release(uint256 id) external returns (uint256) {
        VestingData memory data = vestingData[id] ; 
        require(msg.sender == data.beneficiary, InvalidBeneficiary(msg.sender));
        vestingData[id].lastClaim = block.timestamp  ;

        VestingPeriod[] memory periods = vestingPeriods[id] ;
        (uint256 periodNumber, uint256 amount) = (periods.length, 0) ;
        for(uint256 i ; i < periodNumber ; ++i) {
            VestingPeriod memory period = periods[i] ;
            uint256 released = period.toReleaseAt(data.lastClaim) ;
            uint256 toRelease = period.toReleaseAt(block.timestamp) ;
            uint256 periodAmount = toRelease - released ;
            amount += periodAmount ;
        }
        require(amount != 0, VestingNotStarted() );

        data.token.safeTransfer(data.beneficiary, amount) ;
        emit VestingClaimed(id, amount) ;
        if (block.timestamp >= data.latestTimestamp) {
            delete vestingData[id] ;
            delete vestingPeriods[id] ;
        }
        return amount ;
    }

    function releasable(uint256 id, uint256 timestamp) external view returns (uint256) {
        VestingData memory data = vestingData[id] ; 
        VestingPeriod[] memory periods = vestingPeriods[id] ;
        (uint256 periodNumber, uint256 amount) = (periods.length, 0) ;
        
        for(uint256 i ; i < periodNumber ; ++i) {
            VestingPeriod memory period = periods[i] ;
            uint256 released = period.toReleaseAt(data.lastClaim) ;
            uint256 toRelease = period.toReleaseAt(timestamp) ;
            amount += toRelease - released ;
        }
        return amount ;
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
