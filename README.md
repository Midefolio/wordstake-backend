# $Gor Testnet Integration - Word Stake Game

## Overview

This document outlines the integration of $Gor testnet cryptocurrency into our multiplayer word stake game. The system creates unique wallet addresses for each game, allows players to stake equal amounts of $Gor tokens, and automatically transfers the total stake to the winner upon game completion.

## Architecture

### Game Flow
1. **Game Creation**: When players create a multiplayer stake game, a unique Gorbagana wallet address is generated
2. **Staking Phase**: Each player transfers an equal amount of $Gor to the game's wallet address
3. **Game Completion**: After determining the winner, the total $Gor balance is transferred to the winner's address

## Implementation Details

### 1. Unique Wallet Address Generation

When players initiate a multiplayer stake game, the system generates a unique Gorbagana testnet wallet address for that specific game instance.

```javascript
// Game Schema - createGame static method
gameSchema.statics.createGame = async function (gameData: any) {
    const session = await startSession();
    session.startTransaction();
    try {
        const sanitizedData = Object.entries(gameData).reduce((acc: any, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value;
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        const letters  = generateRandomLetters(); // generate letters
        const { host, gameType, title, duration, reward, currency, stake, players, gameCode } = sanitizedData;
        
        // Verify host exists
        const existingHost = await UserAuth.findOne({ pubkey: host }).session(session);
        if (!existingHost) errorMessage(404, "Host not found");

        // Check if host already has a pending game
        const existingPendingGame = await this.findOne({ 
            host: host, 
            gameStatus: "pending" 
        }).session(session);
        if (existingPendingGame) {
            errorMessage(400, "You already have a pending game. Please complete or cancel your current game before creating a new one.");
        }

        // Check if gameCode already exists
        const existingGame = await this.findOne({ gameCode }).session(session);
        if (existingGame) errorMessage(400, "Game code already exists. Please use a unique game code.");

        let gameDetails = { ...sanitizedData, letters };

        // Create wallet only if gameType is not "solo play"
        if (gameType.toLowerCase() !== "solo play") {
            try {
                // Create unique Gorbagana wallet for this game
                const walletData = await createGorbaganaWallet();
                
                if (!walletData || !walletData.pubKey || !walletData.privateKey) {
                    throw new Error("Failed to create wallet - invalid wallet data");
                }

                gameDetails.address = {
                    pubKey: walletData.pubKey,
                    privateKey: walletData.privateKey
                };
            } catch (walletError: any) {
                errorMessage(500, `Failed to create game wallet: ${walletError.message}`);
            }
        }

        const newGame = await this.create([gameDetails], { session });
        
        const sanitizedGame = Array.isArray(newGame)
            ? newGame.map(game => {
                const gameObj = game.toObject ? game.toObject() : game;
                delete gameObj.letters;
                // Remove private key from response for security
                if (gameObj.address && gameObj.address.privateKey) {
                    delete gameObj.address.privateKey;
                }
                return gameObj;
            })
            : newGame;

        await session.commitTransaction();
        session.endSession();

        return {
            message: "Game created successfully",
            data: sanitizedGame
        };
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            errorMessage(400, `Validation error: ${messages.join(', ')}`);
        }
        throw error;
    }
};

// Gorbagana Wallet Helper Functions
const GORBAGANA_RPC_URL = 'https://rpc.gorbagana.wtf';
const GORBAGANA_NETWORK_NAME = 'Gorbagana Testnet';

/**
 * Creates a new Gorbagana Testnet wallet
 * @returns Object containing public key, private key, and network info
 */
export const createGorbaganaWallet = async (): Promise<{
    pubKey: string;
    privateKey: string;
}> => {
    try {
        // Create connection to Gorbagana testnet
        const connection = new Connection(GORBAGANA_RPC_URL, 'confirmed');
        
        // Generate a new keypair for Gorbagana (Solana-based)
        const keypair = Keypair.generate();
        
        // Get the public key as a base58 string
        const pubKey = keypair.publicKey.toBase58();
        
        // Get the private key as a base58 string
        const privateKey = bs58.encode(keypair.secretKey);
        
        // Verify connection to Gorbagana testnet
        try {
            const version = await connection.getVersion();
            console.log(`Connected to ${GORBAGANA_NETWORK_NAME}:`, version);
        } catch (connectionError) {
            console.warn('Could not verify connection to Gorbagana testnet:', connectionError);
        }        
        return {
            pubKey,
            privateKey,
        };
    } catch (error: any) {
        console.error(`Error creating ${GORBAGANA_NETWORK_NAME} wallet:`, error);
        throw new Error(`Failed to create ${GORBAGANA_NETWORK_NAME} wallet: ${error.message}`);
    }
};
```

