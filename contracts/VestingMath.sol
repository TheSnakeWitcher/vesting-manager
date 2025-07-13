// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 ;
pragma abicoder v2 ;

struct VestingPeriod {
    uint256 startTime ;

    uint128 cycleDuration ;
    uint128 cycleNumber ;

    uint256 cycleAmount ;
}

library VestingMath {

    /// @notice determines whether a period ended as of timestamp 'at'
    function endedAt(VestingPeriod memory period, uint256 at) internal pure returns (bool) {
        return at > endTime(period) ;
    }

    /// @notice the amount to release according the cycle for timestamp `at`
    function toReleaseAt(VestingPeriod memory period, uint256 at) internal pure returns (uint256) {
        if ( at < period.startTime ) return 0 ;

        uint256 cycleNumber = inCycle(period, at) ;
        return cycleNumber * period.cycleAmount ;
    }

    /// @notice the `cycleNumber` of `period` for timestamp `at`
    function inCycle(VestingPeriod memory period, uint256 at) internal pure returns (uint256) {
        uint256 cycle = (at - period.startTime) / period.cycleDuration ;
        return (cycle < period.cycleNumber) ? cycle + 1 : period.cycleNumber ;
    }

    /// @notice the `endTime` for `period`
    function endTime(VestingPeriod memory period) internal pure returns (uint256) {
        return period.startTime + period.cycleDuration * period.cycleNumber ;
    }

    /// @notice the maximun amount to release for `period`
    function maxToRelease(VestingPeriod memory period) internal pure returns (uint256) {
        return period.cycleNumber * period.cycleAmount ;
    }

}
