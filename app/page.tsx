// noinspection DuplicatedCode

"use client";
import React, {ChangeEvent, useEffect, useState} from "react";
import {Box, Button, FormControl, FormLabel, Input, Select, Text, VStack} from "@chakra-ui/react";
import {
    Contract as ZkSyncContract,
    Provider as ZkSyncProvider,
    utils as ZkSyncUtils,
    Web3Provider as ZkSyncBrowserProvider
} from "zksync-web3";
import {ethers} from "ethers";
import greeterContractJson from "./artifacts/Greeter.json";
import erc20ContractJson from "./artifacts/MyERC20.json";

interface TokenDetails {
    address: string;
    decimals: number;
    name: string;
    symbol: string;
}

const allowedTokens: TokenDetails[] = [
    {
        "address": "0x0000000000000000000000000000000000000000",
        "decimals": 18,
        "name": "Ether",
        "symbol": "ETH"
    },
    {
        "address": process.env.NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS ? process.env.NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS : "",
        "decimals": 18,
        "name": "ERC20 token",
        "symbol": "ERC20"
    }
];

console.log(allowedTokens);
const defaultToken = allowedTokens[1];


export default function Home() {
    const [isLoadingMessage, setIsLoadingMessage] = useState<string>("Loading...");
    const [selectedToken, setSelectedToken] = useState<TokenDetails>(defaultToken);
    const [balance, setBalance] = useState<string | null>(null);
    const [paymasterAllowance, setPaymasterAllowance] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);


    useEffect(() => {
        // noinspection JSIgnoredPromiseFromCall
        readOnChainData(selectedToken);

    }, []);

    const handleChangeTokenSelection = (event: ChangeEvent<HTMLSelectElement>) => {
        const newTokenName = event.target.value;
        const newSelectedTokenDetails: TokenDetails = allowedTokens.filter(
            (t) => t.name == newTokenName,
        )[0];
        setSelectedToken(newSelectedTokenDetails);
        console.log(newSelectedTokenDetails);
        // noinspection JSIgnoredPromiseFromCall
        readOnChainData(newSelectedTokenDetails);
    };

    const readOnChainData = async (newSelectedTokenDetails: TokenDetails) => {
        setIsLoadingMessage("Loading...");
        const serverZkStackProvider = new ZkSyncProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_URL);
        // @ts-ignore
        const userZkStackProvider = new ZkSyncBrowserProvider(window.ethereum);
        await userZkStackProvider.send("eth_requestAccounts", []);
        const userZkStackSigner = userZkStackProvider.getSigner();
        // Read balance of user
        const userAddress = await userZkStackSigner.getAddress();
        const balanceInLowerUnit = await serverZkStackProvider.getBalance(
            userAddress,
            "committed",
            newSelectedTokenDetails.address);
        const balanceInCurrency = ethers.utils.formatUnits(balanceInLowerUnit, newSelectedTokenDetails.decimals);
        console.log(balanceInCurrency);
        setBalance(balanceInCurrency);
        // Read greeter contract
        const greeterContract = new ZkSyncContract(
            process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS : "",
            greeterContractJson.abi,
            serverZkStackProvider
        );
        const message: string = await greeterContract.greet();
        console.log(message);
        setMessage(message);
        // Read paymaster allowance
        const testnetPaymaster = await serverZkStackProvider.getTestnetPaymasterAddress();
        if (newSelectedTokenDetails.name != "Ether") {
            console.log("testnetPaymaster");
            console.log(testnetPaymaster);
            if (testnetPaymaster) {
                const tokenContract = new ZkSyncContract(
                    newSelectedTokenDetails.address,
                    erc20ContractJson.abi,
                    serverZkStackProvider
                );
                const paymasterAllowanceBN = await tokenContract.allowance(
                    userAddress,
                    testnetPaymaster,
                );
                const paymasterAllowance = ethers.utils.formatUnits(paymasterAllowanceBN, newSelectedTokenDetails.decimals);
                console.log("paymasterAllowance");
                console.log(paymasterAllowance);
                setPaymasterAllowance(paymasterAllowance);
            }
        }
        setIsLoadingMessage("");
    };

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

    const Refresh = () => {
        if (!isLoadingMessage) {
            return (
                <Box>
                    <Box margin="10px">
                        <Button colorScheme="blue"
                                onClick={() => readOnChainData(selectedToken)}>Refresh</Button>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    const SelectionConfirmation = () => {
        return (
            <Text fontSize="l" color="black">
                You have selected {selectedToken.name}
            </Text>
        );

    };

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

    // TODO: Remove
    const PaymasterAllowanceDisplay = () => {
        if ((selectedToken.name != "Ether") && paymasterAllowance) {
            return (
                <Text fontSize="l" color="black">
                    The allowance of Paymaster is {paymasterAllowance} {selectedToken.name}
                </Text>
            );
        } else {
            return null;
        }
    };
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
                        <Select placeholder={selectedToken.name} onChange={handleChangeTokenSelection}>
                            {allowedTokens.map((token, index) => (
                                <option key={index} value={token.name}>{token.name}</option>
                            ))}
                        </Select>
                    </Box>
                    <SelectionConfirmation/>
                    <BalanceDisplay/>
                    <PaymasterAllowanceDisplay/>
                </Box>
            );
        } else {
            return null;
        }
    };

    const MessageDisplay = () => {
        if (message) {
            return (
                <Box>
                    <Text fontSize="l" color="black">
                        Here is the greeting message currently stored in the Greeter contract
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

    // TODO: Remove
    const handleChangeAllowanceButton = async (newInput: string | null) => {
        if (newInput) {
            const inputValue = ethers.BigNumber.from(newInput).mul(ethers.BigNumber.from("1000000000000000000"));
            const serverZkStackProvider = new ZkSyncProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_URL);
            // @ts-ignore
            const userZkStackProvider = new ZkSyncBrowserProvider(window.ethereum);
            const userZkStackSigner = userZkStackProvider.getSigner();
            const tokenContract = new ZkSyncContract(
                selectedToken.address,
                erc20ContractJson.abi,
                userZkStackSigner
            );
            // Configure overrides
            let overrides = {};
            // Execute transaction
            const testnetPaymaster = await serverZkStackProvider.getTestnetPaymasterAddress();
            const transaction = await tokenContract.approve(testnetPaymaster, inputValue, overrides);
            console.log(transaction.hash);
            setIsLoadingMessage("Waiting for transaction to be processed...");
            await transaction.wait();
            await readOnChainData(selectedToken);
        }
    };

    // TODO: Remove
    const AllowanceInput = () => {
        const [newInput, setNewInput] = useState<string | null>(null);

        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            setNewInput(event.target.value);
        };

        if (!isLoadingMessage && (selectedToken.name != "Ether")) {
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
                            <Input width="100%" value={newInput ? newInput : ""}
                                   onChange={handleInputChange}/>

                        </FormControl>
                        <Box margin="10px">
                            <Button colorScheme="blue"
                                    onClick={() => handleChangeAllowanceButton(newInput)}>Submit</Button>
                        </Box>
                    </Box>
                </Box>
            );
        } else {
            return null;
        }
    };

    const GreeterContractDisplay = () => {
        if (!isLoadingMessage) {
            return (
                <Box>
                    <Box marginTop="10px" marginBottom="10px">
                        <Text as="b" fontSize="xl" color="black">
                            Greeter contract
                        </Text>
                    </Box>
                    <MessageDisplay/>

                </Box>
            );
        } else {
            return null;
        }
    };

    const handleSubmitMessageButton = async (message: string | null) => {
        if (message) {
            const serverZkStackProvider = new ZkSyncProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_URL);
            // @ts-ignore
            const userZkStackProvider = new ZkSyncBrowserProvider(window.ethereum);
            const userZkStackSigner = userZkStackProvider.getSigner();
            const greeterContract = new ZkSyncContract(
                process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS : "",
                greeterContractJson.abi,
                userZkStackSigner
            );
            console.log("Greeter contract address");
            console.log(greeterContract.address);
            console.log(process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS);
            console.log("Message");
            console.log(message);
            // Configure overrides
            let overrides = {};
            if (selectedToken.name != "Ether") {
                console.log("Trying to send transaction via paymaster...");
                const testnetPaymaster =
                    await serverZkStackProvider.getTestnetPaymasterAddress();
                console.log("testnetPaymaster");
                console.log(testnetPaymaster);
                if (testnetPaymaster) {
                    const gasPrice = await userZkStackProvider.getGasPrice();
                    console.log("gasPrice");
                    console.log(gasPrice);
                    // estimate gasLimit via paymaster
                    const initialPaymasterInput = {
                        type: "ApprovalBased",
                        minimalAllowance: ethers.BigNumber.from("1"),
                        token: selectedToken.address,
                        innerInput: new Uint8Array(),
                    };
                    console.log("initialPaymasterInput");
                    console.log(initialPaymasterInput);

                    const paramsForFeeEstimation = ZkSyncUtils.getPaymasterParams(
                        testnetPaymaster,
                        {
                            type: "ApprovalBased",
                            minimalAllowance: ethers.BigNumber.from("1"),
                            token: selectedToken.address,
                            innerInput: new Uint8Array(),
                        }
                    );
                    console.log("paramsForFeeEstimation");
                    console.log(paramsForFeeEstimation);
                    // estimate gasLimit via paymaster
                    const gasLimit = await greeterContract.estimateGas.setGreeting({
                        message,
                        customData: {
                            gasPerPubdata: ZkSyncUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
                            paymasterParams: paramsForFeeEstimation,
                        },
                    });
                    console.log("Default gas per pubdata");
                    console.log(ZkSyncUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT);
                    console.log("gasLimit");
                    console.log(gasLimit);
                    const fee = gasPrice.mul(gasLimit.toString());
                    console.log("Estimated fee");
                    console.log(fee);
                    const newPaymasterInput = {
                        type: "ApprovalBased",
                        token: selectedToken.address,
                        minimalAllowance: fee,
                        // empty bytes as testnet paymaster does not use innerInput
                        innerInput: new Uint8Array(),
                    };
                    console.log("newPaymasterInput");
                    console.log(newPaymasterInput);
                    const paymasterParams = ZkSyncUtils.getPaymasterParams(testnetPaymaster, {
                        type: "ApprovalBased",
                        token: selectedToken.address,
                        minimalAllowance: fee,
                        // empty bytes as testnet paymaster does not use innerInput
                        innerInput: new Uint8Array(),
                    });
                    console.log("paymasterParams");
                    console.log(paymasterParams);
                    overrides = {
                        maxFeePerGas: gasPrice,
                        maxPriorityFeePerGas: BigInt(0),
                        gasLimit: gasLimit,
                        customData: {
                            gasPerPubdata: ZkSyncUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
                            paymasterParams,
                        },
                    };
                }
            }

            // Execute transaction
            console.log("Overrides");
            console.log(overrides);
            const transaction = await greeterContract.setGreeting(message, overrides);
            console.log(transaction.hash);
            setIsLoadingMessage("Waiting for transaction to be processed...");
            await transaction.wait();
            await readOnChainData(selectedToken);
        }
    };

    const GreeterContractInput = () => {
        const [newMessage, setNewMessage] = useState<string | null>(null);

        const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            setNewMessage(event.target.value);
        };

        if (!isLoadingMessage) {
            return (
                <Box marginTop="12px" width="100%">
                    <FormControl marginRight="10px">
                        <FormLabel>Enter a new message:</FormLabel>
                        <Input width="100%" value={newMessage ? newMessage : ""}
                               onChange={handleMessageInputChange}/>

                    </FormControl>
                    <Box margin="10px">
                        <Button colorScheme="blue"
                                onClick={() => handleSubmitMessageButton(newMessage)}>Submit</Button>
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
                    This is a simple dapp, which can be used to interact with the Greeter smart contract.
                </Text>
            </Box>
            <Loading/>
            <Refresh/>
            <TokenSelection/>
            <AllowanceInput/>
            <GreeterContractDisplay/>
            <GreeterContractInput/>
        </VStack>
    );
}