**Key Features:**
- Each multiplayer game gets a unique Gorbagana wallet address
- Solana-based keypair generation for Gorbagana testnet compatibility
- Secure private key storage in database (removed from API responses)
- Transaction-safe game creation with proper error handling
- Solo play games skip wallet creation for efficiency

### 2. Player Staking (Frontend Transfer)

Players transfer their stake amount from their personal wallets to the game's unique address through the frontend interface using the `TransferGor` component.

```javascript
export function TransferGor({initialAmount, address, from, onTransferSuccess }: any) {
  const { connected, publicKey, sendTransaction, gorConnection, fetchBalance } = useWalletApp();
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<any>();
  const [sending, setSending] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (address) setRecipient(address);
    if (initialAmount) setAmount(initialAmount);
  }, [address, initialAmount]);

  // Clear messages when inputs change
  useEffect(() => {
    if (error) setError('');
    if (success) setSuccess('');
  }, [recipient, amount]);

  const handleTransfer = async () => {
    if (!publicKey || !recipient || !amount || !gorConnection) return;

    setError('');
    setSuccess('');
    setSending(true);
    
    try {
      // Check wallet balance first
      const balance = await gorConnection.getBalance(publicKey);
      const lamportsToSend = parseFloat(amount) * LAMPORTS_PER_SOL;
      
      // Estimate transaction fee (typical Solana transaction fee is ~5000 lamports)
      const estimatedFee = 5000;
      const totalRequired = lamportsToSend + estimatedFee;
      
      if (balance < totalRequired) {
        const balanceInGOR = balance / LAMPORTS_PER_SOL;
        const requiredInGOR = totalRequired / LAMPORTS_PER_SOL;
        
        setError(`Insufficient balance! Available: ${balanceInGOR.toFixed(6)} GOR, Required: ${requiredInGOR.toFixed(6)} GOR (including fees)`);
        return;
      }

      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipient);
      } catch (error) {
        setError('Invalid recipient address format');
        return;
      }
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: lamportsToSend,
        })
      );

      // Get recent blockhash from Gorbagana network
      const { blockhash } = await gorConnection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      const signature = await sendTransaction(transaction, gorConnection);

      // Refresh balance if function exists
      if (fetchBalance) {
        await fetchBalance();
      }
 
      if (onTransferSuccess) {
        await onTransferSuccess();
        setRecipient('');
        setAmount('');
        setSuccess('');
        return
      }
      
      // Wait for confirmation
      setTimeout(() => {
        setRecipient('');
        setAmount('');
        setSuccess('');
        setShowTransfer(false);
      }, 3000);

    } catch (error: any) {
      console.error('Transfer failed:', error);
      
      // Better error handling
      if (error.message?.includes('insufficient funds')) {
        setError('Insufficient funds for this transaction');
      } else if (error.message?.includes('Invalid public key')) {
        setError('Invalid recipient address');
      } else if (error.message?.includes('blockhash not found')) {
        setError('Network error. Please try again');
      } else if (error.message?.includes('User rejected')) {
        setError('Transaction was rejected');
      } else {
        setError(error.message || 'Transaction failed. Please try again');
      }
    } finally {
      setSending(false);
    }
  };

  if (!connected) return null;

  return (
    <>
      {from == 'join'? <>
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTransfer(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Users className="w-5 h-5" />
            Join Game
          </motion.button>
        </div>
      </> : <><button
        onClick={() => setShowTransfer(true)}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <Send className="w-4 h-4" />
        Send from Wallet
      </button></>}

      <AnimatePresence>
        {showTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowTransfer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Transfer GOR</h3>
                <button
                  onClick={() => setShowTransfer(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter recipient's wallet address"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    disabled={sending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (GOR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    disabled={sending}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowTransfer(false);
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={sending || !recipient || !amount || !!success}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Sending...' : success ? 'Sent!' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**Key Features:**
- **Smart Balance Validation**: Checks player's $Gor balance including transaction fees before allowing transfer
- **Pre-populated Values**: Automatically fills recipient address and stake amount from game data
- **Comprehensive Error Handling**: Handles insufficient funds, invalid addresses, network errors, and user rejections
- **Real-time UI Feedback**: Loading states, success messages, and error notifications
- **Wallet Integration**: Uses `useWalletApp()` hook for seamless wallet connectivity
- **Transaction Confirmation**: Waits for blockchain confirmation and updates wallet balance
- **Responsive Design**: Modal-based interface with smooth animations and mobile-friendly layout
- **Callback Support**: `onTransferSuccess` callback for post-transfer actions (like updating game state)

### 3. Winner Payout System

After game completion and winner determination, the system automatically transfers the total accumulated $Gor from the game address to the winner's wallet.

```javascript
// Placeholder for winner payout code
 import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const GORBAGANA_RPC_URL = 'https://rpc.gorbagana.wtf';

