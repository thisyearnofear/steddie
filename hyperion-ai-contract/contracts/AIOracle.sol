// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IHyperionAI {
    function postSummary(bytes32 playerId,
                         uint32  periodId,
                         bytes16 coachId,
                         int32   deltaRating,
                         uint8   cheatFlag) external;

    function getSummary(bytes32 playerId, uint32 periodId) external view
        returns (int32 deltaRating, uint8 cheatFlag, bytes16 coachId);
}

contract AIOracle is IHyperionAI, Ownable {
    struct Summary {
        int32  deltaRating;
        uint8  cheatFlag; // 0=clean,1=suspect,2=banned
        bytes16 coachId;
    }

    mapping(bytes32 => mapping(uint32 => Summary)) private summaries;

    event SummaryPosted(bytes32 indexed playerId, uint32 indexed periodId,
                        bytes16 coachId, int32 deltaRating, uint8 cheatFlag);

    // relayer (off-chain personaliser) must be authorised
    mapping(address => bool) public relayers;
    function setRelayer(address relayer, bool allowed) external onlyOwner {
        relayers[relayer] = allowed;
    }

    modifier onlyRelayer() {
        require(relayers[msg.sender], "not relayer");
        _;
    }

    function postSummary(bytes32 playerId, uint32 periodId,
                         bytes16 coachId, int32 deltaRating,
                         uint8 cheatFlag) external override onlyRelayer {
        summaries[playerId][periodId] = Summary(deltaRating, cheatFlag, coachId);
        emit SummaryPosted(playerId, periodId, coachId, deltaRating, cheatFlag);
    }

    function getSummary(bytes32 playerId, uint32 periodId)
        external view override returns (int32, uint8, bytes16)
    {
        Summary memory s = summaries[playerId][periodId];
        return (s.deltaRating, s.cheatFlag, s.coachId);
    }
}