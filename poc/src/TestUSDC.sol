// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestUSDC
 * @notice A test ERC20 token mimicking USDC for local testing
 * @dev Has 6 decimals like real USDC and public mint functions for testing
 */
contract TestUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Test USDC", "tUSDC") {
        // Mint 1 million tokens to deployer
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    // Public mint for testing - anyone can mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Convenience: mint to caller
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
