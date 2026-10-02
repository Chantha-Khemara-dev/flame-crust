// Helper to compress image into lightweight Base64 string
const fileToBase64 = (file, maxSize = 1200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; // Add white background in case of transparent png
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.92)); // High quality compression
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const uploadImageToCloudinary = async (file) => {
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "gdkctwwo").trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "flameimg").trim();

  // Compress image to JPEG before upload (High Quality)
  const compressedBase64 = await fileToBase64(file, 1200);

  if (file && cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append("file", compressedBase64); // Send the compressed base64 string
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return data.secure_url;
        }
      }
    } catch (error) {
      console.warn("Cloudinary upload failed, falling back to local compression:", error);
    }
  }

  // Guaranteed fallback: returns compressed base64 image
  return compressedBase64;
};

export const uploadAudioToCloudinary = async (audioBlob) => {
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "gdkctwwo").trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "flameimg").trim();

  // Try uploading to Cloudinary video/upload (Cloudinary stores audio files under video resource type)
  if (audioBlob && cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return data.secure_url;
        }
      }
    } catch (error) {
      console.warn("Cloudinary audio upload failed, falling back to base64 data URI:", error);
    }
  }

  // Reliable fallback: convert audio blob to base64 data URI
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};


// Helper to optimize existing Cloudinary URLs on the fly (for old images)
export const getOptimizedImageUrl = (url, width = 1200) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  
  // If already transformed, don't transform again
  if (url.includes("/upload/f_") || url.includes("/upload/q_")) return url;

  // Inject transformation: output as JPG, high quality auto, max width 1200px
  return url.replace("/image/upload/", `/image/upload/f_jpg,q_auto:good,w_${width},c_limit/`);
};
