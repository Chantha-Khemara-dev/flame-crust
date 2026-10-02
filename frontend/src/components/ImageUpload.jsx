import { useState } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { UploadCloud, Loader2 } from "lucide-react";

export default function ImageUpload({ value, onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadedUrl = await uploadImageToCloudinary(file);
      
      if (onUploadSuccess) {
        onUploadSuccess(uploadedUrl);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("មានបញ្ហាក្នុងការ Upload រូបភាព!");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[250px] gap-4">
      <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-8 h-8 text-gray-500 mb-2" />
          )}
          <p className="text-sm text-gray-500">
            {isUploading ? "កំពុង Upload..." : "ចុចដើម្បីជ្រើសរើសរូបភាព"}
          </p>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageChange}
          disabled={isUploading}
        />
      </label>

      {value && (
        <div className="relative">
          <img 
            src={value} 
            alt="Uploaded Preview" 
            className="w-32 h-32 object-cover rounded-lg border shadow"
          />
          <p className="text-xs text-green-600 mt-1">✓ Upload រួចរាល់</p>
        </div>
      )}
    </div>
  );
}