/**
 * Transfers all $Gor from game wallet to winner's address
 * @param gameId - The ID of the completed game
 * @param winnerAddress - The winner's wallet address
 * @param gameWalletPrivateKey - The private key of the game wallet (from database)
 * @returns Object containing transaction signature and transfer amount
 */
export const transferGorToWinner = async (
    gameId: string,
    winnerAddress: string,
    gameWalletPrivateKey: string
): Promise<{
    signature: string;
    transferAmount: number;
    transferAmountInGor: number;
    transactionFee: number;
}> => {
    try {
        // Create connection to Gorbagana testnet
        const connection = new Connection(GORBAGANA_RPC_URL, 'confirmed');
        
        // Validate winner address
        let winnerPubkey: PublicKey;
        try {
            winnerPubkey = new PublicKey(winnerAddress);
        } catch (error) {
            throw new Error('Invalid winner address format');
        }
        
        // Create keypair from private key
        let gameWalletKeypair: Keypair;
        try {
            const privateKeyBytes = bs58.decode(gameWalletPrivateKey);
            gameWalletKeypair = Keypair.fromSecretKey(privateKeyBytes);
        } catch (error) {
            throw new Error('Invalid game wallet private key format');
        }
        
        // Get game wallet balance
        const gameWalletBalance = await connection.getBalance(gameWalletKeypair.publicKey);
        
        if (gameWalletBalance === 0) {
            throw new Error('Game wallet has no balance to transfer');
        }
        
        // Estimate transaction fee (typical Solana transaction fee)
        const estimatedFee = 5000; // 5000 lamports
        
        if (gameWalletBalance <= estimatedFee) {
            throw new Error('Insufficient balance to cover transaction fees');
        }
        
        // Calculate transfer amount (total balance minus transaction fee)
        const transferAmount = gameWalletBalance - estimatedFee;
        const transferAmountInGor = transferAmount / LAMPORTS_PER_SOL;
        
        console.log(`Transferring ${transferAmountInGor} GOR to winner: ${winnerAddress}`);
        
        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: gameWalletKeypair.publicKey,
                toPubkey: winnerPubkey,
                lamports: transferAmount,
            })
        );
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = gameWalletKeypair.publicKey;
        
        // Sign and send transaction
        transaction.sign(gameWalletKeypair);
        
        const signature = await connection.sendTransaction(transaction, [gameWalletKeypair]);
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        console.log(`Successfully transferred ${transferAmountInGor} GOR to winner. Transaction: ${signature}`);
        
        return {
            signature,
            transferAmount,
            transferAmountInGor,
            transactionFee: estimatedFee
        };
        
    } catch (error: any) {
        console.error('Error transferring GOR to winner:', error);
        throw new Error(`Failed to transfer GOR to winner: ${error.message}`);
    }
};

