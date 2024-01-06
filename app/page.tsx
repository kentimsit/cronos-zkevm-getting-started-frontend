"use client";
import React, {ChangeEvent, useEffect, useState} from "react";
import {Box, Button, FormControl, FormLabel, Input, Select, Text, VStack} from "@chakra-ui/react";
import {
    BrowserProvider as ZkSyncBrowserProvider,
    Contract as ZkSyncContract,
    Provider as ZkSyncProvider,
    utils as ZkSyncUtils
} from "zksync-ethers";
import {ethers} from "ethers";
import greeterContractJson from "./artifacts/Greeter.json";

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
        "name": "CROK",
        "symbol": "CROK"
    }
]

console.log(allowedTokens)
const defaultToken = allowedTokens[1];


export default function Home() {
    const [selectedToken, setSelectedToken] = useState<TokenDetails>(defaultToken);
    const [balance, setBalance] = useState<string | null>(null);
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
        const serverZkStackProvider = new ZkSyncProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_URL);
        // @ts-ignore
        const userZkStackProvider = new ZkSyncBrowserProvider(window.ethereum);
        const userZkStackSigner = await userZkStackProvider.getSigner();
        // Read balance of user
        const userAddress = await userZkStackSigner.getAddress();
        const balanceInLowerUnit = await serverZkStackProvider.getBalance(
            userAddress,
            "committed",
            newSelectedTokenDetails.address);
        const balanceInCurrency = ethers.formatUnits(balanceInLowerUnit, newSelectedTokenDetails.decimals);
        console.log(balanceInCurrency);
        setBalance(balanceInCurrency)
        // Read greeter contract
        const greeterContract = new ZkSyncContract(
            process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS : "",
            greeterContractJson.abi,
            serverZkStackProvider
        )
        const message: string = await greeterContract.greet();
        console.log(message)
        setMessage(message);
    }


    function TokenSelection() {
        const SelectionConfirmation = () => {
            return (
                <Text fontSize="l" color="black">
                    You have selected {selectedToken.name}
                </Text>
            )

        }

        const BalanceDisplay = () => {
            if (balance) {
                return (
                    <Text fontSize="l" color="black">
                        Your balance is {balance} {selectedToken.name}
                    </Text>
                )
            } else {
                return (
                    <Text fontSize="l" color="black">
                        Loading balance...
                    </Text>
                )
            }
        }
        return (
            <Box>
                <Box marginTop="10px" marginBottom="10px">
                    <Text as="h2" fontSize="xl" color="black">
                        Select token to pay gas fees
                    </Text>
                </Box>
                <Box marginTop="10px" marginBottom="10px">
                    <Select placeholder='Select option' onChange={handleChangeTokenSelection}>
                        {allowedTokens.map((token, index) => (
                            <option key={index} value={token.name}>{token.name}</option>
                        ))}
                    </Select>
                </Box>
                <SelectionConfirmation/>
                <BalanceDisplay/>
            </Box>
        )
    }


    function GreeterContractDisplay() {
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
                        <Box margin="10px">
                            <Button colorScheme='blue'
                                    onClick={() => readOnChainData(selectedToken)}>Refresh</Button>
                        </Box>
                    </Box>
                )
            } else {
                return (
                    <Box>
                        <Text fontSize="l" color="black">
                            Loading greeting message from Greeter contract...
                        </Text>
                    </Box>
                )
            }
        }
        return (
            <Box>
                <Box marginTop="10px" marginBottom="10px">
                    <Text as="h2" fontSize="xl" color="black">
                        Greeter contract
                    </Text>
                </Box>
                <MessageDisplay/>

            </Box>
        )
    }

    const handleSubmitMessageButton = async (message: string | null) => {
        if (message) {
            const serverZkStackProvider = new ZkSyncProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_URL);
            // @ts-ignore
            const userZkStackProvider = new ZkSyncBrowserProvider(window.ethereum);
            const userZkStackSigner = await userZkStackProvider.getSigner();
            const greeterContract = new ZkSyncContract(
                process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS ? process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS : "",
                greeterContractJson.abi,
                userZkStackSigner
            )
            console.log("Greeter contract address")
            console.log(await greeterContract.getAddress())
            console.log(process.env.NEXT_PUBLIC_GREETER_CONTRACT_ADDRESS)
            console.log("Message")
            console.log(message)
            // Configure overrides
            let overrides = {}
            if (selectedToken.name != "Ether") {
                console.log("Trying to send transaction via paymaster...")
                const testnetPaymaster =
                    await serverZkStackProvider.getTestnetPaymasterAddress();
                console.log("testnetPaymaster")
                console.log(testnetPaymaster)
                if (testnetPaymaster) {
                    const gasPrice = await userZkStackProvider.getGasPrice();
                    console.log("gasPrice")
                    console.log(gasPrice)
                    // estimate gasLimit via paymaster
                    const initialPaymasterInput = {
                        type: "ApprovalBased",
                        minimalAllowance: BigInt(1),
                        token: selectedToken.address,
                        innerInput: new Uint8Array(),
                    }
                    console.log("initialPaymasterInput")
                    console.log(initialPaymasterInput)

                    const paramsForFeeEstimation = ZkSyncUtils.getPaymasterParams(
                        testnetPaymaster,
                        {
                            type: "ApprovalBased",
                            minimalAllowance: BigInt(1),
                            token: selectedToken.address,
                            innerInput: new Uint8Array(),
                        }
                    );
                    console.log("paramsForFeeEstimation")
                    console.log(paramsForFeeEstimation)
                    // estimate gasLimit via paymaster
                    const gasLimit = await greeterContract.setGreeting.estimateGas({
                        message,
                        customData: {
                            gasPerPubdata: ZkSyncUtils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
                            paymasterParams: paramsForFeeEstimation,
                        },
                    })
                    console.log("gasLimit")
                    console.log(gasLimit)
                    const fee = gasPrice * BigInt(gasLimit.toString());
                    console.log("Estimated fee")
                    console.log(fee)
                    const newPaymasterInput = {
                        type: "ApprovalBased",
                        token: selectedToken.address,
                        minimalAllowance: fee,
                        // empty bytes as testnet paymaster does not use innerInput
                        innerInput: new Uint8Array(),
                    }
                    console.log("newPaymasterInput")
                    console.log(newPaymasterInput)
                    const paymasterParams = ZkSyncUtils.getPaymasterParams(testnetPaymaster, {
                        type: "ApprovalBased",
                        token: selectedToken.address,
                        minimalAllowance: fee,
                        // empty bytes as testnet paymaster does not use innerInput
                        innerInput: new Uint8Array(),
                    });
                    console.log("paymasterParams")
                    console.log(paymasterParams)
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
            console.log("Overrides")
            console.log(overrides)
            const txPayload = await greeterContract.setGreeting.populateTransaction(message);
            console.log("txPayload")
            console.log(txPayload)
            // const transaction = await greeterContract.setGreeting(message, overrides);
            const transaction = await userZkStackSigner.sendTransaction({...txPayload, ...overrides});
            console.log(transaction.hash)
        }
    }

    function GreeterContractInput() {
        const [newMessage, setNewMessage] = useState<string | null>(null);

        const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            setNewMessage(event.target.value);
        };

        return (
            <Box marginTop="12px" width="100%">
                <FormControl marginRight="10px">
                    <FormLabel>Enter a new message:</FormLabel>
                    <Input width="100%" value={newMessage ? newMessage : ""}
                           onChange={handleMessageInputChange}/>

                </FormControl>
                <Box margin="10px">
                    <Button colorScheme='blue'
                            onClick={() => handleSubmitMessageButton(newMessage)}>Submit</Button>
                </Box>
            </Box>
        )
    }

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
            <TokenSelection/>
            <GreeterContractDisplay/>
            <GreeterContractInput/>
        </VStack>
    )
}
