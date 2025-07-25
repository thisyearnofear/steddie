# Memoree Paymaster Roadmap

## Desired UX

- **Gasless onboarding**: Users can play, save progress, and join small competitions without needing native tokens for gas.
- **Automatic fallback**: After N free transactions, show a clear prompt to “top up” or use their own wallet’s gas.
- **One-click experience**: Transaction popups are minimized; ideally, a user sees only a single confirmation when required.

## Technical Stack (Hyperion)

- **Native Paymaster (when live)**
  - Use Hyperion’s built-in paymaster to sponsor user gas for whitelisted contracts (AIOracle, AddressMapper, SmartAccount).
  - Limit free tx count per account via on-chain storage or off-chain rate limiting.
  - Supports ERC-4337 “smart account” pattern for advanced flows.

- **Interim: Biconomy-style Relayer**
  - API Gateway (Node.js/Bun) acts as a meta-tx relayer.
  - User signs payload; relayer submits to Hyperion and pays gas.
  - Rate limits and whitelists enforced at gateway.

## Security Checks

- **Whitelist**: Only sponsor approved contract calls (prevent rug-pull).
- **Rate limiting**: N free tx per user per 24 hours (enforced in paymaster or relayer).
- **Deposits**: Cap total paymaster outlay, auto-disable if balance too low.
- **Abuse monitoring**: Track anomalous patterns and blocklist abusers.

## Development Phases

**Phase 1 – Meta-tx Relayer MVP**
- Implement meta-tx signing and relayer endpoint.
- Sponsor gas for first 20 tx per account.
- Alerts when paymaster wallet balance is low.

**Phase 2 – Native Paymaster Integration**
- Activate Hyperion paymaster as soon as available.
- Migrate sponsorship logic on-chain.
- Add gas usage stats to admin dashboard.

**Phase 3 – Smart Account + Fallback**
- Smart account factory for new users.
- On depletion, prompt user to switch to self-gas or top up with tMETIS.
- “One-click” fallback logic in UI.

**Phase 4 – Security & Analytics**
- Real-time abuse/fraud monitoring.
- Admin controls to pause/resume sponsorship.
- Usage analytics and reporting.

---
With this approach, Memoree users enjoy a Web2-smooth experience, while the platform maintains control and security over operational costs.