const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

const rpcUrl = 'https://api.testnet.solana.com';
const mintAddress = 'So11111111111111111111111111111111111111112';
const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const connection = new Connection(rpcUrl);

async function testConnection() {
    try {
        const version = await connection.getVersion();
        console.log("Connected to Solana RPC. Version:", version);
    } catch (error) {
        console.error("Failed to connect to Solana RPC:", error);
    }
}

testConnection();

async function fetchLiquidityPools(mintAddress, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const mintPublicKey = new PublicKey(mintAddress);
            const tokenAccountsFilter = {
                commitment: 'confirmed',
                filters: [
                    {
                        dataSize: 165
                    },
                    {
                        memcmp: {
                            offset: 0,
                            bytes: mintPublicKey.toBase58()
                        }
                    }
                ]
            };
            console.log("Fetching liquidity pools...");
            const tokenAccounts = await connection.getProgramAccounts(
                new PublicKey(tokenProgramId),
                tokenAccountsFilter
            );
            console.log("Liquidity pools fetched successfully.");
            console.log("Number of liquidity pools found:", tokenAccounts.length);
            return tokenAccounts.map(account => account.pubkey.toString());
        } catch (error) {
            console.error("Error fetching liquidity pools:", error);
            if (error.response && error.response.status === 429) {
                const retryAfter = parseInt(error.response.headers.get('retry-after'), 10);
                console.warn(`Rate limit exceeded. Retrying in ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                retries++;
                console.warn(`Attempt ${retries} failed. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    throw new Error('Failed to fetch liquidity pools after multiple retries.');
}

async function main() {
    try {
        const liquidityPools = await fetchLiquidityPools(mintAddress);
        console.log("Liquidity Pool Accounts related to the USDC mint address:", liquidityPools);

        try {
            fs.writeFileSync('liquidity_pools.txt', liquidityPools.join('\n'));
            console.log("Liquidity pool account addresses written to liquidity_pools.txt");
        } catch (error) {
            console.error("Error writing to file:", error);
        }
    } catch (error) {
        console.error("Error in main function:", error);
        console.log("Please try again later or contact support if the issue persists.");
    }
}

main();