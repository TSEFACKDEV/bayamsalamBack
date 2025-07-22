var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import path from "path";
import fs from "fs/promises";
const uploadDir = path.join(process.cwd(), "uploads", "products");
export function handleProductImagesUpload(files) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs.mkdir(uploadDir, { recursive: true });
        const imagePaths = [];
        for (const file of files) {
            const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
            const filePath = path.join(uploadDir, filename);
            yield file.mv(filePath);
            imagePaths.push(`/uploads/products/${filename}`);
        }
        return imagePaths;
    });
}
export function deleteProductImages(images) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const img of images) {
            const imgPath = path.join(process.cwd(), img);
            try {
                yield fs.unlink(imgPath);
            }
            catch (err) {
                // Ignore if file does not exist
            }
        }
    });
}
