import env from './config.ValidateEnv';
import mongoose from 'mongoose';

const connectToDb = async(cb: ()=> void): Promise<void> => {
  try {
    await mongoose.connect(env.MONG_URI);
    cb();
  } catch (error) {
    console.log(error);
  }
}

export default connectToDb
