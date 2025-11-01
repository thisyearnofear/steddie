import Leaderboard from "../contracts/Leaderboard.cdc"

// Check contract status
access(all) fun main(userAddress: Address): {String: AnyStruct} {

    let status: {String: AnyStruct} = {}

    // ===== LEADERBOARD STATUS =====

    if let leaderboardAdminRef = Leaderboard.borrowLeaderboardAdmin(userAddress) {
        status["leaderboard_exists"] = true
        status["current_period"] = leaderboardAdminRef.currentPeriod
    } else {
        status["leaderboard_exists"] = false
    }

    status["status"] = "contracts_deployed"
    status["current_timestamp"] = getCurrentBlock().timestamp

    return status
}
