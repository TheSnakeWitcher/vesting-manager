// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 ;
pragma abicoder v2 ;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol" ;
import { console } from "hardhat/console.sol" ;

struct VestingPeriod {
    IERC20 token ;
    address[] beneficiaries ;
    uint256 lastClaim ;

    uint256 startTime ;
    uint256 cycleAmount ;
    uint128 cycleDuration ;
    uint128 cycleNumber ;
}

library VestingMath {

    using SafeERC20 for IERC20 ;

    function pay(VestingPeriod memory period, address from, address holder) internal {
        period.token.safeTransferFrom(from, holder, maxToRelease(period)) ;
    }

    function release(VestingPeriod memory period) internal {
        uint256 beneficiariesNumber = period.beneficiaries.length ;

        uint256 cycleAmount = toReleaseAt(period, block.timestamp) - toReleaseAt(period, period.lastClaim) ;
        if (beneficiariesNumber < 2) {
            address to = period.beneficiaries[0] ;
            period.token.safeTransfer(to, cycleAmount) ;
        } else {
            uint256 amountPerBeneficiary = cycleAmount / beneficiariesNumber ;
            for(uint256 i ; i < beneficiariesNumber ; ++i ) {
                period.token.safeTransfer(
                    period.beneficiaries[i],
                    amountPerBeneficiary
                ) ;
            }
        }
    }

    /// @notice determines whether a period ended as of timestamp 'at'
    function checkCreation(VestingPeriod memory period) internal view returns (bool) {
        return period.beneficiaries.length > 0 &&
            address(period.token) != address(0) &&
            period.startTime > block.timestamp &&
            period.cycleDuration > 0 &&
            period.cycleNumber > 0 &&
            period.cycleAmount > 0 ;
        
    }

    function checkRelease(VestingPeriod memory period) internal view returns (bool) {
        bool notStarted = period.startTime > block.timestamp ;
        if (notStarted) return false ;

        uint256 released = toReleaseAt(period, period.lastClaim) ;
        uint256 toRelease = toReleaseAt(period, block.timestamp) ;
        if (toRelease - released <= 0) return false ;

        return true ;
    }

    function checkExists(VestingPeriod memory period) internal pure returns (bool) {
        return address(period.token) != address(0) ;
    }

    /// @notice determines whether a vesting period is ended for timestamp 'at'
    function endedAt(VestingPeriod memory period, uint256 at) internal pure returns (bool) {
        return at > endTime(period) ;
    }

    /// @notice the cumulative amount to release according the cycle for timestamp `at`
    function toReleaseAt(VestingPeriod memory period, uint256 at) internal pure returns (uint256) {
        if ( at < period.startTime ) return 0 ;

        uint256 cycleNumber = inCycle(period, at) ;
        return cycleAmountFor(period, cycleNumber) ;
    }

    /// @notice the `cycleNumber` of `period` for timestamp `at`
    function inCycle(VestingPeriod memory period, uint256 at) internal pure returns (uint256) {
        uint256 cycle = (at - period.startTime) / period.cycleDuration ;
        return (cycle < period.cycleNumber) ? cycle + 1 : period.cycleNumber ;
    }

    function cycleStartTimestamp(VestingPeriod memory period, uint256 cycleNumber) internal pure returns (uint256) {
        return period.startTime + period.cycleDuration * cycleNumber ;
    }

    function cycleAmountFor(VestingPeriod memory period, uint256 cycleNumber) internal pure returns (uint256) {
        return period.cycleAmount * cycleNumber ;
    }

    /// @notice the `endTime` for `period` or the last cycle start timestamp
    function endTime(VestingPeriod memory period) internal pure returns (uint256) {
        return cycleStartTimestamp(period, period.cycleNumber) ;
    }

    /// @notice the maximun amount to release for `period`
    function maxToRelease(VestingPeriod memory period) internal pure returns (uint256) {
        return cycleAmountFor(period, period.cycleNumber) ;
    }
}
