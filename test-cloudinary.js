const fs = require('fs');
const path = require('path');

async function test() {
  const formData = new FormData();
  // minimal 1x1 base64 image
  const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  formData.append("file", base64);
  formData.append("upload_preset", "flameimg");

  try {
    const response = await fetch("https://api.cloudinary.com/v1_1/gdkctwwo/image/upload", {
      method: "POST",
      body: formData,
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
test();
