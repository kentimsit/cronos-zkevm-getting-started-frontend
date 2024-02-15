// noinspection DuplicatedCode

"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    Contract as ZkContract,
    Provider as zkProvider,
    utils as ZkUtils,
    BrowserProvider as ZkBrowserProvider,
} from "zksync-ethers";
import { ethers } from "ethers";
import greeterContractJson from "./artifacts/Greeter.json";
import erc20ContractJson from "./artifacts/MyERC20.json";

interface TokenDetails {
    address: string;
    decimals: number;
    name: string;
    symbol: string;
}

// zkSync TEST token (for information only)
// https://sepolia.explorer.zksync.io/address/0x7E2026D8f35872923F5459BbEDDB809F6aCEfEB3#contract

const allowedTokens: TokenDetails[] = [
    {
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    {
        address: process.env.NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS
            ? process.env.NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS
            : "",
        decimals: 18,
        name: "ERC20 token",
        symbol: "ERC20",
    },
];

console.log("Allowed tokens:");
console.log(allowedTokens);
const defaultToken = allowedTokens[1];

export default function Home() {
    const [isLoadingMessage, setIsLoadingMessage] =
        useState<string>("Loading...");
    const [selectedToken, setSelectedToken] =
        useState<TokenDetails>(defaultToken);
    const [balance, setBalance] = useState<string | null>(null);
    const [paymasterAllowance, setPaymasterAllowance] = useState<string | null>(
        null
    );
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        readOnChainData(selectedToken);
    }, []);

    const handleChangeTokenSelection = (
        event: ChangeEvent<HTMLSelectElement>
    ) => {
        const newTokenName = event.target.value;
        const newSelectedTokenDetails: TokenDetails = allowedTokens.filter(
            (t) => t.name == newTokenName
        )[0];
        setSelectedToken(newSelectedTokenDetails);
        console.log("Selected token details:");
        console.log(newSelectedTokenDetails);
        readOnChainData(newSelectedTokenDetails);
    };

    /**
     * Reads on-chain data for the selected token details.
     * @param newSelectedTokenDetails The new selected token details.
     */
    const readOnChainData = async (newSelectedTokenDetails: TokenDetails) => {
        setIsLoadingMessage("Loading...");
        const serverZkStackProvider = new zkProvider(
            process.env.NEXT_PUBLIC_BLOCKCHAIN_URL
        );
        // @ts-ignore
        const userZkStackProvider = new ZkBrowserProvider(window.ethereum);
        await userZkStackProvider.send("eth_requestAccounts", []);
        const userZkStackSigner = await userZkStackProvider.getSigner();
        // Read balance of user
        const userAddress = await userZkStackSigner.getAddress();
        const balanceInLowerUnit = await serverZkStackProvider.getBalance(
            userAddress,
            "committed",
            newSelectedTokenDetails.address
        );
        const balanceInCurrency = ethers.formatUnits(
            balanceInLowerUnit,
            newSelectedTokenDetails.decimals
        );
        console.log("User balance", balanceInCurrency);
        setBalance(balanceInCurrency);
        // Read greeter contract
        const greeterContract = new ZkContract(
            process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS
                ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS
                : "",
            greeterContractJson.abi,
            serverZkStackProvider
        );
        const message: string = await greeterContract.greet();
        console.log("Message found", message);
        setMessage(message);
        // Read paymaster allowance
        const testnetPaymasterAddress =
            await serverZkStackProvider.getTestnetPaymasterAddress();
        if (newSelectedTokenDetails.name != "Ether") {
            console.log("testnetPaymasterAddress:");
            console.log(testnetPaymasterAddress);
            if (testnetPaymasterAddress) {
                const tokenContract = new ZkContract(
                    newSelectedTokenDetails.address,
                    erc20ContractJson.abi,
                    serverZkStackProvider
                );
                const paymasterAllowanceBN = await tokenContract.allowance(
                    userAddress,
                    testnetPaymasterAddress
                );
                const paymasterAllowance = ethers.formatUnits(
                    paymasterAllowanceBN,
                    newSelectedTokenDetails.decimals
                );
                console.log("paymasterAllowance:", paymasterAllowance);
                setPaymasterAllowance(paymasterAllowance);
            }
        }
        setIsLoadingMessage("");
    };

    /**
     * Renders a loading message if isLoadingMessage is provided.
     * @returns JSX.Element | null
     */
    const Loading = () => {
        if (isLoadingMessage) {
            return (
                <Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Text as="h2" fontSize="xl" color="black">
                            {isLoadingMessage}
                        </Text>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    /**
     * Renders a Refresh button that triggers the `readOnChainData` function when clicked.
     * The button is only rendered if `isLoadingMessage` is false.
     *
     * @returns The Refresh button component.
     */
    const Refresh = () => {
        if (!isLoadingMessage) {
            return (
                <Box>
                    <Box margin="10px">
                        <Button
                            colorScheme="blue"
                            onClick={() => readOnChainData(selectedToken)}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    /**
     * Renders a confirmation message displaying the selected token name.
     * @returns JSX.Element
     */
    const SelectionConfirmation = () => {
        return (
            <Text fontSize="l" color="black">
                You have selected {selectedToken.name}
            </Text>
        );
    };

    /**
     * Renders the balance display component.
     *
     * @returns The JSX element representing the balance display.
     */
    const BalanceDisplay = () => {
        if (balance) {
            return (
                <Text fontSize="l" color="black">
                    Your balance is {balance} {selectedToken.name}
                </Text>
            );
        } else {
            return (
                <Text fontSize="l" color="black">
                    Loading balance...
                </Text>
            );
        }
    };

    // TODO: Check if this is really needed
    /**
     * Renders the display of Paymaster allowance.
     *
     * @returns The JSX element representing the display of Paymaster allowance.
     */
    const PaymasterAllowanceDisplay = () => {
        if (selectedToken.name != "Ether" && paymasterAllowance) {
            return (
                <Text fontSize="l" color="black">
                    The allowance of Paymaster is {paymasterAllowance}{" "}
                    {selectedToken.name}
                </Text>
            );
        } else {
            return null;
        }
    };

    /**
     * Renders the token selection component.
     * If isLoadingMessage is false, it renders the token selection UI with a dropdown to select a token.
     * Otherwise, it returns null.
     *
     * @returns The token selection component.
     */
    const TokenSelection = () => {
        if (!isLoadingMessage) {
            return (
                <Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Text as="b" fontSize="xl" color="black">
                            Select token to pay gas fees
                        </Text>
                    </Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Select
                            placeholder={selectedToken.name}
                            onChange={handleChangeTokenSelection}
                        >
                            {allowedTokens.map((token, index) => (
                                <option key={index} value={token.name}>
                                    {token.name}
                                </option>
                            ))}
                        </Select>
                    </Box>
                    <SelectionConfirmation />
                    <BalanceDisplay />
                    <PaymasterAllowanceDisplay />
                </Box>
            );
        } else {
            return null;
        }
    };

    /**
     * Renders the message display component.
     * If a message is provided, it displays the greeting message stored in the Greeter contract.
     * If no message is provided, it displays a loading message.
     */
    const MessageDisplay = () => {
        if (message) {
            return (
                <Box>
                    <Text fontSize="l" color="black">
                        Here is the greeting message currently stored in the
                        Greeter contract
                    </Text>
                    <Text as="b" fontSize="l" color="black">
                        {message}
                    </Text>
                </Box>
            );
        } else {
            return (
                <Box>
                    <Text fontSize="l" color="black">
                        Loading greeting message from Greeter contract...
                    </Text>
                </Box>
            );
        }
    };

    // TODO: Check if this is really needed
    /**
     * Handles the change of the Paymaster allowance.
     *
     * @param newInput The new input value.
     */
    const handleChangeAllowanceButton = async (newInput: string | null) => {
        if (newInput) {
            const inputValue = BigInt(newInput) * BigInt("1000000000000000000");
            const serverZkStackProvider = new zkProvider(
                process.env.NEXT_PUBLIC_BLOCKCHAIN_URL
            );
            // @ts-ignore
            const userZkStackProvider = new ZkBrowserProvider(window.ethereum);
            const userZkStackSigner = await userZkStackProvider.getSigner();
            const tokenContract = new ZkContract(
                selectedToken.address,
                erc20ContractJson.abi,
                userZkStackSigner
            );
            // Configure overrides
            let overrides = {};
            // Execute transaction
            const testnetPaymasterAddress =
                await serverZkStackProvider.getTestnetPaymasterAddress();
            const transaction = await tokenContract.approve(
                testnetPaymasterAddress,
                inputValue,
                overrides
            );
            console.log("Transaction hash:", transaction.hash);
            setIsLoadingMessage("Waiting for transaction to be processed...");
            await transaction.wait();
            await readOnChainData(selectedToken);
        }
    };

    // TODO: Check if this is really needed
    /**
     * Renders the Paymaster allowance input component.
     *
     * @returns The JSX element representing the Paymaster allowance input.
     */
    const AllowanceInput = () => {
        const [newInput, setNewInput] = useState<string | null>(null);

        const handleInputChange = (
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            setNewInput(event.target.value);
        };

        if (!isLoadingMessage && selectedToken.name != "Ether") {
            return (
                <Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Text as="b" fontSize="xl" color="black">
                            Change Paymaster allowance
                        </Text>
                    </Box>
                    <Box marginTop="12px" width="100%">
                        <FormControl marginRight="10px">
                            <FormLabel>Enter a new value:</FormLabel>
                            <Input
                                width="100%"
                                value={newInput ? newInput : ""}
                                onChange={handleInputChange}
                            />
                        </FormControl>
                        <Box margin="10px">
                            <Button
                                colorScheme="blue"
                                onClick={() =>
                                    handleChangeAllowanceButton(newInput)
                                }
                            >
                                Submit
                            </Button>
                        </Box>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    /**
     * Renders the Greeter contract display component.
     * If isLoadingMessage is false, it renders the greeting message stored in the Greeter contract.
     * Otherwise, it returns null.
     *
     * @returns The Greeter contract display component.
     */
    const GreeterContractDisplay = () => {
        if (!isLoadingMessage) {
            return (
                <Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Text as="b" fontSize="xl" color="black">
                            Greeter contract
                        </Text>
                    </Box>
                    <MessageDisplay />
                </Box>
            );
        } else {
            return null;
        }
    };

    /**
     * MAIN FUNCTION OF THIS DEMO
     * Handles the submission of a new message to the Greeter contract.
     *
     * @param message The new message to be submitted.
     */
    const handleSubmitMessageButton = async (message: string | null) => {
        if (message) {
            const serverZkStackProvider = new zkProvider(
                process.env.NEXT_PUBLIC_BLOCKCHAIN_URL
            );
            // const ethProvider = ethers.getDefaultProvider("sepolia");
            // @ts-ignore
            const userZkStackProvider = new ZkBrowserProvider(window.ethereum);
            const userZkStackSigner = await userZkStackProvider.getSigner();
            console.log("User address:", await userZkStackSigner.getAddress());
            const greeterContract = new ZkContract(
                process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS
                    ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS
                    : "",
                greeterContractJson.abi,
                userZkStackSigner
            );
            console.log("Greeter contract address");
            console.log(await greeterContract.getAddress());
            console.log(process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS);
            console.log("Message");
            console.log(message);
            // If the user is paying for gas in Ether
            // This works
            if (selectedToken.name == "Ether") {
                // Execute transaction
                const transaction = await greeterContract.setGreeting(message);
                console.log("Transaction hash:", transaction.hash);
                setIsLoadingMessage(
                    "Waiting for transaction to be processed..."
                );
                await transaction.wait();
                await readOnChainData(selectedToken);
            }
            // If the user is paying for gas in ERC20 token, via the Paymaster
            // This is based on : https://docs.zksync.io/build/tutorials/dapp-development/frontend-quickstart-paymaster.html#pay-fees-with-erc20-tokens
            // This does not work currently, it fails at
            // const transaction = await greeterContract.setGreeting(message, overrides);
            if (selectedToken.name != "Ether") {
                console.log("Trying to send transaction via paymaster...");
                const testnetPaymasterAddress =
                    await serverZkStackProvider.getTestnetPaymasterAddress();
                console.log("testnetPaymasterAddress:");
                console.log(testnetPaymasterAddress);
                if (testnetPaymasterAddress) {
                    const gasPrice = await serverZkStackProvider.getGasPrice();
                    console.log("gasPrice:");
                    console.log(gasPrice);
                    // Estimate gasLimit via paymaster
                    const paramsForFeeEstimation = ZkUtils.getPaymasterParams(
                        testnetPaymasterAddress,
                        {
                            type: "ApprovalBased",
                            minimalAllowance: BigInt("1"),
                            token: selectedToken.address,
                            innerInput: new Uint8Array(),
                        }
                    );
                    console.log("paramsForFeeEstimation:");
                    console.log(paramsForFeeEstimation);
                    console.log({
                        type: "ApprovalBased",
                        minimalAllowance: BigInt("1"),
                        token: selectedToken.address,
                        innerInput: new Uint8Array(),
                    });
                    const gasLimit =
                        await greeterContract.setGreeting.estimateGas({
                            message,
                            customData: {
                                gasPerPubdata:
                                    ZkUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
                                paymasterParams: paramsForFeeEstimation,
                            },
                        });
                    console.log("Default gas per pubdata:");
                    console.log(ZkUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT);
                    console.log("gasLimit:");
                    console.log(gasLimit);
                    const fee = gasPrice * BigInt(gasLimit);
                    console.log("Estimated fee:");
                    console.log(fee);
                    // Create transaction
                    const paymasterParams = ZkUtils.getPaymasterParams(
                        testnetPaymasterAddress,
                        {
                            type: "ApprovalBased",
                            token: selectedToken.address,
                            minimalAllowance: fee,
                            // empty bytes as testnet paymaster does not use innerInput
                            innerInput: new Uint8Array(),
                        }
                    );
                    console.log("paymasterParams:");
                    console.log(paymasterParams);
                    console.log({
                        type: "ApprovalBased",
                        token: selectedToken.address,
                        minimalAllowance: fee,
                        innerInput: new Uint8Array(),
                    });
                    const overrides = {
                        maxFeePerGas: gasPrice,
                        maxPriorityFeePerGas: BigInt("1"),
                        gasLimit: gasLimit,
                        customData: {
                            gasPerPubdata:
                                ZkUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
                            paymasterParams,
                        },
                    };
                    // Execute transaction
                    console.log("Overrides:");
                    console.log(overrides);
                    // ERROR IS HERE !!!
                    /*
                     * This fails at the following line of the sendTransaction function:
                     * const from = await ethers_1.ethers.resolveAddress(transaction.from);
                     */
                    const transaction = await greeterContract.setGreeting(
                        message,
                        overrides
                    );
                    console.log("Transaction hash:", transaction.hash);
                    setIsLoadingMessage(
                        "Waiting for transaction to be processed..."
                    );
                    await transaction.wait();
                    await readOnChainData(selectedToken);
                }
            }
        }
    };

    /**
     * Renders a component for entering a new message and submitting it.
     * @returns The GreeterContractInput component.
     */
    const GreeterContractInput = () => {
        const [newMessage, setNewMessage] = useState<string | null>(null);

        const handleMessageInputChange = (
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            setNewMessage(event.target.value);
        };

        if (!isLoadingMessage) {
            return (
                <Box marginTop="12px" width="100%">
                    <FormControl marginRight="10px">
                        <FormLabel>Enter a new message:</FormLabel>
                        <Input
                            width="100%"
                            value={newMessage ? newMessage : ""}
                            onChange={handleMessageInputChange}
                        />
                    </FormControl>
                    <Box margin="10px">
                        <Button
                            colorScheme="blue"
                            onClick={() =>
                                handleSubmitMessageButton(newMessage)
                            }
                        >
                            Submit
                        </Button>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    return (
        <VStack m={10} gap={5} alignItems="flex-start">
            <Box>
                <Text as="h1" fontSize="3xl" color="black">
                    Cronos zkEVM Greeter Front End
                </Text>
                <Text fontSize="l" color="black">
                    This is a simple dapp, which can be used to interact with
                    the Greeter smart contract.
                </Text>
                <Text fontSize="l" color="black">
                    Unlock MetaMask, and connect to the zkStack Sepolia Testnet.
                </Text>
            </Box>
            <Loading />
            <Refresh />
            <TokenSelection />
            <AllowanceInput />
            <GreeterContractDisplay />
            <GreeterContractInput />
        </VStack>
    );
}
