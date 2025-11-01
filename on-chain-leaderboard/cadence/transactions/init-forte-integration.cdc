import Leaderboard from "../contracts/Leaderboard.cdc"

// Initialize leaderboard contract
transaction() {

    prepare(signer: auth(Storage, Capabilities) &Account) {

        // Create and store leaderboard admin resource if it doesn't exist
        if signer.storage.borrow<&Leaderboard.LeaderboardAdmin>(from: Leaderboard.getAdminStoragePath()) == nil {
            let admin <- Leaderboard.createAdmin()
            signer.storage.save(<-admin, to: Leaderboard.getAdminStoragePath())

            // Create public capability
            let cap = signer.capabilities.storage.issue<&Leaderboard.LeaderboardAdmin>(Leaderboard.getAdminStoragePath())
            signer.capabilities.publish(cap, at: Leaderboard.getAdminPublicPath())
            
            log("Leaderboard admin resource initialized")
        } else {
            log("Leaderboard admin resource already exists")
        }
    }
}
