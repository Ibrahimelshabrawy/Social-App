import {tmpdir} from "node:os";
import {MulterEnum, StoreEnum} from "../enum/multer.enum";
import multer from "multer";
import {Request} from "express";

export const multerCloud = ({
  store_type = StoreEnum.disk,
  custom_types = MulterEnum.image,
}: {
  store_type?: StoreEnum;
  custom_types?: string[];
  maxFileSize?: number;
} = {}) => {
  const storage =
    store_type === StoreEnum.memory
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination: tmpdir(),
          filename: function (
            req: Request,
            file: Express.Multer.File,
            cb: Function,
          ) {
            const uniqueSuffix =
              Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + "-" + file.originalname);
          },
        });

  function fileFilter(req: Request, file: Express.Multer.File, cb: Function) {
    if (!custom_types.includes(file.mimetype)) {
      return cb(new Error("inValid File Type", {cause: 400}));
    }
    return cb(null, true);
  }
  const upload = multer({storage, fileFilter});
  return upload;
};
