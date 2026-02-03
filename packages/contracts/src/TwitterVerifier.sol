// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

contract TwitterVerifier is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // --- State ---
    mapping(address => string) public verifiedTwitter;
    mapping(string => address) public twitterToAddress;
    mapping(bytes32 => address) private s_requestToSender;
    mapping(bytes32 => string) private s_requestToUsername;

    // Registration state: user -> nonce for tweet verification
    mapping(address => bytes32) public s_verificationNonce;
    mapping(address => string) public s_registeredUsername;

    // --- Config ---
    bytes32 public s_donId;
    uint64 public s_subscriptionId;
    uint32 public s_gasLimit;
    string public s_source;
    bytes public s_encryptedSecretsReference;

    // --- Events ---
    event VerificationRegistered(address indexed user, string username, bytes32 nonce);
    event VerificationRequested(bytes32 indexed requestId, address indexed user, string username);
    event VerificationFulfilled(bytes32 indexed requestId, address indexed user, string username, bool verified);
    event VerificationFailed(bytes32 indexed requestId, address indexed user, string username, bytes err);

    // --- Errors ---
    error AlreadyVerified();
    error UsernameAlreadyClaimed();
    error EmptyUsername();
    error NotRegistered();

    constructor(
        address router,
        bytes32 donId,
        uint64 subscriptionId,
        uint32 gasLimit,
        string memory source
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        s_donId = donId;
        s_subscriptionId = subscriptionId;
        s_gasLimit = gasLimit;
        s_source = source;
    }

    /// @notice Step 1: Register intent to verify. Generates a unique nonce the user must include in their tweet.
    function registerVerification(string calldata username) external returns (bytes32 nonce) {
        if (bytes(username).length == 0) revert EmptyUsername();
        if (bytes(verifiedTwitter[msg.sender]).length > 0) revert AlreadyVerified();
        if (twitterToAddress[username] != address(0)) revert UsernameAlreadyClaimed();

        nonce = keccak256(abi.encodePacked(msg.sender, username, block.timestamp, block.prevrandao));

        s_verificationNonce[msg.sender] = nonce;
        s_registeredUsername[msg.sender] = username;

        emit VerificationRegistered(msg.sender, username, nonce);
    }

    /// @notice Step 2: After tweeting, call this to trigger Chainlink Functions verification.
    function requestVerification() external returns (bytes32 requestId) {
        bytes32 nonce = s_verificationNonce[msg.sender];
        if (nonce == bytes32(0)) revert NotRegistered();

        string memory username = s_registeredUsername[msg.sender];
        if (bytes(verifiedTwitter[msg.sender]).length > 0) revert AlreadyVerified();
        if (twitterToAddress[username] != address(0)) revert UsernameAlreadyClaimed();

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(s_source);

        string[] memory args = new string[](3);
        args[0] = username;
        args[1] = _addressToString(msg.sender);
        args[2] = _bytes32ToHexString(nonce);
        req.setArgs(args);

        if (s_encryptedSecretsReference.length > 0) {
            req.addSecretsReference(s_encryptedSecretsReference);
        }

        requestId = _sendRequest(req.encodeCBOR(), s_subscriptionId, s_gasLimit, s_donId);

        s_requestToSender[requestId] = msg.sender;
        s_requestToUsername[requestId] = username;

        emit VerificationRequested(requestId, msg.sender, username);
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        address user = s_requestToSender[requestId];
        string memory username = s_requestToUsername[requestId];

        if (err.length > 0) {
            emit VerificationFailed(requestId, user, username, err);
            delete s_requestToSender[requestId];
            delete s_requestToUsername[requestId];
            return;
        }

        int256 result = abi.decode(response, (int256));

        if (result == 1) {
            verifiedTwitter[user] = username;
            twitterToAddress[username] = user;
            // Clean up registration state
            delete s_verificationNonce[user];
            delete s_registeredUsername[user];
            emit VerificationFulfilled(requestId, user, username, true);
        } else {
            emit VerificationFulfilled(requestId, user, username, false);
        }

        delete s_requestToSender[requestId];
        delete s_requestToUsername[requestId];
    }

    // --- Admin ---
    function setSource(string memory source) external onlyOwner {
        s_source = source;
    }

    function setGasLimit(uint32 gasLimit) external onlyOwner {
        s_gasLimit = gasLimit;
    }

    function setSubscriptionId(uint64 subscriptionId) external onlyOwner {
        s_subscriptionId = subscriptionId;
    }

    function setEncryptedSecretsReference(bytes memory ref) external onlyOwner {
        s_encryptedSecretsReference = ref;
    }

    // --- View ---
    function isVerified(address user) external view returns (bool) {
        return bytes(verifiedTwitter[user]).length > 0;
    }

    function getRegistration(address user) external view returns (string memory username, bytes32 nonce) {
        username = s_registeredUsername[user];
        nonce = s_verificationNonce[user];
    }

    // --- Internal ---
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _bytes32ToHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }
}
