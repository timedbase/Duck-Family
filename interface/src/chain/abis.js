import { parseAbi } from "viem";

// Every signature here was generated mechanically from
// `forge inspect <Contract> abi --json` against the Duck-Family-Contract repo (or, for
// Permit2/UniversalRouter/V4Quoter, verified against their real deployed +
// verified source on Ink) — not hand-typed. Keep in sync if the contracts
// are ever redeployed/upgraded.

// Error entries are included alongside the functions/events above so viem
// can decode a revert's 4-byte selector into a readable name (e.g.
// "InsufficientCreationFee(500000000000000, 0)") instead of surfacing the
// raw "signature 0x..." that wallets show when they can't match unknown
// revert data.
export const DUCK_INCUBATION_ABI = parseAbi([
  "function creationFee() view returns (uint256)",
  "function platformToken() view returns (address)",
  "function quoteTokenAllowed(address) view returns (bool)",
  "function createToken((string name, string symbol, uint256 totalSupply, uint256 curveBps, uint256 liquidityBps, address quoteToken, uint256 startVirtualQuote, uint256 migrationTargetQuote, uint256 earlyBuyAmount, uint256 hookFeeBps, bool enableAntibot, uint256 antibotBlocks, string metaURI, bytes32 salt) p) payable returns (address)",
  "function buy(address token_, uint256 amountIn, uint256 minOut, uint256 deadline) payable",
  "function buyWithNative(address token_, uint256 minQuoteOut, uint256 minOut, uint256 deadline) payable",
  "function sell(address token_, uint256 amountIn, uint256 minQuoteOut, uint256 deadline)",
  "function claimCurveFee(address token_)",
  "function getToken(address token_) view returns ((address token, address creator, address quoteToken, uint256 totalSupply, uint256 liquidityTokens, uint256 bcTokensTotal, uint256 bcTokensSold, uint256 virtualQuote, uint256 k, uint256 raisedQuote, uint256 migrationTarget, address pair, bytes32 poolId, uint256 accruedFee, uint256 hookFeeBps, bool antibotEnabled, uint256 creationBlock, uint256 tradingBlock, bool migrated, bool migrationPending))",
  "function getAmountOut(address token_, uint256 quoteIn) view returns (uint256 tokensOut, uint256 feeQuote)",
  "function getAmountOutSell(address token_, uint256 tokensIn) view returns (uint256 quoteOut, uint256 feeQuote)",
  "function getSpotPrice(address token_) view returns (uint256 price)",
  "function setFeeSplits(address token_, (address wallet, uint16 bps)[] splits_)",
  "function getFeeSplits(address token_) view returns ((address wallet, uint16 bps)[])",
  "error ActivePool()", "error AlreadyMigrated()", "error AntibotBlocksOutOfRange()", "error ApprovalFailed()",
  "error CloneFailed()", "error DeadlineExpired()", "error ExceedsSoldSupply()", "error InsufficientContractBalance()",
  "error InsufficientCreationFee(uint256 required, uint256 provided)", "error InsufficientOutput()",
  "error InsufficientPoolQuote()", "error InvalidAllocation()", "error InvalidFeeSplitBps()", "error InvalidHookFeeBps()",
  "error InvalidMarketCaps()", "error InvalidSupply()", "error LiquidityReserveViolation()", "error MigrationPending()",
  "error MigrationTargetNotReached()", "error NativeNotAccepted()", "error NativeQuoteNoSwapNeeded()",
  "error NativeTransferFailed()", "error NotCreator()", "error NotMigrated()", "error NotSelf()",
  "error PendingValueMismatch()", "error QuoteTokenNotAllowed()", "error Reentrancy()", "error RouteUnavailable()",
  "error SlippageTooFewTokens()", "error SlippageTooLittleQuote()", "error TimelockNotExpired()",
  "error TimelockNotQueued()", "error TooManyFeeSplits()", "error TransferFailed()", "error Unauthorized()",
  "error UnknownToken()", "error VanityAddressRequired()", "error ZeroAddress()", "error ZeroAmount()",
]);

export const DUCK_LAUNCHER_ABI = parseAbi([
  "function launchFee() view returns (uint256)",
  "function platformToken() view returns (address)",
  "function quoteTokens(address) view returns (bool)",
  "function dexes(address) view returns (address singleton, address permit2, address hook, bool enabled)",
  "function launch((string name, string symbol, string metaURI, address feeWallet, address positionManager, address quoteToken, bytes32 vanitySalt, uint256 launchMarketCap, uint256 minQuoteOut, uint256 minTokensOut, uint256 hookFeeBps, bool revertOnInstantBuyFailure) p) payable returns (address token, bytes32 poolId, uint256 tokenId)",
  "error HookRequired()", "error InstantBuyFailed()", "error InsufficientOutput()", "error InvalidHookFeeBps()",
  "error InvalidTickRange()", "error PendingValueMismatch()", "error PoolAlreadyExists()", "error TimelockNotExpired()",
  "error TimelockNotQueued()", "error TransferFailed()", "error Unauthorized()", "error UnsupportedDex()",
  "error UnsupportedQuoteToken()", "error VanityMismatch()", "error WrongFee()", "error ZeroAddress()", "error ZeroAmount()",
]);

