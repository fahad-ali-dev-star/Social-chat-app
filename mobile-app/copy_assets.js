import fs from "fs";
import path from "path";

const iconPath = "C:\\Users\\fahad\\.gemini\\antigravity\\brain\\f230594a-52c7-4ebb-8cda-f9be8bbd9e92\\buzz_icon_final_1786982505186.jpg";
const splashPath = "C:\\Users\\fahad\\.gemini\\antigravity\\brain\\f230594a-52c7-4ebb-8cda-f9be8bbd9e92\\buzz_splash_extracted_1786982437608.jpg";
const destDir = "c:\\Users\\fahad\\Downloads\\mern-social-app-step6d-fixed\\mern-social-app-fixed-phase5\\mobile-app\\assets\\images";

fs.copyFileSync(iconPath, path.join(destDir, "icon.png"));
fs.copyFileSync(iconPath, path.join(destDir, "android-icon-foreground.png"));
fs.copyFileSync(iconPath, path.join(destDir, "favicon.png"));
fs.copyFileSync(splashPath, path.join(destDir, "splash-icon.png"));

console.log("All Buzz Chat app assets updated successfully!");
