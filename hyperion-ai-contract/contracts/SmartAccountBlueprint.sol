// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/**
 *  Minimal ERC-4337-compatible smart account skeleton to be expanded when Hyperion Paymaster goes live.
 *  Currently reverts on all exec calls – exists to lock in address for future upgradability.
 */
contract SmartAccountBlueprint {
    address public owner;
    constructor(address _owner){owner=_owner;}
    receive() external payable {}
    function execute(address,to,uint256 value,bytes calldata data) external {
        revert("Not yet implemented");
    }
}