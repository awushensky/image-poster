import type { QueuedImage } from "~/model/database";

interface ImageListProps {
  images: QueuedImage[];
}

export default function ImageList({ images }: ImageListProps) {
  return (
    <div className="p-4">
      {
        images.length === 0 ? (
          <p className="text-gray-500">No images uploaded yet.</p>
        ) : (
          <ul className="space-y-4">
            {images.map((image) => (
              <li key={image.id} className="border p-4 rounded-lg">
                <img
                  src={`/image/${image.storage_key}`}
                  width="20%"
                  alt={image.storage_key}
                  className="w-lg h-auto rounded"
                />
                <div className="mt-2">
                  <h3 className="text-lg font-semibold">{image.post_text}</h3>
                  <p className="text-sm text-gray-600">NSFW?: {image.is_nsfw}</p>
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}

