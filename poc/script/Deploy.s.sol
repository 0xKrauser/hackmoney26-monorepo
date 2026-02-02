// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {ReactionPool} from "../src/ReactionPool.sol";
import {TestUSDC} from "../src/TestUSDC.sol";
import {MockCustody} from "../src/MockCustody.sol";

/**
 * @title Deploy
 * @notice Deployment script for ReactionPool contract
 *
 * Usage:
 *   # Dry run
 *   forge script script/Deploy.s.sol --rpc-url base_sepolia
 *
 *   # Broadcast (deploy)
 *   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
 */
contract DeployScript is Script {
    // Yellow Network Custody contract on Base Sepolia
    address constant CUSTODY_ADDRESS = 0x019B65A265EB3363822f2752141b3dF16131b262;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("Custody address:", CUSTODY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TestUSDC token
        TestUSDC token = new TestUSDC();
        console.log("TestUSDC deployed at:", address(token));

        // Deploy ReactionPool
        ReactionPool pool = new ReactionPool(CUSTODY_ADDRESS);
        console.log("ReactionPool deployed at:", address(pool));

        // Optionally set up an authorized signer (deployer by default)
        // pool.setAuthorizedSigner(deployer, true);
        // console.log("Deployer set as authorized signer");

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Summary ===");
        console.log("TestUSDC:", address(token));
        console.log("  - Decimals:", token.decimals());
        console.log("  - Deployer balance:", token.balanceOf(deployer));
        console.log("ReactionPool:", address(pool));
        console.log("  - Owner:", pool.owner());
        console.log("  - Custody:", pool.custodyAddress());
        console.log("========================\n");
    }
}

/**
 * @title SetupPool
 * @notice Script to configure ReactionPool after deployment
 *
 * Usage:
 *   forge script script/Deploy.s.sol:SetupPoolScript --rpc-url base_sepolia --broadcast
 */
contract SetupPoolScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolAddress = vm.envAddress("REACTION_POOL_ADDRESS");
        address signerAddress = vm.envAddress("AUTHORIZED_SIGNER");

        ReactionPool pool = ReactionPool(poolAddress);

        console.log("Pool address:", poolAddress);
        console.log("Setting authorized signer:", signerAddress);

        vm.startBroadcast(deployerPrivateKey);

        pool.setAuthorizedSigner(signerAddress, true);

        vm.stopBroadcast();

        console.log("Authorized signer set successfully");
    }
}

/**
 * @title DeployMock
 * @notice Deploy MockCustody + TestUSDC + ReactionPool for LOCAL TESTING ONLY
 *
 * ⚠️  WARNING: This deploys a MOCK Custody contract that accepts any ERC20 token.
 *     Use this ONLY when Yellow Network's testnet tokens (ytest.USD) are unavailable.
 *     For production or integration testing with Yellow Network, use DeployScript instead.
 *
 * Usage:
 *   forge script script/Deploy.s.sol:DeployMockScript --rpc-url base_sepolia --broadcast
 */
contract DeployMockScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("  MOCK DEPLOYMENT - FOR TESTING ONLY");
        console.log("===========================================\n");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockCustody (accepts any ERC20)
        MockCustody custody = new MockCustody();
        console.log("\n1. MockCustody deployed at:", address(custody));

        // 2. Deploy TestUSDC token
        TestUSDC token = new TestUSDC();
        console.log("2. TestUSDC deployed at:", address(token));

        // 3. Deploy ReactionPool pointing to MockCustody
        ReactionPool pool = new ReactionPool(address(custody));
        console.log("3. ReactionPool deployed at:", address(pool));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== MOCK Deployment Summary ===");
        console.log("MockCustody:", address(custody));
        console.log("  [!] This is a MOCK - not Yellow Network's official Custody");
        console.log("TestUSDC:", address(token));
        console.log("  - Decimals:", token.decimals());
        console.log("  - Deployer balance:", token.balanceOf(deployer));
        console.log("ReactionPool:", address(pool));
        console.log("  - Owner:", pool.owner());
        console.log("  - Custody:", pool.custodyAddress());
        console.log("===============================\n");

        console.log("Next steps:");
        console.log("1. Update CONTRACTS in packages/web3/lib/config.ts:");
        console.log("   custody: '%s'", address(custody));
        console.log("   testToken: '%s'", address(token));
        console.log("   reactionPool: '%s'", address(pool));
        console.log("2. Update CONTRACTS in poc/scripts/client.ts with same values");
        console.log("3. Run: npx tsx scripts/2-setup-channel.ts");
    }
}
