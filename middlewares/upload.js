import multer from "multer";
import { CustomError } from "./error.middlewares.js";

// Configure disk storage for temporary files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(
    file.originalname.toLowerCase().split(".").pop()
  );

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only JPEG/JPG/PNG images are allowed"), false);
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware for multiple image uploads (up to 10 files)
const uploadMultipleImages = (req, res, next) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message, err.field);
      return next(new CustomError(`Multer error: ${err.message}`, 400));
    } else if (err) {
      console.error("Upload error:", err.message);
      return next(new CustomError(err.message || "File upload error", 400));
    }
    console.log(
      "UploadMultipleImages: req.files:",
      req.files,
      "req.body:",
      req.body
    );
    next();
  });
};

// Middleware for single image upload
const uploadSingleImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message, err.field);
      return next(new CustomError(`Multer error: ${err.message}`, 400));
    } else if (err) {
      console.error("Upload error:", err.message);
      return next(new CustomError(err.message || "File upload error", 400));
    }
    console.log(
      "UploadSingleImage: req.file:",
      req.file,
      "req.body:",
      req.body
    );
    next();
  });
};

export { uploadMultipleImages, uploadSingleImage };