export const DUCK_RAISE_ABI = parseAbi([
  "function campaignFee() view returns (uint256)",
  "function platformToken() view returns (address)",
  "function quoteAssetAllowed(address) view returns (bool)",
  "function launch(string name_, string symbol_, string metaURI_, address dexQuoteAsset_, uint256 goalNativeWei_, uint256 startTime_, bytes32 vanitySalt_, uint256 hookFeeBps_) payable returns (uint256 campaignId, address token)",
  "function contribute(uint256 campaignId_) payable",
  "function claim(uint256 campaignId_)",
  "function claimRefund(uint256 campaignId_)",
  "function finalize(uint256 campaignId_) returns (address token)",
  "function campaigns(uint256) view returns (address creator, string name, string symbol, string metaURI, address dexQuoteAsset, uint256 goal, uint256 startTime, uint256 deadline, uint256 totalRaised, bytes32 vanitySalt, uint256 contributorBps, uint256 lpBps, bool finalized, bool succeeded, address token, uint256 hookFeeBps)",
  "error AlreadyFinalized()", "error CampaignFailed_()", "error CampaignNotFound()", "error CampaignSucceeded_()",
  "error DeadlineNotPassed()", "error DeadlinePassed()", "error HookNotSet()", "error InsufficientOutput()",
  "error InvalidBps()", "error InvalidHookFeeBps()", "error NotFinalized()", "error NotLiveYet()",
  "error NothingToClaim()", "error PendingValueMismatch()", "error PoolAlreadyExists()", "error QuoteAssetNotAllowed()",
  "error SwapFailed()", "error TimelockNotExpired()", "error TimelockNotQueued()", "error TransferFailed()",
  "error Unauthorized()", "error VanityMismatch()", "error WrongFee()", "error ZeroAddress()", "error ZeroAmount()",
]);

export const DUCK_LOCKER_ABI = parseAbi([
  "function claimAllFees()",
  "function claimFees(address token)",
  "function isLauncher(address) view returns (bool)",
  "function creatorOf(address token) view returns (address)",
  "function positions(address) view returns (uint256 tokenId, address token0, address token1, bytes32 poolId, address hook, address positionManager)",
  "error AlreadyRegistered()", "error NotAuthorized()", "error NotLauncher()", "error PendingValueMismatch()",
  "error TimelockNotExpired()", "error TimelockNotQueued()", "error TransferFailed()", "error Unauthorized()",
  "error UnknownToken()", "error ZeroAddress()",
]);

export const DUCK_HOOK_ABI = parseAbi([
  "function ctoFee() view returns (uint256)",
  "function pools(bytes32) view returns (address token, address quoteCurrency, bool tokenIsCurrency0, address creator, uint256 launchTimestamp, bool registered, uint256 hookFeeBps)",
  "function ctoApplications(bytes32) view returns (address applicant, address newCreator, uint256 paid)",
  "function applyForCTO(bytes32 poolId, address newCreator) payable",
  "function approveCTO(bytes32 poolId)",
  "function rejectCTO(bytes32 poolId)",
  "function claimFees(bytes32 poolId)",
  "function setFeeSplits(bytes32 poolId, (address wallet, uint16 bps)[] splits_)",
  "function getFeeSplits(bytes32 poolId) view returns ((address wallet, uint16 bps)[])",
  "error AlreadyRegistered()", "error CTOApplicationPending()", "error InsufficientCTOFee()",
  "error InvalidFeeSplitBps()", "error InvalidHookFeeBps()", "error NoCTOApplication()", "error NotCreator()",
  "error NotLauncher()", "error NotOwner()", "error NotPoolManager()", "error NotRegistered()",
  "error SameBlockSwap()", "error TooManyFeeSplits()", "error TransferFailed()", "error ZeroAddress()",
]);

export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function metaURI() view returns (string)",
  "error AlreadyInitialized()", "error ExceedsAllowance()", "error InsufficientBalance()",
  "error LaunchPhaseAlreadyEnded()", "error LaunchPhaseTransferRestricted()", "error NotOwner()",
  "error PermitExpired()", "error InvalidSignature()", "error ZeroAddress()", "error ZeroAmount()",
]);

// Canonical Permit2, identical on every chain it's deployed to.
export const PERMIT2_ABI = parseAbi([
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
]);

// Verified against Ink's real deployed UniversalRouter source (Commands.sol/
// Actions.sol/IV4Router.sol/IUniversalRouter.sol) -- see chain/dex.js for
// how the V4_SWAP command payload is built.
export const UNIVERSAL_ROUTER_ABI = parseAbi([
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) payable",
]);

// Verified against Ink's real deployed V4Quoter source/ABI.
export const V4_QUOTER_ABI = parseAbi([
  "function quoteExactInputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
]);