/**
 * Complete game payout process - determines winner and transfers funds
 * @param gameId - The ID of the completed game
 * @param winnerId - The ID of the winning player
 * @returns Object containing payout details and updated game status
 */
export const completeGamePayout = async (gameId: string, winnerId: string) => {
    const session = await startSession();
    session.startTransaction();
    
    try {
        // Find the game
        const game = await Game.findById(gameId).session(session);
        if (!game) {
            throw new Error('Game not found');
        }
        
        // Check if game is completed
        if (game.gameStatus !== 'completed') {
            throw new Error('Game is not completed yet');
        }
        
        // Check if payout already processed
        if (game.payoutProcessed) {
            throw new Error('Payout already processed for this game');
        }
        
        // Find the winner
        const winner = await UserAuth.findById(winnerId).session(session);
        if (!winner) {
            throw new Error('Winner not found');
        }
        
        // Validate that the winner participated in the game
        const winnerParticipated = game.players.some(
            (player: any) => player.userId?.toString() === winnerId
        );
        
        if (!winnerParticipated) {
            throw new Error('Winner did not participate in this game');
        }
        
        // Check if game has wallet address and private key
        if (!game.address || !game.address.privateKey) {
            throw new Error('Game wallet information not found');
        }
        
        // Transfer GOR to winner
        const payoutResult = await transferGorToWinner(
            gameId,
            winner.pubkey, // Winner's wallet address
            game.address.privateKey
        );
        
        // Update game with payout information
        const updatedGame = await Game.findByIdAndUpdate(
            gameId,
            {
                $set: {
                    payoutProcessed: true,
                    payoutDetails: {
                        winnerId: winnerId,
                        winnerAddress: winner.pubkey,
                        transactionSignature: payoutResult.signature,
                        transferAmount: payoutResult.transferAmount,
                        transferAmountInGor: payoutResult.transferAmountInGor,
                        transactionFee: payoutResult.transactionFee,
                        payoutTimestamp: new Date()
                    }
                }
            },
            { new: true, session }
        );
        
        await session.commitTransaction();
        session.endSession();
        
        return {
            message: 'Payout completed successfully',
            game: updatedGame,
            payout: payoutResult
        };
        
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error completing game payout:', error);
        throw new Error(`Failed to complete game payout: ${error.message}`);
    }
};

/**
 * Get game wallet balance
 * @param gameId - The ID of the game
 * @returns Balance in lamports and GOR
 */
export const getGameWalletBalance = async (gameId: string): Promise<{
    balanceInLamports: number;
    balanceInGor: number;
}> => {
    try {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        
        if (!game.address || !game.address.pubKey) {
            throw new Error('Game wallet address not found');
        }
        
        const connection = new Connection(GORBAGANA_RPC_URL, 'confirmed');
        const publicKey = new PublicKey(game.address.pubKey);
        
        const balanceInLamports = await connection.getBalance(publicKey);
        const balanceInGor = balanceInLamports / LAMPORTS_PER_SOL;
        
        return {
            balanceInLamports,
            balanceInGor
        };
        
    } catch (error: any) {
        console.error('Error getting game wallet balance:', error);
        throw new Error(`Failed to get game wallet balance: ${error.message}`);
    }
};

