import multer, { Multer } from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './config.cloudinary';

interface CloudinaryStorageParams {
  folder: string;
  allowedFormats: string[];
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'zip'],
  } as CloudinaryStorageParams,
});

const upload: Multer = multer({ storage });

export default upload;
