/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import env from '../config/config.ValidateEnv';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import NodeCache from 'node-cache';
import validator from 'validator';
import PasswordValidator from 'password-validator';
import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';

const cache = new NodeCache({ stdTTL: 600 });  // expires in 10mins

const generateCode =( key:string ): string => {
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  cache.set(key, code, 600); 
  return code;
} 

const verifyCode = (key:string, inputCode:string): boolean  => {
  const storedCode =  cache.get(key);
  if (storedCode === inputCode) {
    cache.del(key);
    return true;
  }
  return false;
};

const mailHandler = async (mailTitle:string, emailBody:string, userMail:any, subtitle:string): Promise< any > => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.GMAIL_USERNAME,
        pass: env.GMAIL_PASSWORD,
      },
      tls: {
       rejectUnauthorized: false  // Ignore SSL certificate validation errors
      }
    });

  const mailOptions = {
    from: ` ${subtitle}<` + env.GMAIL_USERNAME + '>',
    to: userMail,
    subject: mailTitle,
    replyTo: "info@SolCart.com",
    html: emailBody,
  };

    const send = await transporter.sendMail(mailOptions);
    if(send){
      return {message:"done", email:userMail};
    }
  } catch (error: any) {
    console.error('Error sending email:', error.message);
    throw error; 
  }
};


const multipleMailHandler = async (
  mailTitle: string, 
  emailBody: string, 
  userMails: string[],
  subtile:string
): Promise<any> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.GMAIL_USERNAME,
        pass: env.GMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Ignore SSL certificate validation errors
      },
    });
    // from: 'A Customer Just Orderd Your Item On Solcart <' + env.GMAIL_USERNAME + '>',

    const mailOptions = {
      from: ` ${subtile}<` + env.GMAIL_USERNAME + '>',
      to: userMails.join(','), // Join array of email addresses with a comma
      subject: mailTitle,
      replyTo: "support@futurelivingafrica.com",
      html: emailBody,
    };

    const send = await transporter.sendMail(mailOptions);
    if (send) {
      return true;
    }
  } catch (error: any) {
    console.error('Error sending email:', error.message);
    throw error; 
  }
};


const createToken = async (_id: string): Promise<string> => {
  const token = await jwt.sign({ _id }, env.SECRET as string, { expiresIn: "3d" });
  return token;
};

const hashPassword = async (password: string): Promise<string> => {
  try {
    const hash = await argon2.hash(password);
    return hash;
  } catch (err) {
    throw new Error('Password hashing failed');
  }
};

const verifyPassword = async (password: string, hash: string): Promise<any> => {
  try {
    const match = await argon2.verify(hash, password);
    return match;
  } catch (err) {
   console.log(err)
  }
};

const validEmail = (email: string): boolean => {
  return validator.isEmail(email);
};


const validatePassword = (password: string): any => {
  const schema = new PasswordValidator();
  schema
    .is().min(8)                                    // Minimum length 8
    .is().max(100)                                  // Maximum length 100
    .has().uppercase()                              // Must have uppercase letters
    .has().lowercase()                              // Must have lowercase letters
    .has().digits(1)                                // Must have at least 1 digit
    .has().symbols()                                // Must have at least one special character
    .has().not().spaces()                           // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values
  return schema.validate(password);
};


const generateRandomLetters = () => {
  const vowels = 'aeiou';
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const letters = [];
  const usage:any = {};

  // Ensure at least 2 vowels
  for (let i = 0; i < 2; i++) {
    const letter = vowels[Math.floor(Math.random() * vowels.length)];
    letters.push(letter);
    usage[letter] = (usage[letter] || 0) + 1;
  }

  // Add 6 consonants
  for (let i = 0; i < 6; i++) {
    const letter = consonants[Math.floor(Math.random() * consonants.length)];
    letters.push(letter);
    usage[letter] = (usage[letter] || 0) + 1;
  }

  // Shuffle the letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  return {
    letters,
    usage
  };
};

// Gorbagana Testnet configuration
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




export {
  mailHandler,
  createToken,
  hashPassword,
  verifyPassword,
  generateCode,
  verifyCode,
  validEmail,
  multipleMailHandler,
  validatePassword,
  generateRandomLetters
}