/**
 * Batch process payouts for multiple completed games
 * @param gameIds - Array of game IDs to process
 * @returns Array of payout results
 */
export const batchProcessPayouts = async (gameIds: string[]) => {
    const results = [];
    
    for (const gameId of gameIds) {
        try {
            // Find game and determine winner
            const game = await Game.findById(gameId);
            if (!game) {
                results.push({
                    gameId,
                    success: false,
                    error: 'Game not found'
                });
                continue;
            }
            
            // Determine winner based on your game logic
            // This is a placeholder - implement your winner determination logic
            const winnerId = determineGameWinner(game);
            
            if (!winnerId) {
                results.push({
                    gameId,
                    success: false,
                    error: 'Could not determine winner'
                });
                continue;
            }
            
            // Process payout
            const payoutResult = await completeGamePayout(gameId, winnerId);
            
            results.push({
                gameId,
                success: true,
                payout: payoutResult
            });
            
        } catch (error: any) {
            results.push({
                gameId,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};

/**
 * Helper function to determine game winner
 * This is a placeholder - implement your actual winner determination logic
 * @param game - The game object
 * @returns Winner's user ID
 */
const determineGameWinner = (game: any): string | null => {
    // Implement your winner determination logic here
    // This could be based on:
    // - Highest score
    // - Best word combinations
    // - Game-specific rules
    // - etc.
    
    // Example implementation:
    if (game.players && game.players.length > 0) {
        // Find player with highest score
        const winner = game.players.reduce((prev: any, current: any) => {
            return (prev.score > current.score) ? prev : current;
        });
        
        return winner.userId?.toString() || null;
    }
    
    return null;
};

/**
 * Validate payout eligibility
 * @param gameId - The ID of the game
 * @returns Object indicating if payout is eligible and any issues
 */
export const validatePayoutEligibility = async (gameId: string): Promise<{
    eligible: boolean;
    issues: string[];
    gameBalance?: number;
}> => {
    const issues: string[] = [];
    
    try {
        const game = await Game.findById(gameId);
        if (!game) {
            issues.push('Game not found');
            return { eligible: false, issues };
        }
        
        if (game.gameStatus !== 'completed') {
            issues.push('Game is not completed');
        }
        
        if (game.payoutProcessed) {
            issues.push('Payout already processed');
        }
        
        if (!game.address || !game.address.privateKey) {
            issues.push('Game wallet information missing');
        }
        
        // Check wallet balance
        let gameBalance = 0;
        if (game.address && game.address.pubKey) {
            try {
                const balanceInfo = await getGameWalletBalance(gameId);
                gameBalance = balanceInfo.balanceInGor;
                
                if (gameBalance === 0) {
                    issues.push('Game wallet has no balance');
                }
            } catch (error) {
                issues.push('Could not check game wallet balance');
            }
        }
        
        return {
            eligible: issues.length === 0,
            issues,
            gameBalance
        };
        
    } catch (error: any) {
        issues.push(`Validation error: ${error.message}`);
        return { eligible: false, issues };
    }
};
```

**Key Features:**
- Automatic payout to verified winner
- Complete balance transfer (minus transaction fees)
- Transaction confirmation and logging
- Game completion status updates

## Additional Helper Functions

### Wallet Utility Functions

```javascript
/**
 * Helper function to get Gorbagana testnet connection
 * @returns Connection object for Gorbagana testnet
 */
export const getGorbaganaConnection = (): Connection => {
    return new Connection(GORBAGANA_RPC_URL, 'confirmed');
};

/**
 * Helper function to validate if an address is valid for Gorbagana
 * @param address - The address to validate
 * @returns boolean indicating if the address is valid
 */
export const isValidGorbaganaAddress = (address: string): boolean => {
    try {
        // Since Gorbagana is Solana-based, we can use Solana's validation
        const publicKey = new (require('@solana/web3.js').PublicKey)(address);
        return publicKey.toBase58() === address;
    } catch {
        return false;
    }
};

/**
 * Get wallet balance on Gorbagana testnet
 * @param publicKey - The public key to check balance for
 * @returns Promise<number> - Balance in lamports
 */
export const getGorbaganaBalance = async (publicKey: string): Promise<number> => {
    try {
        const connection = getGorbaganaConnection();
        const pubKey = new (require('@solana/web3.js').PublicKey)(publicKey);
        const balance = await connection.getBalance(pubKey);
        return balance;
    } catch (error: any) {
        console.error('Error getting Gorbagana balance:', error);
        throw new Error(`Failed to get balance: ${error.message}`);
    }
};
```

## Technical Requirements

### Frontend Dependencies
- `@solana/web3.js` - Core Solana blockchain functionality
- `framer-motion` - Animation library for UI transitions
- `react` - Frontend framework with hooks
- `lucide-react` - Icon library for UI elements

### Component Usage
```javascript
// Basic usage for game joining
<TransferGor 
  initialAmount={gameStakeAmount}
  address={gameWalletAddress}
  from="join"
  onTransferSuccess={handleJoinGameSuccess}
/>

// General wallet transfer
<TransferGor 
  onTransferSuccess={handleTransferComplete}
/>
```

### Wallet Integration
The component integrates with a custom `useWalletApp()` hook that provides:
- `connected` - Boolean wallet connection status
- `publicKey` - User's wallet public key
- `sendTransaction` - Function to send transactions
- `gorConnection` - Gorbagana network connection
- `fetchBalance` - Function to refresh wallet balance

### Network Configuration
- **RPC URL**: `https://rpc.gorbagana.wtf`
- **Network**: Gorbagana Testnet (Solana-based)
- **Connection Type**: Confirmed transactions
- **Key Format**: Base58 encoded keypairs

### Security Considerations
- Game wallet private keys are securely stored and managed
- Transaction validation to prevent double-spending
- Winner verification before payout execution
- Proper error handling for failed transactions

## Testing

### Testnet Configuration
- **Network**: Gorbagana Testnet
- **Currency**: $Gor (testnet tokens)
- **Environment**: Testing environment with testnet tokens

### Test Scenarios
1. **Wallet Creation**: Verify unique addresses are generated for each game
2. **Staking Process**: Test equal stake transfers from multiple players
3. **Winner Payout**: Confirm total balance transfer to winner
4. **Edge Cases**: Handle network failures, insufficient balances, etc.

## Deployment Notes

### Environment Variables
```env
GORBAGANA_RPC_URL=https://rpc.gorbagana.wtf
GOR_TOKEN_CONTRACT_ADDRESS=your_token_contract_address
GAME_WALLET_ENCRYPTION_KEY=your_encryption_key
MONGODB_URI=your_mongodb_connection_string
```

### Database Schema
The game documents include an `address` field structure:
```javascript
{
  address: {
    pubKey: string,    // Public key for receiving $Gor transfers
    privateKey: string // Private key for sending payouts (encrypted in production)
  }
}
```

### Configuration
- Ensure proper network configuration for Gorbagana testnet
- Set up appropriate gas limits and transaction fees
- Configure wallet creation and management services

## Error Handling

The system includes comprehensive error handling for:
- Network connectivity issues
- Insufficient $Gor balances
- Transaction failures
- Wallet creation errors
- Winner verification failures

## Future Enhancements

- Integration with mainnet $Gor tokens
- Multi-token support
- Advanced staking mechanisms
- Tournament-style multi-game payouts
- Integration with additional wallet providers

## Support

For technical support or questions regarding the $Gor testnet integration, please refer to:
- Gorbagana testnet documentation
- $Gor token contract specifications
- Game development team contacts

---

**Note**: This integration is currently running on testnet. Ensure all testing is completed before considering mainnet deployment.