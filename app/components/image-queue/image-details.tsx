import type { FileMetadata } from "@mjackson/file-storage";

type Props = {
  file: FileMetadata,
};

export default function ImageFile({ file }: { file: FileMetadata }) {
  return (
    <ul>
      <li>{file.key}</li>
      <li>{file.lastModified}</li>
      <li>{file.name}</li>
      <li>{file.size}</li>
      <li>{file.type}</li>
      <li><img src={`/images/image/${file.key}`} alt={file.name}/></li>
    </ul>
  )
}
