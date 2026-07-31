import { Jimp } from "jimp";

async function generateIcons() {
  const image = await Jimp.read("C:\\Users\\fahad\\.gemini\\antigravity\\brain\\5d805964-9f76-4ca6-aabe-3854d5712ee5\\buzz_chat_app_icon_1785511494885.jpg");

  const img192 = image.clone();
  img192.resize({ w: 192, h: 192 });
  await img192.write("public/logo192.png");

  const img512 = image.clone();
  img512.resize({ w: 512, h: 512 });
  await img512.write("public/logo512.png");

  console.log("Icons generated");
}

generateIcons().catch(console.error);
