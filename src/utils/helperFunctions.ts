/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import env from '../config/config.ValidateEnv';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import NodeCache from 'node-cache';
import validator from 'validator';
import PasswordValidator from 'password-validator';

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

export {
  mailHandler,
  createToken,
  hashPassword,
  verifyPassword,
  generateCode,
  verifyCode,
  validEmail,
  multipleMailHandler,
  validatePassword
}


