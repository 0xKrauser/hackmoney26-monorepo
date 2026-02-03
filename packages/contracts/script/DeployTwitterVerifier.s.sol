// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TwitterVerifier.sol";

contract DeployTwitterVerifier is Script {
    function run() external {
        // Base Sepolia Chainlink Functions Router
        address router = 0xf9B8fc078197181C841c296C876945aaa425B278;
        bytes32 donId = bytes32("fun-base-sepolia-1");
        uint64 subscriptionId = uint64(vm.envUint("CHAINLINK_SUBSCRIPTION_ID"));
        uint32 gasLimit = 300_000;
        string memory source = vm.readFile("functions/twitter-verify.js");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        TwitterVerifier verifier = new TwitterVerifier(
            router,
            donId,
            subscriptionId,
            gasLimit,
            source
        );

        console.log("TwitterVerifier deployed at:", address(verifier));

        vm.stopBroadcast();
    }
}
