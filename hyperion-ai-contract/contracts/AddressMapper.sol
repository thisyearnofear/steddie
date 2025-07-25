// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AddressMapper is Ownable {
    // key = bytes32(flowAddress) where flowAddress is lower-case string (without 0x)
    mapping(bytes32 => address) public ethAddressOf;

    event MappingSet(bytes32 indexed flowKey, address indexed ethAddress);

    // player maps their own ETH address to their Flow address hash
    function setMyMapping(string calldata flowAddrLowerNo0x) external {
        bytes32 key = keccak256(bytes(flowAddrLowerNo0x));
        ethAddressOf[key] = msg.sender;
        emit MappingSet(key, msg.sender);
    }

    function getEthAddress(string calldata flowAddrLowerNo0x) external view returns (address) {
        return ethAddressOf[keccak256(bytes(flowAddrLowerNo0x))];
    }
}